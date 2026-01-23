<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'amount',
        'status',
        'is_cross_border',
        'conversion_rate',
        'converted_currency',
        'payout_fee',
        'linked_account',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'conversion_rate' => 'decimal:4',
        'payout_fee' => 'decimal:2',
        'is_cross_border' => 'boolean',
        'processed_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
