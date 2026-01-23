<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class PayShapData extends PayoutMethodData
{
    public function __construct(
        public readonly string $phoneNumber,
        public readonly string $accountName,
        public readonly ?string $provider = null,
    ) {
        parent::__construct(
            type: PayoutMethodType::PAYSHAP,
            details: [
                'phone_number' => $phoneNumber,
                'account_name' => $accountName,
                'provider' => $provider,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            phoneNumber: $data['phone_number'],
            accountName: $data['account_name'],
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
            'phone_number' => ['required', 'string', 'max:20'],
            'account_name' => ['required', 'string', 'max:255'],
            'provider' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
