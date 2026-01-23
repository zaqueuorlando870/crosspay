<?php

use App\Http\Controllers\WalletController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\TransactionController;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Public marketplace
Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
Route::get('/marketplace/{listing}', [MarketplaceController::class, 'show'])->name('marketplace.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $balance = LaravelPayPocket::checkBalance(auth()->user());

        return Inertia::render('dashboard', [
            'balance' => $balance,
        ]);
    })->name('dashboard');

    // Selling currency
    Route::get('/selling', function () {
        $balance = LaravelPayPocket::checkBalance(auth()->user());
        
        return Inertia::render('selling', [
            'balance' => $balance,
        ]);
    })->name('selling');

    // Wallet operations
    Route::get('/wallet/deposit', function () {
        return Inertia::render('deposit', [
            'balance' => LaravelPayPocket::checkBalance(auth()->user())
        ]);
    })->name('wallet.deposit');

    // API Routes for transactions
    Route::middleware('auth')->group(function () {
        Route::get('/api/transactions/recent', [TransactionController::class, 'getRecentTransactions']);
        Route::get('/api/transactions', [TransactionController::class, 'index']);
    });

    Route::post('/wallet/deposit', [WalletController::class, 'deposit'])->name('wallet.deposit.store');
    Route::post('/wallet/pay', [WalletController::class, 'pay'])->name('wallet.pay');

    // Listings
    Route::get('/listings/create', [ListingController::class, 'create'])->name('listings.create');
    Route::post('/listings', [ListingController::class, 'store'])->name('listings.store');
    Route::get('/listings/{listing}/edit', [ListingController::class, 'edit'])->name('listings.edit');
    Route::put('/listings/{listing}', [ListingController::class, 'update'])->name('listings.update');
    Route::delete('/listings/{listing}', [ListingController::class, 'destroy'])->name('listings.destroy');

    // Orders
    Route::get('/listings/{listing}/order/create', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
    Route::post('/orders/{order}/complete', [OrderController::class, 'completeOrder'])->name('orders.complete');

    // Payouts
    // Earnings and Payouts 
    // Main earnings dashboard
    Route::get('/earnings/overview', [PayoutController::class, 'index'])->name('earnings.overview');
    
    // Payout methods
    Route::post('/payouts/methods', [PayoutController::class, 'storeMethod'])->name('payouts.methods.store');
    
    // Payout requests
    Route::post('/payouts/request', [PayoutController::class, 'requestPayout'])->name('payouts.request');
    
    // Order-specific payouts (existing routes)
    Route::get('/payouts/orders/{order}/payout', [PayoutController::class, 'create'])->name('payouts.create');
    Route::post('/payouts', [PayoutController::class, 'store'])->name('payouts.store');
    Route::get('/payouts/{payout}/confirm', [PayoutController::class, 'confirmation'])->name('payouts.confirmation');
    Route::post('/payouts/{payout}/process', [PayoutController::class, 'process'])->name('payouts.process');
    
    // Payout history
    Route::get('/payouts', [PayoutController::class, 'payouts'])->name('payouts.index');
  
    // PayPal routes
    Route::post('/payment/paypal/create', [App\Http\Controllers\Payment\PayPalController::class, 'create'])->name('payment.paypal.create');
    Route::get('/payment/paypal/success', [App\Http\Controllers\Payment\PayPalController::class, 'success'])->name('payment.paypal.success');
    Route::get('/payment/paypal/cancel', [App\Http\Controllers\Payment\PayPalController::class, 'cancel'])->name('payment.paypal.cancel');
    
    // Paystack routes
    Route::post('/payment/paystack/initialize', [App\Http\Controllers\Payment\PaystackController::class, 'initialize'])->name('payment.paystack.initialize');
    Route::get('/payment/paystack/callback', [App\Http\Controllers\Payment\PaystackController::class, 'callback'])->name('payment.paystack.callback');
});

require __DIR__.'/settings.php';
