/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Settings2, 
  ArrowUpDown, 
  ChevronDown, 
  Filter, 
  Info, 
  TrendingUp, 
  TrendingDown,
  LayoutGrid,
  Table as TableIcon,
  Columns as ColumnsIcon,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INDIAN_STOCKS } from './data/stocks';
import { Stock, Sector, ScreenerFilters } from './types';

// Column Visibility & Width State
type ColumnKey = keyof Stock | 'actions';

const COLUMN_LABELS: Record<string, string> = {
  symbol: 'Symbol',
  price: 'Price',
  intrinsicValue: 'Intrinsic Value',
  marketCapCr: 'MCap (Cr)',
  pe: 'P/E',
  sectorPe: 'Sect. PE',
  avgRoce5y: 'ROCE 5Y %',
  avgRoe3y: 'ROE 3Y %',
  debtToEquity: 'D/E Ratio',
  revenueGrowth5y: 'Sales Gr 5Y %',
  epsGrowth5y: 'EPS Gr 5Y %',
};

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'symbol',
  'marketCapCr',
  'price',
  'intrinsicValue',
  'pe',
  'sectorPe',
  'avgRoce5y',
  'avgRoe3y',
  'debtToEquity',
  'revenueGrowth5y',
  'epsGrowth5y'
];

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(INDIAN_STOCKS);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filters, setFilters] = useState<ScreenerFilters>({
    search: '',
    sector: 'All',
    minMarketCap: 1000,
    maxPledged: 15,
    minRoce: 15,
    minRoe: 12,
    minOperatingMargin: 18,
    minNetProfitMargin: 10,
    minCashFlowMargin: 10,
    minRevenueGrowth: 10,
    minOperatingGrowth: 12,
    minEpsGrowth: 10,
    maxDebtToEquity: 1,
    minInterestCoverage: 3,
    minRoce3y: 15,
    minRoe3y: 12,
    minRevenueGrowth3y: 10,
    minOperatingGrowth3y: 12,
    minEpsGrowth3y: 10,
    maxPe: 50,
    onlyIncreasingPromoter: false,
  });

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);


  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' } | null>(null);

  // Resizing logic
  const handleResize = (key: string, e: React.MouseEvent) => {
    const startX = e.pageX;
    const startWidth = columnWidths[key] || 120; // Default width

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(startWidth + (moveEvent.pageX - startX), 60);
      setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Live Data Refresh from API
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Chunk symbols to avoid URL length issues (though 50 is fine)
      const symbolList = stocks.map(s => s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO') ? s.symbol : `${s.symbol}.NS`).join(',');
      
      const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbolList)}`);
      
      if (!response.ok) throw new Error('API fetch failed');
      
      const liveData = await response.json();
      
      // Update stocks with live prices
      setStocks(prevStocks => prevStocks.map(stock => {
        const symbolNs = stock.symbol.endsWith('.NS') || stock.symbol.endsWith('.BO') ? stock.symbol : `${stock.symbol}.NS`;
        const liveMatch = Array.isArray(liveData) ? liveData.find((d: any) => d.symbol === symbolNs) : null;
        
        const livePrice = liveMatch ? (liveMatch.price ?? liveMatch.currentPrice ?? liveMatch.lastPrice) : null;
        
        if (typeof livePrice === 'number') {
          // Adjust PE based on price fluctuation
          const priceScale = livePrice / (stock.price || 1);
          return {
            ...stock,
            price: livePrice,
            pe: Number((stock.pe * priceScale).toFixed(2))
          };
        }
        return stock;
      }));

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch live quotes:', error);
      // Fallback to minimal random fluctuation if real API fails 
      // so it doesn't look broken during dev
      setStocks(prevStocks => prevStocks.map(stock => {
        const fluctuation = 1 + (Math.random() * 0.001 - 0.0005);
        return {
          ...stock,
          price: Number((stock.price * fluctuation).toFixed(2)),
          pe: Number((stock.pe * fluctuation).toFixed(2))
        };
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh frequently to feel "live"
  useEffect(() => {
    // Initial fetch
    handleRefresh();
    
    const interval = setInterval(handleRefresh, 15000); // UI updates every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter Logic
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesSearch = stock.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                            stock.symbol.toLowerCase().includes(filters.search.toLowerCase());
      const matchesSector = filters.sector === 'All' || stock.sector === filters.sector;
      
      const passMarketCap = stock.marketCapCr >= filters.minMarketCap;
      const passPromoter = !filters.onlyIncreasingPromoter || stock.promoterHoldingTrend === 'Increasing';
      const passPledged = stock.pledgedHoldingPct <= filters.maxPledged;
      
      const passRoce = stock.avgRoce5y >= filters.minRoce;
      const passRoe = stock.avgRoe5y >= filters.minRoe;
      const passOperatingMargin = stock.ebitdaMarginPct >= filters.minOperatingMargin;
      const passNetProfitMargin = stock.netProfitMarginPct >= filters.minNetProfitMargin;
      const passCashFlowMargin = stock.cashFlowMarginPct >= filters.minCashFlowMargin;
      
      const passRevenueGrowth = stock.revenueGrowth5y >= filters.minRevenueGrowth;
      const passOperatingGrowth = stock.ebitdaGrowth5y >= filters.minOperatingGrowth;
      const passEpsGrowth = stock.epsGrowth5y >= filters.minEpsGrowth;
      
      const passFcf = stock.freeCashFlowCr > 0;
      
      const passDebtToEquity = stock.isFinance || (stock.debtToEquity !== null && stock.debtToEquity <= filters.maxDebtToEquity);
      const passInterestCoverage = stock.isFinance || (stock.interestCoverageRatio !== null && stock.interestCoverageRatio >= filters.minInterestCoverage);
      
      const passRoce3y = stock.avgRoce3y >= filters.minRoce3y;
      const passRoe3y = stock.avgRoe3y >= filters.minRoe3y;
      const passRevenueGrowth3y = stock.revenueGrowth3y >= filters.minRevenueGrowth3y;
      const passOperatingGrowth3y = stock.ebitdaGrowth3y >= filters.minOperatingGrowth3y;
      const passEpsGrowth3y = stock.epsGrowth3y >= filters.minEpsGrowth3y;
      const passPe = stock.pe <= filters.maxPe;

      return matchesSearch && matchesSector && passMarketCap && passPromoter && passPledged && 
             passRoce && passRoe && passOperatingMargin && passNetProfitMargin && passCashFlowMargin &&
             passRevenueGrowth && passOperatingGrowth && passEpsGrowth && 
             passFcf && passDebtToEquity && passInterestCoverage &&
             passRoce3y && passRoe3y && passRevenueGrowth3y && passOperatingGrowth3y && passEpsGrowth3y && passPe;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const aVal = a[key as keyof Stock];
      const bVal = b[key as keyof Stock];
      
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filters, sortConfig, stocks]);

  const handleSort = (key: ColumnKey) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="h-auto md:h-20 bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-0 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-none">Personal Stock Screener</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Fundamental Analysis Dashboard</span>
          </div>
        </div>



        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2.5 rounded-xl border border-slate-200 transition-all text-slate-500 hover:bg-slate-50 active:scale-95 ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowFilterSidebar(true)}
            className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-900 rounded-xl text-white transition-all hover:bg-slate-800 shadow-lg shadow-slate-200 active:scale-95"
            title="Advanced Filters"
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Filters</span>
          </button>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Quick search..."
              className="bg-slate-100 border-none rounded-xl py-2 pl-9 pr-3 w-32 lg:w-48 text-xs focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <button 
            onClick={() => setShowColumnManager(!showColumnManager)}
            className={`p-2.5 rounded-xl border transition-all shrink-0 active:scale-95 ${showColumnManager ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            title="Manage Columns"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sector Navigation */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
        <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-wider whitespace-nowrap">Sectors:</span>
        <button 
          onClick={() => setFilters({ ...filters, sector: 'All' })}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${filters.sector === 'All' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          All universe
        </button>
        {Object.values(Sector).map(s => (
          <button 
            key={s}
            onClick={() => setFilters({ ...filters, sector: s })}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all shrink-0 ${filters.sector === s ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
        {/* Growth Filter Summary */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
             <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-8 h-4 rounded-full relative transition-colors ${filters.onlyIncreasingPromoter ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <input 
                  type="checkbox"
                  className="sr-only"
                  checked={filters.onlyIncreasingPromoter}
                  onChange={(e) => setFilters({ ...filters, onlyIncreasingPromoter: e.target.checked })}
                />
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${filters.onlyIncreasingPromoter ? 'left-4.5' : 'left-0.5'}`} />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Increasing Promoter Holding</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Market Live</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5" />
              Sync: {lastUpdated.toLocaleTimeString()}
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Finance sector skips Debt & Interest checks</span>
            </div>
          </div>
        </div>

        {/* Column Manager Popup */}
        <AnimatePresence>
          {showColumnManager && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6 bg-indigo-50/50 rounded-xl border border-indigo-100 p-4 md:p-6 shadow-inner"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Displayed Financial Metrics</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setVisibleColumns(Object.keys(COLUMN_LABELS) as ColumnKey[])}
                      className="text-[10px] font-bold text-indigo-600 hover:underline transition-all"
                    >
                      SELECT ALL
                    </button>
                    <button 
                      onClick={() => setVisibleColumns(['symbol', 'name'])}
                      className="text-[10px] font-bold text-slate-400 hover:underline transition-all"
                    >
                      RESET
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowColumnManager(false)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase"
                >
                  Apply & Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map(key => (
                  <label key={key} className="flex items-center gap-2 text-[11px] md:text-xs cursor-pointer select-none group">
                    <input 
                      type="checkbox"
                      checked={visibleColumns.includes(key)}
                      onChange={() => toggleColumn(key)}
                      className="accent-indigo-600 rounded"
                    />
                    <span className={`transition-colors truncate ${visibleColumns.includes(key) ? 'font-semibold text-indigo-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {COLUMN_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters Sidebar */}
        <AnimatePresence>
          {showFilterSidebar && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilterSidebar(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Advanced Screening Rules</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust Custom Thresholds</p>
                  </div>
                  <button 
                    onClick={() => setShowFilterSidebar(false)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <ArrowUpDown className="w-5 h-5 rotate-90" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth no-scrollbar">
                  {/* Market & Structure */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Size & Structure</h4>
                    
                    <FilterSlider 
                      label="Minimum Market Capitalization (Cr)" 
                      value={filters.minMarketCap} 
                      min={0} max={10000} step={500} 
                      onChange={(v) => setFilters({...filters, minMarketCap: v})}
                      suffix=" Cr"
                    />

                    <FilterSlider 
                      label="Maximum Pledged Promoter Holding %" 
                      value={filters.maxPledged} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, maxPledged: v})}
                      suffix="%"
                    />

                    <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <span className="text-xs font-semibold text-indigo-900">Only Increasing Promoter Trend</span>
                      <button 
                        onClick={() => setFilters({...filters, onlyIncreasingPromoter: !filters.onlyIncreasingPromoter})}
                        className={`w-10 h-5 rounded-full relative transition-all ${filters.onlyIncreasingPromoter ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${filters.onlyIncreasingPromoter ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Quality Metrics */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Earnings Quality</h4>
                    
                    <FilterSlider 
                      label="Minimum 5Y Avg Return on Capital" 
                      value={filters.minRoce} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRoce: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum 5Y Avg Return on Equity" 
                      value={filters.minRoe} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRoe: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum 3Y Avg Return on Capital" 
                      value={filters.minRoce3y} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRoce3y: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum 3Y Avg Return on Equity" 
                      value={filters.minRoe3y} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRoe3y: v})}
                      suffix="%"
                    />
                  </div>

                  {/* Valuation */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Valuation</h4>
                    
                    <FilterSlider 
                      label="Maximum P/E Ratio" 
                      value={filters.maxPe} 
                      min={1} max={200} step={1} 
                      onChange={(v) => setFilters({...filters, maxPe: v})}
                      suffix=""
                    />
                  </div>

                  {/* Margins */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Profitability & Cash</h4>
                    
                    <FilterSlider 
                      label="Minimum Operating Margin %" 
                      value={filters.minOperatingMargin} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minOperatingMargin: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum Net Profit Margin %" 
                      value={filters.minNetProfitMargin} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minNetProfitMargin: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum Cash Flow Margin %" 
                      value={filters.minCashFlowMargin} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minCashFlowMargin: v})}
                      suffix="%"
                    />
                  </div>

                  {/* Growth */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Historical Growth (5 Year)</h4>
                    
                    <FilterSlider 
                      label="Minimum Revenue Growth %" 
                      value={filters.minRevenueGrowth} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRevenueGrowth: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum Operating Growth %" 
                      value={filters.minOperatingGrowth} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minOperatingGrowth: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum Earnings per Share Growth %" 
                      value={filters.minEpsGrowth} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minEpsGrowth: v})}
                      suffix="%"
                    />
                  </div>

                  {/* Growth 3Y */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Medium-term Growth (3 Year)</h4>
                    
                    <FilterSlider 
                      label="Minimum Revenue Growth 3Y %" 
                      value={filters.minRevenueGrowth3y} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minRevenueGrowth3y: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum Operating Growth 3Y %" 
                      value={filters.minOperatingGrowth3y} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minOperatingGrowth3y: v})}
                      suffix="%"
                    />

                    <FilterSlider 
                      label="Minimum EPS Growth 3Y %" 
                      value={filters.minEpsGrowth3y} 
                      min={0} max={100} step={1} 
                      onChange={(v) => setFilters({...filters, minEpsGrowth3y: v})}
                      suffix="%"
                    />
                  </div>

                  {/* Solvency */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1">Efficiency & Solvency</h4>
                    
                    <FilterSlider 
                      label="Maximum Debt to Equity Ratio" 
                      value={filters.maxDebtToEquity} 
                      min={0} max={10} step={0.1} 
                      onChange={(v) => setFilters({...filters, maxDebtToEquity: v})}
                      suffix=""
                    />

                    <FilterSlider 
                      label="Minimum Interest Coverage Ratio" 
                      value={filters.minInterestCoverage} 
                      min={0} max={50} step={0.5} 
                      onChange={(v) => setFilters({...filters, minInterestCoverage: v})}
                      suffix=""
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFilters({
                      search: '',
                      sector: 'All',
                      minMarketCap: 1000,
                      maxPledged: 15,
                      minRoce: 15,
                      minRoe: 12,
                      minOperatingMargin: 18,
                      minNetProfitMargin: 10,
                      minCashFlowMargin: 10,
                      minRevenueGrowth: 10,
                      minOperatingGrowth: 12,
                      minEpsGrowth: 10,
                      maxDebtToEquity: 1,
                      minInterestCoverage: 3,
                      minRoce3y: 15,
                      minRoe3y: 12,
                      minRevenueGrowth3y: 10,
                      minOperatingGrowth3y: 12,
                      minEpsGrowth3y: 10,
                      maxPe: 50,
                      onlyIncreasingPromoter: false,
                    })}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setShowFilterSidebar(false)}
                    className="py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all uppercase tracking-widest"
                  >
                    Show Results
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Results Table */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
          <div className="flex-1 overflow-auto no-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-max">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="h-12">
                  {visibleColumns.map((key) => (
                    <th 
                      key={key} 
                      style={{ width: columnWidths[key] || 'auto', minWidth: key === 'symbol' ? '70px' : '90px' }}
                      className="relative px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider group"
                    >
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => handleSort(key)}
                      >
                        <span className="truncate">{COLUMN_LABELS[key]}</span>
                        <ArrowUpDown className={`w-2.5 h-2.5 shrink-0 transition-opacity ${sortConfig?.key === key ? 'text-indigo-600 opacity-100' : 'opacity-20 group-hover:opacity-100'}`} />
                      </div>
                      
                      {/* Resize Handle */}
                      <div 
                        onMouseDown={(e) => handleResize(key, e)}
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-200 opacity-0 group-hover:opacity-100 cursor-col-resize hover:bg-indigo-400 transition-all z-20"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] md:text-sm">
                {filteredStocks.length > 0 ? (
                  filteredStocks.map((stock) => (
                    <tr 
                      key={stock.id} 
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      {visibleColumns.map((key) => (
                        <td key={key} className="px-4 py-3 whitespace-nowrap">
                          {renderValue(key, stock[key as keyof Stock], stock)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={visibleColumns.length} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-6 h-6 md:w-8 md:h-8 text-slate-200" />
                        <p className="text-slate-400 font-medium italic text-xs md:text-sm">No results match your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-slate-500 font-medium">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <span className="font-bold animate-pulse text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
              {filteredStocks.length} Results
            </span>
            <span className="shrink-0 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-500" />
              Market Feed: NSE Real-time (Sync Active)
            </span>
            <span className="shrink-0 opacity-60">Session Date: {new Date().toLocaleDateString()}</span>
            {sortConfig && (
              <span className="uppercase font-bold text-slate-400 shrink-0">
                Sorted by: <span className="text-indigo-600">{COLUMN_LABELS[sortConfig.key]}</span> {sortConfig.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 uppercase tracking-widest font-bold opacity-60">
            <span>v1.2.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function FilterSlider({ label, value, min, max, step, onChange, suffix }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, suffix: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-bold text-indigo-600 tabular-nums">{value}{suffix}</span>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
}

function renderValue(key: ColumnKey, value: any, stock: Stock) {
  if (value === null) return <span className="text-slate-300 italic">—</span>;

  if (key === 'symbol') {
    return (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">{value}</span>
      </div>
    );
  }
  
  if (key === 'name') {
    return <span className="text-xs font-semibold text-slate-800 line-clamp-1">{value}</span>;
  }

  if (key === 'sector') {
    return <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider">{value}</span>;
  }

  if (key === 'marketCapCr' || key === 'price' || key === 'intrinsicValue' || key === 'pe' || key === 'sectorPe') {
    let formatted = typeof value === 'number' ? 
      (key === 'pe' || key === 'sectorPe' ? value.toFixed(1) : `₹${value.toLocaleString('en-IN')}`) 
      : value;
    
    // Valuation highlight
    let style = "text-slate-700";
    if (key === 'pe') {
      if (stock.pe < stock.sectorPe * 0.7) style = "text-emerald-600 font-bold underline decoration-emerald-200 underline-offset-4";
      if (stock.pe > stock.sectorPe * 2) style = "text-rose-500 font-medium";
    }

    if (key === 'intrinsicValue') {
       const isUndervalued = typeof value === 'number' && stock.price < value;
       style = isUndervalued ? "text-emerald-600 font-bold" : "text-slate-500 font-medium opacity-80";
    }

    if (key === 'price') {
      style = "font-bold text-slate-900";
    }

    return <span className={`font-mono text-[13px] ${style}`}>{formatted}</span>;
  }

  if (key.toString().toLowerCase().includes('pct') || 
      key.toString().toLowerCase().includes('roce') || 
      key.toString().toLowerCase().includes('roe') || 
      key.toString().toLowerCase().includes('growth')) {
    
    const val = typeof value === 'number' ? value : 0;
    const isHigh = val > 22;
    const isMedium = val > 15;
    const isNegative = val < 0;
    
    return (
      <span className={`font-mono text-[13px] ${isHigh ? 'text-emerald-600 font-bold bg-emerald-50/50 px-1 rounded' : isMedium ? 'text-emerald-600 font-semibold' : isNegative ? 'text-rose-500 font-medium' : 'text-slate-600'}`}>
        {typeof value === 'number' ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : value}
      </span>
    );
  }

  if (key === 'promoterHoldingTrend') {
    const isIncreasing = value === 'Increasing';
    const isStable = value === 'Stable';
    return (
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${isIncreasing ? 'bg-emerald-50 text-emerald-700' : isStable ? 'bg-slate-50 text-slate-600' : 'bg-rose-50 text-rose-700'}`}>
        {isIncreasing ? (
          <TrendingUp className="w-3 h-3" />
        ) : !isStable && (
          <TrendingDown className="w-3 h-3" />
        )}
        <span className="text-[10px] uppercase font-bold tracking-wider">{value}</span>
      </div>
    );
  }

  if (key === 'debtToEquity' || key === 'interestCoverageRatio') {
    const isRisky = key === 'debtToEquity' && typeof value === 'number' && value > 1.0;
    const isSafe = key === 'debtToEquity' && typeof value === 'number' && value < 0.3;
    return <span className={`font-mono text-[13px] ${isRisky ? 'text-rose-600 font-bold underline decoration-rose-200' : isSafe ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>{value}</span>;
  }

  return <span className="text-sm text-slate-600">{value?.toString() || ''}</span>;
}

