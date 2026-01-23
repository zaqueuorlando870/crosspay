import { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type Currency = 'USD' | 'AOA' | 'EUR' | 'GBP' | 'ZAR';

const currencyFormats: Record<Currency, { symbol: string; locale: string }> = {
    USD: { symbol: '$', locale: 'en-US' },
    AOA: { symbol: 'Kz', locale: 'pt-AO' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
    ZAR: { symbol: 'R', locale: 'en-ZA' },
};

export function formatCurrency(amount: number, currency: Currency = 'USD', options: { showPlus?: boolean } = {}): string {
    const { symbol, locale } = currencyFormats[currency] || currencyFormats.USD;
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    
    let formattedAmount: string;
    
    // For AOA, we'll format it as Kz 1,234.56 instead of 1.234,56 Kz
    if (currency === 'AOA') {
        formattedAmount = `${symbol} ${Math.abs(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    } else {
        formattedAmount = formatter.format(Math.abs(amount));
    }
    
    // Add + sign for positive amounts if showPlus is true
    if (options.showPlus && amount > 0) {
        return `+${formattedAmount}`;
    } else if (amount < 0) {
        return `-${formattedAmount}`;
    }
    
    return formattedAmount;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isSameUrl(
    url1: NonNullable<InertiaLinkProps['href']>,
    url2: NonNullable<InertiaLinkProps['href']>,
) {
    return resolveUrl(url1) === resolveUrl(url2);
}

export function resolveUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}
