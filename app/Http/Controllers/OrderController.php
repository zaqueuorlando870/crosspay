<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Escrow;
use App\Models\Fee;
use App\Models\Payout;
use App\Models\Transaction;
use App\Models\Earning;
use Illuminate\Http\Request;
use Inertia\Inertia;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;

class OrderController extends Controller
{
    public function create(Listing $listing)
    {
        return response()->json([
            'success' => true,
            'listing' => $listing->load('seller'),
        ]);
    }

public function store(Request $request)
{
    \Log::info('=== ORDER CREATION STARTED ===');
    \Log::info('Request Data', [
        'request_all' => $request->all(),
        'user_id' => auth()->id(),
        'timestamp' => now()->toDateTimeString()
    ]);

    $validated = $request->validate([
        'listing_id' => 'required|exists:listings,id',
        'amount' => 'required|numeric|min:0.01',
        'from_currency' => 'required|string|size:3',
        'to_currency' => 'required|string|size:3',
    ]);

    \Log::info('Validation Passed', [
        'validated_data' => $validated
    ]);

    $listing = Listing::findOrFail($validated['listing_id']);
    \Log::info('Listing Found', [
        'listing_id' => $listing->id,
        'listing_details' => [
            'seller_id' => $listing->user_id,
            'from_currency' => $listing->from_currency,
            'to_currency' => $listing->to_currency,
            'exchange_rate' => $listing->exchange_rate,
            'min_amount' => $listing->min_amount,
            'total_amount' => $listing->total_amount,
            'amount' => $listing->amount,
            'status' => $listing->status
        ]
    ]);

    $user = auth()->user();
    $amount = (float)$validated['amount'];
    $fromCurrency = $validated['from_currency'];
    $toCurrency = $validated['to_currency'];

    // Only update currencies if they are not already set
    $updateData = [];
    if (empty($listing->from_currency)) {
        $updateData['from_currency'] = $fromCurrency;
    }
    if (empty($listing->to_currency)) {
        $updateData['to_currency'] = $toCurrency;
    }
    
    if (!empty($updateData)) {
        \Log::info('Updating Listing Currencies', [
            'update_data' => $updateData,
            'listing_id' => $listing->id
        ]);
        $listing->update($updateData);
        \Log::info('Listing Currencies Updated Successfully');
    }

    \Log::info('Currency Check', [
        'listing_currencies' => "{$listing->from_currency}/{$listing->to_currency}",
        'request_currencies' => "{$fromCurrency}/{$toCurrency}",
        'listing_id' => $listing->id
    ]); 

    // Validate currencies match the listing
    if ($fromCurrency !== $listing->from_currency || $toCurrency !== $listing->to_currency) {
        \Log::error('Currency Mismatch', [
            'expected' => "{$listing->from_currency}/{$listing->to_currency}",
            'provided' => "{$fromCurrency}/{$toCurrency}"
        ]);
        return response()->json([
            'success' => false,
            'error' => 'Currency pair does not match the selected listing.',
            'expected' => "{$listing->from_currency}/{$listing->to_currency}",
            'provided' => "{$fromCurrency}/{$toCurrency}"
        ], 422);
    }
    \Log::info('Currency Validation Passed');

    // Check if user's currency aligns with the to_currency
    \Log::info('User Currency Check', [
        'user_id' => $user->id,
        'user_currency' => $user->currency,
        'to_currency' => $toCurrency,
        'from_currency' => $fromCurrency
    ]);

    if ($user->currency !== $toCurrency) {
        \Log::error('User Currency Mismatch', [
            'user_currency' => $user->currency,
            'to_currency' => $toCurrency,
            'error' => 'User currency does not match the target currency'
        ]);
        return response()->json([
            'success' => false,
            'error' => 'Your account currency (' . $user->currency . ') does not match the target currency (' . $toCurrency . '). Please update your profile settings or select a different listing.',
            'user_currency' => $user->currency,
            'to_currency' => $toCurrency
        ], 422);
    }
    \Log::info('User Currency Validation Passed');

    // Check if listing is active
    if (!$listing->isActive()) {
        \Log::error('Listing Not Active', [
            'listing_id' => $listing->id,
            'status' => $listing->status
        ]);
        return response()->json([
            'success' => false,
            'error' => 'This listing is no longer available.',
            'listing_id' => $listing->id,
            'status' => $listing->status
        ], 422);
    }
    \Log::info('Listing Active Check Passed');

    // Validate amount
    if ($amount < $listing->min_amount) {
        \Log::error('Amount Below Minimum', [
            'requested_amount' => $amount,
            'minimum_amount' => $listing->min_amount,
            'currency' => $listing->from_currency
        ]);
        return response()->json([
            'success' => false,
            'error' => "Minimum amount is " . number_format($listing->min_amount, 2) . " {$listing->from_currency}.",
            'requested_amount' => $amount,
            'minimum_amount' => $listing->min_amount,
            'currency' => $listing->from_currency
        ], 422);
    }
    \Log::info('Minimum Amount Check Passed');

    if ($amount > $listing->total_amount) {
        \Log::error('Amount Above Maximum', [
            'requested_amount' => $amount,
            'maximum_amount' => $listing->total_amount,
            'currency' => $listing->from_currency
        ]);
        return response()->json([
            'success' => false,
            'error' => "Maximum available amount is " . number_format($listing->total_amount, 2) . " {$listing->from_currency}.",
            'requested_amount' => $amount,
            'maximum_amount' => $listing->total_amount,
            'currency' => $listing->from_currency
        ], 422);
    }
    \Log::info('Maximum Amount Check Passed');

    // Check if user has sufficient balance in the specific currency
    $walletBalance = LaravelPayPocket::checkBalance(auth()->user(), $fromCurrency);
    \Log::info('Wallet Balance Check', [
        'user_id' => auth()->id(),
        'currency' => $fromCurrency,
        'required_amount' => $amount,
        'available_balance' => $walletBalance,
        'sufficient' => $walletBalance >= $amount
    ]);


    

    if ($walletBalance < $amount) {
        \Log::error('Insufficient Balance', [
            'required' => $amount,
            'available' => $walletBalance,
            'shortfall' => $amount - $walletBalance,
            'currency' => $fromCurrency
        ]);
        return response()->json([
            'success' => false,
            'error' => "Insufficient balance. You need " . number_format($amount, 2) . " {$toCurrency} to complete this exchange transaction. Current balance: " . number_format($walletBalance, 2) . " {$toCurrency}",
            'required_amount' => $amount,
            'available_balance' => $walletBalance,
            'shortfall' => $amount - $walletBalance,
            'currency' => $fromCurrency
        ], 422);
    }
    \Log::info('Balance Check Passed');

    // Start database transaction
    \Log::info('Starting Database Transaction');
    \DB::beginTransaction();
    try {
        // Calculate exchange and fees
        $exchangeRate = $listing->exchange_rate;
        $exchangedAmount = $amount * $exchangeRate;
        $platformFee = $exchangedAmount * ($listing->fee / 100);
        $netAmount = $exchangedAmount - $platformFee;

        \Log::info('Exchange Calculation', [
            'exchange_rate' => $exchangeRate,
            'original_amount' => $amount,
            'exchanged_amount' => $exchangedAmount,
            'platform_fee_percentage' => $listing->fee,
            'platform_fee_amount' => $platformFee,
            'net_amount' => $netAmount
        ]);

        // Create the order
        \Log::info('Creating Order');
        $order = Order::create([
            'user_id' => $user->id,
            'listing_id' => $listing->id,
            'amount' => $amount,
            'from_currency' => $fromCurrency,
            'to_currency' => $toCurrency,
            'exchange_rate' => $exchangeRate,
            'fee_amount' => $platformFee,
            'total_amount' => $exchangedAmount,
            'net_amount' => $netAmount,
            'status' => 'completed',
        ]);

        \Log::info('Order Created Successfully', [
            'order_id' => $order->id,
            'order_details' => [
                'user_id' => $order->user_id,
                'listing_id' => $order->listing_id,
                'amount' => $order->amount,
                'from_currency' => $order->from_currency,
                'to_currency' => $order->to_currency,
                'exchange_rate' => $order->exchange_rate,
                'fee_amount' => $order->fee_amount,
                'total_amount' => $order->total_amount,
                'net_amount' => $order->net_amount,
                'status' => $order->status
            ]
        ]);

        // Debit the buyer's wallet
        \Log::info('Debiting Buyer Wallet', [
            'user_id' => $user->id,
            'amount' => $amount,
            'currency' => $fromCurrency,
            'description' => "Exchange order #{$order->id} - {$amount} {$fromCurrency} to {$toCurrency}"
        ]);

        $debitResult = $user->debit($amount, [
            'currency' => $fromCurrency,
            'description' => "Exchange order #{$order->id} - {$amount} {$fromCurrency} to {$toCurrency}",
            'metadata' => [
                'order_id' => $order->id,
                'listing_id' => $listing->id,
                'exchange_rate' => $exchangeRate,
                'fee' => $platformFee
            ]
        ]);

        \Log::info('Buyer Wallet Debited Successfully', [
            'debit_result' => $debitResult
        ]);

        // Get the seller from the listing
        $seller = $listing->user;
        $buyer = $user;

        \Log::info('Processing Seller Earning', [
            'seller_id' => $seller->id,
            'buyer_id' => $buyer->id,
            'amount_to_receive' => $netAmount,
            'currency' => $toCurrency
        ]);

        // Create earning record for seller (receives the exchanged amount in to_currency)
        $sellerEarning = Earning::create([
            'user_id' => $seller->id,
            'order_id' => $order->id,
            'currency' => $toCurrency, // Seller receives the target currency
            'amount' => $netAmount, // Amount after fees
            'fee' => $platformFee,
            'net_amount' => $netAmount,
            'type' => 'exchange_sale',
            'status' => 'available',
            'metadata' => [
                'exchange_rate' => $exchangeRate,
                'buyer_id' => $buyer->id,
                'original_amount' => $amount,
                'original_currency' => $fromCurrency,
                'completed_at' => now()->toDateTimeString()
            ]
        ]);

        \Log::info('Seller Earning Created', [
            'earning_id' => $sellerEarning->id,
            'seller_id' => $sellerEarning->user_id,
            'amount' => $sellerEarning->amount,
            'currency' => $sellerEarning->currency,
            'net_amount' => $sellerEarning->net_amount
        ]);

        \Log::info('Processing Buyer Earning', [
            'buyer_id' => $buyer->id,
            'amount_to_receive' => $amount,
            'currency' => $fromCurrency
        ]);

        // Create earning record for buyer (receives the original amount in from_currency)
        $buyerEarning = Earning::create([
            'user_id' => $buyer->id,
            'order_id' => $order->id,
            'currency' => $fromCurrency, // Buyer receives the source currency
            'amount' => $amount, // Original amount in source currency
            'fee' => 0, // Buyer doesn't pay fees on the amount they receive
            'net_amount' => $amount,
            'type' => 'exchange_purchase',
            'status' => 'available',
            'metadata' => [
                'exchange_rate' => $exchangeRate,
                'seller_id' => $seller->id,
                'exchanged_amount' => $exchangedAmount,
                'exchanged_currency' => $toCurrency,
                'completed_at' => now()->toDateTimeString()
            ]
        ]);

        \Log::info('Buyer Earning Created', [
            'earning_id' => $buyerEarning->id,
            'buyer_id' => $buyerEarning->user_id,
            'amount' => $buyerEarning->amount,
            'currency' => $buyerEarning->currency,
            'net_amount' => $buyerEarning->net_amount
        ]);

        // Update listing's remaining amount
        \Log::info('Updating Listing Amount', [
            'listing_id' => $listing->id,
            'current_amount' => $listing->amount,
            'amount_to_decrement' => $amount
        ]);

        $listing->decrement('amount', $amount);

        \Log::info('Listing Amount Updated', [
            'new_amount' => $listing->fresh()->amount
        ]);

        // If no amount left, mark listing as completed
        if ($listing->fresh()->amount <= 0) {
            \Log::info('Marking Listing as Completed', [
                'listing_id' => $listing->id,
                'final_amount' => $listing->fresh()->amount
            ]);
            $listing->update(['status' => Listing::STATUS_COMPLETED]);
            \Log::info('Listing Status Updated to Completed');
        }

        \Log::info('Committing Database Transaction');
        \DB::commit();
        \Log::info('Database Transaction Committed Successfully');

        \Log::info('=== ORDER CREATION COMPLETED SUCCESSFULLY ===', [
            'order_id' => $order->id,
            'final_status' => 'success',
            'timestamp' => now()->toDateTimeString()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully! Your exchange has been completed.',
            'order' => $order->load(['listing', 'user']),
            'seller_earning' => $sellerEarning,
            'buyer_earning' => $buyerEarning
        ], 201);

    } catch (\Exception $e) {
        \DB::rollBack();
        \Log::error('=== ORDER CREATION FAILED ===', [
            'error_message' => $e->getMessage(),
            'error_trace' => $e->getTraceAsString(),
            'timestamp' => now()->toDateTimeString()
        ]);
        return response()->json([
            'success' => false,
            'error' => 'Failed to create order. Please try again.',
            'message' => $e->getMessage()
        ], 500);
    }
}

}
