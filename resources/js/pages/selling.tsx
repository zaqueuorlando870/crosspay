import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getExchangeRates } from '@/utils/exchangeRates';
import { ArrowRightLeft, Wallet, Plus, ArrowUpRight } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Sell Currency',
        href: '/selling',
    },
];

type PageProps = {
    auth: {
        user: {
            currency?: string;
        };
    };
};

type SellingProps = {
    balance: number;
    status?: string;
    auth: {
        user: {
            currency?: string;
        };
    };
};

// Format currency based on user's preference
const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

export default function Selling({ balance, status, ...props }: SellingProps) {
    const { auth } = usePage<PageProps>().props;
    const userCurrency = auth.user?.currency || 'USD';
    const [selectedCurrency, setSelectedCurrency] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState('0');
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
    const [isLoadingRates, setIsLoadingRates] = useState(true);
    const [ratesError, setRatesError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch exchange rates on component mount
    useEffect(() => {
        const loadRates = async () => {
            try {
                setIsLoadingRates(true);
                
                // Get rates based on user's preferred currency
                const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${userCurrency}`);
                const rates = response.data.rates;
                
                // Fixed rate for ZAR to AOA
                const ZAR_TO_AOA = 56.18; // 1 ZAR = 56.18 AOA (fixed rate)
                
                // Get ZAR rate in user's currency for AOA conversion
                const userToZarRate = 1 / rates['ZAR'];
                
                // Calculate all rates in user's currency
                const requiredRates = {
                    'USD': rates['USD'] || 1,  // User's currency to USD
                    'EUR': rates['EUR'] || 0.85, 
                    'ZAR': rates['ZAR'] || 18.75,
                    'AOA': rates['ZAR'] ? rates['ZAR'] * ZAR_TO_AOA : 1053.38, // Convert through ZAR
                    'NAD': rates['ZAR'] || 18.75 // 1 ZAR = 1 NAD
                };
                
                setExchangeRates(requiredRates);
                setRatesError(null);
            } catch (error) {
                console.error('Failed to load exchange rates:', error);
                // Fallback to default rates based on user's currency
                const defaultRates: Record<string, number> = {
                    'USD': 1,
                    'EUR': 0.91,
                    'ZAR': 18.75,
                    'AOA': 1053.38,  // 18.75 * 56.18
                    'NAD': 18.75
                };
                
                // If user's currency is not USD, convert rates
                if (userCurrency !== 'USD') {
                    const userRate = defaultRates[userCurrency] || 1;
                    Object.keys(defaultRates).forEach(key => {
                        defaultRates[key] = defaultRates[key] / userRate;
                    });
                }
                
                setExchangeRates(defaultRates);
                setRatesError('Failed to load latest exchange rates. Using default values.');
            } finally {
                setIsLoadingRates(false);
            }
        };

        loadRates();
    }, [userCurrency]); // Add userCurrency as dependency
    
    // Calculate rates and amounts
    const baseRate = selectedCurrency ? exchangeRates[selectedCurrency] || 0 : 0;
    const feeAmount = (Number(fee) / 100) * baseRate;
    const finalRate = baseRate + feeAmount;
    const totalAmount = amount ? (Number(amount) * finalRate).toFixed(2) : '0.00';
    const profitAmount = amount ? (Number(amount) * (Number(fee) / 100) * baseRate).toFixed(2) : '0.00';

    const currencies = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'EUR', name: 'Euro' },
        { code: 'ZAR', name: 'South African Rand' },
        { code: 'AOA', name: 'Angolan Kwanza' },
        { code: 'NAD', name: 'Namibian Dollar' }
    ].filter(currency => currency.code !== userCurrency); // Filter out user's base currency

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        
        try {
            await router.post('/listings', {
                currency: selectedCurrency,
                amount: parseFloat(amount),
                fee: parseFloat(fee),
                exchange_rate: baseRate,
                final_rate: finalRate, // finalRate is already a number
                total_amount: parseFloat(totalAmount),
                profit: parseFloat(profitAmount)
            }, {
                onSuccess: () => {
                    // Show success message
                    setSuccessMessage('Listing created successfully!');
                    // Reset the form
                    setSelectedCurrency('');
                    setAmount('');
                    setFee('0');
                    // Clear success message after 5 seconds
                    setTimeout(() => setSuccessMessage(null), 5000);
                },
                onError: (errors) => {
                    console.error('Error creating listing:', errors);
                    setSuccessMessage('Failed to create listing. Please check your input and try again.');
                },
                preserveScroll: true
            });
        } catch (error) {
            console.error('Error creating listing:', error);
            setSuccessMessage('An unexpected error occurred. Please try again later.');
        }
    };

    const handleCancel = () => {
        router.visit(dashboard().url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sell Currency" />
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Status Message */}
                {(status || successMessage) && (
                    <div className={`rounded-lg p-4 ${
                        successMessage?.includes('success') 
                            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                        {successMessage || status}
                    </div>
                )}

                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Sell Currency</h2>
                        <p className="text-muted-foreground">Create a new listing to sell your currency</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {isLoadingRates && (
                            <span className="text-sm text-muted-foreground">Updating rates...</span>
                        )}
                        {ratesError && (
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">{ratesError}</span>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-10">
                    <div className="space-y-4 lg:col-span-7">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowRightLeft className="h-5 w-5" />
                                    Create Listing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="currency">Currency to Receive</Label>
                                            <Select 
                                                value={selectedCurrency} 
                                                onValueChange={setSelectedCurrency}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select currency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {currencies.map((currency) => (
                                                        <SelectItem key={currency.code} value={currency.code}>
                                                            {currency.name} ({currency.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="amount">
                                                Amount of ZAR to Sell
                                            </Label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <span className="text-gray-500">R</span>
                                                </div>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    step="0.01"
                                                    min="0"
                                                    className="pl-8"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fee">Your Fee (%)</Label>
                                            <Input
                                                id="fee"
                                                type="number"
                                                placeholder="0.00"
                                                value={fee}
                                                onChange={(e) => setFee(e.target.value)}
                                                step="0.01"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {selectedCurrency && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base">Exchange Rate Information</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">Base Rate</p>
                                                        <p className="font-medium">
                                                            {userCurrency === 'USD' 
                                                                ? `1 ${userCurrency} = ${baseRate} ${selectedCurrency}`
                                                                : `1 ${selectedCurrency} = ${(1 / baseRate).toFixed(4)} ${userCurrency}`
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">Your Rate</p>
                                                        <p className="font-medium">
                                                            {userCurrency === 'USD'
                                                                ? `1 ${userCurrency} = ${finalRate.toFixed(4)} ${selectedCurrency}`
                                                                : `1 ${selectedCurrency} = ${(1 / finalRate).toFixed(4)} ${userCurrency}`
                                                            }
                                                            {Number(fee) > 0 && ` (${fee}% fee)`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {amount && Number(amount) > 0 && (
                                                    <div className="space-y-4">
                                                        <div className="h-px bg-border" />
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium">Transaction Summary</h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <p className="text-sm text-muted-foreground">
                                                                        You're paying (ZAR)
                                                                    </p>
                                                                    <p className="font-medium">
                                                                        {Number(amount).toLocaleString('en-ZA', { 
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 2 
                                                                        })} ZAR
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-1 text-right">
                                                                    <p className="text-sm text-muted-foreground">
                                                                        You're receiving ({selectedCurrency})
                                                                    </p>
                                                                    <p className="font-medium text-green-600 dark:text-green-400">
                                                                        {Number(totalAmount).toLocaleString(undefined, {
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 4
                                                                        })} {selectedCurrency}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Your Profit</p>
                                                                    <p className="text-xs text-green-600 dark:text-green-400">
                                                                        {fee}% fee on {Number(amount).toLocaleString('en-ZA', { 
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 2 
                                                                        })} ZAR (Rate: 1 {selectedCurrency} = {(1/baseRate).toFixed(4)} ZAR)
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                                        {Number(profitAmount).toLocaleString(undefined, {
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 4
                                                                        })} {selectedCurrency}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {baseRate > 0 ? (
                                                                            `${Number(Number(profitAmount) / baseRate).toLocaleString('en-ZA', {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 4
                                                                            })} ZAR`
                                                                        ) : 'Calculating...'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="flex justify-end space-x-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancel}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit">
                                            Create Listing
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4 lg:col-span-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Wallet className="h-5 w-5" />
                                    Wallet Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Available Balance</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(balance, userCurrency)}
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full mt-2"
                                        onClick={() => router.visit('/wallet/deposit')}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Funds
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ArrowRightLeft className="h-5 w-5" />
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start"
                                    onClick={() => router.visit('/marketplace')}
                                >
                                    View Marketplace
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start"
                                    onClick={() => router.visit('/wallet/transactions')}
                                >
                                    Transaction History
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}