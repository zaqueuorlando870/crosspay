import { useState } from 'react';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import { login, register, logout } from '@/routes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BsCurrencyExchange } from 'react-icons/bs';
import { toast } from 'sonner';
import { LogOut, User as UserIcon } from 'lucide-react';
import {
    Search,
    TrendingUp,
    User,
    LogIn,
    UserPlus,
    MoreVertical,
    BarChart3,
    PieChart,
    TrendingDown,
    Shield,
    Cloud,
    Heart,
    Truck,
} from 'lucide-react';

interface Currency {
    id: number;
    code: string;
    name: string;
    baseRate: number;
    rate: number;
    lastUpdated: string;
    flag: string;
    minAmount: number;
    maxAmount: number;  // Maximum amount that can be exchanged in one transaction
    fee: number;        // Transaction fee percentage
    originalData?: any; // Original data from the server
}

interface MarketplaceProps {
    listings: Currency[];
    currencyGroups: { name: string; icon: any }[];
    tabs: string[];
}

const CURRENCY_GROUPS = [
    { name: 'MAJORS', icon: BarChart3 },
    { name: 'AFRICAN', icon: PieChart },
];

const TABS = ['All Currencies', 'Favorites', 'Gainers', 'Losers'];

interface User {
    name: string;
    email: string;
    currency?: string;
}

interface PageProps {
    auth: {
        user: User | null;
    };
    user: User | null;
    name: string;
    email: string;
    listings: Currency[];
    currencyGroups: { name: string; icon: any }[];
    tabs: string[];
}

export default function Marketplace({ listings, currencyGroups, tabs, auth }: PageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(['MAJORS']);
    const [baseCurrency, setBaseCurrency] = useState(auth?.user?.currency || 'USD');
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [amount, setAmount] = useState('');
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const { post, processing } = useForm();  // Moved inside the component
    const CURRENCY_GROUPS = currencyGroups;
    const TABS = tabs;


    const formatRate = (rate: number) => {
        return rate.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });
    };

    const formatChange = (change: number) => {
        return change.toFixed(2);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Add these state variables
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        minMaxAmount: '',
        currency: ''
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            minPrice: '',
            maxPrice: '',
            minMaxAmount: '',
            currency: ''
        });
    };

    // Update the filteredListings calculation to handle price range filtering correctly
    const filteredListings = listings.filter(currency => {
        if (!currency || !currency.name || !currency.code) {
            return false; // Skip invalid entries
        }

        // Filter by search query with null checks and optional chaining
        const searchLower = searchQuery?.toLowerCase() || '';
        const matchesSearch = currency.name?.toLowerCase().includes(searchLower) ||
            currency.code?.toLowerCase().includes(searchLower);

        // Get the rate for the current currency in the selected base currency
        let rate;
        if (currency.code === baseCurrency) {
            rate = 1; // If it's the base currency, rate is 1:1
        } else {
            // Find the base currency's rate
            const baseCurrencyData = listings.find(c => c.code === baseCurrency);
            if (!baseCurrencyData) return false; // Skip if base currency not found

            // Get the direct rate if available, otherwise calculate it
            if (currency.rate && currency.rate > 0) {
                rate = 1 / currency.rate;
            } else {
                // Fallback calculation using base rates
                const currencyInUSD = 1 / currency.baseRate;
                const baseInUSD = 1 / baseCurrencyData.baseRate;
                rate = currencyInUSD / baseInUSD;
            }
        }

        // Filter by price range
        const minPrice = parseFloat(filters.minPrice) || 0;
        const maxPrice = parseFloat(filters.maxPrice) || Number.MAX_SAFE_INTEGER;

        // For the price range, we want to show how much 1 unit of the currency is worth in the base currency
        const priceInBaseCurrency = 1 / rate;
        const matchesPrice = priceInBaseCurrency >= minPrice && priceInBaseCurrency <= maxPrice;

        // Filter by max amount
        const minMaxAmount = parseFloat(filters.minMaxAmount) || 0;
        const matchesMaxAmount = currency.maxAmount >= minMaxAmount;

        // Filter by currency code
        const matchesCurrency = !filters.currency || currency.code === filters.currency;

        return matchesSearch && matchesPrice && matchesMaxAmount && matchesCurrency;
    });

    const handleExchangeClick = (currency: Currency) => {
        setSelectedCurrency(currency);
        setShowExchangeModal(true);
    };

    const handleExchangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCurrency) return;

        const amountNum = parseFloat(amount || '0');
        const baseCurrencyRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;
        const amountInUsd = amountNum / baseCurrencyRate;

        // Calculate the fee in USD
        const feeInUsd = amountInUsd * (selectedCurrency.fee / 100);
        const receiveAmount = amountInUsd - feeInUsd;

        // Prepare the data to submit
        const formData = {
            listing_id: selectedCurrency.id,
            amount: amountNum,
            from_currency: baseCurrency,
            to_currency: selectedCurrency.code,
            receive_amount: receiveAmount,
            exchange_rate: 1, // 1:1 for same currency
            real_rate: 1, // 1:1 for same currency
            fee_amount: feeInUsd,
            fee_percentage: selectedCurrency.fee,
            amount_in_usd: amountInUsd
        };

        try {
            const response = await router.post('/orders', formData, {
                preserveScroll: true,
                onSuccess: (page) => {
                    setShowExchangeModal(false);
                    setAmount('');
                    toast.success('Order created successfully!');
                    if (page.props.redirect && typeof page.props.redirect === 'string' && page.props.redirect.trim() !== '') {
                        router.visit(page.props.redirect);
                    }
                },
                onError: (errors) => {
                    // Handle validation errors
                    if (errors.message) {
                        toast.error(errors.message);
                    } else {
                        toast.error('Failed to create order. Please try again.');
                    }
                }
            });

        } catch (error) {
            console.error('Error submitting order:', error);
            toast.error('An unexpected error occurred. Please try again.');
        }
    };

    const calculateReceiveAmount = () => {
        if (!amount || !selectedCurrency) return '0.00';
        const amountNum = parseFloat(amount);

        // If same currency, return the amount (no conversion needed)
        if (baseCurrency === selectedCurrency.code) {
            return amountNum.toFixed(2);
        }

        // Get the base currency rate (how much USD is 1 unit of base currency)
        const baseCurrencyRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;

        // Convert amount to USD first
        const amountInUsd = amountNum / baseCurrencyRate;

        // Calculate fee in USD
        const feeInUsd = (amountInUsd * selectedCurrency.fee) / 100;

        // Calculate amount after fee in USD
        const amountAfterFeeInUsd = amountInUsd - feeInUsd;

        // If target currency is USD, return the USD amount
        if (selectedCurrency.code === 'USD') {
            return amountAfterFeeInUsd.toFixed(2);
        }

        // Convert USD to target currency using the target's baseRate
        const targetCurrencyRate = listings.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
        return (amountAfterFeeInUsd * targetCurrencyRate).toFixed(2);
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
                                <span className="text-lg font-bold text-gray-900 dark:text-white">CrossPay FX</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex items-center gap-6 text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Last Updated: {new Date().toLocaleString()}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Currencies: {listings.length}</span>
                                </div>
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
                    {/* Filter Controls */}
                    {/* Filter Section */}
                    <div className="mb-8">
                        <div className="border-b border-gray-200 dark:border-slate-700 pb-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Marketplace</h2>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Filter and find the best exchange rates
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-md">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search currencies..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md leading-5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center px-3.5 py-2 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <span>Clear</span>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Price Range Filter */}
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Price Range ({baseCurrency})
                                    </label>
                                    <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                name="minPrice"
                                                value={filters.minPrice}
                                                onChange={handleFilterChange}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                placeholder="Min"
                                                min="0"
                                                step="0.0001"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                name="maxPrice"
                                                value={filters.maxPrice}
                                                onChange={handleFilterChange}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                placeholder="Max"
                                                min="0"
                                                step="0.0001"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Max Amount Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Min. Exchange Amount
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            type="number"
                                            name="minMaxAmount"
                                            value={filters.minMaxAmount}
                                            onChange={handleFilterChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            placeholder="Enter amount"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Currency Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Currency
                                    </label>
                                    <div className="mt-1">
                                        <select
                                            name="currency"
                                            value={filters.currency}
                                            onChange={handleFilterChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        >
                                            <option value="">All Currencies</option>
                                            {Array.from(new Set(listings.map(c => c.code))).map(code => (
                                                <option key={code} value={code}>{code}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Base Currency Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Base Currency
                                    </label>
                                    <div className="mt-1">
                                        <select
                                            value={baseCurrency}
                                            onChange={(e) => setBaseCurrency(e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        >
                                            {listings.map(currency => (
                                                <option key={currency.code} value={currency.code}>
                                                    {currency.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
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
                                        Rate ({baseCurrency})
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Max Exchange
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Last Updated
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">

                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredListings.map((currency, idx) => (
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
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                1 {currency.code} = {formatRate(1 / currency.rate)} {selectedCurrency}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900 dark:text-white">
                                                Up to {currency.maxAmount.toLocaleString()} {currency.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(currency.lastUpdated)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleExchangeClick(currency)}
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

            {/* Exchange Currency Modal */}
            {showExchangeModal && selectedCurrency && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Exchange {selectedCurrency.name} ({selectedCurrency.code})
                            </h3>
                            <button
                                onClick={() => setShowExchangeModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleExchangeSubmit}>
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        From:
                                    </label>
                                    <select
                                        value={baseCurrency}
                                        onChange={(e) => setBaseCurrency(e.target.value)}
                                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                                    >
                                        {listings.map((currency) => (
                                            <option key={currency.code} value={currency.code}>
                                                {currency.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Amount to Exchange ({baseCurrency})
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500">{baseCurrency === 'USD' ? '$' : baseCurrency === 'EUR' ? '€' : baseCurrency === 'GBP' ? '£' : baseCurrency === 'JPY' ? '¥' : baseCurrency}</span>
                                    </div>
                                    <input
                                        type="number"
                                        id="amount-input"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min={selectedCurrency.minAmount}
                                        max={selectedCurrency.maxAmount}
                                        step="0.01"
                                        className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2"
                                        placeholder={`0.00 ${baseCurrency}`}
                                        required
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Min: {selectedCurrency.minAmount} {selectedCurrency.code} - Max: {selectedCurrency.maxAmount} {selectedCurrency.code}
                                </div>
                            </div>

                            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-md">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Exchange Rate (with fee):</span>
                                    <span className="text-sm font-medium">1 {baseCurrency} = {
                                        (() => {
                                            if (baseCurrency === selectedCurrency.code) return '1.0000';
                                            const baseRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;
                                            const targetRate = listings.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
                                            const feeMultiplier = 1 + (selectedCurrency.fee / 100);
                                            return (targetRate / baseRate * feeMultiplier).toFixed(4);
                                        })()
                                    } {selectedCurrency.code}</span>
                                </div>
                                <div className="flex justify-between mb-1 text-xs text-gray-500">
                                    <span>Real Exchange Rate:</span>
                                    <span>1 {baseCurrency} = {
                                        baseCurrency === selectedCurrency.code
                                            ? '1.0000'
                                            : (() => {
                                                const baseRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;
                                                const targetRate = listings.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
                                                return (targetRate / baseRate).toFixed(4);
                                            })()
                                    } {selectedCurrency.code}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-xs text-gray-500">
                                    <span>Inverse Rate:</span>
                                    <span>1 {selectedCurrency.code} = {
                                        (() => {
                                            if (baseCurrency === selectedCurrency.code) return '1.0000';
                                            const baseRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;
                                            const targetRate = listings.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
                                            const feeMultiplier = 1 + (selectedCurrency.fee / 100);
                                            return (baseRate / (targetRate * feeMultiplier)).toFixed(4);
                                        })()
                                    } {baseCurrency}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-xs text-gray-500">
                                    <span>Fee:</span>
                                    <span>{selectedCurrency.fee}% ({
                                        (() => {
                                            const baseCurrencyRate = listings.find(c => c.code === baseCurrency)?.baseRate || 1;
                                            const amountInUsd = parseFloat(amount || '0') / baseCurrencyRate;
                                            const feeInUsd = (amountInUsd * selectedCurrency.fee) / 100;
                                            return `$${feeInUsd.toFixed(2)} USD`;
                                        })()
                                    })</span>
                                </div>
                                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-900 dark:text-white">You'll receive:</span>
                                    <div className="text-right">
                                        <div className="text-blue-600 dark:text-blue-400 font-semibold">
                                            {calculateReceiveAmount()} {selectedCurrency?.code}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            = {amount || '0'} {baseCurrency}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            (Fee: {selectedCurrency ? (parseFloat(amount || '0') * selectedCurrency.baseRate * selectedCurrency.fee / 100).toFixed(2) : '0.00'} USD)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowExchangeModal(false)}
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
