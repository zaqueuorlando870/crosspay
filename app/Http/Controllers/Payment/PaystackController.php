<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;

class PaystackController extends Controller
{
    /**
     * Initialize Paystack payment
     */
    public function initialize(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'amount' => 'required|numeric|min:1', // Amount in the base currency
            'currency' => 'required|string|size:3',
        ]);

        $reference = 'PS-' . Str::upper(Str::random(16));
        $amount = (float) $request->amount;
        $wallet_id = 'wallet_1';
        Log::info("Wallet ID: " . $wallet_id);
        
        try {
            // Get the authenticated user
            $user = $request->user();
            
            // Get Paystack secret key
            $secretKey = config('services.paystack.secret_key');
            
            if (empty($secretKey)) {
                throw new \Exception('Paystack secret key is not configured');
            }
            
            // Log the first few characters of the key for debugging (without exposing the full key)
            Log::debug('Using Paystack key: ' . substr($secretKey, 0, 8) . '...');
            
            // Call Paystack API to initialize transaction
            $http = Http::withToken($secretKey);
            
            // Disable SSL verification in development
            if (app()->environment('local', 'development')) {
                $http->withoutVerifying();
            }
            
            $response = $http->post('https://api.paystack.co/transaction/initialize', [
                    'email' => $request->email,
                    'amount' => $amount, // Convert to kobo
                    'currency' => $request->currency,
                    'reference' => $reference,
                    'callback_url' => route('payment.paystack.callback'),
                    'metadata' => [
                        'user_id' => $user->id,
                        'amount' => $amount,
                        'currency' => $request->currency,
                        'wallet_id' => $wallet_id,
                        'reference' => $reference
                    ]
                ]);

            $responseData = $response->json();

            if (!$response->successful() || !$responseData['status']) {
                Log::error('Paystack initialization failed', [
                    'response' => $responseData,
                    'request' => $request->all()
                ]);
                
                return response()->json([
                    'error' => $responseData['message'] ?? 'Failed to initialize Paystack payment'
                ], 500);
            }

            return response()->json([
                'authorization_url' => $responseData['data']['authorization_url'],
                'access_code' => $responseData['data']['access_code'],
                'reference' => $reference
            ]);

        } catch (\Exception $e) {
            Log::error('Paystack initialization error: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'An error occurred while initializing payment'
            ], 500);
        }
    }

    /**
     * Handle Paystack callback
     */
    public function callback(Request $request)
    {
        $request->validate([
            'reference' => 'required|string',
            'trxref' => 'sometimes|string' // Paystack might send this instead of reference
        ]);

        $reference = $request->reference ?? $request->trxref;
        
        if (!$reference) {
            return redirect()->route('wallet.deposit')
                ->with('error', 'Invalid payment reference');
        }

        try {
            // Get Paystack secret key
            $secretKey = config('services.paystack.secret_key');
            
            if (empty($secretKey)) {
                throw new \Exception('Paystack secret key is not configured');
            }
            
            // Log the first few characters of the key for debugging (without exposing the full key)
            Log::debug('Using Paystack key in callback: ' . substr($secretKey, 0, 8) . '...');
            
            // Set up the HTTP client with token
            $http = Http::withToken($secretKey);
            
            // Disable SSL verification in development
            if (app()->environment('local', 'development')) {
                $http->withoutVerifying();
            }
            
            // Verify the transaction with Paystack
            $response = $http->get("https://api.paystack.co/transaction/verify/" . $reference);

            $responseData = $response->json();

            if (!$response->successful() || !$responseData['status']) {
                throw new \Exception($responseData['message'] ?? 'Payment verification failed');
            }

            $transactionData = $responseData['data'];
            
            // Get the user from the metadata
            $userId = $transactionData['metadata']['user_id'] ?? null;
            $amount = (float) $transactionData['amount'] / 100; // Convert from kobo to main currency
            $currency = $transactionData['currency'] ?? 'NGN';
            $wallet_id = $transactionData['metadata']['wallet_id'] ?? null;

            if (!$userId) {
                throw new \Exception('User ID not found in transaction metadata');
            }

            // Get the user
            $user = User::findOrFail($userId);

            // Check if this transaction was already processed
            $existingTransaction = \DB::table('transactions')
                ->where('reference', $reference)
                ->first();

            if ($existingTransaction) {
                return redirect()->route('dashboard')
                    ->with('success', 'Payment already processed successfully!');
            }

            if ($transactionData['status'] !== 'success') {
                throw new \Exception('Payment was not successful: ' . $transactionData['gateway_response']);
            }

            // Process the successful payment
            \DB::beginTransaction();

            try {
                // Add funds to user's cash wallet using Laravel PayPocket
                $responnseFromDeposit = LaravelPayPocket::deposit(
                    $user, 
                    $wallet_id, 
                    (float)$amount
                );

                $balance = LaravelPayPocket::checkBalance($user);
                Log::info("Wallet Balance: " . $balance);
                Log::info("Response from deposit: " . $responnseFromDeposit);

                // Calculate fees and net amount (assuming no fees for deposits)
                $platformFee = 0;
                $platformFeePercentage = 0;
                $netAmount = $amount;
                $totalFees = 0;

                // Create a transaction record with all required fields
                $user->transactions()->create([
                    'reference' => $reference,
                    'wallet_id' => $wallet_id,
                    'amount' => $amount,
                    'net_amount' => $netAmount,
                    'platform_fee' => $platformFee,
                    'platform_fee_percentage' => $platformFeePercentage,
                    'total_fees' => $totalFees,
                    'currency' => $currency,
                    'type' => 'deposit',
                    'status' => 'completed',
                    'provider_reference' => $reference,
                    'metadata' => [
                        'provider' => 'paystack',
                        'provider_reference' => $reference,
                        'description' => 'Deposit via Paystack'
                    ]
                ]);

                \DB::commit();
                
                // Debug log
                Log::info('Paystack payment processed successfully', [
                    'user_id' => $user->id,
                    'amount' => $amount,
                    'currency' => $currency,
                    'reference' => $reference
                ]);

                return redirect()->route('deposit')
                    ->with('success', 'Payment processed successfully! Your wallet has been credited.');

            } catch (\Exception $e) {
                \DB::rollBack();
                Log::error('Paystack deposit processing error: ' . $e->getMessage(), [
                    'exception' => $e,
                    'reference' => $reference
                ]);
                
                return redirect()->route('wallet.deposit')
                    ->with('error', 'Error processing your payment. Please contact support.');
            }

        } catch (\Exception $e) {
            Log::error('Paystack callback error: ' . $e->getMessage(), [
                'exception' => $e,
                'reference' => $reference ?? null
            ]);
            
            return redirect()->route('wallet.deposit')
                ->with('error', 'Payment verification failed: ' . $e->getMessage());
        }
    }
}