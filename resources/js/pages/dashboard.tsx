import { dashboard, selling } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowRightLeft, BarChart2, Clock, CreditCard, DollarSign, FileText, Home, LineChart, ListChecks, Mail, Package2, PanelLeft, Search, Settings, ShoppingCart, Users, Wallet, Zap, ChevronUp, ChevronDown, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import Wallets from '@/components/Wallets';
import RecentTransactions from '@/components/RecentTransactions';
import type { PageProps as InertiaPageProps } from '@inertiajs/core';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

type Transaction = {
    id: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    status: 'completed' | 'pending' | 'failed';
    date: string;
};

type Wallet = {
    id: string;
    name: string;
    balance: number;
    currency: string;
    type: string;
};

type ExchangeRate = {
    from: string;
    to: string;
    rate: number;
    change: number;
};

interface DashboardProps {
    balance: number;
    availableBalance?: number;
    activeListingsCount?: number;
    wallets?: Wallet[];
    recentTransactions?: Transaction[];
    exchangeRates?: ExchangeRate[];
    status?: string;
};
 

// Type for page props with auth
type PageProps = InertiaPageProps & {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            email_verified_at: string | null;
            created_at: string;
            updated_at: string;
            currency: string;
        };
    };
    [key: string]: unknown;
};

// Balance Cards Component
function BalanceCards({ 
    balance, 
    available = 0, 
    activeListingsCount = 0,
    exchangeRates = [] 
}: { 
    balance: number; 
    available?: number; 
    activeListingsCount?: number;
    exchangeRates: ExchangeRate[] 
}) {
    // Get user's preferred currency
    const { auth } = usePage<PageProps>().props;
    const userCurrency = auth.user.currency || 'USD';
    
    // Format currency based on user's locale and currency
    const formatCurrency = (value: number, currency = userCurrency) => {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };
    
    const totalValue = exchangeRates.reduce((sum, rate) => {
        return sum + (rate.rate * 1000);
    }, balance);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                    <p className="text-xs text-muted-foreground">Total funds</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeListingsCount}</div>
                    <p className="text-xs text-muted-foreground">In marketplace</p>
                </CardContent>
            </Card>
        </div>
    );
}

// Quick Exchange Component
function QuickExchange() {
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('EUR');
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState<number | null>(null);
    const [rate, setRate] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { auth } = usePage<PageProps>().props;
    const userCurrency = auth.user.currency || 'USD';

    const currencies = [
        { code: 'USD', name: 'US Dollar' },
        { code: 'AOA', name: 'Angolan Kwanza' },
        { code: 'NAD', name: 'Namibian Dollar' },
        { code: 'ZAR', name: 'South African Rand' },
    ];

    // Fetch exchange rate when currencies change
    useEffect(() => {
        const fetchExchangeRate = async () => {
            if (!fromCurrency || !toCurrency) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
                if (!response.ok) throw new Error('Failed to fetch exchange rate');
                
                const data = await response.json();
                const newRate = data.rates[toCurrency];
                
                if (!newRate) throw new Error('Exchange rate not available');
                
                setRate(newRate);
                // Recalculate result if amount exists
                if (amount) {
                    const amountNum = parseFloat(amount);
                    if (!isNaN(amountNum)) {
                        setResult(amountNum * newRate);
                    }
                }
            } catch (err) {
                console.error('Error fetching exchange rate:', err);
                setError('Failed to fetch exchange rate. Please try again later.');
                setRate(0);
                setResult(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchExchangeRate();
    }, [fromCurrency, toCurrency]);

    const handleExchange = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(amount);
        if (!isNaN(amountNum) && rate > 0) {
            setResult(amountNum * rate);
        }
    };

    // Set initial currency to user's preferred currency if available
    useEffect(() => {
        if (userCurrency && userCurrency !== fromCurrency) {
            setFromCurrency(userCurrency);
        }
    }, [userCurrency]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    Quick Exchange
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleExchange} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">From</label>
                        <div className="flex gap-2">
                            <select 
                                value={fromCurrency}
                                onChange={(e) => setFromCurrency(e.target.value)}
                                className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                {currencies.map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-center">
                        <button 
                            type="button" 
                            className="rounded-full bg-muted p-2"
                            onClick={() => {
                                const temp = fromCurrency;
                                setFromCurrency(toCurrency);
                                setToCurrency(temp);
                                setResult(null);
                            }}
                        >
                            <ArrowDown className="h-4 w-4" />
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">To</label>
                        <div className="flex gap-2">
                            <select 
                                value={toCurrency}
                                onChange={(e) => setToCurrency(e.target.value)}
                                className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                {currencies.map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code}
                                    </option>
                                ))}
                            </select>
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {isLoading ? (
                                    <span className="text-muted-foreground">Loading...</span>
                                ) : result !== null ? (
                                    <span>{result.toFixed(2)} {toCurrency}</span>
                                ) : (
                                    <span>0.00 {toCurrency}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                            Rate: 1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
                        </p>
                    </div>
                    
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                    >
                        {isLoading ? 'Converting...' : 'Exchange Now'}
                    </Button>
                    {rate > 0 && !isLoading && (
                        <div className="text-center text-sm text-muted-foreground">
                            1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

// Exchange Rates Component
function ExchangeRates({ rates }: { rates: ExchangeRate[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Exchange Rates
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {rates.map((rate, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="font-medium">{rate.from}/{rate.to}</div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono">{rate.rate.toFixed(4)}</span>
                                <span className={`inline-flex items-center text-xs ${rate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {rate.change >= 0 ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                    {Math.abs(rate.change)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ 
    balance = 0, // Provide a default value of 0
    availableBalance = 0, // Provide a default value of 0
    activeListingsCount = 0,
    wallets,
    recentTransactions,
    exchangeRates = [], // Provide a default empty array
    status
}: DashboardProps) {
    // Mock data - replace with actual data from props
    const walletsData = wallets && wallets.length > 0 ? wallets : [
        {
            id: 'wallet_1',
            name: 'Primary Wallet',
            balance: 1000,
            currency: 'USD',
            type: 'checking',
        },
        {
            id: 'wallet_2',
            name: 'Savings',
            balance: 5000,
            currency: 'USD',
            type: 'savings',
        },
    ];

    const recentTransactionsData = recentTransactions && recentTransactions.length > 0 ? recentTransactions : [
        {
            id: '1',
            description: 'Deposit from Bank',
            amount: 1000,
            type: 'credit' as const,
            status: 'completed' as const,
            date: '2025-01-15T10:30:00Z',
        },
        {
            id: '2',
            description: 'Grocery Store',
            amount: 85.42,
            type: 'debit' as const,
            status: 'completed' as const,
            date: '2025-01-14T15:22:00Z',
        },
        {
            id: '3',
            description: 'Monthly Subscription',
            amount: 9.99,
            type: 'debit' as const,
            status: 'pending' as const,
            date: '2025-01-14T08:10:00Z',
        },
    ];

    const handleDeposit = (walletId: string) => {
        router.post(
            '/wallet/deposit',
            { type: walletId },
            { preserveScroll: true }
        );
    };

    const handlePay = () => {
        router.post(
            '/wallet/pay',
            {},
            { preserveScroll: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Status Message */}
                {status && (
                    <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {status}
                    </div>
                )}

                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Currency Exchange</h2>
                        <p className="text-muted-foreground">Manage your multi-currency portfolio and exchange funds</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => router.visit(selling())}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            New Exchange
                        </Button>
                    </div>
                </div>

                {/* Balance Cards */}
                <BalanceCards 
                    balance={balance} 
                    available={availableBalance}
                    activeListingsCount={activeListingsCount}
                    exchangeRates={exchangeRates.length > 0 ? exchangeRates : [
                        // Fallback rates if none provided
                        { from: 'USD', to: 'EUR', rate: 0.92, change: 0.5 },
                        { from: 'USD', to: 'GBP', rate: 0.79, change: -0.3 },
                        { from: 'USD', to: 'ZAR', rate: 18.75, change: 1.2 },
                    ]} 
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-10">
                    <div className="space-y-4 lg:col-span-7">
                        <QuickExchange />
                    </div>
                    <div className="lg:col-span-3">
                        <RecentTransactions transactions={recentTransactionsData} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
 