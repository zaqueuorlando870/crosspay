<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Earning extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'order_id',
        'currency',
        'amount',
        'fee',
        'net_amount',
        'type',
        'status',
        'metadata'
    ];

    protected $casts = [
        'amount' => 'decimal:8',
        'fee' => 'decimal:8',
        'net_amount' => 'decimal:8',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function markAsProcessing()
    {
        return $this->update(['status' => 'processing']);
    }

    public function markAsPaid()
    {
        return $this->update(['status' => 'paid']);
    }
}