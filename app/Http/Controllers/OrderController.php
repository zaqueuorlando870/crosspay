<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Escrow;
use App\Models\Fee;
use App\Models\Payout;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function create(Listing $listing)
    {
        return Inertia::render('order-detail', [
            'listing' => $listing->load('seller'),
        ]);
    }

public function store(Request $request)
{
    $validated = $request->validate([
        'listing_id' => 'required|exists:listings,id',
        'amount' => 'required|numeric|min:0.01',
        'from_currency' => 'required|string|size:3',
        'to_currency' => 'required|string|size:3',
    ]);

    $listing = Listing::findOrFail($validated['listing_id']);
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
        $listing->update($updateData);
    }


    \Log::info('Currency Check', [
        'listing_currencies' => "{$listing->from_currency}/{$listing->to_currency}",
        'request_currencies' => "{$fromCurrency}/{$toCurrency}",
        'listing_id' => $listing->id
    ]); 


    // Validate currencies match the listing
    if ($fromCurrency !== $listing->from_currency || $toCurrency !== $listing->to_currency) {
        return response()->json([
            'success' => false,
            'message' => 'Currency pair does not match the selected listing.'
        ], 422);
    }

    // Check if listing is active
    if (!$listing->isActive()) {
        return response()->json([
            'success' => false,
            'message' => 'This listing is no longer available.'
        ], 422);
    }

    // Validate amount
    if ($amount < $listing->min_amount) {
        return response()->json([
            'success' => false,
            'message' => "Minimum amount is " . number_format($listing->min_amount, 2) . " {$listing->from_currency}."
        ], 422);
    }

    if ($amount > $listing->available_amount) {
        return response()->json([
            'success' => false,
            'message' => "Maximum available amount is " . number_format($listing->available_amount, 2) . " {$listing->from_currency}."
        ], 422);
    }

    // Check if user has sufficient balance
    if ($user->balance($fromCurrency) < $amount) {
        return response()->json([
            'success' => false,
            'message' => "Insufficient balance. You need " . number_format($amount, 2) . " {$fromCurrency} to complete this transaction."
        ], 422);
    }

    // Start database transaction
    \DB::beginTransaction();
    try {
        // Calculate exchange and fees
        $exchangeRate = $listing->exchange_rate;
        $exchangedAmount = $amount * $exchangeRate;
        $platformFee = $exchangedAmount * ($listing->fee / 100);
        $netAmount = $exchangedAmount - $platformFee;

        // Create the order
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
            'status' => 'pending',
        ]);

        // Debit the buyer's wallet
        $user->debit($amount, [
            'currency' => $fromCurrency,
            'description' => "Exchange order #{$order->id} - {$amount} {$fromCurrency} to {$toCurrency}",
            'metadata' => [
                'order_id' => $order->id,
                'listing_id' => $listing->id,
                'exchange_rate' => $exchangeRate,
                'fee' => $platformFee
            ]
        ]);

        // Get the seller from the listing
        $seller = $listing->user;
        $buyer = $user;

        // Create earning record for seller (receives the exchanged amount in to_currency)
        Earning::create([
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

        // Create earning record for buyer (receives the original amount in from_currency)
        Earning::create([
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

        // Update listing's remaining amount
        $listing->decrement('amount', $amount);

        // If no amount left, mark listing as completed
        if ($listing->amount <= 0) {
            $listing->update(['status' => Listing::STATUS_COMPLETED]);
        }

        \DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully!',
            'redirect' => route('orders', $order->id)
        ]);

    } catch (\Exception $e) {
        \DB::rollBack();
        \Log::error('Order creation failed: ' . $e->getMessage());
        return Inertia::render('order-detail', [
            'error' => 'Failed to create order. Please try again.'
        ])->with('error', 'Failed to create order. Please try again.');
    }
}

}
