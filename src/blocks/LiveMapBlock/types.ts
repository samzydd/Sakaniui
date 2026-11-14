import type { LatLng } from '../../components/Map/geo';

/** What the dots, the ranking and the figures show. */
export type LiveMapMetric = 'revenue' | 'payments' | 'approval';

/** default: the live map. loading: skeletons until the data arrives. empty: no payments yet today. */
export type LiveMapState = 'default' | 'loading' | 'empty';

export interface LiveMapRegion {
  id: string;
  /** Shown on the filter chip and beside the city name, e.g. "EMEA". */
  label: string;
  /** Where the globe turns when this region is chosen, as [latitude, longitude]. */
  center: LatLng;
}

export interface LiveMapCity {
  id: string;
  name: string;
  /** Two-letter code, shown beside the name in the list, e.g. "GB". */
  country: string;
  /** Shown in the selection chip, e.g. "Tokyo, Japan". */
  countryName: string;
  /** The id of one of `regions`. */
  region: string;
  /** [latitude, longitude]. */
  position: LatLng;
  /** IANA time zone, for the "22:42 local" in the hover card, e.g. "Asia/Tokyo". */
  timeZone: string;
  /** Revenue today, in dollars. */
  revenue: number;
  /** Payments today. */
  payments: number;
  /** Approval rate, in percent (97.1). */
  approvalRate: number;
  /** Average payment, in dollars. */
  avgPayment: number;
  /** Revenue against forecast, in percent: 6 shows "+6% vs forecast", -2 shows "-2% vs forecast". */
  vsForecast: number;
  /** "watch" gives the city a dashed amber ring on the globe and a Watch badge (approvals dipping). Defaults to "healthy". */
  status?: 'healthy' | 'watch';
  /** Share of revenue by payment method, in percent. */
  methods: { label: string; share: number }[];
}

export interface LiveMapTotals {
  /** Revenue today across every city, in dollars. */
  revenue: number;
  /** Payments today across every city. */
  payments: number;
  /** Approval rate across every city, in percent. */
  approvalRate: number;
  /** Revenue against forecast, in percent. */
  vsForecast: number;
  /** How many cities there are in all (the list shows the top few): "Top 5 of 40 cities". */
  cities: number;
}

export interface LiveMapInsight {
  title: string;
  body: string;
  /** The one line the phone layout shows in a pill. */
  short: string;
}
