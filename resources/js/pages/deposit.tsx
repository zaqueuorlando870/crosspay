import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Plus, ArrowRight, Banknote, Loader2, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Custom Tabs component since shadcn/ui tabs are not available
const Tabs = ({ value, onValueChange, className, children }: any) => (
    <div className={className}>
        {children}
    </div>
);

const TabsList = ({ className, children }: any) => (
    <div className={`flex items-center justify-start space-x-2 ${className}`}>
        {children}
    </div>
);

const TabsTrigger = ({ value, className, children, ...props }: any) => (
    <button
        type="button"
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className}`}
        {...props}
    >
        {children}
    </button>
);

const TabsContent = ({ value, className, children }: any) => (
    <div className={className}>
        {children}
    </div>
);
// Format currency utility function
// In resources/js/lib/utils.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
    const currencyFormats: Record<string, { symbol: string; locale: string }> = {
        'USD': { symbol: '$', locale: 'en-US' },
        'AOA': { symbol: 'Kz', locale: 'pt-AO' },
        'EUR': { symbol: '€', locale: 'de-DE' },
        'GBP': { symbol: '£', locale: 'en-GB' },
        'ZAR': { symbol: 'R', locale: 'en-ZA' },
    };

    const format = currencyFormats[currency] || currencyFormats['USD'];
    
    // For AOA, we'll format it as Kz 1,234.56 instead of 1.234,56 Kz
    if (currency === 'AOA') {
        return `${format.symbol} ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
    
    return new Intl.NumberFormat(format.locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

const depositBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Deposit',
        href: '/deposit',
    },
];

type Wallet = {
    id: string;
    name: string;
    balance: number;
    currency: string;
    type: 'checking' | 'savings' | 'investment';
    lastTransaction?: string;
};

interface Transaction {
    id: string;
    reference: string;
    amount: number;
    net_amount: number;
    currency: string;
    type: 'deposit' | 'withdrawal' | 'transfer' | 'exchange_buy' | 'exchange_sell' | 'platform_fee';
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
    created_at: string;
    description: string;
}

type DepositMethod = 'bank_transfer' | 'crypto' | 'paypal' | 'paystack';

interface DashboardProps {
    balance: number;
    wallets: Wallet[];
    recentTransactions: Transaction[];
    status?: string;
}

export type { Wallet, Transaction, DepositMethod };

// User type definition
interface User {
    currency: string;
    [key: string]: any;
}

// Extend the Inertia PageProps type
declare module '@inertiajs/core' {
    interface PageProps {
        auth?: {
            user?: User;
        };
    }
}

export default function Deposit({ balance, wallets = [], status }: DashboardProps) {
    // Get user settings from Laravel Inertia props
    const { auth } = usePage().props;
    // Get base currency from user settings or default to 'USD'
    const baseCurrency = auth?.user?.currency || 'USD';
    // Get the user's wallet (always available)
    const userWallet = {
        id: 'default-wallet',
        name: 'Main Wallet',
        balance: balance,
        currency: baseCurrency,
        type: 'checking'
    };

    const [amount, setAmount] = useState('');
    const [depositMethod, setDepositMethod] = useState<DepositMethod>('bank_transfer');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

    const handleDeposit = async (e: React.FormEvent, method?: DepositMethod) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Update deposit method if provided
        if (method) {
            setDepositMethod(method);
        }

        if (!amount) {
            setError('Please enter an amount');
            setIsLoading(false);
            return;
        }

        const amountNumber = parseFloat(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            setError('Please enter a valid amount');
            setIsLoading(false);
            return;
        }

        // Additional validation for minimum amount
        if (amountNumber < 1) {
            setError(`Minimum deposit amount is ${formatCurrency(1, userWallet.currency)}`);
            setIsLoading(false);
            return;
        }

        try {
            // Map deposit method to type
            const currentMethod = method || depositMethod;
            const depositType = currentMethod === 'bank_transfer' ? 'bank' :
                currentMethod === 'crypto' ? 'crypto' :
                currentMethod === 'paypal' ? 'paypal' :
                currentMethod === 'paystack' ? 'paystack' : 'other';

            if (currentMethod === 'paypal') {
                // Handle PayPal payment
                const response = await axios.post('/payment/paypal/create', {
                    amount: amountNumber,
                    currency: baseCurrency,
                    wallet_id: userWallet.id,
                    type: depositType
                });

                if (response.data?.approval_url) {
                    window.location.href = response.data.approval_url;
                } else {
                    throw new Error('Failed to initialize PayPal payment');
                }

            } else if (currentMethod === 'paystack') {
                // Handle Paystack payment
                const response = await axios.post('/payment/paystack/initialize', {
                    amount: amountNumber * 100, // Paystack uses kobo/pesewas (multiply by 100)
                    email: auth?.user?.email,
                    currency: baseCurrency,
                    wallet_id: userWallet.id,
                    type: depositType
                });

                if (response.data?.authorization_url) {
                    window.location.href = response.data.authorization_url;
                } else {
                    throw new Error('Failed to initialize Paystack payment');
                }

            } else {
                // Handle bank transfer and crypto
                try {
                    const response = await axios.post('/wallet/deposit', {
                        wallet_id: userWallet.id,
                        amount: amountNumber,
                        method: depositMethod,
                        currency: userWallet.currency,
                        type: depositType  // Add type for bank transfer and crypto
                    });

                    if (response.data.success) {
                        // Reset form on success
                        setAmount('');
                        setError(null);
                        
                        // Refresh transactions after successful deposit
                        const transactionsResponse = await axios.get('/api/transactions/recent');
                        setTransactions(transactionsResponse.data);
                        
                        console.log('Deposit successful:', response.data.message);
                    } else {
                        throw new Error(response.data.message || 'Failed to process deposit');
                    }
                } catch (err) {
                    console.error('Deposit error:', err);
                    setError(err instanceof Error ? err.message : 'An unexpected error occurred');
                } finally {
                    setIsLoading(false);
                }
            }
        } catch (err) {
            console.error('Payment processing error:', err);
            setError('Failed to process payment. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddWallet = () => {
        // Implement add wallet functionality
        console.log('Add new wallet');
    };

    // Fetch transactions on component mount
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await axios.get('/api/transactions/recent');
                setTransactions(response.data);
            } catch (error) {
                console.error('Error fetching transactions:', error);
                setError('Failed to load transactions');
            } finally {
                setIsLoadingTransactions(false);
            }
        };

        fetchTransactions();
        
        // Show success message if status is present
        if (status) {
            // Refresh transactions if status indicates a successful deposit
            if (typeof status === 'string' && status.includes('success')) {
                fetchTransactions();
            }
            console.log('Status:', status);
        }
    }, [status]);

    return (
        <AppLayout breadcrumbs={depositBreadcrumbs}>
            <Head title="Deposit Funds" />
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                {/* Status Message */}
                {status && (
                    <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {status}
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Deposit Funds</h1>
                        <p className="text-muted-foreground">Add money to your account</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Recent Transactions */}
                    <div className="md:col-span-2">
                        <Card className="h-full flex flex-col">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
                                <CardDescription>Your recent deposit and withdrawal history</CardDescription>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setIsLoadingTransactions(true);
                                    axios.get('/api/transactions/recent')
                                        .then(response => setTransactions(response.data))
                                        .catch(error => console.error('Error refreshing transactions:', error))
                                        .finally(() => setIsLoadingTransactions(false));
                                }}
                                disabled={isLoadingTransactions}
                                className="flex items-center gap-1"
                            >
                                {isLoadingTransactions ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                <span>{isLoadingTransactions ? 'Refreshing...' : 'Refresh'}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        {isLoadingTransactions ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : transactions.length > 0 ? (
                            <div className="h-[400px] overflow-y-auto pr-2 -mr-2">
                                <div className="space-y-3 pr-2 py-2">
                                {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-2 rounded-full ${
                                                    tx.type === 'deposit' || tx.type === 'exchange_sell'
                                                        ? 'bg-green-100 dark:bg-green-900/30'
                                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                                }`}>
                                                    {tx.type === 'deposit' || tx.type === 'exchange_sell' ? (
                                                        <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                    ) : (
                                                        <ArrowUpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {tx.type === 'deposit' ? 'Deposit' : 
                                                         tx.type === 'withdrawal' ? 'Withdrawal' :
                                                         tx.type === 'transfer' ? 'Transfer' :
                                                         tx.type === 'exchange_buy' ? 'Exchange Buy' :
                                                         tx.type === 'exchange_sell' ? 'Exchange Sell' :
                                                         'Transaction'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                        <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                            {tx.reference}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-semibold ${
                                                    tx.type === 'deposit' || tx.type === 'exchange_sell'
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-foreground'
                                                }`}>
                                                    {tx.type === 'deposit' || tx.type === 'exchange_sell' ? '+' : '-'}
                                                    {formatCurrency(tx.amount, tx.currency)}
                                                </p>
                                                <div className="text-xs text-muted-foreground">
                                                    {tx.status === 'completed' ? (
                                                        <span className="text-green-600 dark:text-green-400">Completed</span>
                                                    ) : tx.status === 'pending' ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                                                    ) : tx.status === 'failed' ? (
                                                        <span className="text-red-600 dark:text-red-400">Failed</span>
                                                    ) : tx.status === 'cancelled' ? (
                                                        <span className="text-gray-600 dark:text-gray-400">Cancelled</span>
                                                    ) : tx.status === 'refunded' ? (
                                                        <span className="text-blue-600 dark:text-blue-400">Refunded</span>
                                                    ) : (
                                                        <span className="text-gray-600 dark:text-gray-400">{tx.status}</span>
                                                    )}
                                                    {tx.net_amount && tx.net_amount !== tx.amount && (
                                                        <span className="ml-2">
                                                            Net: {formatCurrency(tx.net_amount, tx.currency)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No transactions found</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={() => {
                                            setIsLoadingTransactions(true);
                                            axios.get('/api/transactions/recent')
                                                .then(response => setTransactions(response.data))
                                                .catch(error => console.error('Error loading transactions:', error))
                                                .finally(() => setIsLoadingTransactions(false));
                                        }}
                                    >
                                        {isLoadingTransactions ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Retry
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Make a Deposit</CardTitle>
                                <CardDescription>Add money to your wallet</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Wallet</Label>
                                        <div className="flex items-center p-3 border rounded-md bg-muted/10">
                                            <Wallet className="h-5 w-5 mr-3 text-primary" />
                                            <div>
                                                <div className="font-medium">{userWallet.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Balance: {formatCurrency(userWallet.balance, userWallet.currency)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <span className="text-muted-foreground">
                                                    {baseCurrency === 'USD' ? '$' :
                                                        baseCurrency === 'EUR' ? '€' :
                                                            baseCurrency === 'GBP' ? '£' :
                                                                baseCurrency === 'AOA' ? 'Kz' :
                                                                    baseCurrency === 'NAD' ? 'N$' :
                                                                        baseCurrency === 'ZAR' ? 'R' : baseCurrency}
                                                </span>
                                            </div>
                                            <Input
                                                id="amount"
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-8"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                min="0.01"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Payment Method</Label>
                                        
                                        {/* PayPal Button */}
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="w-full justify-start p-6 h-auto"
                                            onClick={() => handleDeposit({ preventDefault: () => {} } as React.FormEvent, 'paypal')}
                                        >
                                            <div className="flex items-center space-x-4 w-full">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="#003087"
                                                    className="flex-shrink-0"
                                                >
                                                    <path d="M7.5 7.5h3.5v-1.5H7.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h1.5v-1.5H7.5c-1.7 0-3-1.3-3-3s1.3-3 3-3z" />
                                                    <path d="M16.5 7.5h-3.5v-1.5h3.5c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5H15v1.5h1.5c3.3 0 6-2.7 6-6s-2.7-6-6-6z" />
                                                    <path d="M10.5 9H12v6h-1.5z" fill="#fff" />
                                                </svg>
                                                <div className="text-left">
                                                    <div className="font-medium">PayPal</div>
                                                    <div className="text-sm text-muted-foreground">Safe and secure payments</div>
                                                </div>
                                            </div>
                                        </Button>

                                        {/* Paystack Button */}
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="w-full justify-start p-6 h-auto"
                                            onClick={() => handleDeposit({ preventDefault: () => {} } as React.FormEvent, 'paystack')}
                                        >
                                            <div className="flex items-center space-x-4 w-full">
                                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00A6FF] text-white text-xs font-bold">
                                                    PS
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium">Paystack</div>
                                                    <div className="text-sm text-muted-foreground">Accepts all major cards and banks</div>
                                                </div>
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
};
