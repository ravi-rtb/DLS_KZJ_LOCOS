
import React, { useState } from 'react';
import { getAllWag7Failures, getAllWdg4Failures, parseDateDDMMYY } from '../services/googleSheetService';
import type { TractionFailure } from '../types';
import Loader from './Loader';
import { PrinterIcon, CalendarDaysIcon } from './Icons';

interface MeetingModeProps {
  onBack: () => void;
}

type ReportSectionData = {
  summary: { system: string; msgCount: number; icmsCount: number }[];
  icmsFailures: TractionFailure[];
  messageFailures: TractionFailure[];
  totalMsg: number;
  totalIcms: number;
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
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the end date fully

      const [wag7Raw, wdg4Raw] = await Promise.all([
        getAllWag7Failures(),
        getAllWdg4Failures()
      ]);

      const filterByDate = (failures: TractionFailure[]) => {
        return failures.filter(f => {
          const d = parseDateDDMMYY(f.datefailed || '');
          return d && d >= start && d <= end;
        });
      };

      const processData = (failures: TractionFailure[], groupByField: 'equipment' | 'system'): ReportSectionData => {
        const filtered = filterByDate(failures);
        
        const icmsList = filtered.filter(f => f.icmsmessage && f.icmsmessage.toUpperCase() !== 'MESSAGE' && f.icmsmessage.trim() !== '');
        // Messages are usually marked 'MESSAGE' in ICMS col OR have empty ICMS col but exist in list
        const msgList = filtered.filter(f => (!f.icmsmessage || f.icmsmessage.toUpperCase() === 'MESSAGE' || f.icmsmessage.trim() === ''));

        // Generate Summary
        const summaryMap = new Map<string, { msg: number; icms: number }>();

        filtered.forEach(f => {
          // For WDG4 uses 'system', WAG7 uses 'equipment'
          let sys = f[groupByField] || 'Others';
          if (!sys.trim()) sys = 'Others';
          
          if (!summaryMap.has(sys)) summaryMap.set(sys, { msg: 0, icms: 0 });
          
          const entry = summaryMap.get(sys)!;
          // Determine if it counts as ICMS or Message for the summary table
          if (f.icmsmessage && f.icmsmessage.toUpperCase() !== 'MESSAGE' && f.icmsmessage.trim() !== '') {
            entry.icms++;
          } else {
            entry.msg++;
          }
        });

        const summary = Array.from(summaryMap.entries()).map(([system, counts]) => ({
          system,
          msgCount: counts.msg,
          icmsCount: counts.icms
        })).sort((a, b) => a.system.localeCompare(b.system));

        return {
          summary,
          icmsFailures: icmsList,
          messageFailures: msgList,
          totalMsg: msgList.length,
          totalIcms: icmsList.length
        };
      };

      setWag7Data(processData(wag7Raw, 'equipment')); // WAG7 uses 'equipment' column
      setWdg4Data(processData(wdg4Raw, 'equipment')); // WDG4 mapped to 'equipment' in transform function (mapped from 'system')

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

  // --- Sub-components for the specific table style ---

  const SummaryTable = ({ data, title }: { data: ReportSectionData, title: string }) => (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-lg font-bold text-brand-primary mb-2 text-center underline uppercase">{title} Failures Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-2 py-1 text-left">System / Equipment</th>
              <th className="border border-black px-2 py-1 text-center w-24">Msg</th>
              <th className="border border-black px-2 py-1 text-center w-24">ICMS</th>
              <th className="border border-black px-2 py-1 text-center w-24 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.summary.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-black px-2 py-1">{row.system}</td>
                <td className="border border-black px-2 py-1 text-center">{row.msgCount || ''}</td>
                <td className="border border-black px-2 py-1 text-center">{row.icmsCount || ''}</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{(row.msgCount + row.icmsCount) || ''}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black px-2 py-1 text-right">Grand Total</td>
              <td className="border border-black px-2 py-1 text-center text-brand-secondary">{data.totalMsg}</td>
              <td className="border border-black px-2 py-1 text-center text-red-600">{data.totalIcms}</td>
              <td className="border border-black px-2 py-1 text-center">{data.totalMsg + data.totalIcms}</td>
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
                <th className="border border-black px-1 py-2 w-20">Date</th>
                <th className="border border-black px-1 py-2 w-16">Divn/Rly</th>
                {type === 'ICMS' && <th className="border border-black px-1 py-2 w-16">ICMS</th>}
                <th className="border border-black px-2 py-2">Failure Details</th>
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
                    <div className="mt-1">{f.briefmessage}</div>
                  </td>
                  <td className="border border-black px-2 py-2 align-top whitespace-pre-wrap">
                    <div>{f.causeoffailure}</div>
                    {/* Assuming investigation status might contain schedule info or we append it if available */}
                    {f.lastsch && <div className="mt-2 text-gray-600">Last Sch: {f.lastsch} ({f.lastschdate})</div>}
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
        <div className="max-w-5xl mx-auto print:w-full">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
             <h1 className="text-2xl font-bold uppercase">Electric Loco Failures Summary</h1>
             <p className="font-medium">Period: {parseDateDDMMYY(startDate)?.toLocaleDateString('en-GB')} to {parseDateDDMMYY(endDate)?.toLocaleDateString('en-GB')}</p>
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
