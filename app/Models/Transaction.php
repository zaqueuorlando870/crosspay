<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'wallet_id',
        'counterparty_id',
        'listing_id',
        'amount',
        'net_amount',
        'platform_fee',
        'platform_fee_percentage',
        'seller_fee',
        'seller_fee_percentage',
        'total_fees',
        'currency',
        'type',
        'status',
        'reference',
        'metadata'
    ];

    protected $casts = [
        'wallet_id' => 'string',
        'amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'platform_fee_percentage' => 'decimal:2',
        'seller_fee' => 'decimal:2',
        'seller_fee_percentage' => 'decimal:2',
        'total_fees' => 'decimal:2',
        'metadata' => 'array'
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function counterparty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counterparty_id');
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    // Helper methods
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}