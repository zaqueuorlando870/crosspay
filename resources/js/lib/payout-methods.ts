export type PayoutMethodType = 
  | 'bank_transfer' 
  | 'mobile_money' 
  | 'paypal' 
  | 'payshap' 
  | 'multicaixa' 
  | 'ewallet';

export interface PayoutMethodDetails {
  // Common fields
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  branch_code?: string;
  swift_code?: string;
  iban?: string;
  phone_number?: string;
  email?: string;
  provider?: string;
  wallet_address?: string;
  // Add other possible fields as needed
  [key: string]: string | number | boolean | undefined;
}

export interface PayoutMethod {
  id: string;
  type: PayoutMethodType;
  details: PayoutMethodDetails;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const getPayoutMethodDisplayName = (type: PayoutMethodType): string => {
  const displayNames: Record<PayoutMethodType, string> = {
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    paypal: 'PayPal',
    payshap: 'PayShap',
    multicaixa: 'Multicaixa',
    ewallet: 'E-Wallet',
  };
  return displayNames[type] || type;
};

export const getPayoutMethodDetails = (method: PayoutMethod): string => {
  const { type, details } = method;
  
  switch (type) {
    case 'paypal':
      return details.email || '';
    case 'bank_transfer':
      return `${details.bank_name || ''} ••••${details.account_number?.slice(-4) || ''}`;
    case 'mobile_money':
      return `${details.provider || 'Mobile Money'} ••••${details.phone_number?.slice(-4) || ''}`;
    case 'payshap':
      return details.phone_number || details.account_number || '';
    case 'multicaixa':
      return `${details.network || 'Multicaixa'} ••••${details.phone_number?.slice(-4) || ''}`;
    case 'ewallet':
      return details.wallet_address || details.email || details.phone_number || '';
    default:
      return '';
  }
};

export const getPayoutMethodIcon = (type: PayoutMethodType): string => {
  const icons: Record<PayoutMethodType, string> = {
    bank_transfer: 'Banknote',
    mobile_money: 'Smartphone',
    paypal: 'CreditCard',
    payshap: 'Smartphone',
    multicaixa: 'Wallet',
    ewallet: 'Wallet',
  };
  return icons[type] || 'CreditCard';
};
