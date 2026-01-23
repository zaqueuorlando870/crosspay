<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;

class PayPalController extends Controller
{
    protected $paypalBaseUrl;
    protected $clientId;
    protected $secret;

    public function __construct()
    {
        $this->paypalBaseUrl = config('services.paypal.mode') === 'sandbox' 
            ? 'https://api-m.sandbox.paypal.com' 
            : 'https://api-m.paypal.com';
        
        $this->clientId = config('services.paypal.client_id');
        $this->secret = config('services.paypal.secret');
    }

    protected function getAccessToken()
    {
        $response = Http::withBasicAuth($this->clientId, $this->secret)
            ->asForm()
            ->post("{$this->paypalBaseUrl}/v1/oauth2/token", [
                'grant_type' => 'client_credentials'
            ]);

        if (!$response->successful()) {
            Log::error('PayPal access token error', [
                'status' => $response->status(),
                'response' => $response->json()
            ]);
            throw new \Exception('Failed to get PayPal access token');
        }

        return $response->json()['access_token'];
    }

    /**
     * Create a PayPal order
     */
    public function create(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'currency' => 'required|string|size:3',
            'wallet_id' => 'required|string' // Just an identifier, not a foreign key
        ]);

        $orderId = 'PAYPAL-' . Str::upper(Str::random(16));
        $amount = number_format($request->amount, 2, '.', '');
        
        try {
            $accessToken = $this->getAccessToken();
            $user = $request->user();

            // Create PayPal order
            $response = Http::withToken($accessToken)
                ->withHeaders([
                    'PayPal-Request-Id' => Str::uuid()->toString(),
                    'Content-Type' => 'application/json'
                ])
                ->post("{$this->paypalBaseUrl}/v2/checkout/orders", [
                    'intent' => 'CAPTURE',
                    'purchase_units' => [
                        [
                            'reference_id' => $orderId,
                            'amount' => [
                                'currency_code' => strtoupper($request->currency),
                                'value' => $amount
                            ],
                            'description' => 'Wallet Deposit',
                            'custom_id' => $user->id, // Store user ID in custom_id
                            'metadata' => [
                                'user_id' => $user->id,
                                'amount' => $amount,
                                'currency' => $request->currency,
                                'reference' => $orderId
                            ]
                        ]
                    ],
                    'application_context' => [
                        'brand_name' => config('app.name'),
                        'return_url' => route('payment.paypal.success'),
                        'cancel_url' => route('payment.paypal.cancel'),
                        'user_action' => 'PAY_NOW'
                    ]
                ]);

            $responseData = $response->json();

            if (!$response->successful()) {
                Log::error('PayPal order creation failed', [
                    'status' => $response->status(),
                    'response' => $responseData,
                    'request' => $request->all()
                ]);
                
                return response()->json([
                    'error' => $responseData['message'] ?? 'Failed to create PayPal order'
                ], 500);
            }

            // Find the approval URL in the response
            $approveLink = collect($responseData['links'] ?? [])
                ->where('rel', 'approve')
                ->first();

            if (!$approveLink) {
                throw new \Exception('No approval URL found in PayPal response');
            }

            return response()->json([
                'order_id' => $orderId,
                'approval_url' => $approveLink['href']
            ]);

        } catch (\Exception $e) {
            Log::error('PayPal order creation error: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'An error occurred while creating PayPal order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle successful PayPal payment
     */
    public function success(Request $request)
    {
        $token = $request->query('token');
        
        if (!$token) {
            return redirect()->route('dashboard')
                ->with('error', 'Invalid PayPal payment token');
        }

        try {
            $accessToken = $this->getAccessToken();
            
            // Capture the payment
            $response = Http::withToken($accessToken)
                ->withHeaders([
                    'Content-Type' => 'application/json'
                ])
                ->post("{$this->paypalBaseUrl}/v2/checkout/orders/{$token}/capture");

            $responseData = $response->json();

            if ($response->status() !== 201 || $responseData['status'] !== 'COMPLETED') {
                throw new \Exception('Payment was not completed successfully');
            }

            // Get the purchase unit and its metadata
            $purchaseUnit = $responseData['purchase_units'][0] ?? null;
            $customId = $purchaseUnit['custom_id'] ?? null;
            $amount = $purchaseUnit['payments']['captures'][0]['amount']['value'] ?? null;
            $currency = $purchaseUnit['payments']['captures'][0]['amount']['currency_code'] ?? null;
            $reference = $purchaseUnit['reference_id'] ?? null;

            if (!$customId || !$amount || !$reference) {
                throw new \Exception('Invalid payment data received from PayPal');
            }

            // Get the user
            $user = User::find($customId);
            if (!$user) {
                throw new \Exception('User not found');
            }

            // Process the successful payment
            \DB::beginTransaction();

            try {
                // Add funds to user's cash wallet using Laravel PayPocket
                LaravelPayPocket::deposit($user, 'cash', (float)$amount, [
                    'reference' => $reference,
                    'description' => 'PayPal Deposit',
                    'metadata' => [
                        'provider' => 'paypal',
                        'provider_reference' => $token,
                        'currency' => $currency
                    ]
                ]);

                \DB::commit();

                return redirect()->route('dashboard')
                    ->with('success', 'Payment processed successfully! Your wallet has been credited.');

            } catch (\Exception $e) {
                \DB::rollBack();
                Log::error('PayPal deposit processing error: ' . $e->getMessage(), [
                    'exception' => $e,
                    'reference' => $reference ?? null
                ]);
                
                return redirect()->route('wallet.deposit')
                    ->with('error', 'Error processing your payment. Please contact support.');
            }

        } catch (\Exception $e) {
            Log::error('PayPal payment processing error: ' . $e->getMessage(), [
                'exception' => $e,
                'token' => $token
            ]);
            
            return redirect()->route('wallet.deposit')
                ->with('error', 'Payment processing failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle cancelled PayPal payment
     */
    public function cancel()
    {
        return redirect()->route('wallet.deposit')
            ->with('status', 'Payment was cancelled');
    }
}