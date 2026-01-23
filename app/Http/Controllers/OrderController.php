<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Escrow;
use App\Models\Fee;
use App\Models\Payout;
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
        ]);

        $listing = Listing::findOrFail($validated['listing_id']);
        $buyer = auth()->user();

        // Calculate fees
        $listingFee = $listing->listing_fee;
        $buyerFee = $listing->price * 0.02; // 2% buyer fee
        $sellerCommission = $listing->price * 0.05; // 5% seller commission
        $totalFees = $listingFee + $buyerFee + $sellerCommission;
        $totalAmount = $listing->price + $buyerFee;

        // Create order
        $order = Order::create([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'price' => $listing->price,
            'total_amount' => $totalAmount,
            'status' => 'pending',
            'transaction_id' => 'TXN-' . uniqid(),
        ]);

        // Debit buyer's wallet
        $buyer->debit($totalAmount, [
            'description' => "Purchase: {$listing->title}",
            'reference' => "ORDER-{$order->id}",
        ]);

        // Create escrow
        Escrow::create([
            'order_id' => $order->id,
            'amount' => $listing->price,
            'status' => 'held',
            'held_at' => now(),
        ]);

        // Record fees
        Fee::create([
            'order_id' => $order->id,
            'listing_fee' => $listingFee,
            'seller_commission' => $sellerCommission,
            'buyer_fee' => $buyerFee,
            'payout_fee' => 0, // Will be calculated at payout
            'total_fees' => $totalFees,
        ]);

        // Update listing quantity
        $listing->decrement('quantity');
        if ($listing->quantity <= 0) {
            $listing->update(['status' => 'sold']);
        }

        return redirect()->route('order-detail', $order)->with('success', 'Order created successfully!');
    }

    public function completeOrder(Order $order)
    {
        // Only seller can complete
        if ($order->listing->user_id !== auth()->id()) {
            abort(403);
        }

        $order->update(['status' => 'completed']);
        $escrow = $order->escrow;
        $escrow->update(['status' => 'released', 'released_at' => now()]);

        // Credit seller (minus commission)
        $seller = $order->listing->seller;
        $fees = $order->fees;
        $amountToSeller = $escrow->amount - $fees->seller_commission;

        $seller->credit($amountToSeller, [
            'description' => "Sale: {$order->listing->title}",
            'reference' => "ORDER-{$order->id}",
        ]);

        return back()->with('success', 'Order completed and funds released!');
    }
}
