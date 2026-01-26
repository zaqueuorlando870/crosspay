<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Services\CurrencyMarketService;
use Inertia\Inertia;

class MarketplaceController extends Controller
{
    protected $currencyMarketService;

    public function __construct(CurrencyMarketService $currencyMarketService)
    {
        $this->currencyMarketService = $currencyMarketService;
    }

    public function index()
    {
        $listings = Listing::where('status', 'active')
            ->with('seller')
            ->get()
            ->map(function($listing) {
                $currencyCode = $listing->from_currency;
                
                // Get real-time market data with fallback to listing's exchange rate
                $marketData = $this->currencyMarketService->get24hStats(
                    'USD', 
                    $currencyCode,
                    (float)$listing->exchange_rate
                );
                
                return [
                    'id' => $listing->id,
                    'code' => $currencyCode,
                    'name' => $this->getCurrencyName($currencyCode),
                    'baseRate' => $marketData['current_rate'] ?? (float)$listing->exchange_rate,
                    'rate' => (float)$listing->final_rate,
                    'change24h' => $marketData['change24h'] ?? 0,
                    'high24h' => $marketData['high24h'] ?? (float)$listing->final_rate * 1.02,
                    'low24h' => $marketData['low24h'] ?? (float)$listing->final_rate * 0.98,
                    'lastUpdated' => now()->toISOString(),
                    'flag' => $this->getCurrencyFlag($currencyCode),
                    'amount' => $listing->amount,
                    'from_currency' => $listing->from_currency,
                    'to_currency' => $listing->to_currency,
                    'total_amount' => $listing->total_amount,
                    'minAmount' => $listing->min_amount ?? 10,
                    'maxAmount' => $listing->max_amount ?? 10000,
                    'fee' => (float)$listing->fee,
                    'originalData' => $listing,
                    'marketData' => $marketData, // For debugging
                    'seller' => [
                        'id' => $listing->seller->id,
                        'name' => $listing->seller->name,
                        'email' => $listing->seller->email,
                        'created_at' => $listing->seller->created_at,
                    ]
                ];
            });

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

    /**
     * Get the full name of a currency from its code
     *
     * @param string $currencyCode The 3-letter currency code (e.g., 'USD', 'EUR')
     * @return string The full name of the currency or the code itself if not found
     */
    protected function getCurrencyName(string $currencyCode): string
    {
        $currencies = [
            'AOA' => 'Angolan Kwanza',
            'USD' => 'US Dollar',
            'EUR' => 'Euro',
            'NAD' => 'Namibian Dollar',
            'ZAR' => 'South African Rand',
        ];

        return $currencies[strtoupper($currencyCode)] ?? $currencyCode;
    }

    /**
     * Get the flag emoji for a given currency code
     *
     * @param string $currencyCode The 3-letter currency code (e.g., 'USD', 'EUR')
     * @return string The flag emoji or empty string if not found
     */
    protected function getCurrencyFlag(string $currencyCode): string
    {
        $countryFlags = [
            'AOA' => '🇦🇴', // Angolan Kwanza
            'USD' => '🇺🇸', // US Dollar
            'EUR' => '🇪🇺', // Euro
            'NAD' => '🇳🇦', // Namibian Dollar
            'ZAR' => '🇿🇦', // South African Rand
        ];

        return $countryFlags[strtoupper($currencyCode)] ?? '';
    }
}