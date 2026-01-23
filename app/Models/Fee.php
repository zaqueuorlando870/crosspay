<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fee extends Model
{
    protected $fillable = [
        'order_id',
        'listing_fee',
        'seller_commission',
        'buyer_fee',
        'payout_fee',
        'total_fees',
    ];

    protected $casts = [
        'listing_fee' => 'decimal:2',
        'seller_commission' => 'decimal:2',
        'buyer_fee' => 'decimal:2',
        'payout_fee' => 'decimal:2',
        'total_fees' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
