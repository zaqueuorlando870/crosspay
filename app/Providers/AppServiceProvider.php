<?php

namespace App\Providers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\App;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\CurrencyMarketService::class, function ($app) {
            return new \App\Services\CurrencyMarketService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set the application locale based on user preference
        $this->app->setLocale(
            $this->app->request->getPreferredLanguage(config('app.available_locales'))
        );

        // Share the user's currency with all views
        View::composer('*', function ($view) {
            $currency = 'USD'; // Default currency
            
            if (Auth::check()) {
                $currency = Auth::user()->currency ?? $currency;
            } elseif (session()->has('user_currency')) {
                $currency = session('user_currency');
            }
            
            $view->with('userCurrency', $currency);
        });
    }
}
