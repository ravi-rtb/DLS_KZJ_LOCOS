

import React, { useState, useEffect, useMemo } from 'react';
import { getAllWag7Failures, getAllWdg4Failures, parseDateDDMMYY } from '../services/googleSheetService';
import type { TractionFailure } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import FailureDetailsModal from './FailureDetailsModal';
import { ChevronDownIcon, ChevronUpIcon, ClipboardDocumentListIcon } from './Icons';

interface FailuresSummaryProps {
  onBack: () => void;
}

type MonthlyCell = { count: number; items: TractionFailure[] };
type SummaryRow = { name: string; monthlyData: MonthlyCell[]; total: MonthlyCell };
type SummaryData = { title: string; groupTitle: string; headers: string[]; rows: SummaryRow[]; totals: Omit<SummaryRow, 'name'> };

type SummaryGroup = { name: string; rows: SummaryRow[]; totals: Omit<SummaryRow, 'name'> };
type GroupedSummaryData = {
  title: string;
  groupTitle: string;
  headers: string[];
  groups: SummaryGroup[];
  others: SummaryRow[];
  grandTotals: Omit<SummaryRow, 'name'>;
};

// --- WDG4 Specific Constants ---
const WDG4_SYSTEM_MAP: { [key: string]: string } = {
  '1 PPK': 'Power Pack',
  '2 Radiator': 'Radiator',
  '3 LOS': 'Lube Oil System',
  '4 FOS': 'Fuel Oil System',
  '5 CWS': 'Cooling Water System',
  '6 TSC': 'Turbo Super Charger',
  '7 COM': 'Compressor',
  '8 UNT': 'Under Truck',
  '11 ABK': 'Air Brake',
  '12 GOV': 'Governor',
  '14 BAT': 'Battery',
  '15 TM': 'Traction Motor',
  '16 TA': 'Traction Alternator',
  '17 Wires & Cables': 'Wires & cables',
  '18 Electric Control': 'Electric control',
  '21 AXE': 'Auxiliary Motors',
  '24 OTH': 'Others',
};
const WDG4_MECHANICAL_SYSTEMS = new Set([
  'Power Pack', 'Radiator', 'Lube Oil System', 'Fuel Oil System',
  'Cooling Water System', 'Turbo Super Charger', 'Compressor', 'Under Truck',
  'Air Brake', 'Governor'
]);
const WDG4_ELECTRICAL_SYSTEMS = new Set([
  'Battery', 'Traction Motor', 'Traction Alternator', 'Wires & cables',
  'Electric control', 'Auxiliary Motors'
]);

// --- Helper Functions ---

const getWdg4SystemInfo = (equipment: string): { name: string; group: 'Mechanical' | 'Electrical' | 'Others' } => {
  if (!equipment) return { name: 'Uncategorized', group: 'Others' };
  const equipmentTrimmed = equipment.trim();
  const mappedName = Object.entries(WDG4_SYSTEM_MAP).find(([key]) => equipmentTrimmed.startsWith(key))?.[1] || equipmentTrimmed;

  if (WDG4_MECHANICAL_SYSTEMS.has(mappedName)) return { name: mappedName, group: 'Mechanical' };
  if (WDG4_ELECTRICAL_SYSTEMS.has(mappedName)) return { name: mappedName, group: 'Electrical' };
  return { name: mappedName, group: 'Others' };
};

const getFinancialYear = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  return month >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
};

const FY_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // Apr (3) to Mar (2)

const generateFyHeaders = (fy: string): string[] => {
  const startYear = parseInt(fy.slice(0, 4));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return FY_MONTH_ORDER.map(monthIndex => {
    const year = monthIndex >= 3 ? startYear : startYear + 1;
    return `${monthNames[monthIndex]}'${year.toString().slice(-2)}`;
  });
};

const sumSummaryTotals = (
  total1: Omit<SummaryRow, 'name'>,
  total2: Omit<SummaryRow, 'name'>,
): Omit<SummaryRow, 'name'> => {
  const emptyTotal = { monthlyData: Array(12).fill(null).map(() => ({ count: 0, items: [] })), total: { count: 0, items: [] } };
  const t1 = total1 || emptyTotal;
  const t2 = total2 || emptyTotal;

  const combinedMonthlyData: MonthlyCell[] = t1.monthlyData.map((cell, i) => {
    const otherCell = t2.monthlyData[i] || { count: 0, items: [] };
    return {
      count: cell.count + otherCell.count,
      items: [...cell.items, ...otherCell.items],
    };
  });

  const combinedTotal: MonthlyCell = {
    count: t1.total.count + t2.total.count,
    items: [...t1.total.items, ...t2.total.items],
  };

  return {
    monthlyData: combinedMonthlyData,
    total: combinedTotal,
  };
};

const processSummary = (
  failures: TractionFailure[],
  fy: string,
  title: string,
  groupTitle: string,
  filterFn: (f: TractionFailure) => boolean,
  groupByKey: keyof TractionFailure,
): SummaryData => {
  const headers = generateFyHeaders(fy);
  const rowsMap = new Map<string, { monthlyData: MonthlyCell[] }>();
  const grandTotals: MonthlyCell[] = Array(12).fill(null).map(() => ({ count: 0, items: [] }));

  const relevantFailures = failures.filter(filterFn);

  relevantFailures.forEach(f => {
    const groupName = f[groupByKey] || 'Uncategorized';
    if (!rowsMap.has(groupName)) {
      rowsMap.set(groupName, {
        monthlyData: Array(12).fill(null).map(() => ({ count: 0, items: [] })),
      });
    }

    const date = parseDateDDMMYY(f.datefailed || '');
    if (!date) return; // Skip if date is invalid

    const month = date.getUTCMonth();
    const monthIndexInFy = FY_MONTH_ORDER.indexOf(month);

    if (monthIndexInFy !== -1) {
      rowsMap.get(groupName)!.monthlyData[monthIndexInFy].count++;
      rowsMap.get(groupName)!.monthlyData[monthIndexInFy].items.push(f);

      grandTotals[monthIndexInFy].count++;
      grandTotals[monthIndexInFy].items.push(f);
    }
  });

  const rows: SummaryRow[] = Array.from(rowsMap.entries())
    .map(([name, data]) => {
      const total = data.monthlyData.reduce(
        (acc, month) => {
          acc.count += month.count;
          acc.items.push(...month.items);
          return acc;
        },
        { count: 0, items: [] },
      );
      return { name, ...data, total };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const total = grandTotals.reduce(
    (acc, month) => {
      acc.count += month.count;
      acc.items.push(...month.items);
      return acc;
    },
    { count: 0, items: [] },
  );

  return { title, groupTitle, headers, rows, totals: { monthlyData: grandTotals, total } };
};

const processWdg4GroupedSummary = (
    failures: TractionFailure[],
    fy: string,
    title: string,
): GroupedSummaryData => {
    const headers = generateFyHeaders(fy);
    const dataMaps = {
        Mechanical: new Map<string, { monthlyData: MonthlyCell[] }>(),
        Electrical: new Map<string, { monthlyData: MonthlyCell[] }>(),
        Others: new Map<string, { monthlyData: MonthlyCell[] }>(),
    };

    failures.forEach(f => {
        const { name: systemName, group } = getWdg4SystemInfo(f.equipment || '');
        const currentMap = dataMaps[group];
        if (!currentMap.has(systemName)) {
            currentMap.set(systemName, { monthlyData: Array(12).fill(null).map(() => ({ count: 0, items: [] })) });
        }
        const date = parseDateDDMMYY(f.datefailed || '');
        if (!date) return;
        const month = date.getUTCMonth();
        const monthIndexInFy = FY_MONTH_ORDER.indexOf(month);
        if (monthIndexInFy !== -1) {
            currentMap.get(systemName)!.monthlyData[monthIndexInFy].count++;
            currentMap.get(systemName)!.monthlyData[monthIndexInFy].items.push(f);
        }
    });

    const createSummaryRows = (map: Map<string, { monthlyData: MonthlyCell[] }>): SummaryRow[] => {
        return Array.from(map.entries()).map(([name, data]) => {
            const total = data.monthlyData.reduce((acc, month) => {
                acc.count += month.count;
                acc.items.push(...month.items);
                return acc;
            }, { count: 0, items: [] });
            return { name, ...data, total };
        }).sort((a, b) => a.name.localeCompare(b.name));
    };
    
    const calculateTotals = (rows: SummaryRow[]): Omit<SummaryRow, 'name'> => {
        const monthlyTotals: MonthlyCell[] = Array(12).fill(null).map(() => ({ count: 0, items: [] }));
        rows.forEach(row => {
            row.monthlyData.forEach((cell, i) => {
                monthlyTotals[i].count += cell.count;
                monthlyTotals[i].items.push(...cell.items);
            });
        });
        const total = monthlyTotals.reduce((acc, month) => {
            acc.count += month.count;
            acc.items.push(...month.items);
            return acc;
        }, { count: 0, items: [] });
        return { monthlyData: monthlyTotals, total };
    };

    const mechanicalRows = createSummaryRows(dataMaps.Mechanical);
    const electricalRows = createSummaryRows(dataMaps.Electrical);
    const othersRows = createSummaryRows(dataMaps.Others);

    const mechanicalTotals = calculateTotals(mechanicalRows);
    const electricalTotals = calculateTotals(electricalRows);
    const othersTotals = calculateTotals(othersRows);
    
    const grandTotals = sumSummaryTotals(sumSummaryTotals(mechanicalTotals, electricalTotals), othersTotals);

    return {
        title,
        groupTitle: 'System',
        headers,
        groups: [
            { name: 'Mechanical', rows: mechanicalRows, totals: mechanicalTotals },
            { name: 'Electrical', rows: electricalRows, totals: electricalTotals },
        ],
        others: othersRows,
        grandTotals,
    };
};

// --- Sub-Components ---

const SummaryTable: React.FC<{ data: SummaryData; onCellClick: (failures: TractionFailure[]) => void }> = ({ data, onCellClick }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const sortedRows = useMemo(() => {
        let sortableItems = [...data.rows];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let valA, valB;
                if (sortConfig.key === 'name') {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                } else if (sortConfig.key === 'total') {
                    valA = a.total.count;
                    valB = b.total.count;
                } else { // Monthly data sort
                    const monthIndex = data.headers.indexOf(sortConfig.key);
                    if(monthIndex > -1){
                        valA = a.monthlyData[monthIndex].count;
                        valB = b.monthlyData[monthIndex].count;
                    } else {
                        return 0; // Should not happen
                    }
                }

                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data.rows, data.headers, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' 
          ? <ChevronUpIcon className="h-4 w-4 inline-block ml-1 text-text-primary" /> 
          : <ChevronDownIcon className="h-4 w-4 inline-block ml-1 text-text-primary" />;
    };

    if (!data || data.rows.length === 0) {
        return <p className="text-sm text-text-secondary px-3 py-2">No data available for this summary.</p>;
    }

    return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
             <th colSpan={14} className="px-3 py-2 text-left font-semibold text-text-primary bg-gray-200">{data.title}</th>
          </tr>
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-text-secondary sticky left-0 bg-gray-100">
                <button onClick={() => requestSort('name')} className="flex items-center gap-1 transition-colors hover:text-text-primary">
                    {data.groupTitle}{getSortIcon('name')}
                </button>
            </th>
            {data.headers.map(h => 
                <th key={h} className="px-3 py-2 font-semibold text-text-secondary w-20">
                    <button onClick={() => requestSort(h)} className="transition-colors hover:text-text-primary">
                        {h}{getSortIcon(h)}
                    </button>
                </th>
            )}
            <th className="px-3 py-2 font-semibold text-text-secondary w-24">
                <button onClick={() => requestSort('total')} className="transition-colors hover:text-text-primary">
                    Total{getSortIcon('total')}
                </button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedRows.map(row => (
            <tr key={row.name}>
              <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap sticky left-0 bg-white">{row.name}</td>
              {row.monthlyData.map((cell, i) => (
                <td key={i} className="px-3 py-2 text-center">
                  {cell.count > 0 ? (
                    <button onClick={() => onCellClick(cell.items)} className="text-blue-600 hover:underline">{cell.count}</button>
                  ) : null}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-bold">
                {row.total.count > 0 ? (
                    <button onClick={() => onCellClick(row.total.items)} className="text-blue-600 hover:underline">{row.total.count}</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-bold">
            <tr>
                <td className="px-3 py-2 sticky left-0 bg-gray-100 text-text-primary">Grand Total</td>
                {data.totals.monthlyData.map((cell, i) => (
                    <td key={i} className="px-3 py-2 text-center">
                        {cell.count > 0 ? (
                            <button onClick={() => onCellClick(cell.items)} className="text-blue-600 hover:underline">{cell.count}</button>
                        ) : null}
                    </td>
                ))}
                 <td className="px-3 py-2 text-center">
                    {data.totals.total.count > 0 ? (
                        <button onClick={() => onCellClick(data.totals.total.items)} className="text-blue-600 hover:underline">{data.totals.total.count}</button>
                    ) : null}
                </td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};

const GroupedSummaryTable: React.FC<{ data: GroupedSummaryData; onCellClick: (failures: TractionFailure[]) => void }> = ({ data, onCellClick }) => {
  const renderRow = (row: SummaryRow, isSubtotal = false) => (
    <tr key={row.name} className={isSubtotal ? "bg-gray-200 font-semibold" : "hover:bg-gray-50"}>
      <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap sticky left-0 bg-inherit">{row.name}</td>
      {row.monthlyData.map((cell, i) => (
        <td key={i} className="px-3 py-2 text-center">
          {cell.count > 0 ? (
            <button onClick={() => onCellClick(cell.items)} className="text-blue-600 hover:underline">{cell.count}</button>
          ) : null}
        </td>
      ))}
      <td className="px-3 py-2 text-center font-bold">
        {row.total.count > 0 ? (
          <button onClick={() => onCellClick(row.total.items)} className="text-blue-600 hover:underline">{row.total.count}</button>
        ) : null}
      </td>
    </tr>
  );

  const totalGroupsAndOthers = (data.groups || []).reduce((acc, g) => acc + g.rows.length, 0) + (data.others || []).length;
  if (totalGroupsAndOthers === 0) {
     return <p className="text-sm text-text-secondary px-3 py-2">No data available for this summary.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr><th colSpan={14} className="px-3 py-2 text-left font-semibold text-text-primary bg-gray-200">{data.title}</th></tr>
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-text-secondary sticky left-0 bg-gray-100">{data.groupTitle}</th>
            {data.headers.map(h => <th key={h} className="px-3 py-2 font-semibold text-text-secondary w-20">{h}</th>)}
            <th className="px-3 py-2 font-semibold text-text-secondary w-24">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.groups && data.groups.map(group => (
            <React.Fragment key={group.name}>
              {group.rows.length > 0 && (
                <>
                  <tr className="bg-gray-100 font-bold"><td colSpan={14} className="px-3 py-2 text-left text-text-primary">{group.name}</td></tr>
                  {group.rows.map(row => renderRow(row))}
                  {renderRow({ name: `Subtotal - ${group.name}`, ...group.totals }, true)}
                </>
              )}
            </React.Fragment>
          ))}
          {data.others && data.others.length > 0 && (
            <>
              <tr className="bg-gray-100 font-bold"><td colSpan={14} className="px-3 py-2 text-left text-text-primary">Others</td></tr>
              {data.others.map(row => renderRow(row))}
            </>
          )}
        </tbody>
        <tfoot className="bg-gray-200 font-bold border-t-2 border-gray-400">
          <tr>
            <td className="px-3 py-2 sticky left-0 bg-gray-200 text-text-primary">Grand Total</td>
            {data.grandTotals.monthlyData.map((cell, i) => (
              <td key={i} className="px-3 py-2 text-center">
                {cell.count > 0 ? <button onClick={() => onCellClick(cell.items)} className="text-blue-600 hover:underline">{cell.count}</button> : null}
              </td>
            ))}
            <td className="px-3 py-2 text-center">
              {data.grandTotals.total.count > 0 ? <button onClick={() => onCellClick(data.grandTotals.total.items)} className="text-blue-600 hover:underline">{data.grandTotals.total.count}</button> : null}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const CollapsibleSummarySection: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children }) => (
  <div className="border rounded-md bg-white">
    <h4
      onClick={onToggle}
      className="text-md font-semibold p-3 cursor-pointer flex justify-between items-center bg-gray-50 rounded-t-md hover:bg-gray-100 transition-colors"
      aria-expanded={isExpanded}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
    >
      {title}
      <ChevronDownIcon className={`h-5 w-5 text-gray-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
    </h4>
    {isExpanded && (
      <div className="p-4 border-t border-gray-200">
        {children}
      </div>
    )}
  </div>
);

const DateFilter: React.FC<{
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
}> = ({ startDate, endDate, onStartDateChange, onEndDateChange, onApply, onClear }) => (
  <div className="my-4 p-4 border rounded-lg bg-gray-50 print:hidden">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="start-date" className="text-sm font-medium text-text-secondary">From:</label>
        <input
          type="date"
          id="start-date"
          value={startDate}
          onChange={e => onStartDateChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-brand-light focus:border-brand-light text-brand-primary font-medium bg-white"
          aria-label="Start date for filtering failures"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="end-date" className="text-sm font-medium text-text-secondary">To:</label>
        <input
          type="date"
          id="end-date"
          value={endDate}
          onChange={e => onEndDateChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-brand-light focus:border-brand-light text-brand-primary font-medium bg-white"
          aria-label="End date for filtering failures"
        />
      </div>
      <button
        onClick={onApply}
        className="px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition"
      >
        Apply Filter
      </button>
      <button
        onClick={onClear}
        className="px-4 py-2 text-sm font-medium text-text-secondary bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition"
      >
        Clear
      </button>
    </div>
  </div>
);


// --- WAG7 Summary View ---
const WAG7SummaryView: React.FC<{ onCellClick: (failures: TractionFailure[]) => void }> = ({ onCellClick }) => {
  const [allFailures, setAllFailures] = useState<TractionFailure[]>([]);
  const [filteredFailures, setFilteredFailures] = useState<TractionFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, Set<string>>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const failures = await getAllWag7Failures();
        setAllFailures(failures);
        setFilteredFailures(failures);
        if (failures.length > 0) {
            const latestFy = failures
                .map(f => {
                    const date = parseDateDDMMYY(f.datefailed || '');
                    return date ? getFinancialYear(date) : null;
                })
                .filter((fy): fy is string => !!fy)
                .filter(fy => fy >= '2024-25')
                .sort()
                .pop();
            if (latestFy) {
                setExpandedYears(new Set([latestFy]));
                setExpandedSummaries({ [latestFy]: new Set(['a']) });
            }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedData = useMemo(() => {
    const failuresByFy = filteredFailures.reduce((acc, f) => {
      const date = parseDateDDMMYY(f.datefailed || '');
      if (!date) return acc;
      const fy = getFinancialYear(date);
      if (!acc[fy]) acc[fy] = [];
      acc[fy].push(f);
      return acc;
    }, {} as Record<string, TractionFailure[]>);

    const result: Record<string, {
      summaryA: GroupedSummaryData;
      summaryB: GroupedSummaryData;
      summaryC: GroupedSummaryData;
      summaryD: SummaryData;
      summaryE_punc: SummaryData;
    }> = {};

    for (const fy in failuresByFy) {
        const fyFailures = failuresByFy[fy];

        // A: ICMS Failures (Shed)
        const summaryA_main = processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.icmsmessage?.toUpperCase() !== 'MESSAGE' && f.responsibility?.toUpperCase() !== 'OTH', 'equipment');
        const summaryA_oth = processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.icmsmessage?.toUpperCase() !== 'MESSAGE' && f.responsibility?.toUpperCase() === 'OTH', 'equipment');
        const summaryA_grouped: GroupedSummaryData = {
            title: 'ICMS Failures (Shed)',
            groupTitle: 'Equipment',
            headers: summaryA_main.headers,
            groups: [
                { name: 'Loco Account', rows: summaryA_main.rows, totals: summaryA_main.totals },
                { name: 'Others', rows: summaryA_oth.rows, totals: summaryA_oth.totals },
            ],
            others: [],
            grandTotals: sumSummaryTotals(summaryA_main.totals, summaryA_oth.totals),
        };

        // B: ICMS Failures (Based on eLocos)
        const summaryB_yLoco = processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.elocosaf?.toUpperCase().includes('Y-LOCO'), 'equipment');
        const summaryB_yOth = processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.elocosaf?.toUpperCase().includes('Y-OTH'), 'equipment');
        const summaryB_grouped: GroupedSummaryData = {
            title: 'ICMS Failures (Based on eLocos)',
            groupTitle: 'Equipment',
            headers: summaryB_yLoco.headers,
            groups: [
                { name: 'Loco Account', rows: summaryB_yLoco.rows, totals: summaryB_yLoco.totals },
                { name: 'Others', rows: summaryB_yOth.rows, totals: summaryB_yOth.totals },
            ],
            others: [],
            grandTotals: sumSummaryTotals(summaryB_yLoco.totals, summaryB_yOth.totals),
        };

        // C: Messages
        const summaryC_main = processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.icmsmessage?.toUpperCase() === 'MESSAGE' && f.responsibility?.toUpperCase() !== 'OTH', 'equipment');
        const summaryC_oth = processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.icmsmessage?.toUpperCase() === 'MESSAGE' && f.responsibility?.toUpperCase() === 'OTH', 'equipment');
        const summaryC_grouped: GroupedSummaryData = {
            title: 'Messages',
            groupTitle: 'Equipment',
            headers: summaryC_main.headers,
            groups: [
                { name: 'Loco Account', rows: summaryC_main.rows, totals: summaryC_main.totals },
                { name: 'Others', rows: summaryC_oth.rows, totals: summaryC_oth.totals },
            ],
            others: [],
            grandTotals: sumSummaryTotals(summaryC_main.totals, summaryC_oth.totals),
        };

        result[fy] = {
            summaryA: summaryA_grouped,
            summaryB: summaryB_grouped,
            summaryC: summaryC_grouped,
            summaryD: processSummary(fyFailures, fy, 'Section Summary', 'Section Code', () => true, 'responsibility'),
            summaryE_punc: processSummary(fyFailures, fy, 'Punctuality - As per eLocos', 'Equipment', f => !!f.elocosaf?.toUpperCase().includes('PUNC'), 'equipment'),
        }
    }
    return result;
  }, [filteredFailures]);

    const handleFilterApply = () => {
        if (!startDate && !endDate) {
            setFilteredFailures(allFailures);
            return;
        }

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (end) {
            end.setUTCHours(23, 59, 59, 999);
        }

        const filtered = allFailures.filter(failure => {
            const failureDate = parseDateDDMMYY(failure.datefailed || '');
            if (!failureDate) return false;
            if (start && failureDate < start) return false;
            if (end && failureDate > end) return false;
            return true;
        });

        setFilteredFailures(filtered);
    };

    const handleFilterClear = () => {
        setStartDate('');
        setEndDate('');
        setFilteredFailures(allFailures);
    };

  const toggleYear = (fy: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fy)) newSet.delete(fy); else newSet.add(fy);
      if (newSet.size > 0 && !expandedSummaries[fy]) {
        setExpandedSummaries(prevSummaries => ({ ...prevSummaries, [fy]: new Set(['a']) }));
      }
      return newSet;
    });
  };

  const toggleSummary = (fy: string, summaryKey: string) => {
    setExpandedSummaries(prev => {
        const currentFySummaries = new Set(prev[fy] || []);
        if (currentFySummaries.has(summaryKey)) currentFySummaries.delete(summaryKey); else currentFySummaries.add(summaryKey);
        return { ...prev, [fy]: currentFySummaries };
    });
  };

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const financialYears = Object.keys(processedData).filter(fy => fy >= '2024-25').sort().reverse();

  return (
    <>
      <DateFilter 
        startDate={startDate} endDate={endDate}
        onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        onApply={handleFilterApply} onClear={handleFilterClear}
      />
      
      {financialYears.length === 0 ? (
        <p className="print:hidden p-4 text-center text-text-secondary">
          {filteredFailures.length !== allFailures.length 
            ? 'No failure data found for the selected period.' 
            : 'No WAG7 failure data found for FY 2024-25 or later to generate summaries.'
          }
        </p>
      ) : (
        <div className="space-y-4 print:space-y-0">
          {financialYears.map(fy => (
            <div key={fy} className="border rounded-lg print:border-none">
              <h3 
                onClick={() => toggleYear(fy)}
                className="text-lg font-bold bg-gray-50 p-4 cursor-pointer flex justify-between items-center rounded-t-lg hover:bg-gray-100 print:hidden"
                aria-expanded={expandedYears.has(fy)}
              >
                Financial Year: {fy}
                <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${expandedYears.has(fy) ? 'rotate-180' : ''}`} />
              </h3>
               <div className="hidden print:block text-lg font-bold bg-gray-50 p-4 border-b">Financial Year: {fy}</div>

              <div className={`${!expandedYears.has(fy) ? 'hidden' : ''} print:block p-4 space-y-6 bg-gray-50 border-t print:p-0 print:border-t-0 print:bg-white print:space-y-8`}>
                  <CollapsibleSummarySection title="ICMS Failures (Shed)" isExpanded={expandedSummaries[fy]?.has('a')} onToggle={() => toggleSummary(fy, 'a')}>
                    <GroupedSummaryTable data={processedData[fy].summaryA} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>

                  <CollapsibleSummarySection title="Messages" isExpanded={expandedSummaries[fy]?.has('c')} onToggle={() => toggleSummary(fy, 'c')}>
                    <GroupedSummaryTable data={processedData[fy].summaryC} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>
                  
                  <CollapsibleSummarySection title="Sections summary" isExpanded={expandedSummaries[fy]?.has('d')} onToggle={() => toggleSummary(fy, 'd')}>
                    <SummaryTable data={processedData[fy].summaryD} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>
                                  
                  <CollapsibleSummarySection title="ICMS Failures (Based on eLocos)" isExpanded={expandedSummaries[fy]?.has('b')} onToggle={() => toggleSummary(fy, 'b')}>
                     <GroupedSummaryTable data={processedData[fy].summaryB} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>

                  <CollapsibleSummarySection title="Punctuality - As per eLocos" isExpanded={expandedSummaries[fy]?.has('e')} onToggle={() => toggleSummary(fy, 'e')}>
                     <div className="space-y-4"><SummaryTable data={processedData[fy].summaryE_punc} onCellClick={onCellClick} /></div>
                  </CollapsibleSummarySection>
                </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};


// --- WDG4 Summary View ---
const WDG4SummaryView: React.FC<{ onCellClick: (failures: TractionFailure[]) => void }> = ({ onCellClick }) => {
  const [allFailures, setAllFailures] = useState<TractionFailure[]>([]);
  const [filteredFailures, setFilteredFailures] = useState<TractionFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, Set<string>>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const failures = await getAllWdg4Failures();
        setAllFailures(failures);
        setFilteredFailures(failures);
        if (failures.length > 0) {
            const latestFy = failures
                .map(f => {
                    const date = parseDateDDMMYY(f.datefailed || '');
                    return date ? getFinancialYear(date) : null;
                })
                .filter((fy): fy is string => !!fy)
                .filter(fy => fy >= '2024-25')
                .sort()
                .pop();
            if (latestFy) {
                setExpandedYears(new Set([latestFy]));
                setExpandedSummaries({ [latestFy]: new Set(['icms']) });
            }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedData = useMemo(() => {
    const failuresByFy = filteredFailures.reduce((acc, f) => {
      const date = parseDateDDMMYY(f.datefailed || '');
      if (!date) return acc;
      const fy = getFinancialYear(date);
      if (!acc[fy]) acc[fy] = [];
      acc[fy].push(f);
      return acc;
    }, {} as Record<string, TractionFailure[]>);

    const result: Record<string, { icms: GroupedSummaryData, messages: GroupedSummaryData, section: SummaryData }> = {};
    for (const fy in failuresByFy) {
        const fyFailures = failuresByFy[fy];
        const icmsFailures = fyFailures.filter(f => f.icms && f.icms.trim() !== '');
        const messageFailures = fyFailures.filter(f => !f.icms || f.icms.trim() === '');
        
        result[fy] = {
            icms: processWdg4GroupedSummary(icmsFailures, fy, 'ICMS Failures'),
            messages: processWdg4GroupedSummary(messageFailures, fy, 'Message Failures'),
            section: processSummary(fyFailures, fy, 'Section Summary', 'Shed Section', () => true, 'responsibility'),
        };
    }
    return result;
  }, [filteredFailures]);
  
  const handleFilterApply = () => {
    if (!startDate && !endDate) {
        setFilteredFailures(allFailures);
        return;
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) {
        end.setUTCHours(23, 59, 59, 999);
    }
    const filtered = allFailures.filter(failure => {
        const failureDate = parseDateDDMMYY(failure.datefailed || '');
        if (!failureDate) return false;
        if (start && failureDate < start) return false;
        if (end && failureDate > end) return false;
        return true;
    });
    setFilteredFailures(filtered);
  };

  const handleFilterClear = () => {
    setStartDate('');
    setEndDate('');
    setFilteredFailures(allFailures);
  };
  
  const toggleYear = (fy: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fy)) newSet.delete(fy); else newSet.add(fy);
       if (newSet.size > 0 && !expandedSummaries[fy]) {
        setExpandedSummaries(prevSummaries => ({ ...prevSummaries, [fy]: new Set(['icms']) }));
      }
      return newSet;
    });
  };

  const toggleSummary = (fy: string, summaryKey: string) => {
    setExpandedSummaries(prev => {
        const currentFySummaries = new Set(prev[fy] || []);
        if (currentFySummaries.has(summaryKey)) currentFySummaries.delete(summaryKey); else currentFySummaries.add(summaryKey);
        return { ...prev, [fy]: currentFySummaries };
    });
  };

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const financialYears = Object.keys(processedData).filter(fy => fy >= '2024-25').sort().reverse();

  return (
    <>
      <DateFilter 
        startDate={startDate} endDate={endDate}
        onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        onApply={handleFilterApply} onClear={handleFilterClear}
      />
      {financialYears.length === 0 ? (
        <p className="print:hidden p-4 text-center text-text-secondary">
          {filteredFailures.length !== allFailures.length 
            ? 'No failure data found for the selected period.' 
            : 'No WDG4 failure data found for FY 2024-25 or later to generate summaries.'
          }
        </p>
      ) : (
        <div className="space-y-4 print:space-y-0">
          {financialYears.map(fy => (
            <div key={fy} className="border rounded-lg print:border-none">
               <h3 
                onClick={() => toggleYear(fy)}
                className="text-lg font-bold bg-gray-50 p-4 cursor-pointer flex justify-between items-center rounded-t-lg hover:bg-gray-100 print:hidden"
                aria-expanded={expandedYears.has(fy)}
              >
                Financial Year: {fy}
                <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${expandedYears.has(fy) ? 'rotate-180' : ''}`} />
              </h3>
              <div className="hidden print:block text-lg font-bold bg-gray-50 p-4 border-b">Financial Year: {fy}</div>
              
              <div className={`${!expandedYears.has(fy) ? 'hidden' : ''} print:block p-4 space-y-6 bg-gray-50 border-t print:p-0 print:border-t-0 print:bg-white print:space-y-8`}>
                  <CollapsibleSummarySection title="ICMS Summary" isExpanded={expandedSummaries[fy]?.has('icms')} onToggle={() => toggleSummary(fy, 'icms')}>
                    <GroupedSummaryTable data={processedData[fy].icms} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>
                  
                  <CollapsibleSummarySection title="Messages Summary" isExpanded={expandedSummaries[fy]?.has('messages')} onToggle={() => toggleSummary(fy, 'messages')}>
                    <GroupedSummaryTable data={processedData[fy].messages} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>
                  
                  <CollapsibleSummarySection title="Section-wise Summary" isExpanded={expandedSummaries[fy]?.has('section')} onToggle={() => toggleSummary(fy, 'section')}>
                    <SummaryTable data={processedData[fy].section} onCellClick={onCellClick} />
                  </CollapsibleSummarySection>
                </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};


// --- Main Component ---

const FailuresSummary: React.FC<FailuresSummaryProps> = ({ onBack }) => {
  const [modalFailures, setModalFailures] = useState<TractionFailure[] | null>(null);
  const [activeTab, setActiveTab] = useState<'wag7' | 'wdg4'>('wag7');

  return (
    <div className="bg-bg-card p-6 rounded-lg shadow-lg print:p-0 print:shadow-none print:border-none">
        {modalFailures && <FailureDetailsModal failures={modalFailures} onClose={() => setModalFailures(null)} />}

      <div className="flex justify-between items-center mb-4 border-b pb-4 print:hidden">
        <h2 className="text-xl font-bold text-brand-primary flex items-center">
          <ClipboardDocumentListIcon className="h-6 w-6 mr-3"/>
          Loco Failures Summary
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-brand-secondary bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
        >
          &larr; Back to Search
        </button>
      </div>

      <div className="mb-4 border-b border-gray-200 print:hidden">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('wag7')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'wag7'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                }`}
            >
                WAG7 Summary
            </button>
            <button
                onClick={() => setActiveTab('wdg4')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'wdg4'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                }`}
            >
                WDG4 Summary
            </button>
        </nav>
      </div>
      
      <div>
        {activeTab === 'wag7' && <WAG7SummaryView onCellClick={setModalFailures} />}
        {activeTab === 'wdg4' && <WDG4SummaryView onCellClick={setModalFailures} />}
      </div>
    </div>
  );
};

export default FailuresSummary;
