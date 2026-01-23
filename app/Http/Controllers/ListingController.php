<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ListingController extends Controller
{
    public function create()
    {
        return Inertia::render('create-listing');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'currency' => 'required|string|size:3',
            'amount' => 'required|numeric|min:0.01',
            'fee' => 'required|numeric|min:0',
            'exchange_rate' => 'required|numeric|min:0',
            'final_rate' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'profit' => 'required|numeric|min:0',
        ]);

        $listing = $request->user()->listings()->create($validated);
        $user = auth()->user();
        $user->pay($validated['amount']);
        $transaction = $request->user()->transactions()->create([
            'wallet_id' => auth()->user()->id,
            'amount' => -$validated['amount'],
            'net_amount' => -$validated['amount'] * (1 - ($validated['fee'] / 100)),
            'platform_fee' => $validated['amount'] * ($validated['fee'] / 100) * 0.5,
            'platform_fee_percentage' => $validated['fee'] * 0.5,
            'seller_fee' => $validated['amount'] * ($validated['fee'] / 100) * 0.5,
            'seller_fee_percentage' => $validated['fee'] * 0.5,
            'total_fees' => $validated['amount'] * ($validated['fee'] / 100),
            'currency' => $validated['currency'],
            'type' => 'debit',
            'status' => 'completed',
            'listing_id' => $listing->id,
            'reference' => 'TXN' . time() . $request->user()->id,
            'description' => 'Purchase of ' . $validated['amount'] . ' ' . $validated['currency'] . ' for ' . $listing->title,
            'metadata' => [
                'exchange_rate' => $validated['exchange_rate'],
                'final_rate' => $validated['final_rate'],
                'total_amount' => $validated['total_amount'],
                'profit' => $validated['profit']
            ]
        ]);

        return back()->with([
            'success' => 'Listing created successfully',
            'listing' => $listing
        ]);
    }

    public function edit(Listing $listing)
    {
        $this->authorize('update', $listing);

        return Inertia::render('edit-listing', [
            'listing' => $listing,
        ]);
    }

    public function update(Request $request, Listing $listing)
    {
        $this->authorize('update', $listing);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0.01',
            'quantity' => 'required|integer|min:1',
            'category' => 'nullable|string',
        ]);

        $listing->update($validated);

        return redirect()->route('marketplace.show', $listing)->with('success', 'Listing updated successfully!');
    }

    public function destroy(Listing $listing)
    {
        $this->authorize('delete', $listing);

        $listing->update(['status' => 'inactive']);

        return redirect()->route('seller-dashboard')->with('success', 'Listing deactivated successfully!');
    }
}
