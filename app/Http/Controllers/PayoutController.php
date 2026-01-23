<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;

class PayoutController extends Controller
{
    /**
     * Display the earnings and payouts page.
     */
    public function index()
    {
        $user = auth()->user();

        $recentEarnings = $user->transactions()
            ->whereIn('type', ['debit', 'referral', 'bonus'])
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'status' => $transaction->status,
                    'type' => $transaction->type,
                    'created_at' => $transaction->created_at->toDateTimeString(),
                    'description' => $transaction->description,
                ];
            });

        $expectedEarnings = $user->transactions()
            ->whereIn('type', ['debit'])
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'status' => $transaction->status,
                    'type' => $transaction->type,
                    'seller_fee' => $transaction->seller_fee,
                    'seller_fee_percentage' => $transaction->seller_fee_percentage,
                    'created_at' => $transaction->created_at->toDateTimeString(),
                    'description' => $transaction->description,
                ];
            });

        $balanceCheck = LaravelPayPocket::checkBalance($user);

        $balance = [
            [
                'currency' => $user->currency,
                'amount' => $balanceCheck,
                'available' => $balanceCheck - $balanceCheck * 0.03,
            ],
        ];

        // Group expected earnings by currency
        $totalExpectedEarnings = $expectedEarnings->groupBy('currency')->map(function ($group) {
            return [
                'amount' => $group->sum('amount'),
                'seller_fee' => $group->sum('seller_fee'),
                'seller_fee_percentage' => $group->sum('seller_fee_percentage'),
            ];
        })->toArray();

        return Inertia::render('earnings', [
            'balance' => $balance,
            'recentEarnings' => $recentEarnings,
            'totalExpectedEarnings' => $totalExpectedEarnings,
            'payoutMethods' => $user->payoutMethods->map(function ($method) {
                return [
                    'id' => $method->id,
                    'type' => $method->type,
                    'details' => $method->details,
                    'is_default' => $method->is_default,
                ];
            }),
        ]);
    }

    /**
     * Create a new payout method.
     */
    public function create()
    {
        return Inertia::render('earnings');
    }

    /**
     * Store a new payout method.
     */
    public function storeMethod(Request $request)
    {
        $user = auth()->user();
        
        // Log the incoming request data
        \Log::info('Payout method creation request:', [
            'user_id' => $user->id,
            'request_data' => $request->all(),
            'request_headers' => $request->headers->all(),
        ]);
        
        try {

            $validationRules = [
                'type' => 'required|in:bank_transfer,ewallet,payshap,paypal,multicaixa',
                'details' => 'required|array',
                'currency' => 'required|string|size:3',
                'is_default' => 'sometimes|boolean',
                'details.name' => 'required|string|max:255',
                'details.account_holder_name' => 'required|string|max:255',
            ];
            // Log before validation
            \Log::debug('Starting validation for payout method', [
                'input_data' => $request->all()
            ]);

            // Add type-specific validation rules
            switch ($request->input('type')) {
                case 'bank_transfer':
                    $validationRules = array_merge($validationRules, [
                        'details.bank_name' => 'required|string|max:255',
                        'details.account_number' => 'required|string|max:50',
                        'details.iban' => 'required|string|max:34',
                        'details.swift_code' => 'nullable|string|max:11',
                        'details.branch_code' => 'nullable|string|max:20',
                        'details.account_type' => 'required|in:savings,checking',
                    ]);
                    break;
                    
                case 'ewallet':
                    $validationRules = array_merge($validationRules, [
                        'details.phone_number' => 'required|string|max:20',
                    ]);
                    break;
                    
                case 'multicaixa':
                    $validationRules = array_merge($validationRules, [
                        'details.phone_number' => 'required|string|max:20',
                        'details.provider' => 'required|string|max:100',
                        'details.network' => 'required|string|max:100',
                    ]);
                    break;
                    
                case 'paypal':
                    $validationRules = array_merge($validationRules, [
                        'details.email' => 'required|email|max:255',
                    ]);
                    break;
                    
                case 'payshap':
                    $validationRules = array_merge($validationRules, [
                        'details.payshap_id' => 'required|string|max:50',
                    ]);
                    break;
            }

            // Validate the request
            $validated = $request->validate($validationRules);

            // Log after successful validation
            \Log::debug('Validation passed', [
                'validated_data' => $validated
            ]);

            // If this is set as default, unset other defaults
            if ($request->boolean('is_default')) {
                $user->payoutMethods()->update(['is_default' => false]);
            }

            // Prepare details based on type
            $details = $request->details;
            $details['account_holder_name'] = $details['account_holder_name'] ?? $details['name'] ?? null;
            
            // Ensure backward compatibility
            if ($validated['type'] === 'ewallet' || $validated['type'] === 'multicaixa') {
                $details['phone'] = $details['phone'] ?? $details['phone_number'] ?? null;
            }

            // Log before creating payout method
            \Log::debug('Creating payout method with data:', [
                'type' => $validated['type'] ?? 'NOT_SET',
                'details' => $validated['details'] ?? [],
                'currency' => $validated['currency'] ?? 'NOT_SET',
                'is_default' => $validated['is_default'] ?? false,
            ]);
            
            // Create the payout method
            $payoutMethod = $user->payoutMethods()->create([
                'type' => $validated['type'],
                'details' => $details,
                'currency' => $validated['currency'],
                'is_default' => $validated['is_default'] ?? false,
            ]);

            // Log successful creation
            \Log::info('Payout method created successfully', [
                'payout_method_id' => $payoutMethod->id,
                'type' => $payoutMethod->type,
                'currency' => $payoutMethod->currency,
            ]);

            return back()->with('success', 'Payout method saved successfully');
        } catch (\Exception $e) {
            // Log detailed error information
            \Log::error('Error saving payout method', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'user_id' => $user->id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            // Return a more detailed error message in development
            $errorMessage = config('app.env') === 'local' 
                ? 'Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine()
                : 'Failed to save payout method. Please try again.';
                
            return back()->with('error', $errorMessage)->withInput();
        }
    }

    /**
     * Request a payout.
     */
    public function requestPayout(Request $request)
    {
        try {
            $user = auth()->user();
            $validated = $request->validate([
                'amount' => 'required|numeric|min:1',
                'currency' => 'required|string|in:USD,AOA',
                'method' => 'required|in:paypal,multicaixa',
            ]);

            // Add your payout logic here
            // This is a placeholder for the actual payout implementation
            
            // Example: Create a transaction record
            $user->transactions()->create([
                'amount' => -$validated['amount'],
                'currency' => $validated['currency'],
                'type' => 'payout',
                'status' => 'pending',
                'description' => 'Payout request via ' . $validated['method'],
                'reference' => 'PYT' . time() . $user->id,
            ]);

            return back()->with('success', 'Payout request submitted successfully');
        } catch (\Exception $e) {
            \Log::error('Error requesting payout: ' . $e->getMessage());
            return back()->with('error', 'Failed to process payout request: ' . $e->getMessage());
        }
    }

    public function store(Request $request, Order $order)
    {
        $user = auth()->user();
        
        // Only buyer can request payout
        if ($order->buyer_id !== $user->id) {
            abort(403);
        }

        try {
            $validated = $request->validate([
                'is_cross_border' => 'boolean',
                'converted_currency' => 'nullable|string|size:3',
                'linked_account' => 'required|string',
            ]);

            $escrow = $order->escrow;
            $amount = $escrow->amount;

            // Calculate payout fee (3%)
            $payoutFee = $amount * 0.03;
            $finalAmount = $amount - $payoutFee;

            // If cross-border, apply conversion (example rate)
            if ($validated['is_cross_border'] ?? false) {
                $conversionRate = 1.1; // Example rate
                $finalAmount = $finalAmount * $conversionRate;
            }

            // Create payout
            $payout = Payout::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'amount' => $finalAmount,
                'status' => 'pending',
                'is_cross_border' => $validated['is_cross_border'] ?? false,
                'conversion_rate' => ($validated['is_cross_border'] ?? false) ? 1.1 : null,
                'converted_currency' => $validated['converted_currency'] ?? null,
                'payout_fee' => $payoutFee,
                'linked_account' => $validated['linked_account'],
            ]);

            // Debit user's wallet for payout fee
            $user->debit($payoutFee, [
                'description' => 'Payout processing fee',
                'reference' => "PAYOUT-{$payout->id}",
            ]);

            return redirect()->route('payout-confirmation', $payout)->with('success', 'Payout requested!');
        } catch (\Exception $e) {
            \Log::error('Error creating payout: ' . $e->getMessage());
            return back()->with('error', 'Failed to process payout: ' . $e->getMessage())->withInput();
        }
    }

    public function process(Payout $payout)
    {
        $user = auth()->user();
        if ($payout->user_id !== $user->id) {
            abort(403);
        }

        $payout->update([
            'status' => 'completed',
            'processed_at' => now(),
        ]);

        // Credit user's external account (in real system, use payment gateway)
        $user->credit($payout->amount, [
            'description' => 'Payout to linked account',
            'reference' => "PAYOUT-{$payout->id}",
        ]);

        return back()->with('success', 'Payout processed successfully!');
    }

    public function payoutHistory()
    {
        $user = auth()->user();
        $payouts = $user->payouts()->with('order')->paginate(20);

        return Inertia::render('payouts', [
            'payouts' => $payouts,
        ]);
    }
}
