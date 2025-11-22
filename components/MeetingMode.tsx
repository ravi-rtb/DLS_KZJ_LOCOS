import React, { useState } from 'react';
import { getAllWag7Failures, getAllWdg4Failures, parseDateDDMMYY } from '../services/googleSheetService';
import type { TractionFailure } from '../types';
import Loader from './Loader';
import { PrinterIcon, CalendarDaysIcon } from './Icons';

interface MeetingModeProps {
  onBack: () => void;
}

// Stats structure for a single cell (count + optional list of loco numbers)
type CellStats = {
  count: number;
  locos: string[];
};

// Structure for a row in the summary table
type SummaryRow = {
  name: string;
  isHeader: boolean; // True for "System" rows, False for "Component" rows
  p1_Msg: CellStats;
  p1_Icms: CellStats;
  p2_Msg: CellStats;
  p2_Icms: CellStats;
  total_Msg: CellStats;
  total_Icms: CellStats;
};

type ReportSectionData = {
  summaryRows: SummaryRow[];
  period1Label: string;
  period2Label: string;
  monthLabel: string;
  icmsFailures: TractionFailure[];
  messageFailures: TractionFailure[];
  grandTotal: {
    p1Msg: number; p1Icms: number;
    p2Msg: number; p2Icms: number;
    totalMsg: number; totalIcms: number;
  };
};

const MeetingMode: React.FC<MeetingModeProps> = ({ onBack }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [wdg4Data, setWdg4Data] = useState<ReportSectionData | null>(null);
  const [wag7Data, setWag7Data] = useState<ReportSectionData | null>(null);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Please select both From and To dates.');
      return;
    }

    setIsLoading(true);
    try {
      const p2Start = new Date(startDate);
      const p2End = new Date(endDate);
      p2End.setHours(23, 59, 59, 999); // End of day

      // Calculate Period 1 (Start of Month -> StartDate - 1)
      const p1Start = new Date(p2Start.getFullYear(), p2Start.getMonth(), 1);
      const p1End = new Date(p2Start);
      p1End.setDate(p2Start.getDate() - 1);
      p1End.setHours(23, 59, 59, 999);

      // Calculate Month Total range (Start of Month -> p2End)
      const monthStart = new Date(p1Start);
      const monthEnd = new Date(p2End); // Usually report is cumulative up to end date

      const [wag7Raw, wdg4Raw] = await Promise.all([
        getAllWag7Failures(),
        getAllWdg4Failures()
      ]);

      // Helpers
      const isDateInRange = (date: Date | null, start: Date, end: Date) => {
        if (!date) return false;
        return date >= start && date <= end;
      };
      
      const isIcms = (f: TractionFailure) => f.icmsmessage && f.icmsmessage.toUpperCase() !== 'MESSAGE' && f.icmsmessage.trim() !== '';
      
      const formatDateRange = (s: Date, e: Date) => {
         // If start > end (e.g. 1st selected), return empty or special text
         if (s > e) return 'N/A';
         const pad = (n: number) => n.toString().padStart(2, '0');
         return `${pad(s.getDate())}-${pad(s.getMonth()+1)}-${s.getFullYear().toString().slice(-2)} to ${pad(e.getDate())}-${pad(e.getMonth()+1)}-${e.getFullYear().toString().slice(-2)}`;
      };
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthLabel = `${monthNames[p2Start.getMonth()]}-${p2Start.getFullYear().toString().slice(-2)}`;

      const processData = (failures: TractionFailure[], groupByField: 'equipment' | 'system'): ReportSectionData => {
        // 1. Detailed Lists (Only for Period 2)
        const p2Failures = failures.filter(f => {
             const d = parseDateDDMMYY(f.datefailed || '');
             return isDateInRange(d, p2Start, p2End);
        });
        
        const icmsList = p2Failures.filter(f => isIcms(f));
        const msgList = p2Failures.filter(f => !isIcms(f));

        // 2. Summary Table Data (Aggregated for Month)
        // We need all failures from Month Start to Month End
        const monthFailures = failures.filter(f => {
            const d = parseDateDDMMYY(f.datefailed || '');
            return isDateInRange(d, monthStart, monthEnd);
        });

        // Tree: System -> Component -> Stats
        type AggStats = {
            p1Msg: number; p1Icms: number; p1Locos: string[];
            p2Msg: number; p2Icms: number; p2Locos: string[];
            totalMsg: number; totalIcms: number; totalLocos: string[];
        };
        const initStats = (): AggStats => ({
            p1Msg: 0, p1Icms: 0, p1Locos: [],
            p2Msg: 0, p2Icms: 0, p2Locos: [],
            totalMsg: 0, totalIcms: 0, totalLocos: []
        });

        const map = new Map<string, { 
            totalStats: AggStats, 
            components: Map<string, AggStats> 
        }>();

        const grandTotal = {
             p1Msg: 0, p1Icms: 0,
             p2Msg: 0, p2Icms: 0,
             totalMsg: 0, totalIcms: 0
        };

        monthFailures.forEach(f => {
            const d = parseDateDDMMYY(f.datefailed || '');
            if (!d) return;

            let sys = f[groupByField] || 'Others';
            if (!sys.trim()) sys = 'Others';
            
            const comp = f.component || f.briefmessage || 'General'; // Use component or brief message for detail
            const is_icms = isIcms(f);
            const inP1 = isDateInRange(d, p1Start, p1End);
            const inP2 = isDateInRange(d, p2Start, p2End);

            if (!map.has(sys)) {
                map.set(sys, { totalStats: initStats(), components: new Map() });
            }
            const sysEntry = map.get(sys)!;

            if (!sysEntry.components.has(comp)) {
                sysEntry.components.set(comp, initStats());
            }
            const compEntry = sysEntry.components.get(comp)!;

            const updateStats = (stats: AggStats) => {
                if (is_icms) {
                    if (inP1) { stats.p1Icms++; stats.p1Locos.push(f.locono); }
                    if (inP2) { stats.p2Icms++; stats.p2Locos.push(f.locono); }
                    stats.totalIcms++; stats.totalLocos.push(f.locono);
                } else {
                    if (inP1) { stats.p1Msg++; stats.p1Locos.push(f.locono); }
                    if (inP2) { stats.p2Msg++; stats.p2Locos.push(f.locono); }
                    stats.totalMsg++; stats.totalLocos.push(f.locono);
                }
            };

            // Update component stats
            updateStats(compEntry);
            // Update system header stats
            updateStats(sysEntry.totalStats);

            // Update Grand Total
            if (is_icms) {
                if (inP1) grandTotal.p1Icms++;
                if (inP2) grandTotal.p2Icms++;
                grandTotal.totalIcms++;
            } else {
                if (inP1) grandTotal.p1Msg++;
                if (inP2) grandTotal.p2Msg++;
                grandTotal.totalMsg++;
            }
        });

        // Flatten to rows
        const summaryRows: SummaryRow[] = [];
        
        // Sort systems alphabetically
        const sortedSystems = Array.from(map.keys()).sort();

        sortedSystems.forEach(sys => {
            const { totalStats, components } = map.get(sys)!;
            
            // Add Header Row
            summaryRows.push({
                name: sys,
                isHeader: true,
                p1_Msg: { count: totalStats.p1Msg, locos: [] },
                p1_Icms: { count: totalStats.p1Icms, locos: [] },
                p2_Msg: { count: totalStats.p2Msg, locos: [] },
                p2_Icms: { count: totalStats.p2Icms, locos: [] },
                total_Msg: { count: totalStats.totalMsg, locos: [] },
                total_Icms: { count: totalStats.totalIcms, locos: [] },
            });

            // Add Component Rows
            // Only add components that have > 0 failures in at least one category
            Array.from(components.entries()).forEach(([compName, stats]) => {
                if (stats.totalMsg === 0 && stats.totalIcms === 0) return;

                summaryRows.push({
                    name: compName,
                    isHeader: false,
                    p1_Msg: { count: stats.p1Msg, locos: stats.p1Locos },
                    p1_Icms: { count: stats.p1Icms, locos: stats.p1Locos },
                    p2_Msg: { count: stats.p2Msg, locos: stats.p2Locos },
                    p2_Icms: { count: stats.p2Icms, locos: stats.p2Locos },
                    total_Msg: { count: stats.totalMsg, locos: stats.totalLocos },
                    total_Icms: { count: stats.totalIcms, locos: stats.totalLocos },
                });
            });
        });

        return {
            summaryRows,
            period1Label: formatDateRange(p1Start, p1End),
            period2Label: formatDateRange(p2Start, p2End),
            monthLabel,
            icmsFailures: icmsList,
            messageFailures: msgList,
            grandTotal
        };
      };

      setWag7Data(processData(wag7Raw, 'equipment'));
      setWdg4Data(processData(wdg4Raw, 'equipment'));
      setReportGenerated(true);

    } catch (error) {
      console.error(error);
      alert('Failed to generate report. Please check console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Components ---

  const SummaryTable = ({ data, title }: { data: ReportSectionData, title: string }) => (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-lg font-bold text-brand-primary mb-2 text-center underline uppercase">{title} Failures Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-2 py-1 text-left">System</th>
              <th colSpan={2} className="border border-black px-2 py-1 text-center">{data.period1Label !== 'N/A' ? data.period1Label : 'Prev Period'}</th>
              <th colSpan={2} className="border border-black px-2 py-1 text-center">{data.period2Label}</th>
              <th colSpan={2} className="border border-black px-2 py-1 text-center">{data.monthLabel}</th>
            </tr>
            <tr className="bg-gray-100">
               <th className="border border-black px-2 py-1"></th>
               <th className="border border-black px-1 py-1 text-center w-12">Msg</th>
               <th className="border border-black px-1 py-1 text-center w-12">ICMS</th>
               <th className="border border-black px-1 py-1 text-center w-12">Msg</th>
               <th className="border border-black px-1 py-1 text-center w-12">ICMS</th>
               <th className="border border-black px-1 py-1 text-center w-12">Msg</th>
               <th className="border border-black px-1 py-1 text-center w-12">ICMS</th>
            </tr>
          </thead>
          <tbody>
             {data.summaryRows.map((row, idx) => {
                 const formatCell = (stats: CellStats) => {
                     if (stats.count === 0) return '';
                     // If header, just number. If detail, number + (locos)
                     if (row.isHeader) return <span className="font-bold text-red-600">{stats.count}</span>;
                     return (
                         <span>
                             <span className="font-bold text-red-600">{stats.count}</span>
                             {stats.locos.length > 0 && <span className="text-xs block">({stats.locos.join(', ')})</span>}
                         </span>
                     );
                 };

                 return (
                    <tr key={idx} className={row.isHeader ? "bg-blue-50 font-bold" : ""}>
                        <td className={`border border-black px-2 py-1 ${!row.isHeader ? 'pl-6' : ''}`}>{row.name}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.p1_Msg)}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.p1_Icms)}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.p2_Msg)}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.p2_Icms)}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.total_Msg)}</td>
                        <td className="border border-black px-1 py-1 text-center align-top">{formatCell(row.total_Icms)}</td>
                    </tr>
                 );
             })}
             <tr className="bg-gray-200 font-bold text-base">
                <td className="border border-black px-2 py-1 text-right">Grand Total</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.p1Msg || ''}</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.p1Icms || ''}</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.p2Msg || ''}</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.p2Icms || ''}</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.totalMsg || ''}</td>
                <td className="border border-black px-1 py-1 text-center text-red-600">{data.grandTotal.totalIcms || ''}</td>
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const DetailedTable = ({ failures, title, type }: { failures: TractionFailure[], title: string, type: 'ICMS' | 'Messages' }) => {
    if (failures.length === 0) return (
      <div className="mb-8">
         <h3 className="text-lg font-bold text-center underline uppercase mb-2">{title} - {type}</h3>
         <div className="border border-black p-2 text-center italic">NIL</div>
      </div>
    );

    return (
      <div className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold text-center underline uppercase mb-2">{title} - {type}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-1 py-2 w-8">Sl No</th>
                <th className="border border-black px-1 py-2 w-16">Date</th>
                <th className="border border-black px-1 py-2 w-16">Divn/Rly</th>
                {type === 'ICMS' && <th className="border border-black px-1 py-2 w-16">ICMS</th>}
                <th className="border border-black px-2 py-2 w-1/3">Failure Details</th>
                <th className="border border-black px-2 py-2 w-1/3">Shed Investigation & Schedule</th>
                <th className="border border-black px-1 py-2 w-16">Shed Section</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-1 py-2 text-center align-top">{idx + 1}</td>
                  <td className="border border-black px-1 py-2 text-center align-top">{f.datefailed}</td>
                  <td className="border border-black px-1 py-2 text-center align-top">
                    {f.div && f.rly ? `${f.div}/${f.rly}` : (f.div || f.rly)}
                  </td>
                  {type === 'ICMS' && (
                     <td className="border border-black px-1 py-2 text-center align-top text-red-600 font-semibold">{f.icmsmessage}</td>
                  )}
                  <td className="border border-black px-2 py-2 align-top whitespace-pre-wrap">
                    <div className="font-bold">Loco No: {f.locono} {f.muwith ? `+ ${f.muwith}` : ''}</div>
                    {f.trainno && <div>Train No: {f.trainno}</div>}
                    {f.load && <div>Load: {f.load}</div>}
                    {f.station && <div>Station: {f.station}</div>}
                    <div className="mt-1 font-medium">Message:</div>
                    <div className="text-gray-800">{f.briefmessage}</div>
                  </td>
                  <td className="border border-black px-2 py-2 align-top whitespace-pre-wrap">
                    <div>{f.causeoffailure}</div>
                    <div className="mt-2 border-t border-gray-300 pt-1">
                        {f.scheduleparticulars ? (
                            <div><span className="font-semibold underline">Sch Particulars:</span> {f.scheduleparticulars}</div>
                        ) : (
                             f.lastsch && <div className="text-gray-600">Last Sch: {f.lastsch} ({f.lastschdate})</div>
                        )}
                    </div>
                  </td>
                  <td className="border border-black px-1 py-2 text-center align-top">{f.responsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 min-h-screen bg-white">
      {/* Header / Controls - Hidden when printing */}
      <div className="print:hidden bg-gray-100 p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 transition"
                >
                    &larr; Exit Meeting Mode
                </button>
                <h2 className="text-xl font-bold text-brand-primary ml-2">Meeting Report Generator</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold">From:</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="border rounded p-1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-bold">To:</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="border rounded p-1"
                    />
                </div>
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-brand-secondary text-white rounded hover:bg-brand-primary disabled:opacity-50"
                >
                    {isLoading ? <span className="animate-pulse">Generating...</span> : (
                        <>
                            <CalendarDaysIcon className="h-5 w-5 mr-2" /> Generate Report
                        </>
                    )}
                </button>
                {reportGenerated && (
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <PrinterIcon className="h-5 w-5 mr-2" /> Print / PDF
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* The Report Content */}
      {reportGenerated && (
        <div className="max-w-6xl mx-auto print:w-full">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
             <h1 className="text-2xl font-bold uppercase">Loco Failures Summary</h1>
             <p className="font-medium">Selected Period: {parseDateDDMMYY(startDate)?.toLocaleDateString('en-GB')} to {parseDateDDMMYY(endDate)?.toLocaleDateString('en-GB')}</p>
          </div>

          {/* WDG4 SECTION */}
          {wdg4Data && (
            <section className="mb-12">
              <div className="bg-gray-800 text-white px-4 py-2 font-bold text-xl mb-4 print:bg-gray-300 print:text-black uppercase">
                  WDG4 / Diesel Locos
              </div>
              <SummaryTable data={wdg4Data} title="WDG4" />
              <DetailedTable failures={wdg4Data.icmsFailures} title="WDG4 Asset Failures" type="ICMS" />
              <DetailedTable failures={wdg4Data.messageFailures} title="WDG4 Messages" type="Messages" />
            </section>
          )}

           {/* Page Break for Print */}
           <div className="print:break-after-page"></div>

          {/* WAG7 SECTION */}
          {wag7Data && (
            <section className="mb-12">
               <div className="bg-blue-800 text-white px-4 py-2 font-bold text-xl mb-4 print:bg-gray-300 print:text-black uppercase">
                  WAG7 / Electric Locos
              </div>
              <SummaryTable data={wag7Data} title="WAG7" />
              <DetailedTable failures={wag7Data.icmsFailures} title="WAG7 Asset Failures" type="ICMS" />
              <DetailedTable failures={wag7Data.messageFailures} title="WAG7 Messages" type="Messages" />
            </section>
          )}
        </div>
      )}

      {!reportGenerated && !isLoading && (
        <div className="text-center text-gray-500 mt-20">
            <p>Select dates above and click Generate to view the meeting report.</p>
        </div>
      )}
      
      {isLoading && <Loader />}
    </div>
  );
};

export default MeetingMode;
