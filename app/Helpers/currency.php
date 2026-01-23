<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;

if (! function_exists('format_currency')) {
    /**
     * Format a number as a currency string based on the user's preferred currency.
     *
     * @param  float  $amount
     * @param  string|null  $currency  Optional currency code to override user's preference
     * @return string
     */
    function format_currency($amount, $currency = null)
    {
        $currency = $currency ?? (Auth::check() ? Auth::user()->currency : 'USD');
        
        // Format the amount based on the currency
        $formatter = new NumberFormatter(app()->getLocale(), NumberFormatter::CURRENCY);
        $formatter->setTextAttribute(NumberFormatter::CURRENCY_CODE, $currency);
        
        return $formatter->formatCurrency($amount, $currency);
    }
}

if (! function_exists('get_user_currency')) {
    /**
     * Get the user's preferred currency.
     *
     * @return string
     */
    function get_user_currency()
    {
        return Auth::check() ? Auth::user()->currency : 'USD';
    }
}
