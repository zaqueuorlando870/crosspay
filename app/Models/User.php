<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use HPWebdeveloper\LaravelPayPocket\Interfaces\WalletOperations;
use HPWebdeveloper\LaravelPayPocket\Traits\ManagesWallet;
use HPWebdeveloper\LaravelPayPocket\Facades\LaravelPayPocket;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use HPWebdeveloper\LaravelPayPocket\Enums\WalletEnums;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable implements WalletOperations
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;
    use ManagesWallet;

    /**
     * Get the payout methods for the user.
     */
    public function payoutMethods(): HasMany
    {
        return $this->hasMany(PayoutMethod::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'currency',
    ];

    protected $attributes = [
        'currency' => 'USD',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    // Marketplace relationships
    public function listings()
    {
        return $this->hasMany(Listing::class);
    }

    public function purchases()
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function payouts()
    {
        return $this->hasMany(Payout::class);
    }

    /**
     * Get all transactions for the user.
     */
    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function earnings()
    {
        return $this->hasMany(Earning::class);
    }

    public function availableEarnings()
    {
        return $this->earnings()->available();
    }

    public function totalEarnings($currency = null)
    {
        $query = $this->earnings()->available();
        
        if ($currency) {
            $query->where('currency', $currency);
        }
        
        return $query->sum('net_amount');
    }



}
