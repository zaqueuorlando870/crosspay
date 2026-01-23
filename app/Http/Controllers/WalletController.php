<?php

namespace App\Http\Controllers;

use HPWebdeveloper\LaravelPayPocket\Exceptions\InsufficientBalanceException;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    /**
     * Deposit funds into user's wallet
     */
    public function deposit(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'wallet_id' => 'required|exists:wallets,id',
            'type' => 'required|string|in:bank,crypto,paypal,paystack,other',
            'currency' => 'sometimes|string|size:3',
            'method' => 'sometimes|string'
        ]);

        $user = auth()->user();
        $amount = $request->input('amount');
        $type = $request->input('type');

        try {
            // Create deposit record
            LaravelPayPocket::deposit($user, $type, $amount);

            $balance = LaravelPayPocket::checkBalance($user);

            return response()->json([
                'success' => true,
                'message' => "Successfully deposited " . number_format($amount, 2) . " to $type. New balance: " . number_format($balance, 2),
                'balance' => $balance
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to process deposit: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process payment from user's wallets
     */
    public function pay(Request $request)
    {
        $user = auth()->user();
        $orderValue = 100; // Fixed amount for demo

        try {
            LaravelPayPocket::pay($user, $orderValue);

            $balance = LaravelPayPocket::checkBalance($user);

            return back()->with('status', "Successfully paid $$orderValue. Remaining balance: $$balance");
        } catch (InsufficientBalanceException $e) {
            return back()->with('status', $e->getMessage());
        } catch (\Exception $e) {
            return back()->with('status', 'Error processing the payment: ' . $e->getMessage());
        }
    }
}
