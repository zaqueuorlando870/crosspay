<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;

class TransactionController extends Controller
{
    /**
     * Get recent transactions for the authenticated user
     */
    public function getRecentTransactions()
    {
        $user = auth()->user();
        
        $transactions = $user->transactions()
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'reference' => $transaction->reference,
                    'amount' => (float) $transaction->amount,
                    'net_amount' => (float) $transaction->net_amount,
                    'currency' => $transaction->currency,
                    'type' => $transaction->type,
                    'status' => $transaction->status,
                    'created_at' => $transaction->created_at->toISOString(),
                    'description' => $transaction->metadata['description'] ?? 'Deposit',
                ];
            });

        return response()->json($transactions);
    }

    /**
     * Get transaction history with pagination
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        
        $transactions = auth()->user()->transactions()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->through(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'reference' => $transaction->reference,
                    'amount' => (float) $transaction->amount,
                    'net_amount' => (float) $transaction->net_amount,
                    'currency' => $transaction->currency,
                    'type' => $transaction->type,
                    'status' => $transaction->status,
                    'created_at' => $transaction->created_at->toISOString(),
                    'description' => $transaction->metadata['description'] ?? 'Deposit',
                ];
            });

        return response()->json($transactions);
    }
}
