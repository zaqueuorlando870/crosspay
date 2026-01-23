<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class MulticaixaData extends PayoutMethodData
{
    public function __construct(
        public readonly string $phoneNumber,
        public readonly string $accountName,
        public readonly string $network,
    ) {
        parent::__construct(
            type: PayoutMethodType::MULTICAIXA,
            details: [
                'phone_number' => $phoneNumber,
                'account_name' => $accountName,
                'network' => $network,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            phoneNumber: $data['phone_number'],
            accountName: $data['account_name'],
            network: $data['network'],
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
            'network' => ['required', 'string', 'in:multicaixa,multicaixa_express,multicaixa_instantaneo'],
        ]);
    }
}
