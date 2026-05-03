/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
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
  Columns as ColumnsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INDIAN_STOCKS } from './data/stocks';
import { Stock, Sector, ScreenerFilters } from './types';

// Column Visibility State
type ColumnKey = keyof Stock | 'actions';

const COLUMN_LABELS: Record<string, string> = {
  symbol: 'Symbol',
  name: 'Company',
  sector: 'Sector',
  marketCapCr: 'Market Cap (Cr)',
  promoterHoldingTrend: 'Promoter Trend',
  pledgedHoldingPct: 'Pledged %',
  debtToEquity: 'Debt to Equity',
  interestCoverageRatio: 'Interest Coverage Ratio',
  avgRoce5y: '5Y Avg Return on Capital',
  avgRoe5y: '5Y Avg Return on Equity',
  ebitdaMarginPct: 'Operating Margin',
  netProfitMarginPct: 'Net Profit Margin',
  cashFlowMarginPct: 'Cash Flow Margin',
  freeCashFlowCr: 'Free Cash Flow (Cr)',
  revenueGrowth5y: '5Y Revenue Growth',
  ebitdaGrowth5y: '5Y Operating Growth',
  epsGrowth5y: '5Y Earnings per Share Growth',
  price: 'Price',
};

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'symbol',
  'name',
  'marketCapCr',
  'avgRoce5y',
  'debtToEquity',
  'revenueGrowth5y',
  'netProfitMarginPct',
  'promoterHoldingTrend'
];

export default function App() {
  const [filters, setFilters] = useState<ScreenerFilters>({
    search: '',
    sector: 'All',
    minMarketCap: 1000,
    maxPledged: 15,
    minRoce: 15,
    minRoe: 12,
    minEbitdaMargin: 18,
    minNetProfitMargin: 10,
    minRevenueGrowth: 10,
    onlyIncreasingPromoter: false,
  });

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' } | null>(null);

  // Filter Logic
  const filteredStocks = useMemo(() => {
    return INDIAN_STOCKS.filter((stock) => {
      const matchesSearch = stock.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                            stock.symbol.toLowerCase().includes(filters.search.toLowerCase());
      const matchesSector = filters.sector === 'All' || stock.sector === filters.sector;
      
      const passMarketCap = stock.marketCapCr > filters.minMarketCap;
      const passPromoter = !filters.onlyIncreasingPromoter || stock.promoterHoldingTrend === 'Increasing';
      const passPledged = stock.pledgedHoldingPct < filters.maxPledged;
      
      const passRoce = stock.avgRoce5y > filters.minRoce;
      const passRoe = stock.avgRoe5y > filters.minRoe;
      const passEbitdaMargin = stock.ebitdaMarginPct > filters.minEbitdaMargin;
      const passNetProfitMargin = stock.netProfitMarginPct > filters.minNetProfitMargin;
      const passRevenueGrowth = stock.revenueGrowth5y > filters.minRevenueGrowth;
      const passFcf = stock.freeCashFlowCr > 0;
      
      const passDebtToEquity = stock.isFinance || (stock.debtToEquity !== null && stock.debtToEquity < 1);
      const passInterestCoverage = stock.isFinance || (stock.interestCoverageRatio !== null && stock.interestCoverageRatio > 3);
      
      return matchesSearch && matchesSector && passMarketCap && passPromoter && passPledged && 
             passRoce && passRoe && passEbitdaMargin && passNetProfitMargin && passRevenueGrowth &&
             passFcf && passDebtToEquity && passInterestCoverage;
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
  }, [filters, sortConfig]);

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
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="font-semibold text-sm md:text-lg tracking-tight truncate block">Stock Screener</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Market Cap &gt; 1K Cr</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Return on Capital &gt; 15%</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Debt to Equity &lt; 1.0</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Pledged Holding &lt; 15%</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..."
              className="bg-slate-100 border-none rounded-full py-1.5 pl-9 pr-3 w-32 md:w-48 lg:w-64 text-xs md:text-sm focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <button 
            onClick={() => setShowColumnManager(!showColumnManager)}
            className={`p-2 rounded-lg transition-colors shrink-0 ${showColumnManager ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Manage Columns"
          >
            <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
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
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Finance sector skips Debt & Interest checks</span>
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
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Show/Hide Metrics</h3>
                <button 
                  onClick={() => setShowColumnManager(false)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase"
                >
                  Apply
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
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

        {/* Results Table */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse table-auto min-w-max">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="h-10">
                  {visibleColumns.map((key) => (
                    <th 
                      key={key} 
                      onClick={() => handleSort(key)}
                      className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        {COLUMN_LABELS[key]}
                        <ArrowUpDown className={`w-2.5 h-2.5 transition-opacity ${sortConfig?.key === key ? 'text-indigo-600 opacity-100' : 'opacity-20 group-hover:opacity-100'}`} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] md:text-sm">
                {filteredStocks.length > 0 ? (
                  filteredStocks.map((stock) => (
                    <tr 
                      key={stock.id} 
                      className="h-12 hover:bg-slate-50 transition-colors group"
                    >
                      {visibleColumns.map((key) => (
                        <td key={key} className="px-4 py-2">
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
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <span className="font-medium animate-pulse text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
              {filteredStocks.length} Results
            </span>
            <span className="shrink-0">Market Universe: {INDIAN_STOCKS.length}</span>
            {sortConfig && (
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                Sorted by: <span className="text-indigo-600">{COLUMN_LABELS[sortConfig.key]}</span> {sortConfig.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="opacity-50">v1.1.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function renderValue(key: ColumnKey, value: any, stock: Stock) {
  if (value === null) return <span className="text-slate-300 italic">—</span>;

  if (key === 'symbol') {
    return (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 leading-none">{value}</span>
      </div>
    );
  }
  
  if (key === 'name') {
    return <span className="text-xs font-semibold text-slate-800 line-clamp-1">{value}</span>;
  }

  if (key === 'sector') {
    return <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">{value}</span>;
  }

  if (key === 'marketCapCr' || key === 'freeCashFlowCr' || key === 'price') {
    const formatted = typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value;
    return <span className="font-mono text-[13px] text-slate-700">{formatted}</span>;
  }

  if (key.toString().toLowerCase().includes('pct') || 
      key.toString().toLowerCase().includes('roce') || 
      key.toString().toLowerCase().includes('roe') || 
      key.toString().toLowerCase().includes('growth')) {
    
    const isHigh = typeof value === 'number' && value > 25;
    const isMedium = typeof value === 'number' && value > 15;
    
    return (
      <span className={`font-mono text-xs font-semibold ${isHigh ? 'text-indigo-600' : isMedium ? 'text-emerald-600' : 'text-slate-600'}`}>
        {typeof value === 'number' ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : value}
      </span>
    );
  }

  if (key === 'promoterHoldingTrend') {
    return (
      <div className="flex items-center gap-1.5">
        {value === 'Increasing' ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-amber-500 opacity-40" />
        )}
        <span className="text-[10px] uppercase font-bold text-slate-500">{value}</span>
      </div>
    );
  }

  if (key === 'debtToEquity' || key === 'interestCoverageRatio') {
    const isRisky = key === 'debtToEquity' && typeof value === 'number' && value > 0.8;
    return <span className={`font-mono text-xs ${isRisky ? 'text-amber-600' : 'text-slate-600'}`}>{value}</span>;
  }

  return <span className="text-sm text-slate-600">{value.toString()}</span>;
}

