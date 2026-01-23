<?php

namespace App\Models;

use App\DataTransferObjects\PayoutMethods\BankTransferData;
use App\DataTransferObjects\PayoutMethods\MobileMoneyData;
use App\DataTransferObjects\PayoutMethods\PayPalData;
use App\DataTransferObjects\PayoutMethods\PayShapData;
use App\DataTransferObjects\PayoutMethods\MulticaixaData;
use App\DataTransferObjects\PayoutMethods\EWalletData;
use App\DataTransferObjects\PayoutMethods\PayoutMethodData;
use App\Enums\PayoutMethodType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class PayoutMethod extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'details',
        'is_default',
    ];

    protected $casts = [
        'details' => 'array',
        'is_default' => 'boolean',
        'type' => PayoutMethodType::class,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDataObject(): PayoutMethodData
    {
        return match ($this->type) {
            PayoutMethodType::BANK_TRANSFER => BankTransferData::fromArray($this->details),
            PayoutMethodType::MOBILE_MONEY => MobileMoneyData::fromArray($this->details),
            PayoutMethodType::PAYPAL => PayPalData::fromArray($this->details),
            PayoutMethodType::PAYSHAP => PayShapData::fromArray($this->details),
            PayoutMethodType::MULTICAIXA => MulticaixaData::fromArray($this->details),
            PayoutMethodType::EWALLET => EWalletData::fromArray($this->details),
            default => throw new \InvalidArgumentException("Unsupported payout method type: {$this->type->value}"),
        };
    }

    public static function createFromData(PayoutMethodData $data, int $userId, bool $isDefault = false): self
    {
        return DB::transaction(function () use ($data, $userId, $isDefault) {
            // If this is being set as default, unset any existing default for this user
            if ($isDefault) {
                static::where('user_id', $userId)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            return static::create([
                'user_id' => $userId,
                'type' => $data->type,
                'details' => $data->toArray(),
                'is_default' => $isDefault,
            ]);
        });
    }

    public function updateData(PayoutMethodData $data, ?bool $isDefault = null): bool
    {
        return DB::transaction(function () use ($data, $isDefault) {
            // If this is being set as default, unset any existing default for this user
            if ($isDefault === true) {
                static::where('user_id', $this->user_id)
                    ->where('id', '!=', $this->id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $this->details = $data->toArray();
            
            if ($isDefault !== null) {
                $this->is_default = $isDefault;
            }

            return $this->save();
        });
    }

    public function setAsDefault(): bool
    {
        return $this->updateData($this->getDataObject(), true);
    }
}
