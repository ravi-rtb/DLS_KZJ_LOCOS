import React, { useState, useEffect, useMemo } from 'react';
import { getAllFailures } from '../services/googleSheetService';
import type { TractionFailure } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import FailureDetailsModal from './FailureDetailsModal';
import { ChevronDownIcon, ClipboardDocumentListIcon } from './Icons';

interface FailuresSummaryProps {
  onBack: () => void;
}

type MonthlyCell = { count: number; items: TractionFailure[] };
type SummaryRow = { name: string; monthlyData: MonthlyCell[]; total: MonthlyCell };
type SummaryData = { title: string; groupTitle: string; headers: string[]; rows: SummaryRow[]; totals: Omit<SummaryRow, 'name'> };

// --- Helper Functions ---

/**
 * Parses a date string in 'dd-mm-yy' or 'dd-mm-yyyy' format.
 * @param dateString The date string from the sheet.
 * @returns A Date object or null if the format is invalid.
 */
const parseDateDDMMYY = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split(/[-/]/);
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  // Handle 2-digit years, assuming they are in the 21st century.
  if (year < 100) {
    year += 2000;
  }
  
  // Use UTC to prevent timezone-related issues.
  const date = new Date(Date.UTC(year, month, day));

  // Validate the created date to ensure components weren't rolled over (e.g., month 13).
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }

  return date;
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

    const date = parseDateDDMMYY(f.datefailed);
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

// --- Sub-Components ---

const SummaryTable: React.FC<{ data: SummaryData; onCellClick: (failures: TractionFailure[]) => void }> = ({ data, onCellClick }) => {
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
            <th className="px-3 py-2 text-left font-semibold text-text-secondary sticky left-0 bg-gray-100">{data.groupTitle}</th>
            {data.headers.map(h => <th key={h} className="px-3 py-2 font-semibold text-text-secondary w-20">{h}</th>)}
            <th className="px-3 py-2 font-semibold text-text-secondary w-24">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.rows.map(row => (
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
                <td className="px-3 py-2 sticky left-0 bg-gray-100">Grand Total</td>
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


// --- Main Component ---

const FailuresSummary: React.FC<FailuresSummaryProps> = ({ onBack }) => {
  const [allFailures, setAllFailures] = useState<TractionFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [modalFailures, setModalFailures] = useState<TractionFailure[] | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const failures = await getAllFailures();
        setAllFailures(failures);
        // Automatically expand the latest financial year if data exists
        if (failures.length > 0) {
            const latestFy = failures
                .map(f => {
                    const date = parseDateDDMMYY(f.datefailed);
                    return date ? getFinancialYear(date) : null;
                })
                .filter((fy): fy is string => !!fy)
                .filter(fy => fy >= '2024-25') 
                .sort()
                .pop();
            if (latestFy) {
                setExpandedYears(new Set([latestFy]));
                // Also expand the first summary section by default for the latest year
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
    const failuresByFy = allFailures.reduce((acc, f) => {
      const date = parseDateDDMMYY(f.datefailed);
      if (!date) return acc; // Skip records with invalid date format
      
      const fy = getFinancialYear(date);
      if (!acc[fy]) acc[fy] = [];
      acc[fy].push(f);
      return acc;
    }, {} as Record<string, TractionFailure[]>);

    const result: Record<string, Record<string, SummaryData>> = {};
    for (const fy in failuresByFy) {
        const fyFailures = failuresByFy[fy];
        result[fy] = {
            summaryA_main: processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.icmsmessage?.toUpperCase() !== 'MESSAGE' && f.responsibility?.toUpperCase() !== 'OTH', 'equipment'),
            summaryA_oth: processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.icmsmessage?.toUpperCase() !== 'MESSAGE' && f.responsibility?.toUpperCase() === 'OTH', 'equipment'),
            summaryB_yLoco: processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.elocosaf?.toUpperCase().includes('Y-LOCO'), 'equipment'),
            summaryB_yOth: processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.elocosaf?.toUpperCase().includes('Y-OTH'), 'equipment'),
            summaryC_main: processSummary(fyFailures, fy, 'Loco Account', 'Equipment', f => f.icmsmessage?.toUpperCase() === 'MESSAGE' && f.responsibility?.toUpperCase() !== 'OTH', 'equipment'),
            summaryC_oth: processSummary(fyFailures, fy, 'Others', 'Equipment', f => f.icmsmessage?.toUpperCase() === 'MESSAGE' && f.responsibility?.toUpperCase() === 'OTH', 'equipment'),
            summaryD: processSummary(fyFailures, fy, 'Responsibility Summary', 'Responsibility', () => true, 'responsibility'),
        }
    }
    return result;
  }, [allFailures]);

  const toggleYear = (fy: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fy)) {
        newSet.delete(fy);
      } else {
        newSet.add(fy);
        // When expanding a new year, default its first summary to be open if not already set
        if (!expandedSummaries[fy]) {
            setExpandedSummaries(prevSummaries => ({
                ...prevSummaries,
                [fy]: new Set(['a']),
            }));
        }
      }
      return newSet;
    });
  };

  const toggleSummary = (fy: string, summaryKey: string) => {
    setExpandedSummaries(prev => {
        const currentFySummaries = new Set(prev[fy] || []);
        if (currentFySummaries.has(summaryKey)) {
            currentFySummaries.delete(summaryKey);
        } else {
            currentFySummaries.add(summaryKey);
        }
        return { ...prev, [fy]: currentFySummaries };
    });
  };


  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const financialYears = Object.keys(processedData).filter(fy => fy >= '2024-25').sort().reverse();

  return (
    <div className="bg-bg-card p-6 rounded-lg shadow-lg">
        {modalFailures && <FailureDetailsModal failures={modalFailures} onClose={() => setModalFailures(null)} />}

      <div className="flex justify-between items-center mb-4 border-b pb-4">
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
      
      {financialYears.length === 0 ? (
        <p>No failure data found for FY 2024-25 or later to generate summaries.</p>
      ) : (
        <div className="space-y-4">
          {financialYears.map(fy => (
            <div key={fy} className="border rounded-lg">
              <h3 
                onClick={() => toggleYear(fy)}
                className="text-lg font-bold bg-gray-50 p-4 cursor-pointer flex justify-between items-center rounded-t-lg hover:bg-gray-100"
                aria-expanded={expandedYears.has(fy)}
              >
                Financial Year: {fy}
                <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${expandedYears.has(fy) ? 'rotate-180' : ''}`} />
              </h3>
              {expandedYears.has(fy) && (
                <div className="p-4 space-y-6 bg-gray-50 border-t">
                  <CollapsibleSummarySection 
                    title="ICMS Failures (Shed)"
                    isExpanded={expandedSummaries[fy]?.has('a')}
                    onToggle={() => toggleSummary(fy, 'a')}
                  >
                    <div className="space-y-4">
                        <SummaryTable data={processedData[fy].summaryA_main} onCellClick={setModalFailures} />
                        <SummaryTable data={processedData[fy].summaryA_oth} onCellClick={setModalFailures} />
                    </div>
                  </CollapsibleSummarySection>
                  
                  <CollapsibleSummarySection 
                    title="ICMS Failures (Based on eLocos)"
                    isExpanded={expandedSummaries[fy]?.has('b')}
                    onToggle={() => toggleSummary(fy, 'b')}
                  >
                     <div className="space-y-4">
                        <SummaryTable data={processedData[fy].summaryB_yLoco} onCellClick={setModalFailures} />
                        <SummaryTable data={processedData[fy].summaryB_yOth} onCellClick={setModalFailures} />
                    </div>
                  </CollapsibleSummarySection>

                  <CollapsibleSummarySection 
                    title="Messages"
                    isExpanded={expandedSummaries[fy]?.has('c')}
                    onToggle={() => toggleSummary(fy, 'c')}
                  >
                     <div className="space-y-4">
                        <SummaryTable data={processedData[fy].summaryC_main} onCellClick={setModalFailures} />
                        <SummaryTable data={processedData[fy].summaryC_oth} onCellClick={setModalFailures} />
                    </div>
                  </CollapsibleSummarySection>
                  
                  <CollapsibleSummarySection 
                    title="Sections summary"
                    isExpanded={expandedSummaries[fy]?.has('d')}
                    onToggle={() => toggleSummary(fy, 'd')}
                  >
                    <SummaryTable data={processedData[fy].summaryD} onCellClick={setModalFailures} />
                  </CollapsibleSummarySection>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FailuresSummary;