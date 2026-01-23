<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'listing_id',
        'buyer_id',
        'price',
        'total_amount',
        'status',
        'transaction_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function escrow(): HasOne
    {
        return $this->hasOne(Escrow::class);
    }

    public function fees(): HasOne
    {
        return $this->hasOne(Fee::class);
    }

    public function payout(): HasOne
    {
        return $this->hasOne(Payout::class);
    }
}
