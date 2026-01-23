import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { login, register, logout } from '@/routes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
    baseRate: number; // The real exchange rate (1 baseCurrency = baseRate targetCurrency)
    rate: number;     // The rate including seller's fee (baseRate + fee)
    change24h: number;
    high24h: number;
    low24h: number;
    lastUpdated: string;
    flag: string;
    minAmount: number;
    maxAmount: number;
    fee: number; // Seller's profit as a percentage of the transaction
}

const CURRENCIES: Currency[] = [
    {
        id: 1,
        code: 'USD',
        name: 'US Dollar',
        baseRate: 1.0,    // 1 USD = 1.0 USD (base currency)
        rate: 1.0,        // Rate shown to user (baseRate + fee)
        change24h: 0.0,
        high24h: 1.002,
        low24h: 0.998,
        lastUpdated: new Date().toISOString(),
        flag: '🇺🇸',
        minAmount: 10,
        maxAmount: 10000,
        fee: 0            // No fee when exchanging to the same currency
    },
    {
        id: 2,
        code: 'EUR',
        name: 'Euro',
        baseRate: 0.91,   // 1 EUR = 0.91 USD (real exchange rate)
        rate: 0.91 * 1.02, // Rate with 2% fee
        change24h: 0.12,
        high24h: 0.92,
        low24h: 0.90,
        lastUpdated: new Date().toISOString(),
        flag: '🇪🇺',
        minAmount: 10,
        maxAmount: 8000,
        fee: 1.8          // 1.8% fee on the USD amount
    },
    {
        id: 3,
        code: 'ZAR',
        name: 'South African Rand',
        baseRate: 16.44,  // 1 USD = 16.44 ZAR (real exchange rate)
        rate: 16.44 * 1.02, // Rate with 2% fee (16.77 ZAR per USD)
        change24h: -0.15,
        high24h: 16.60,
        low24h: 16.30,
        lastUpdated: new Date().toISOString(),
        flag: '🇿🇦',
        minAmount: 100,
        maxAmount: 200000,
        fee: 2.0          // 2% fee on the USD amount
    },
    {
        id: 4,
        code: 'AOA',
        name: 'Angolan Kwanza',
        baseRate: 917.00, // 1 USD = 917.00 AOA (real exchange rate)
        rate: 917.00 * 1.025, // Rate with 2.5% fee (940 AOA per USD)
        change24h: 5.00,
        high24h: 920.00,
        low24h: 915.00,
        lastUpdated: new Date().toISOString(),
        flag: '🇦🇴',
        minAmount: 5000,
        maxAmount: 10000000,
        fee: 2.5          // 2.5% fee on the USD amount
    },
    {
        id: 5,
        code: 'NAD',
        name: 'Namibian Dollar',
        baseRate: 16.44,  // 1 USD = 16.44 NAD (1:1 with ZAR, real exchange rate)
        rate: 16.44 * 1.02, // Rate with 2% fee (16.77 NAD per USD)
        change24h: -0.15,
        high24h: 16.60,
        low24h: 16.30,
        lastUpdated: new Date().toISOString(),
        flag: '🇳🇦',
        minAmount: 100,
        maxAmount: 200000,
        fee: 2.0          // 2% fee on the USD amount
    },
];

const CURRENCY_GROUPS = [
    { name: 'MAJORS', icon: BarChart3 },
    { name: 'AFRICAN', icon: PieChart },
];

const TABS = ['All Currencies', 'Favorites', 'Gainers', 'Losers'];

export default function Welcome() {
    const { auth } = usePage<{ auth: { user: { name: string; email: string } | null } }>().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All Currencies');
    const [selectedGroups, setSelectedGroups] = useState<string[]>(['MAJORS']);
    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [amount, setAmount] = useState('');
    const [showBuyModal, setShowBuyModal] = useState(false);

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

    const handleBuyClick = (currency: Currency) => {
        setSelectedCurrency(currency);
        setShowBuyModal(true);
    };

    const handleBuySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCurrency) return;

        const amountNum = parseFloat(amount || '0');

        // If same currency, no conversion needed
        if (baseCurrency === selectedCurrency.code) {
            alert(`You will receive: ${amountNum} ${selectedCurrency.code}\nNo conversion needed for same currency.`);
            setShowBuyModal(false);
            setAmount('');
            return;
        }

        // Get the base currency rate (how much USD is 1 unit of base currency)
        const baseCurrencyRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;

        // Convert input amount to USD
        const amountInUsd = amountNum / baseCurrencyRate;

        // Calculate the fee in USD
        const feeInUsd = (amountInUsd * selectedCurrency.fee) / 100;

        // Calculate the amount after fee in USD
        const amountAfterFeeInUsd = amountInUsd - feeInUsd;

        // Convert to target currency
        let receiveAmount;
        if (selectedCurrency.code === 'USD') {
            receiveAmount = amountAfterFeeInUsd;
        } else {
            const targetCurrencyRate = CURRENCIES.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
            receiveAmount = amountAfterFeeInUsd * targetCurrencyRate;
        }

        // Calculate the effective exchange rate (including fee)
        const effectiveRate = amountNum / receiveAmount;

        // Get the real rate from base currency to target currency
        let realRate;
        if (baseCurrency === 'USD') {
            realRate = selectedCurrency.baseRate;
        } else if (selectedCurrency.code === 'USD') {
            realRate = 1 / baseCurrencyRate;
        } else {
            realRate = selectedCurrency.baseRate / baseCurrencyRate;
        }

        alert(`Exchange Summary:\n\n` +
            `You will receive: ${receiveAmount.toFixed(2)} ${selectedCurrency.code}\n` +
            `Amount to pay: ${amountNum} ${baseCurrency}\n` +
            `Fee: ${feeInUsd.toFixed(2)} USD (${selectedCurrency.fee}% of ${amountInUsd.toFixed(2)} USD)\n` +
            `Exchange rate: 1 ${selectedCurrency.code} = ${(1 / effectiveRate).toFixed(4)} ${baseCurrency}\n` +
            `(Real rate: 1 ${selectedCurrency.code} = ${realRate.toFixed(4)} ${baseCurrency})`);

        setShowBuyModal(false);
        setAmount('');
    };

    const calculateReceiveAmount = () => {
        if (!amount || !selectedCurrency) return '0.00';
        const amountNum = parseFloat(amount);

        // If same currency, return the amount (no conversion needed)
        if (baseCurrency === selectedCurrency.code) {
            return amountNum.toFixed(2);
        }

        // Get the base currency rate (how much USD is 1 unit of base currency)
        const baseCurrencyRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;

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
        const targetCurrencyRate = CURRENCIES.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
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
                                    <span className="text-white font-bold">◑</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">CrossPay FX</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex items-center gap-6 text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Last Updated: {new Date().toLocaleString()}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Currencies: {CURRENCIES.length}</span>
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

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-slate-800">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab
                                            ? 'border-b-2 border-blue-500 text-blue-500'
                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
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

                    {/* Industry Filter */}
                    <div className="mb-8">
                        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Currency Groups:
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {CURRENCY_GROUPS.map((group) => {
                                const IconComponent = group.icon;
                                return (
                                    <button
                                        key={group.name}
                                        onClick={() => {
                                            setSelectedGroups((prev) =>
                                                prev.includes(group.name)
                                                    ? prev.filter((i) => i !== group.name)
                                                    : [...prev, group.name],
                                            );
                                        }}
                                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${selectedGroups.includes(group.name)
                                                ? 'bg-blue-500 text-white'
                                                : 'border border-gray-300 text-gray-700 hover:border-gray-400 dark:border-slate-700 dark:text-gray-400 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        {group.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter Type */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Base:</span>
                                <select
                                    value={baseCurrency}
                                    onChange={(e) => setBaseCurrency(e.target.value)}
                                    className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    {CURRENCIES.map(currency => (
                                        <option key={currency.code} value={currency.code}>
                                            {currency.code} - {currency.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
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
                                        Code
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Rate (1 {baseCurrency} = )
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
                                        Last Updated
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {CURRENCIES.map((currency, idx) => (
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
                                                {currency.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatRate(1 / currency.rate)} {currency.code}
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
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(currency.lastUpdated)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleBuyClick(currency)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm w-full"
                                            >
                                                Buy {currency.code}
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
                                Buy {selectedCurrency.name} ({selectedCurrency.code})
                            </h3>
                            <button
                                onClick={() => setShowBuyModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleBuySubmit}>
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
                                        {CURRENCIES.map((currency) => (
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
                                            const baseRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;
                                            const targetRate = CURRENCIES.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
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
                                                const baseRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;
                                                const targetRate = CURRENCIES.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
                                                return (targetRate / baseRate).toFixed(4);
                                            })()
                                    } {selectedCurrency.code}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-xs text-gray-500">
                                    <span>Inverse Rate:</span>
                                    <span>1 {selectedCurrency.code} = {
                                        (() => {
                                            if (baseCurrency === selectedCurrency.code) return '1.0000';
                                            const baseRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;
                                            const targetRate = CURRENCIES.find(c => c.code === selectedCurrency.code)?.baseRate || 1;
                                            const feeMultiplier = 1 + (selectedCurrency.fee / 100);
                                            return (baseRate / (targetRate * feeMultiplier)).toFixed(4);
                                        })()
                                    } {baseCurrency}</span>
                                </div>
                                <div className="flex justify-between mb-2 text-xs text-gray-500">
                                    <span>Fee:</span>
                                    <span>{selectedCurrency.fee}% ({
                                        (() => {
                                            const baseCurrencyRate = CURRENCIES.find(c => c.code === baseCurrency)?.baseRate || 1;
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
