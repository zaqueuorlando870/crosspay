<?php

namespace App\DataTransferObjects\PayoutMethods;

use App\Enums\PayoutMethodType;

class BankTransferData extends PayoutMethodData
{
    public function __construct(
        public readonly string $accountHolderName,
        public readonly string $accountNumber,
        public readonly string $bankName,
        public readonly string $iban,
        public readonly ?string $swiftCode = null,
        public readonly ?string $branchCode = null,
    ) {
        parent::__construct(
            type: PayoutMethodType::BANK_TRANSFER,
            details: [
                'account_holder_name' => $accountHolderName,
                'account_number' => $accountNumber,
                'bank_name' => $bankName,
                'iban' => $iban,
                'swift_code' => $swiftCode,
                'branch_code' => $branchCode,
            ]
        );
    }
    
    public static function fromArray(array $data): static
    {
        return new self(
            accountHolderName: $data['account_holder_name'],
            accountNumber: $data['account_number'],
            bankName: $data['bank_name'],
            iban: $data['iban'],
            swiftCode: $data['swift_code'] ?? null,
            branchCode: $data['branch_code'] ?? null,
        );
    }
    
    public function toArray(): array
    {
        return $this->details;
    }
    
    public static function getValidationRules(): array
    {
        return array_merge(parent::getValidationRules(), [
            'account_holder_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:50'],
            'bank_name' => ['required', 'string', 'max:255'],
            'iban' => ['required', 'string', 'max:34', 'regex:/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i'],
            'swift_code' => ['nullable', 'string', 'max:50'],
            'branch_code' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
