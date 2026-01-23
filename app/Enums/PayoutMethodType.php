<?php

namespace App\Enums;

enum PayoutMethodType: string
{
    case BANK_TRANSFER = 'bank_transfer';
    case MOBILE_MONEY = 'mobile_money';
    case PAYPAL = 'paypal';
    case PAYSHAP = 'payshap';
    case MULTICAIXA = 'multicaixa';
    case EWALLET = 'ewallet';
    
    public function label(): string
    {
        return match($this) {
            self::BANK_TRANSFER => 'Bank Transfer',
            self::MOBILE_MONEY => 'Mobile Money',
            self::PAYPAL => 'PayPal',
            self::PAYSHAP => 'PayShap',
            self::MULTICAIXA => 'Multicaixa',
            self::EWALLET => 'E-Wallet',
        };
    }
    
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
