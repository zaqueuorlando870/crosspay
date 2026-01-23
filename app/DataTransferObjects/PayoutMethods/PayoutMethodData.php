<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

abstract class PayoutMethodData
{
    public function __construct(
        public readonly PayoutMethodType $type,
        public readonly array $details
    ) {}
    
    abstract public static function fromArray(array $data): static;
    
    abstract public function toArray(): array;
    
    public function getValidationRules(): array
    {
        return [
            'type' => ['required', 'string', 'in:' . implode(',', PayoutMethodType::values())],
        ];
    }
}
