<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Inertia\Inertia;

class MarketplaceController extends Controller
{
    public function index()
    {
        $listings = Listing::where('status', 'active')
            ->with('seller')
            ->paginate(20);

        return Inertia::render('marketplace', [
            'listings' => $listings,
        ]);
    }

    public function show(Listing $listing)
    {
        return Inertia::render('listing-detail', [
            'listing' => $listing->load('seller', 'orders'),
        ]);
    }
}
