/* Sample data for LiveMapBlock: the figures in the Figma block. Replace it with your own. */
import type { LiveMapCity, LiveMapInsight, LiveMapRegion, LiveMapTotals } from './types';

export const SAMPLE_REGIONS: LiveMapRegion[] = [
  { id: 'americas', label: 'Americas', center: [20, -80] },
  { id: 'emea', label: 'EMEA', center: [35, 15] },
  { id: 'apac', label: 'APAC', center: [14, 112] },
];

export const SAMPLE_CITIES: LiveMapCity[] = [
  {
    id: 'london', name: 'London', country: 'GB', countryName: 'United Kingdom', region: 'emea', position: [51.5, -0.1], timeZone: 'Europe/London',
    revenue: 334204, payments: 13855, approvalRate: 97.8, avgPayment: 24.12, vsForecast: 6,
    methods: [{ label: 'Cards', share: 64 }, { label: 'Wallets', share: 24 }, { label: 'Bank transfer', share: 12 }],
  },
  {
    id: 'singapore', name: 'Singapore', country: 'SG', countryName: 'Singapore', region: 'apac', position: [1.35, 103.8], timeZone: 'Asia/Singapore',
    revenue: 251960, payments: 10230, approvalRate: 97.4, avgPayment: 24.63, vsForecast: 3,
    methods: [{ label: 'Cards', share: 58 }, { label: 'Wallets', share: 31 }, { label: 'Bank transfer', share: 11 }],
  },
  {
    id: 'tokyo', name: 'Tokyo', country: 'JP', countryName: 'Japan', region: 'apac', position: [35.7, 139.7], timeZone: 'Asia/Tokyo',
    revenue: 197804, payments: 8912, approvalRate: 97.1, avgPayment: 22.19, vsForecast: 18,
    methods: [{ label: 'Cards', share: 71 }, { label: 'Wallets', share: 19 }, { label: 'Bank transfer', share: 10 }],
  },
  {
    id: 'mumbai', name: 'Mumbai', country: 'IN', countryName: 'India', region: 'apac', position: [19.1, 72.9], timeZone: 'Asia/Kolkata',
    revenue: 164310, payments: 11480, approvalRate: 95.9, avgPayment: 14.31, vsForecast: 9,
    methods: [{ label: 'Cards', share: 38 }, { label: 'Wallets', share: 47 }, { label: 'Bank transfer', share: 15 }],
  },
  {
    id: 'sydney', name: 'Sydney', country: 'AU', countryName: 'Australia', region: 'apac', position: [-33.9, 151.2], timeZone: 'Australia/Sydney',
    revenue: 138225, payments: 5210, approvalRate: 94.2, avgPayment: 26.53, vsForecast: -2, status: 'watch',
    methods: [{ label: 'Cards', share: 77 }, { label: 'Wallets', share: 15 }, { label: 'Bank transfer', share: 8 }],
  },
];

export const SAMPLE_TOTALS: LiveMapTotals = { revenue: 3941220, payments: 168402, approvalRate: 96.8, vsForecast: 12.4, cities: 40 };

export const SAMPLE_INSIGHT: LiveMapInsight = {
  title: 'Europe is leading',
  body: 'London brings in $334K, 8.5% of today. Tokyo is running 18% above forecast.',
  short: 'Europe leads · London $334K',
};

/** Payment volume for each hour of today (UTC), relative. Hours that have not happened yet are not drawn. */
export const SAMPLE_HOURLY: number[] = [11, 9, 8, 7, 8, 10, 14, 17, 21, 25, 28, 31, 30, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** The moment the Figma block shows: 13:42:03 UTC on 14 November 2026. */
export const SAMPLE_NOW = new Date(Date.UTC(2026, 10, 14, 13, 42, 3));
