import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { FiChevronDown, FiArrowDown, FiSearch } from 'react-icons/fi';
import { BsCurrencyExchange, BsGraphUpArrow, BsGlobe, BsCashCoin } from 'react-icons/bs';
import { Button } from '@headlessui/react';

interface RateCardProps {
    icon: React.ReactNode;
    pair: string;
    rate: string;
    change: string;
    isPositive: boolean;
}

const RateCard: React.FC<RateCardProps> = ({ icon, pair, rate, change, isPositive }) => (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <div className="bg-gray-700 p-2 rounded-full">
                {icon}
            </div>
            <div>
                <div className="font-medium">{pair}</div>
                <div className="text-gray-400 text-sm">1 USD = {rate} {pair.split('/')[1]}</div>
            </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {change}
        </span>
    </div>
);

export default function Welcome() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <Head title="Welcome" />

            {/* Header */}
            <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-gray-900/80 backdrop-blur-md py-2' : 'py-4'}`}>
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <BsCurrencyExchange className="text-white text-xl" />
                            </div>
                            <span className="text-xl font-bold">CrossPay</span>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center space-x-4">
                            <Link href="/login" className="px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
                                Login
                            </Link>
                            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-colors">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="container mx-auto flex flex-col md:flex-row items-center">
                    <div className="md:w-1/2 mb-12 md:mb-0">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                            Exchange currencies <br /> at the best rates
                        </h1>
                        <p className="text-gray-400 text-lg mb-8 max-w-lg">
                            Get the best exchange rates for USD, EUR, ZAR, and other major currencies with low fees and fast transfers.
                        </p>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                router.visit('/marketplace');
                            }}
                        >
                            Get started now
                        </Button>
                        <div className="mt-20 flex justify-center md:justify-start">
                            <div className="animate-bounce w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
                                <FiArrowDown className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Illustration Placeholder - You can replace with actual illustrations */}
                    <div className="md:w-1/2 relative">
                        <div className="relative">
                            {/* Credit Card Stack */}
                            <div className="absolute -top-20 right-20 w-40 h-24 bg-yellow-400 rounded-lg transform rotate-6"></div>
                            <div className="absolute -top-10 right-40 w-40 h-24 bg-green-400 rounded-lg transform -rotate-6"></div>
                            <div className="absolute top-0 right-20 w-40 h-24 bg-pink-400 rounded-lg transform rotate-3"></div>
                            <div className="absolute top-10 right-0 w-40 h-24 bg-blue-400 rounded-lg"></div>

                            {/* Decorative Shapes */}
                            <div className="absolute -top-32 right-0 w-24 h-24 rounded-full border-4 border-blue-500/30"></div>
                            <div className="absolute top-1/2 -right-10 w-16 h-16 bg-blue-600/20 rounded-full"></div>
                            <div className="absolute bottom-0 right-32 w-32 h-32 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute -bottom-10 right-20 w-12 h-12 bg-yellow-400/20 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Market Data Section */}
            <section className="py-12 bg-gray-900/50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <RateCard
                            icon={<BsCurrencyExchange className="text-blue-500 text-xl" />}
                            pair="USD/EUR"
                            rate="0.92"
                            change="+0.15%"
                            isPositive={true}
                        />
                        <RateCard
                            icon={<BsCurrencyExchange className="text-green-500 text-xl" />}
                            pair="USD/ZAR"
                            rate="18.75"
                            change="-0.32%"
                            isPositive={false}
                        />
                        <RateCard
                            icon={<BsCashCoin className="text-yellow-500 text-xl" />}
                            pair="USD/GBP"
                            rate="0.79"
                            change="+0.08%"
                            isPositive={true}
                        />
                        <RateCard
                            icon={<BsGlobe className="text-purple-500 text-xl" />}
                            pair="USD/AOA"
                            rate="825.50"
                            change="+0.12%"
                            isPositive={true}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}