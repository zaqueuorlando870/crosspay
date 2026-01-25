<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Listing extends Model
{
    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_PAUSED = 'paused';
    const STATUS_COMPLETED = 'completed';
    const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'user_id',
        'from_currency',
        'to_currency',
        'currency',
        'amount',
        'fee',
        'exchange_rate',
        'final_rate',
        'total_amount',
        'profit',
        'status',
        'min_amount',
        'max_amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'final_rate' => 'decimal:6',
        'total_amount' => 'decimal:2',
        'profit' => 'decimal:2',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
    ];

    /**
     * Scope a query to only include active listings.
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', self::STATUS_ACTIVE)
              ->where('amount', '>', 0);
    }

    /**
     * Check if the listing is active.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->amount > 0;
    }

    /**
     * Get the available amount for this listing.
     */
    public function getAvailableAmountAttribute(): float
    {
        return (float) $this->amount;
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}