import axios from 'axios';

// Note: Replace with your actual API key from ExchangeRate-API
const EXCHANGE_RATE_API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY || '';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

let ratesCache: { [key: string]: number } | null = null;
let lastFetchTime = 0;

// Default rates in case API fails
const DEFAULT_RATES = {
  USD: 1,
  EUR: 0.92,
  ZAR: 18.75,
  AOA: 842.50,
  NAD: 18.75
};

export async function getExchangeRates() {
  const now = Date.now();
  
  // Return cached rates if they're still fresh
  if (ratesCache && (now - lastFetchTime) < CACHE_DURATION) {
    return ratesCache;
  }

  // If no API key is provided, return default rates
  if (!EXCHANGE_RATE_API_KEY) {
    console.warn('No ExchangeRate-API key provided. Using default rates.');
    return DEFAULT_RATES;
  }

  try {
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`
    );
    
    if (response.data.result === 'success') {
      ratesCache = response.data.conversion_rates;
      lastFetchTime = now;
      
      // Ensure we have all required currencies
      return {
        ...DEFAULT_RATES,
        ...ratesCache
      };
    }
    throw new Error('Failed to fetch exchange rates');
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return ratesCache || DEFAULT_RATES;
  }
}
