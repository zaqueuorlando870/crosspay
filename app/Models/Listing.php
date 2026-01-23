<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    protected $fillable = [
        'user_id',
        'currency',
        'amount',
        'fee',
        'exchange_rate',
        'final_rate',
        'total_amount',
        'profit',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fee' => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'final_rate' => 'decimal:6',
        'total_amount' => 'decimal:2',
        'profit' => 'decimal:2',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
