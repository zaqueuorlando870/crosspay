import { useState, useEffect, useCallback } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { login, register, logout } from '@/routes';

// Use the route function from ziggy-js if needed
const route = window.route || ((name: string, params = {}) => {
    // Simple route helper if ziggy is not available
    if (name === 'login') {
        return `/login?${new URLSearchParams(params as Record<string, string>).toString()}`;
    }
    return `/${name}`;
});

// Define the user type
type User = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
};

// Define the listing type
type Listing = {
    id: number;
    code: string;
    name: string;
    baseRate: number;
    rate: number;
    from_currency: string;
    to_currency: string;
    change24h: number;
    high24h: number;
    low24h: number;
    lastUpdated: string;
    flag: string;
    amount: number;
    total_amount: number;
    minAmount: number;
    maxAmount: number;
    fee: number;
    originalData: any;
};

// Define the page props type
interface PageProps {
    auth: {
        user?: User;
    };
    user?: User;
    listings: Listing[];
    route?: string;
};

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import {
    Search,
} from 'lucide-react';
import { BsCurrencyExchange } from 'react-icons/bs';

// Single interface for currency/listing data
interface Currency extends Omit<Listing, 'originalData'> {
    // Extends the Listing type but excludes originalData
}


export default function Marketplace() {
    const { auth, listings } = usePage<PageProps>().props;
    const isAuthenticated = Boolean(auth?.user);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [amount, setAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [showBuyModal, setShowBuyModal] = useState(false);

    // Get user's base currency from auth or default to USD
    const [userBaseCurrency, setUserBaseCurrency] = useState(auth?.user?.currency || 'USD');

    // Show all available currencies
    const filteredCurrencies = listings || [];

    const formatRate = (rate: number, maxDecimals = 4): string => {
        // Special case for maxAmount to show full number with 4 decimal places
        if (maxDecimals === 4) {
            return new Intl.NumberFormat(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 4,
                useGrouping: true
            }).format(rate);
        }

        // Default formatting for exchange rates
        return rate.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });
    };

    const formatChange = (change: number): string => {
        return change.toFixed(2);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const handleBuyClick = useCallback((currency: Currency) => {
        if (!isAuthenticated) {
            // Redirect to login with a return URL using Inertia's router
            router.visit(route('login', { return: window.location.pathname }));
            return;
        }
        setSelectedCurrency(currency);
        setShowBuyModal(true);
    }, [isAuthenticated]);

    const handleBuySubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated) {
            router.visit(route('login', { return: window.location.pathname }));
            return;
        }

        if (!selectedCurrency) {
            console.error('No currency selected');
            return;
        }

        // Redirect to the order creation page with the necessary parameters
        router.visit(route('orders.store', {
            listing: selectedCurrency.id,
            amount: selectedCurrency.total_amount,
            from_currency: selectedCurrency.from_currency,
            to_currency: selectedCurrency.to_currency
        }));

        // Get the real rate from from_currency to to_currency
        let realRate;
        if (selectedCurrency.from_currency === 'USD') {
            realRate = selectedCurrency.baseRate;
        } else if (selectedCurrency.to_currency === 'USD') {
            const fromCurrency = listings.find(c => c.code === selectedCurrency.from_currency);
            realRate = fromCurrency ? 1 / fromCurrency.baseRate : 1;
        } else {
            const fromCurrency = listings.find(c => c.code === selectedCurrency.from_currency);
            realRate = fromCurrency ? selectedCurrency.baseRate / fromCurrency.baseRate : selectedCurrency.baseRate;
        }

        setShowBuyModal(false);
        setAmount('');
    });

    // Calculate the exchange details for a given amount in to_currency (what the user wants to receive)
    const calculateRequiredAmount = (desiredAmount: number) => {
        if (!selectedCurrency) return {
            requiredAmount: '0.00',
            receiveAmount: '0.00',
            fee: '0.00'
        };

        // If same currency, just apply fee
        if (selectedCurrency.from_currency === selectedCurrency.to_currency) {
            const fee = (desiredAmount * selectedCurrency.fee) / 100;
            return {
                requiredAmount: (desiredAmount + fee).toFixed(2),
                receiveAmount: desiredAmount.toFixed(2),
                fee: fee.toFixed(2)
            };
        }

        // Get the exchange rates
        const fromRate = listings.find(c => c.code === selectedCurrency.from_currency)?.baseRate || 1;
        const toRate = listings.find(c => c.code === selectedCurrency.to_currency)?.baseRate || 1;

        // Calculate the base exchange rate (without fee)
        const baseRate = toRate / fromRate;

        // Calculate the amount to receive in from_currency (after fee)
        const receiveAmount = desiredAmount / baseRate;

        // Calculate the fee in from_currency
        const feeAmount = (receiveAmount * selectedCurrency.fee) / 100;

        // Total amount to pay in to_currency (desired amount + fee in to_currency)
        const requiredAmount = desiredAmount + (feeAmount * baseRate);

        return {
            requiredAmount: requiredAmount.toFixed(2),  // Total to pay in to_currency
            receiveAmount: receiveAmount.toFixed(2),    // Amount to receive in from_currency
            fee: (feeAmount * baseRate).toFixed(2)      // Fee in to_currency
        };
    };

    // Calculate how much the user will receive (to currency) for a given from amount
    const calculateReceiveAmount = (fromAmount?: string | number) => {
        // If no amount or selected currency, return 0.00
        if (!selectedCurrency || fromAmount === undefined || fromAmount === '') return '0.00';

        // Convert to number safely
        const amountNum = typeof fromAmount === 'string' ? parseFloat(fromAmount) : Number(fromAmount);
        if (isNaN(amountNum) || amountNum <= 0) return '0.00';

        // If same currency, just apply fee
        if (selectedCurrency.from_currency === selectedCurrency.to_currency) {
            const fee = (amountNum * selectedCurrency.fee) / 100;
            return (amountNum - fee).toFixed(2);
        }

        // Get exchange rates with fallbacks
        const fromRate = listings.find(c => c.code === selectedCurrency.from_currency)?.baseRate || 1;
        const toRate = listings.find(c => c.code === selectedCurrency.to_currency)?.baseRate || 1;

        // Calculate base exchange rate and apply fee to the from_amount
        const baseRate = toRate / fromRate;
        const amountAfterFee = amountNum * (1 - selectedCurrency.fee / 100);

        // Calculate how much to_currency they'll receive after fee is taken from from_amount
        return (amountAfterFee * baseRate).toFixed(2);
    };

    return (
        <>
            <Head title="CrossPay - Currency Exchange Rates" />
            <div className="min-h-screen bg-white dark:bg-slate-950">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto max-w-7xl px-6 py-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                                    <BsCurrencyExchange className="text-white text-xl" />
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">CrossPay</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    {auth.user ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
                                                    <UserIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-48" align="end">
                                                <div className="px-3 py-2 text-sm">
                                                    <div className="font-medium text-gray-900 dark:text-white">{auth.user.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{auth.user.email}</div>
                                                </div>
                                                <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                                                <Link href={"/dashboard"}>
                                                    <DropdownMenuItem className="cursor-pointer">
                                                        <UserIcon className="mr-2 h-4 w-4" />
                                                        <span>Profile</span>
                                                    </DropdownMenuItem>
                                                </Link>
                                                <Link href={logout()} method="post" as="button">
                                                    <DropdownMenuItem className="cursor-pointer text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">
                                                        <LogOut className="mr-2 h-4 w-4" />
                                                        <span>Log out</span>
                                                    </DropdownMenuItem>
                                                </Link>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={login().url}
                                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                Log in
                                            </Link>
                                            <Link
                                                href={register().url}
                                                className="px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                            >
                                                Register
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-6 py-8">
                    {/* Search Bar */}
                    <div className="mb-8">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Search currencies..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
                                />
                            </div>
                            <button className="rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600">
                                <Search className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Last Updated */}
                    <div className="mb-6 flex items-center justify-end">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Last Updated: {new Date().toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        #
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Currency
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Amount available for exchange
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Rate (1 {userBaseCurrency} = )
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        24h Change
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        24h High
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        24h Low
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Click to Exchange
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCurrencies.map((currency, idx) => (
                                    <tr
                                        key={currency.id}
                                        className={`border-b border-gray-200 dark:border-slate-800 ${idx % 2 === 0
                                            ? 'bg-white dark:bg-slate-950'
                                            : 'bg-gray-50 dark:bg-slate-900/50'
                                            } hover:bg-gray-100 dark:hover:bg-slate-800`}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {currency.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{currency.flag}</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {currency.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {formatRate(currency.amount, 4)} {selectedCurrency?.code || ''}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                1 {currency.code} = {formatRate(1 / currency.rate)} {userBaseCurrency}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`text-sm font-medium ${currency.change24h >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                    }`}
                                            >
                                                {currency.change24h >= 0 ? '+' : ''}
                                                {formatChange(currency.change24h)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900 dark:text-white">
                                                {formatRate(1 / currency.high24h)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900 dark:text-white">
                                                {formatRate(1 / currency.low24h)}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleBuyClick(currency)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm w-full"
                                            >
                                                Exchange {currency.code}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
                        <p>© 2025 Coin Market Cap. All rights reserved.</p>
                    </div>
                </main>
            </div>

            {/* Buy Currency Modal */}
            {showBuyModal && selectedCurrency && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Exchange {selectedCurrency.name} ({selectedCurrency.code})
                            </h3>
                            <button
                                onClick={() => setShowBuyModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleBuySubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Amount to Pay
                                </label>
                                <div className="relative rounded-lg border-0 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="py-4 px-4">
                                                <span className="block text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {Number(selectedCurrency?.total_amount)?.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 bg-gray-50 dark:bg-slate-700 px-4 py-4 border-l border-gray-200 rounded dark:border-gray-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 text-1xl font-bold text-white-400 dark:text-white-200">
                                                {selectedCurrency?.to_currency}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hidden input for form submission */}
                                <input
                                    type="hidden"
                                    name="amount"
                                    value={selectedCurrency?.total_amount || '0'}
                                />

                            </div>

                            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-md">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Exchange Rate (with {selectedCurrency.fee}% fee):</span>
                                    <span className="text-sm font-medium">1 {selectedCurrency.from_currency} = {
                                        (() => {
                                            if (selectedCurrency.from_currency === selectedCurrency.to_currency) return '1.0000';
                                            const fromRate = listings.find(c => c.code === selectedCurrency.from_currency)?.baseRate || 1;
                                            const toRate = listings.find(c => c.code === selectedCurrency.to_currency)?.baseRate || 1;
                                            const directRate = toRate / fromRate;
                                            // Apply fee to the rate
                                            return (directRate * (1 - selectedCurrency.fee / 100)).toFixed(4);
                                        })()
                                    } {selectedCurrency.to_currency}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-xs text-gray-500">
                                    <span>Fee:</span>
                                    <span>{selectedCurrency.fee}%</span>
                                </div>
                                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-900 dark:text-white">You'll receive:</span>
                                    <div className="text-right">
                                        <div className="text-blue-600 dark:text-blue-400 font-semibold">
                                            {selectedCurrency?.amount || '0'} {selectedCurrency?.from_currency}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBuyModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    Confirm Exchange
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}