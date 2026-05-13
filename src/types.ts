export enum Sector {
  IT = 'Information Technology',
  Banking = 'Banking',
  FMCG = 'FMCG',
  Energy = 'Energy',
  Auto = 'Automobile',
  Pharma = 'Pharma',
  Finance = 'NBFC',
  Metals = 'Metals & Mining',
  Telecom = 'Telecom',
  Construction = 'Construction',
  Retail = 'Retail'
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: Sector;
  isFinance: boolean;
  marketCapCr: number;
  promoterHoldingTrend: 'Increasing' | 'Decreasing' | 'Stable';
  pledgedHoldingPct: number;
  debtToEquity: number | null; // null for Finance
  interestCoverageRatio: number | null; // null for Finance
  avgRoce5y: number;
  avgRoe5y: number;
  ebitdaMarginPct: number;
  netProfitMarginPct: number;
  cashFlowMarginPct: number;
  freeCashFlowCr: number;
  revenueGrowth5y: number;
  ebitdaGrowth5y: number;
  epsGrowth5y: number;
  price: number;
  bookValue: number;
  faceValue: number;
  pe: number;
  sectorPe: number;
  avgRoce3y: number;
  avgRoe3y: number;
  revenueGrowth3y: number;
  ebitdaGrowth3y: number;
  epsGrowth3y: number;
  intrinsicValue: number;
  vibe: string; // Brief description
}

export interface ScreenerFilters {
  search: string;
  sector: Sector | 'All';
  minMarketCap: number;
  maxPledged: number;
  minRoce: number;
  minRoe: number;
  minOperatingMargin: number;
  minNetProfitMargin: number;
  minCashFlowMargin: number;
  minRevenueGrowth: number;
  minOperatingGrowth: number;
  minEpsGrowth: number;
  maxDebtToEquity: number;
  minInterestCoverage: number;
  minRoce3y: number;
  minRoe3y: number;
  minRevenueGrowth3y: number;
  minOperatingGrowth3y: number;
  minEpsGrowth3y: number;
  maxPe: number;
  onlyIncreasingPromoter: boolean;
}
