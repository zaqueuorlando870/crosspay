<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class MobileMoneyData extends PayoutMethodData
{
    public function __construct(
        public readonly string $provider,
        public readonly string $phoneNumber,
        public readonly string $accountName,
        public readonly ?string $network = null,
    ) {
        parent::__construct(
            type: PayoutMethodType::MOBILE_MONEY,
            details: [
                'provider' => $provider,
                'phone_number' => $phoneNumber,
                'account_name' => $accountName,
                'network' => $network,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            provider: $data['provider'],
            phoneNumber: $data['phone_number'],
            accountName: $data['account_name'],
            network: $data['network'] ?? null,
        );
    }
    
    public function toArray(): array
    {
        return $this->details;
    }
    
    public static function getValidationRules(): array
    {
        return array_merge(parent::getValidationRules(), [
            'provider' => ['required', 'string', 'max:100'],
            'phone_number' => ['required', 'string', 'max:20', 'regex:/^\+?[1-9]\d{1,14}$/'], // E.164 format
            'account_name' => ['required', 'string', 'max:255'],
            'network' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
