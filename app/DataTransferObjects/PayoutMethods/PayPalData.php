<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class PayPalData extends PayoutMethodData
{
    public function __construct(
        public readonly string $email,
        public readonly string $accountName,
    ) {
        parent::__construct(
            type: PayoutMethodType::PAYPAL,
            details: [
                'email' => $email,
                'account_name' => $accountName,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            email: $data['email'],
            accountName: $data['account_name'],
        );
    }
    
    public function toArray(): array
    {
        return $this->details;
    }
    
    public static function getValidationRules(): array
    {
        return array_merge(parent::getValidationRules(), [
            'email' => ['required', 'email', 'max:255'],
            'account_name' => ['required', 'string', 'max:255'],
        ]);
    }
}
