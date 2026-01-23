import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type Errors } from '@inertiajs/core';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency as baseFormatCurrency, type Currency as UtilsCurrency } from '@/lib/utils';
import { Wallet, Plus, Banknote, X, MapPin, ArrowLeft, Loader2, Smartphone, CreditCard, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';


const earningsBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Earnings',
        href: '/earnings',
    },
];

type TransactionType = 'debit' | 'referral' | 'bonus';

// Define the supported country currencies
type CountryCurrency = 'AOA' | 'NAD' | 'ZAR';

// Extend the Currency type to include all possible currencies
type Currency = CountryCurrency | 'USD' | 'EUR' | 'GBP';

// Create a type guard for CountryCurrency
const isCountryCurrency = (currency: string): currency is CountryCurrency => {
  return ['AOA', 'NAD', 'ZAR'].includes(currency);
};


// Wrapper function to ensure type safety with formatCurrency
const formatCurrency = (amount: number, currencyCode: Currency, options: { showPlus?: boolean } = {}) => {
  // Ensure the currency code is a valid Currency type
  const validCurrency = (['USD', 'AOA', 'EUR', 'GBP', 'ZAR'] as const).includes(currencyCode as any) 
    ? currencyCode as UtilsCurrency 
    : 'USD';
  return baseFormatCurrency(amount, validCurrency, options);
};

// formatAmount is now an alias for formatCurrency for backward compatibility
const formatAmount = formatCurrency;

interface Earning {
    id: string;
    amount: number;
    currency: Currency;
    status: 'pending' | 'completed' | 'failed';
    type: TransactionType;
    created_at: string;
    description: string;
}

type PaymentMethod = 'paypal' | 'bank_transfer' | 'mobile_money' | 'payshap' | 'multicaixa' | 'ewallet' | 'eft';

interface PayoutMethod {
    id: string;
    type: PaymentMethod;
    details: {
        // Common fields
        name?: string;
        account_name?: string;
        
        // Bank transfer fields
        bank_name?: string;
        account_number?: string;
        branch_code?: string;
        account_type?: string; // e.g., 'savings', 'checking'
        iban?: string;        // International Bank Account Number
        swift_code?: string;  // SWIFT/BIC code
        
        // Mobile Money fields
        phone_number?: string;
        provider?: string; // e.g., 'mtn', 'orange', 'vodafone'
        network?: string;  // e.g., 'mtn', 'orange', 'vodafone'
        
        // PayPal fields
        email?: string;
        
        // PayShap fields
        payshap_id?: string;
        
        // E-Wallet fields
        wallet_address?: string;
        wallet_type?: string; // e.g., 'crypto', 'digital_wallet', 'other'
    };
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

interface ExpectedEarnings {
    [currency: string]: {
        amount: number;
        seller_fee: number;
        seller_fee_percentage: number;
    };
}

interface EarningsProps {
    balance: Array<{
        currency: Currency;
        amount: number;
        available: number;
    }>;
    recentEarnings: Earning[];
    payoutMethods: PayoutMethod[];
    totalExpectedEarnings: ExpectedEarnings;
}

// Define country payment methods with proper typing
const countryPaymentMethods = [
    {
        code: 'AO' as const,
        name: 'Angola',
        currency: 'AOA' as const,
        methods: ['bank_transfer', 'multicaixa'] as const
    },
    {
        code: 'NA' as const,
        name: 'Namibia',
        currency: 'NAD' as const,
        methods: ['bank_transfer', 'paypal', 'ewallet'] as const
    },
    {
        code: 'ZA' as const,
        name: 'South Africa',
        currency: 'ZAR' as const,
        methods: ['bank_transfer', 'paypal', 'ewallet', 'payshap'] as const
    }
] as const;

type CountryPaymentMethod = typeof countryPaymentMethods[number];
type CountryCode = CountryPaymentMethod['code'];

interface CountryInfo {
    code: CountryCode;
    name: string;
    currency: CountryCurrency;
    methods: readonly PaymentMethod[];
    available: number;
    amount: number;
}

const getPayoutMethodDisplayName = (method: PaymentMethod) => {
    switch (method) {
        case 'paypal':
            return 'PayPal';
        case 'bank_transfer':
            return 'bank_transfer';
        case 'mobile_money':
            return 'Mobile Money';
        case 'payshap':
            return 'PayShap';
        case 'multicaixa':
            return 'Multicaixa';
        case 'ewallet':
            return 'E-Wallet';
        case 'eft':
            return 'EFT';
        default:
            return 'Unknown';
    }
};

const getPayoutMethodDetails = (method: PayoutMethod) => {
    switch (method.type) {
        case 'paypal':
            return method.details.email;
        case 'bank_transfer':
            // Return formatted bank account information if bank_name exists, otherwise just the account number
            return method.details.bank_name 
                ? `${method.details.bank_name} (••••${method.details.account_number?.slice(-4)})`
                : method.details.account_number || '';
        case 'mobile_money':
            return method.details.phone_number;
        case 'payshap':
            return method.details.payshap_id;
        case 'multicaixa':
            return method.details.phone_number;
        case 'ewallet':
            return method.details.phone_number;
        default:
            return '';
    }
};

// Helper function to get currency symbol
const getCurrencySymbol = (currency: Currency) => ({
    'USD': '$',
    'AOA': 'Kz',
    'EUR': '€',
    'GBP': '£',
    'ZAR': 'R',
    'NAD': 'N$'
}[currency] || '$');

// Helper function to get method icon
const getPayoutMethodIcon = (method: PaymentMethod) => {
    const icons = {
        'bank_transfer': <Banknote className="h-5 w-5" />,
        'paypal': <Wallet className="h-5 w-5 text-blue-500" />,
        'ewallet': <Smartphone className="h-5 w-5 text-green-500" />,
        'payshap': <Wallet className="h-5 w-5 text-purple-500" />,
        'multicaixa': <CreditCard className="h-5 w-5 text-orange-500" />,
        'mobile_money': <Smartphone className="h-5 w-5 text-green-500" />,
        'eft': <RefreshCw className="h-5 w-5 text-blue-500" />,
    };
    return icons[method] || <Wallet className="h-5 w-5" />;
};

export default function Earnings({ 
    balance = [], 
    recentEarnings = [], 
    payoutMethods = [], 
    totalExpectedEarnings = {} as Record<string, { amount: number; seller_fee: number; seller_fee_percentage: number }>,
    flash 
}: EarningsProps & { flash?: { success?: string } }) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,  // Add .url here

        },
        {
            title: 'Earnings',
            href: '/earnings/overview',
        },
    ];
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddMethod, setShowAddMethod] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bank_transfer');
    const [payoutAmount, setPayoutAmount] = useState('');
    const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Show success message if it exists in the URL or flash
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const successMessage = urlParams.get('success');
        
        if (successMessage) {
            toast.success(successMessage);
            // Clear the success message from the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } else if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash]);
    const [availablePayoutMethods, setAvailablePayoutMethods] = useState<PayoutMethod[]>([]);
    const { data: formData, setData, post, processing: isSaving } = useForm({
        name: '',
        account_holder_name: '',
        account_number: '',
        bank_name: '',
        iban: '',
        swift_code: '',
        branch_code: '',
        account_type: 'savings',
        email: '',
        phone_number: '',
        payshap_id: '',
        provider: '',
        network: '',
        is_default: false,
        type: '',
        currency: ''
    });
    
    // Form input change handler
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, type } = target;
        const value = type === 'checkbox' ? target.checked : target.value;
        setData(name as keyof typeof formData, value);
    };

    // Handle payout request - This function is defined later in the component

    // Validate form fields based on the selected method
    const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
        const errors: Record<string, string> = {};
        
        // Common validations
        if (!formData.account_holder_name?.trim()) {
            errors.account_holder_name = 'Account holder name is required';
        }

        // Method-specific validations
        if (selectedMethod === 'bank_transfer') {
            if (!formData.bank_name?.trim()) {
                errors.bank_name = 'Bank name is required';
            }
            if (!formData.account_number?.trim()) {
                errors.account_number = 'Account number is required';
            }
            if (!formData.branch_code?.trim()) {
                errors.branch_code = 'Branch code is required';
            }
            if (!formData.iban?.trim()) {
                errors.iban = 'IBAN is required';
            }
            if (formData.swift_code && formData.swift_code.length > 11) {
                errors.swift_code = 'SWIFT code must not exceed 11 characters';
            }
            if (!formData.account_type) {
                errors.account_type = 'Please select an account type';
            }
        } else if (selectedMethod === 'paypal') {
            if (!formData.email?.trim()) {
                errors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                errors.email = 'Please enter a valid email address';
            }
        } else if (selectedMethod === 'ewallet' || selectedMethod === 'multicaixa') {
            if (selectedMethod === 'multicaixa' && !formData.phone_number?.trim()) {
                errors.phone_number = 'Phone number is required';
            } else if (formData.phone_number && !/^\+?[0-9\s-]{8,20}$/.test(formData.phone_number)) {
                errors.phone_number = 'Please enter a valid phone number';
            }
            
            if (selectedMethod === 'multicaixa') {
                if (!formData.provider?.trim()) {
                    errors.provider = 'Provider is required';
                }
                if (!formData.network?.trim()) {
                    errors.network = 'Network is required';
                }
            }
        } else if (selectedMethod === 'payshap') {
            if (!formData.payshap_id?.trim()) {
                errors.payshap_id = 'PayShap ID is required';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    // Form submission handler
    const handleSavePayoutMethod = (e: FormEvent) => {
        e.preventDefault();
        
        if (!selectedCountry) {
            toast.error('Country Required', {
                description: 'Please select a country to continue',
                duration: 5000
            });
            return;
        }

        // Validate form
        const { isValid, errors } = validateForm();
        
        if (!isValid) {
            // Show the first error
            const firstError = Object.values(errors)[0];
            toast.error('Validation Error', {
                description: firstError,
                duration: 5000
            });
            return;
        }
        
        // Show loading state
        const toastId = toast.loading('Saving payout method...');

        // Prepare the base payload
        const requestData = {
            type: selectedMethod,
            is_default: formData.is_default || false,
            currency: selectedCountry.currency,
            details: {}
        };

        // Handle different payment method types
        switch (selectedMethod) {
            case 'bank_transfer':    
                // Ensure we have a name, fallback to account_holder_name if not provided
                requestData.details = {
                    name: formData.bank_name,
                    account_holder_name: formData.account_holder_name,
                    account_number: formData.account_number,
                    bank_name: formData.bank_name,
                    iban: formData.iban,
                    swift_code: formData.swift_code,
                    branch_code: formData.branch_code,
                    account_type: formData.account_type || 'savings',
                };
                break;
            case 'ewallet':
                const ewalletName = formData.name || formData.account_holder_name;
                requestData.details = {
                    name: ewalletName,
                    account_holder_name: formData.account_holder_name,
                    phone_number: formData.phone_number,
                    wallet_name: ewalletName,
                };
                break;
            case 'multicaixa':
                const multicaixaName = formData.name || formData.account_holder_name;
                requestData.details = {
                    name: multicaixaName,
                    account_holder_name: formData.account_holder_name,
                    phone_number: formData.phone_number,
                    provider: formData.provider,
                    network: formData.network,
                    display_name: multicaixaName,
                };
                break;
            case 'paypal':
                const paypalName = formData.name || formData.account_holder_name || formData.email;
                requestData.details = {
                    name: paypalName,
                    account_holder_name: formData.account_holder_name,
                    email: formData.email,
                    display_name: paypalName,
                };
                break;
            case 'payshap':
                const payshapName = formData.name || formData.account_holder_name || formData.payshap_id;
                requestData.details = {
                    name: payshapName,
                    account_holder_name: formData.account_holder_name,
                    payshap_id: formData.payshap_id,
                    display_name: payshapName,
                };
                break;
        }

        // Submit the form
        router.post('/payouts/methods', requestData, {
            onSuccess: () => {
                // Dismiss loading toast
                toast.dismiss(toastId);

                // Show success message
                toast.success('Payout Method Saved', {
                    description: 'Your payout method has been saved successfully',
                    duration: 5000
                });
                
                setShowAddMethod(false);
                // Reset form
                setData({
                    account_holder_name: '',
                    account_number: '',
                    bank_name: '',
                    iban: '',
                    swift_code: '',
                    branch_code: '',
                    account_type: '',
                    email: '',
                    phone_number: '',
                    payshap_id: '',
                    provider: '',
                    network: '',
                    name: '',
                    is_default: false,
                    type: '',
                    currency: ''
                });
                
                setActiveTab('payouts');
                setSelectedCountry(null);
                setSelectedMethod('bank_transfer');
                // Refresh the payout methods
                router.reload({ only: ['payoutMethods'] });
            },
            onError: (errors: Record<string, any>) => {
                // Dismiss loading toast
                toast.dismiss(toastId);

                console.error('Error saving payout method:', errors);

                if (errors.details) {
                    // Format validation errors for display
                    const errorMessages = Object.entries(errors.details)
                        .map(([field, message]) => `• ${field}: ${message}`)
                        .join('\n');

                    toast.error('Validation Error', {
                        description: `Please check the following fields:\n${errorMessages}`,
                        duration: 10000
                    });
                } else if (errors.message) {
                    toast.error('Error', {
                        description: errors.message,
                        duration: 5000
                    });
                } else {
                    toast.error('Failed to Save', {
                        description: 'An unexpected error occurred. Please try again.',
                        duration: 5000
                    });
                }
                // Dismiss loading toast
                toast.dismiss();
                
                console.error('Error saving payout method:', errors);
                
                if (errors.details) {
                    // Format validation errors for display
                    const errorMessages = Object.entries(errors.details)
                        .map(([field, message]) => `• ${field}: ${message}`)
                        .join('\n');
                        
                    toast.error('Validation Error', {
                        description: `Please check the following fields:\n${errorMessages}`,
                        duration: 10000
                    });
                } else if (errors.message) {
                    toast.error('Error', {
                        description: errors.message,
                        duration: 5000
                    });
                } else {
                    toast.error('Failed to Save', {
                        description: 'An unexpected error occurred. Please try again.',
                        duration: 5000
                    });
                }
            }
        });
    };
    
    // Set initial selected currency based on available countries with balance
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
        // Get the first available currency from totalExpectedEarnings
        const firstAvailable = Object.entries(totalExpectedEarnings)
            .filter(([currency]) => isCountryCurrency(currency))
            .map(([currency]) => currency as CountryCurrency)[0];
        
        return firstAvailable || 'USD';
    });

    // Handle currency change with type safety and update available payout methods
    const handleCurrencyChange = (value: string) => {
        let newCurrency: Currency = 'USD';
        
        if (isCountryCurrency(value) || value === 'USD' || value === 'EUR' || value === 'GBP') {
            newCurrency = value as Currency;
        }
            
        setSelectedCurrency(newCurrency);
        
        // Update available payout methods based on selected currency
        const countryInfo = countryPaymentMethods.find(c => c.currency === newCurrency);
        if (countryInfo) {
            const methods = payoutMethods.filter(method => 
                countryInfo.methods.includes(method.type as any)
            );
            setAvailablePayoutMethods(methods);
        } else {
            setAvailablePayoutMethods([]);
        }
        
        // Reset selected payout method when currency changes
        setSelectedPayoutMethod('');
    };

    // Handle setting a payout method as default
    const handleSetDefault = async (methodId: string) => {
        try {
            const response = await fetch(`/payout-methods/${methodId}/set-default`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                }
            });

            if (!response.ok) {
                throw new Error('Failed to set default payout method');
            }

            // Refresh the page to show the updated default status
            window.location.reload();
        } catch (error) {
            console.error('Error setting default payout method:', error);
            toast.error('Failed to set default payout method. Please try again.');
        }
    };

    // Handle country selection
    const handleCountrySelect = (country: CountryInfo) => {
        setSelectedCountry(country);
        setSelectedCurrency(country.currency);
        // Reset selected method when country changes
        setSelectedMethod('bank_transfer');
        
        // Update available payout methods based on selected country
        const methods = payoutMethods.filter(method => 
            country.methods.includes(method.type as any)
        );
        setAvailablePayoutMethods(methods);
        setSelectedPayoutMethod('');
    };
    
    // Handle payout request submission
    const handleRequestPayout = async () => {
        if (!selectedPayoutMethod || !selectedCurrency || !payoutAmount) {
            toast.error('Please fill in all required fields');
            return;
        }
        
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        const selectedBalance = balance.find(b => b.currency === selectedCurrency);
        if (!selectedBalance || amount > selectedBalance.available) {
            toast.error('Insufficient balance');
            return;
        }
        
        const selectedMethod = payoutMethods.find(m => m.id === selectedPayoutMethod);
        if (!selectedMethod) {
            toast.error('Invalid payout method selected');
            return;
        }

        try {
            await router.post('/payouts/request', {
                amount,
                currency: selectedCurrency,
                payout_method_id: selectedPayoutMethod,
            }, {
                onSuccess: () => {
                    toast.success('Payout request submitted successfully');
                    setPayoutAmount('');
                    setSelectedPayoutMethod('');
                },
                onError: (errors: { message?: string }) => {
                    const errorMessage = errors?.message || 'Failed to request payout. Please try again.';
                    toast.error(errorMessage);
                }
            });
        } catch (error) {
            console.error('Payout error:', error);
            toast.error('An unexpected error occurred. Please try again.');
        }
    };
    
    // Get available countries from totalExpectedEarnings
    const availableCountries = Object.entries(totalExpectedEarnings || {})
        .reduce<CountryInfo[]>((acc, [currency, data]) => {
            if (!isCountryCurrency(currency)) return acc;
            
            const country = countryPaymentMethods.find(c => c.currency === currency);
            if (!country) return acc;
            
            // Skip if we already added this currency
            if (acc.some(c => c.currency === currency)) {
                return acc;
            }
            
            // Add the country with its expected earnings data
            acc.push({
                code: country.code,
                name: country.name,
                currency: currency as CountryCurrency,
                methods: country.methods,
                available: (data?.amount || 0) - (data?.seller_fee || 0),
                amount: data?.amount || 0
            });
            
            return acc;
        }, []);

    return (
        <AppLayout breadcrumbs={earningsBreadcrumbs}>
            <Head title="My Earnings" />
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Earnings</h1>
                    </div>
                </div>

                <Tabs value={activeTab} className="space-y-4" onValueChange={setActiveTab}>
                        <div className="relative -mx-4 md:mx-0 px-4 md:px-0">
                            <TabsList className="w-full flex-nowrap overflow-x-auto pb-1 scrollbar-hide md:overflow-visible">
                                <TabsTrigger value="overview" className="px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                                    <span className="truncate">Overview</span>
                                </TabsTrigger>
                                <TabsTrigger value="request-payout" className="px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                                    <span className="truncate">Request Payout</span>
                                </TabsTrigger>
                                <TabsTrigger value="payouts" className="px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                                    <span className="truncate">Payout Methods</span>
                                </TabsTrigger>
                                <TabsTrigger value="transactions" className="px-2.5 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                                    <span className="truncate">Transactions</span>
                                </TabsTrigger>
                            </TabsList>
                            <div className="absolute right-0 top-0 bottom-0 w-6 md:w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                        </div>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Your Balances</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {balance.map((item) => (
                                        <Card key={item.currency} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                                        {item.currency} Balance
                                                    </CardTitle>
                                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-2xl font-bold">
                                                        {formatCurrency(item.amount, item.currency as Currency)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Available: {formatCurrency(item.available, item.currency as Currency)}
                                                    </p>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                                
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium mb-4">Expected Earnings</h3>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        {Object.entries(totalExpectedEarnings).map(([currency, earnings]) => (
                                            <Card key={currency} className="hover:shadow-md transition-shadow">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                                            Expected ({currency})
                                                        </CardTitle>
                                                        <Banknote className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-2xl font-bold">
                                                            {formatCurrency(earnings.amount, currency as Currency)}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {earnings.seller_fee_percentage}% fee: {formatCurrency(earnings.seller_fee, currency as Currency)}
                                                        </p>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    
                                        
                    <TabsContent value="transactions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Earnings History</CardTitle>
                                <CardDescription>Your recent earnings and transactions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentEarnings?.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentEarnings.map((earning) => (
                                            <div
                                                key={earning.id}
                                                className="flex items-center justify-between p-4 border rounded-lg"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="p-2 rounded-full bg-primary/10">
                                                        <Banknote className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium capitalize">{earning.type}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {earning.description}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(earning.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p
                                                        className={`font-medium ${
                                                            earning.amount >= 0
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                        }`}
                                                    >
                                                        {earning.amount >= 0 ? '+' : ''}
                                                        {formatCurrency(earning.amount, earning.currency as Currency)}
                                                    </p>
                                                    <p
                                                        className={`text-xs ${
                                                            earning.status === 'completed'
                                                                ? 'text-green-600'
                                                                : earning.status === 'pending'
                                                                ? 'text-yellow-600'
                                                                : 'text-red-600'
                                                        }`}
                                                    >
                                                        {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">No earnings history found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="request-payout">
                        <Card>
                            <CardHeader>
                                <CardTitle>Request Payout</CardTitle>
                                <CardDescription>Select a payout method and enter the amount you'd like to withdraw</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Payout Method</Label>
                                        {payoutMethods.length > 0 ? (
                                            <div className="grid gap-3">
                                                {payoutMethods.map((method) => (
                                                    <div 
                                                        key={method.id}
                                                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                                                            selectedPayoutMethod === method.id 
                                                                ? 'border-primary ring-2 ring-primary' 
                                                                : 'hover:bg-muted/50'
                                                        }`}
                                                        onClick={() => setSelectedPayoutMethod(method.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {getPayoutMethodIcon(method.type)}
                                                            <div>
                                                                <div className="font-medium">
                                                                    {getPayoutMethodDisplayName(method.type)}
                                                                    {method.is_default && (
                                                                        <span className="ml-2 text-xs text-green-600">Default</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {getPayoutMethodDetails(method)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {method.details?.bank_name || ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 border rounded-lg">
                                                <p className="text-muted-foreground">
                                                    No payout methods found. Please go to the "Payout Methods" tab to add a payout method.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {payoutMethods.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="amount">Amount</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                        {getCurrencySymbol('USD')}
                                                    </span>
                                                    <Input
                                                        id="amount"
                                                        type="number"
                                                        placeholder="0.00"
                                                        className="pl-8"
                                                        value={payoutAmount}
                                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                                        min="1"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Available: {formatCurrency(balance[0]?.available || 0, balance[0]?.currency as Currency || 'USD')}
                                                </p>
                                            </div>

                                            <Button 
                                                className="w-full" 
                                                onClick={handleRequestPayout}
                                                disabled={!selectedPayoutMethod || !payoutAmount || isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : 'Request Payout'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {/* Payout methods are now shown in the main card above */}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payouts">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Payout Methods</CardTitle>
                                        <CardDescription>Manage how you receive your earnings</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {payoutMethods?.length > 0 ? (
                                    <div className="space-y-4">
                                        {payoutMethods.map((method) => (
                                            <div
                                                key={method.id}
                                                className="flex items-center justify-between p-4 border rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getPayoutMethodIcon(method.type)}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">
                                                                {getPayoutMethodDisplayName(method.type)}
                                                            </p>
                                                            {method.is_default && (
                                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {getPayoutMethodDetails(method)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetDefault(method.id);
                                                    }}
                                                    disabled={method.is_default}
                                                    type="button"
                                                >
                                                    {method.is_default ? 'Default' : 'Set as default'}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 border rounded-lg">
                                        <p className="text-muted-foreground mb-4">
                                            No payout methods added yet
                                        </p>
                                        <Button 
                                            onClick={() => {
                                                setSelectedCountry(null);
                                                setShowAddMethod(true);
                                            }}
                                            size="sm"
                                            className="gap-1"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Payout Method
                                        </Button>
                                    </div>
                                )}

                                {showAddMethod && (
                                    <Card>
                                        <CardContent className="space-y-6">
                                            {!selectedCountry ? (
                                                <div>
                                                    <h3 className="font-medium mb-4">Select Country</h3>
                                                    <div className="grid gap-3">
                                                        {availableCountries.map((countryItem) => (
                                                            <Button
                                                                key={countryItem.code}
                                                                variant="outline"
                                                                className="flex flex-col items-start h-auto p-4 text-left w-full"
                                                                onClick={() => {
                                                                    setSelectedCountry(countryItem);
                                                                    setSelectedMethod(countryItem.methods[0]);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                    <span className="font-medium">{countryItem.name}</span>
                                                                </div>
                                                                <div className="mt-2 text-sm text-muted-foreground">
                                                                    {formatCurrency(countryItem.available || 0, countryItem.currency as Currency)}
                                                                    <span className="text-xs ml-2">available</span>
                                                                </div>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : selectedCountry && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8"
                                                            onClick={() => setSelectedCountry(null)}
                                                        >
                                                            <ArrowLeft className="h-4 w-4" />
                                                        </Button>
                                                        <div>
                                                            <h3 className="font-medium">{selectedCountry.name}</h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatCurrency(selectedCountry.available || 0, selectedCountry.currency as Currency)} available
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h3 className="font-medium">
                                                                Add {selectedMethod === 'paypal' ? 'PayPal' : 
                                                                    selectedMethod === 'bank_transfer' ? 'Bank Account' : 
                                                                    selectedMethod === 'ewallet' ? 'E-Wallet' :
                                                                    getPayoutMethodDisplayName(selectedMethod)}
                                                            </h3>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => setShowAddMethod(false)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedCountry.methods.map((type: PaymentMethod) => {
                                                                    // Skip rendering if the method is not supported
                                                                    if (!['bank_transfer', 'paypal', 'ewallet', 'payshap', 'multicaixa'].includes(type)) {
                                                                        return null;
                                                                    }
                                                                    return (
                                                                        <Button
                                                                            key={type}
                                                                            variant={selectedMethod === type ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => setSelectedMethod(type)}
                                                                            className="capitalize"
                                                                        >
                                                                            {type === 'bank_transfer' ? 'Bank Account' : 
                                                                            type === 'ewallet' ? 'E-Wallet' : 
                                                                            type === 'payshap' ? 'PayShap' :
                                                                            type === 'multicaixa' ? 'Multicaixa' : 'PayPal'}
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <form onSubmit={handleSavePayoutMethod} className="mt-4">
                                                {selectedMethod === 'paypal' && selectedCountry ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium">PayPal Email</label>
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                value={formData.email || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="your@email.com"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="account_holder_name"
                                                                value={formData.account_holder_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Your full name"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                ) : selectedMethod === 'bank_transfer' && selectedCountry ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium">Account Holder Name</label>
                                                            <input
                                                                type="text"
                                                                name="account_holder_name"
                                                                value={formData.account_holder_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Account holder's full name"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Bank Name</label>
                                                            <input
                                                                type="text"
                                                                name="bank_name"
                                                                value={formData.bank_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="e.g., First National Bank"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-sm font-medium">Account Number</label>
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        name="account_number"
                                                                        value={formData.account_number || ''}
                                                                        onChange={handleInputChange}
                                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        placeholder="Account number"
                                                                        required
                                                                    />
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formData.account_number && !/^[0-9]{8,20}$/.test(formData.account_number) 
                                                                            ? 'Please enter a valid account number' 
                                                                            : 'Format: 123456789'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium">Branch Code</label>
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        name="branch_code"
                                                                        value={formData.branch_code || ''}
                                                                        onChange={handleInputChange}
                                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        placeholder="Branch code"
                                                                        required
                                                                    />
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formData.branch_code && !/^[0-9]{3,6}$/.test(formData.branch_code) 
                                                                            ? 'Please enter a valid branch code' 
                                                                            : 'Format: 123'}
                                                                    </p>
                                                                </div>

                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-sm font-medium">IBAN</label>
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        name="iban"
                                                                        value={formData.iban || ''}
                                                                        onChange={handleInputChange}
                                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        placeholder="IBAN"
                                                                        required
                                                                    />
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formData.iban ? 'IBAN format validated' : 'Enter your IBAN'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium">SWIFT/BIC Code</label>
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        name="swift_code"
                                                                        value={formData.swift_code || ''}
                                                                        onChange={handleInputChange}
                                                                        maxLength={11}
                                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        placeholder="SWIFT/BIC code (max 11 chars)"
                                                                    />
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formData.swift_code?.length || 0}/11 characters
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Account Type</label>
                                                            <select 
                                                                name="account_type"
                                                                value={formData.account_type || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <option value="">Select account type</option>
                                                                <option value="savings">Savings</option>
                                                                <option value="checking">Checking</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {selectedMethod === 'ewallet' && selectedCountry && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium">Phone Number (Optional)</label>
                                                            <input
                                                                type="tel"
                                                                name="phone_number"
                                                                value={formData.phone_number || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="+244 900 000 000"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="account_holder_name"
                                                                value={formData.account_holder_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Your full name"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedMethod === 'multicaixa' && selectedCountry && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium">Phone Number</label>
                                                            <input
                                                                type="tel"
                                                                name="phone_number"
                                                                value={formData.phone_number || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="+244 900 000 000"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Provider</label>
                                                            <input
                                                                type="text"
                                                                name="provider"
                                                                value={formData.provider || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="e.g., BAI, BIC, etc."
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Network</label>
                                                            <input
                                                                type="text"
                                                                name="network"
                                                                value={formData.network || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="e.g., Multicaixa, etc."
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="account_holder_name"
                                                                value={formData.account_holder_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Your full name"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedMethod === 'payshap' && selectedCountry && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium">PayShap ID</label>
                                                            <input
                                                                type="text"
                                                                name="payshap_id"
                                                                value={formData.payshap_id || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Your PayShap ID"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="account_holder_name"
                                                                value={formData.account_holder_name || ''}
                                                                onChange={handleInputChange}
                                                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Your full name"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 pt-6">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setShowAddMethod(false)}
                                                        disabled={isSaving}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        type="submit" 
                                                        disabled={isSaving}
                                                        className="min-w-[150px]"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : `Save ${selectedMethod === 'bank_transfer' ? 'Bank Account' : 
                                                            selectedMethod === 'paypal' ? 'PayPal' : 
                                                            selectedMethod === 'ewallet' ? 'E-Wallet' : 
                                                            selectedMethod === 'payshap' ? 'PayShap' :
                                                            selectedMethod === 'multicaixa' ? 'Multicaixa' :
                                                            'Payout Method'}`}
                                                    </Button>
                                                </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                </Tabs>
            </div> 
        </AppLayout>
);
}
