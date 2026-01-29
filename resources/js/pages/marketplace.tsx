import { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { login, register, logout } from '@/routes';
import { toast } from 'sonner';
import ReactCountryFlag from 'react-country-flag';

const appName = import.meta.env.VITE_APP_NAME || 'CrossPay';

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
    fee_amount?: number;
    exchange_rate?: number;
    originalData: any;
};

// Define the page props type
interface PageProps {
    auth: {
        user?: User;
    };
    user?: User;
    listings: Listing[];
    pagination?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    route?: string;
    success?: string | object;
    flash?: {
        success?: string | object;
    };
};

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    User as UserIcon,
    Settings,
    LogOut,
} from 'lucide-react';
import { BsCurrencyExchange } from 'react-icons/bs';

// Single interface for currency/listing data
interface Currency extends Omit<Listing, 'originalData'> {
    // Extends the Listing type but excludes originalData
}


export default function Marketplace() {
    const { auth, listings, pagination } = usePage<PageProps>().props;
    const isAuthenticated = Boolean(auth?.user);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
    const [amount, setAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    
    // Infinity scroll states
    const [allListings, setAllListings] = useState<Listing[]>(listings || []);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver>();
    const lastListingRef = useRef<HTMLTableRowElement>(null);
    
    // Scroll fade states
    const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [showTopFade, setShowTopFade] = useState(false);
    const [showBottomFade, setShowBottomFade] = useState(true);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get user's base currency from auth or default to USD
    const [userBaseCurrency, setUserBaseCurrency] = useState(auth?.user?.currency || 'USD');

    // Initialize hasMore based on pagination
    useEffect(() => {
        if (pagination) {
            setHasMore(currentPage < pagination.last_page);
        }
    }, [pagination, currentPage]);

    // Load more listings
    const loadMoreListings = useCallback(async () => {
        if (isLoading || !hasMore) return;
        
        setIsLoading(true);
        const nextPage = currentPage + 1;
        
        try {
            const params = new URLSearchParams({
                page: nextPage.toString(),
                ...(searchQuery && { search: searchQuery }),
                ...(selectedFilters.length > 0 && { filters: selectedFilters.join(',') })
            });
            
            const response = await fetch(`/marketplace?${params}`);
            const data = await response.json();
            
            if (data.props.listings && data.props.listings.length > 0) {
                setAllListings(prev => [...prev, ...data.props.listings]);
                setCurrentPage(nextPage);
                
                if (data.props.pagination) {
                    setHasMore(nextPage < data.props.pagination.last_page);
                } else {
                    setHasMore(data.props.listings.length < 20); // Assume 20 is default page size
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more listings:', error);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, isLoading, hasMore, searchQuery, selectedFilters]);

    // Intersection observer for infinity scroll
    useEffect(() => {
        if (isLoading) return;
        
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMoreListings();
                }
            },
            { threshold: 0.1 }
        );
        
        if (lastListingRef.current) {
            observer.current.observe(lastListingRef.current);
        }
        
        return () => {
            if (observer.current) observer.current.disconnect();
        };
    }, [isLoading, hasMore, loadMoreListings]);

    // Reset listings when filters or search changes
    useEffect(() => {
        setAllListings(listings || []);
        setCurrentPage(1);
        setHasMore(true);
        setIsLoading(false);
    }, [searchQuery, selectedFilters, listings]);

    // Handle scroll events for fade effects
    const handleScroll = useCallback(() => {
        if (!scrollContainer) return;
        
        setIsScrolling(true);
        
        // Clear existing timeout
        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }
        
        // Set new timeout to detect when scrolling stops
        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 150);
        
        // Check scroll position for fade effects
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        setShowTopFade(scrollTop > 10);
        setShowBottomFade(scrollTop < scrollHeight - clientHeight - 10);
    }, [scrollContainer]);

    // Add scroll event listener
    useEffect(() => {
        const container = scrollContainer;
        if (!container) return;
        
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial check
        handleScroll();
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [scrollContainer, handleScroll]);

    // Filter currencies based on search and currency pair filters
    const filteredCurrencies = allListings?.filter(currency => {
        const matchesSearch = searchQuery === '' || 
            currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            currency.code.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCurrencyFilter = selectedFilters.length === 0 || 
            selectedFilters.includes(`${currency.from_currency} → ${currency.to_currency}`);
        
        return matchesSearch && matchesCurrencyFilter;
    }) || [];

    // Get unique currency pairs from available listings for dynamic filter options
    const uniqueCurrencyPairs = [...new Set(
        allListings?.map(l => `${l.from_currency} → ${l.to_currency}`) || []
    )].sort();

    // Format relative time
    const formatRelativeTime = (dateString: string): string => {
        const now = new Date();
        const lastUpdate = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    };

    // Format full time for tooltip
    const formatFullTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const [lastUpdateTime] = useState(new Date().toISOString());

    // Map currency codes to country codes for flags
    const getCountryCode = (currencyCode: string): string => {
        const currencyToCountry: Record<string, string> = {
            'AOA': 'AO', // Angola
            'USD': 'US', // United States
            'EUR': 'EU', // European Union (special case)
            'NAD': 'NA', // Namibia
            'ZAR': 'ZA', // South Africa
        };
        return currencyToCountry[currencyCode] || currencyCode.slice(0, 2);
    };

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

        // Debug information
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const routeUrl = route('orders.store');
        console.log('CSRF Token:', csrfToken);
        console.log('Route URL:', routeUrl);
        console.log('Request data:', {
            listing_id: selectedCurrency.id,
            amount: selectedCurrency.total_amount,
            from_currency: selectedCurrency.from_currency,
            to_currency: selectedCurrency.to_currency
        });

        // Test if user is authenticated by checking a simple authenticated route
        fetch('/dashboard', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken || ''
            }
        })
        .then(response => {
            console.log('Auth test response status:', response.status);
            if (!response.ok) {
                console.log('User appears to not be authenticated, status:', response.status);
                return;
            }
            console.log('User is authenticated, proceeding with order creation');
            
            // Send the order creation request asynchronously and handle the response
        fetch(route('orders'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            },
            body: JSON.stringify({
                listing_id: selectedCurrency.id,
                amount: selectedCurrency.total_amount,
                from_currency: selectedCurrency.from_currency,
                to_currency: selectedCurrency.to_currency
            })
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                return response.json().then(data => {
                    console.log('Error response JSON:', data);
                    // Don't throw here, just return the error data to be handled in the next .then()
                    return { ...data, isError: true };
                }).catch(err => {
                    // If JSON parsing fails, fallback to text
                    return response.text().then(text => {
                        console.log('Error response text:', text);
                        return { error: 'Server returned non-JSON response', details: text, isError: true };
                    });
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            
            // Check if this is an error response
            if (data.isError) {
                // Handle error response from server
                const errorMessage = data.error || data.message || 'Order creation failed';
                toast.error(errorMessage);
                return;
            }
            
            // Check if the response indicates success
            if (data.success) {
                // Show success message from server or default
                const successMessage = data.message || 'Order created successfully! Your exchange has been completed.';
                toast.success(successMessage);
                
                // Log additional order details if available
                if (data.order) {
                    console.log('Order details:', data.order);
                }
                if (data.seller_earning) {
                    console.log('Seller earning:', data.seller_earning);
                }
                if (data.buyer_earning) {
                    console.log('Buyer earning:', data.buyer_earning);
                }
            } else {
                // Handle case where success is false but no HTTP error
                const errorMessage = data.error || data.message || 'Order creation failed';
                toast.error(errorMessage);
            }
        })
        .catch(errors => {
            console.error('Order creation failed:', errors);
            
            // Handle different error response formats
            let errorMessage = 'Failed to create order. Please try again.';
            
            if (typeof errors === 'string') {
                errorMessage = errors;
            } else if (errors && typeof errors === 'object') {
                // OrderController returns error in different formats
                if (errors.error) {
                    errorMessage = errors.error;
                } else if (errors.message) {
                    errorMessage = errors.message;
                } else if (Object.keys(errors).length > 0) {
                    // If it's a validation error object
                    errorMessage = Object.values(errors).join(', ');
                }
            }
            
            toast.error(errorMessage);
        });
        })
        .catch(error => {
            console.error('Auth test failed:', error);
            toast.error('Authentication check failed. Please log in again.');
        });

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
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                body, html {
                    overflow: hidden;
                    height: 100vh;
                    touch-action: pan-y;
                }
                .no-scroll {
                    overflow: hidden;
                    height: 100vh;
                }
            `}</style>
            <div className="min-h-screen bg-white dark:bg-slate-950 no-scroll">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            {/* Logo */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-500">
                                    <BsCurrencyExchange className="text-white text-sm sm:text-xl" />
                                </div>
                                <span className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white hidden xs:block sm:block">CrossPay</span>
                            </div>

                            {/* Search and Filters - Center */}
                            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
                                {/* Search Bar */}
                                <div className="relative w-full max-w-[120px] sm:max-w-xs">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-8 sm:h-10 pl-8 sm:pl-10 pr-8 sm:pr-10 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                </div>

                                {/* Currency Filters */}
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap hidden sm:block">Filter:</span>
                                    <div className={`flex gap-1 ${uniqueCurrencyPairs.length > 3 ? 'overflow-x-auto scrollbar-hide' : ''} max-w-[100px] sm:max-w-xs`}>
                                        {uniqueCurrencyPairs.slice(0, isMobile ? 2 : 4).map((pair) => (
                                            <button
                                                key={pair}
                                                onClick={() => {
                                                    setSelectedFilters(prev => {
                                                        if (prev.includes(pair)) {
                                                            return prev.filter(f => f !== pair);
                                                        } else {
                                                            return [...prev, pair];
                                                        }
                                                    });
                                                }}
                                                className={`px-1.5 sm:px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex-shrink-0 ${
                                                    selectedFilters.includes(pair)
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {pair}
                                            </button>
                                        ))}
                                        {uniqueCurrencyPairs.length > (isMobile ? 2 : 4) && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 px-1.5 sm:px-2 py-1">
                                                +{uniqueCurrencyPairs.length - (isMobile ? 2 : 4)}
                                            </span>
                                        )}
                                    </div>
                                    {selectedFilters.length > 0 && (
                                        <button
                                            onClick={() => setSelectedFilters([])}
                                            className="px-1.5 sm:px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap flex-shrink-0"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* User Icon */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                {auth.user ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-2 sm:gap-3 h-8 sm:h-10 px-2 sm:px-3 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-200 group">
                                                {/* User Avatar */}
                                                <div className="relative">
                                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-sm">
                                                        {auth.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border border-white dark:border-slate-900"></div>
                                                </div>
                                                {/* User Name */}
                                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors hidden sm:block">
                                                    {auth.user.name.split(' ')[0]}
                                                </span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end">
                                            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                                                        {auth.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{auth.user.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{auth.user.email}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="py-2">
                                                <Link href={"/dashboard"}>
                                                    <DropdownMenuItem className="cursor-pointer py-2 px-3">
                                                        <UserIcon className="mr-3 h-4 w-4 text-gray-500" />
                                                        <div>
                                                            <div className="font-medium">Profile</div>
                                                            <div className="text-xs text-gray-500">View your profile</div>
                                                        </div>
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem className="cursor-pointer py-2 px-3">
                                                    <Settings className="mr-3 h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <div className="font-medium">Settings</div>
                                                        <div className="text-xs text-gray-500">Account preferences</div>
                                                    </div>
                                                </DropdownMenuItem>
                                            </div>
                                            <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                                            <Link href={logout()} method="post" as="button">
                                                <DropdownMenuItem className="cursor-pointer text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 py-2 px-3">
                                                    <LogOut className="mr-3 h-4 w-4" />
                                                    <div>
                                                        <div className="font-medium">Log out</div>
                                                        <div className="text-xs text-red-500">Sign out of your account</div>
                                                    </div>
                                                </DropdownMenuItem>
                                            </Link>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <Link
                                            href={login().url}
                                            className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={register().url}
                                            className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                                        >
                                            Register
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8 pt-20 sm:pt-24 relative">
                    {/* Mobile Last Updated - Above Content */}
                    <div className="sm:hidden flex justify-center mb-4">
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full shadow-lg px-4 py-2">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Updated {formatRelativeTime(lastUpdateTime)}
                                </span>
                                <div 
                                    className="text-gray-500 dark:text-gray-500 cursor-help"
                                    title={formatFullTime(lastUpdateTime)}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Fixed Last Updated */}
                    <div className="hidden sm:flex fixed top-20 right-6 z-40 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full shadow-lg px-4 py-2" style={{ top: 'calc(5rem + 2rem + 600px)' }}>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-gray-600 dark:text-gray-400">
                                Updated {formatRelativeTime(lastUpdateTime)}
                            </span>
                            <div 
                                className="text-gray-500 dark:text-gray-500 cursor-help"
                                title={formatFullTime(lastUpdateTime)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Currency Cards Grid */}
                    <div className="relative mt-4 sm:mt-8 mb-2 sm:mb-16">
                        {/* Scroll Container with Fixed Height */}
                        <div 
                            ref={setScrollContainer}
                            className={`h-[80vh] sm:h-[600px] overflow-y-auto transition-all duration-300 scroll-smooth scrollbar-hide ${
                                isScrolling ? '' : ''
                            }`}
                        >
                            {/* Top Fade */}
                            {showTopFade && (
                                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent dark:from-slate-950 z-10 pointer-events-none"></div>
                            )}
                            
                            {/* Bottom Fade */}
                            {showBottomFade && (
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent dark:from-slate-950 z-10 pointer-events-none"></div>
                            )}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
                                {filteredCurrencies.map((currency, idx) => (
                                    <div
                                        key={currency.id}
                                        ref={idx === filteredCurrencies.length - 1 ? lastListingRef : null}
                                        className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-xl transition-all duration-500 ease-out hover:scale-[1.02] sm:hover:scale-[1.03] hover:border-blue-300 dark:hover:border-blue-600 transform-gpu"
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="w-10 h-6 sm:w-12 sm:h-8 rounded overflow-hidden shadow-sm">
                                                    <ReactCountryFlag
                                                        countryCode={getCountryCode(currency.code)}
                                                        svg
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                        title={currency.name}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                                                        {currency.name}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                                        {currency.code}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    1 {currency.to_currency}
                                                </div>
                                                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                                                    {formatRate(1 / currency.rate)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 sm:p-3">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">24h Change</div>
                                                <div className={`text-xs sm:text-sm font-semibold ${
                                                    currency.change24h >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {currency.change24h >= 0 ? '+' : ''}
                                                    {formatChange(currency.change24h)}%
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 sm:p-3">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available</div>
                                                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                                    {formatRate(currency.amount, 4)} {currency.from_currency}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price Range */}
                                        <div className="flex items-center justify-between mb-3 sm:mb-4 text-xs">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Low: </span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {formatRate(1 / currency.high24h)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">High: </span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {formatRate(1 / currency.low24h)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Exchange Button */}
                                        <button
                                            onClick={() => handleBuyClick(currency)}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
                                        >
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            Exchange {currency.code}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Loading more listings...</span>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-1 text-center text-xs text-gray-600 dark:text-gray-400">
                        <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                    </div>
                </main>
            </div>

            {/* Buy Currency Modal */}
            {showBuyModal && selectedCurrency && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 w-full max-w-md transform transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto relative mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                Exchange {selectedCurrency.name} ({selectedCurrency.code})
                            </h3>
                            <button
                                onClick={() => setShowBuyModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl sm:text-base flex-shrink-0"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleBuySubmit}>
                            <div className="mb-4 sm:mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Amount to Pay
                                </label>
                                <div className="relative rounded-lg border-0 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 bg-red-500 rounded-l-2xl">
                                            <div className="py-3 sm:py-4 px-3 sm:px-4">
                                                <span className="block text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {Number(selectedCurrency?.total_amount)?.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 bg-gray-50 rounded-r-2xl dark:bg-slate-700 px-3 sm:px-4 py-3 sm:py-4 border-l border-gray-200 rounded dark:border-gray-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 text-lg sm:text-1xl font-bold text-white-400 dark:text-white-200">
                                                {selectedCurrency?.to_currency}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 sm:mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    You will receive
                                </label>
                                <div className="relative rounded-lg border-0 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 bg-green-500 rounded-l-2xl">
                                            <div className="py-3 sm:py-4 px-3 sm:px-4">
                                                <span className="block text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                                                     {Number(selectedCurrency?.amount)?.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 rounded-r-2xl bg-gray-50 dark:bg-slate-700 px-3 sm:px-4 py-3 sm:py-4 border-l border-gray-200 rounded dark:border-gray-600">
                                            <span className="inline-flex items-center px-2.5 py-0.5 text-lg sm:text-1xl font-bold text-white-400 dark:text-white-200">
                                                {selectedCurrency?.from_currency}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 sm:mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Exchange Rate
                                </label>
                                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        1 {selectedCurrency?.to_currency} = { formatRate(1 / selectedCurrency?.rate) || 0} {selectedCurrency?.from_currency}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Fee: {selectedCurrency?.fee}% ({formatRate(selectedCurrency?.fee_amount || 0)} {selectedCurrency?.to_currency})
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBuyModal(false)}
                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
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