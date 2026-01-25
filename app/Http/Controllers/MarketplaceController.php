<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Inertia\Inertia;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    public function index(Request $request)
    {
        $listings = Listing::where('status', 'active')
            ->with('seller')
            ->get()
            ->map(function($listing) {
                $currencyCode = $listing->from_currency; // Changed from currency to from_currency
                
                return [
                    'id' => $listing->id,
                    'code' => $currencyCode,
                    'name' => $this->getCurrencyName($currencyCode),
                    'baseRate' => (float)$listing->exchange_rate,
                    'rate' => (float)$listing->final_rate,
                    'change24h' => 0,
                    'high24h' => (float)$listing->final_rate * 1.02,
                    'low24h' => (float)$listing->final_rate * 0.98,
                    'lastUpdated' => $listing->updated_at->toISOString(),
                    'flag' => $this->getCurrencyFlag($currencyCode),
                    'minAmount' => 10,
                    'maxAmount' => 10000,
                    'fee' => (float)$listing->fee,
                    'originalData' => $listing
                ];
            });

        return Inertia::render('marketplace', [
            'listings' => $listings,
            'currencyGroups' => [
                ['name' => 'MAJORS', 'icon' => 'BarChart3'],
                ['name' => 'AFRICAN', 'icon' => 'PieChart']
            ],
            'tabs' => ['All Currencies', 'Favorites', 'Gainers', 'Losers']
        ]);
    }

    public function show(Listing $listing)
    {
        return Inertia::render('listing-detail', [
            'listing' => $listing->load('seller', 'orders'),
        ]);
    }

    private function getCurrencyName($code)
    {
        $currencies = [
            'USD' => 'US Dollar',
            'EUR' => 'Euro',
            'ZAR' => 'South African Rand',
            'AOA' => 'Angolan Kwanza',
            'NAD' => 'Namibian Dollar'
        ];
        
        return $currencies[$code] ?? $code;
    }

    private function getCurrencyFlag($code)
    {
        $flags = [
            'USD' => '🇺🇸',
            'EUR' => '🇪🇺',
            'ZAR' => '🇿🇦',
            'AOA' => '🇦🇴',
            'NAD' => '🇳🇦'
        ];
        
        return $flags[$code] ?? '🏳️';
    }
}