<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class EWalletData extends PayoutMethodData
{
    public function __construct(
        public readonly string $walletAddress,
        public readonly string $walletType,
        public readonly ?string $provider = null,
    ) {
        parent::__construct(
            type: PayoutMethodType::EWALLET,
            details: [
                'wallet_address' => $walletAddress,
                'wallet_type' => $walletType,
                'provider' => $provider,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            walletAddress: $data['wallet_address'],
            walletType: $data['wallet_type'],
            provider: $data['provider'] ?? null,
        );
    }
    
    public function toArray(): array
    {
        return $this->details;
    }
    
    public static function getValidationRules(): array
    {
        return array_merge(parent::getValidationRules(), [
            'wallet_address' => ['required', 'string', 'max:255'],
            'wallet_type' => ['required', 'string', 'in:crypto,digital_wallet,other'],
            'provider' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
