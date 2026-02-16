
import React, { useState, useEffect } from 'react';
import { getAllWAG7Modifications } from '../services/googleSheetService';
import type { WAG7Modification } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { ChevronDownIcon } from './Icons';

interface ModificationSummary {
  name: string;
  count: number;
  locos: {
    locoNo: string;
    status: string;
  }[];
}

interface ModificationsSummaryProps {
  onBack: () => void;
}

/**
 * Robustly finds the key used for the locomotive number in a data object.
 */
const findLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    const searchKeys = ['loco', 'locono', 'loconumber'];
    const objKeys = Object.keys(obj);
    
    for (const key of objKeys) {
        const normalizedKey = key.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '');
        if (searchKeys.includes(normalizedKey)) {
            return key;
        }
    }
    return undefined;
};

const ModificationRow: React.FC<{ modification: ModificationSummary }> = ({ modification }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="cursor-pointer hover:bg-gray-50 border-b border-gray-200 transition-colors"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
      >
        <td className="px-6 py-4 font-medium text-text-primary">{modification.name}</td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-brand-primary">
            {modification.count}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
           <ChevronDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={3} className="p-0 bg-gray-50 shadow-inner">
            <div className="p-4">
              <div className="overflow-auto max-h-80 border rounded-lg bg-white shadow-sm">
                <table className="min-w-full">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-text-secondary uppercase w-16 text-center">Sl No.</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-text-secondary uppercase">Loco No.</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-text-secondary uppercase">Date / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modification.locos.length > 0 ? (
                      modification.locos.map((loco, index) => (
                        <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-4 py-2 text-sm text-text-secondary whitespace-nowrap text-center">{index + 1}</td>
                          <td className="px-4 py-2 text-sm text-brand-primary font-bold whitespace-nowrap">{loco.locoNo}</td>
                          <td className="px-4 py-2 text-sm text-text-primary whitespace-nowrap">{loco.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-secondary italic">No locomotives found with valid data for this modification.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const ModificationsSummary: React.FC<ModificationsSummaryProps> = ({ onBack }) => {
  const [summaryData, setSummaryData] = useState<ModificationSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allModifications = await getAllWAG7Modifications();
        if (allModifications.length === 0) {
          setSummaryData([]);
          return;
        }

        const locoNoKey = findLocoNumberKey(allModifications[0]);
        if (!locoNoKey) {
            throw new Error("Could not find a valid 'Loco Number' column in the modifications sheet. Please check your headers.");
        }
        
        // Exclude non-modification columns based on known headers or keywords
        const excludedCols = new Set(["SPM Make", "Pull Rod Modification", "Remarks", "Loco Number", "Loco No", "LocoNo", "Sl No"]);
        const modificationKeys = Object.keys(allModifications[0]).filter(
          k => !excludedCols.has(k) && !k.toLowerCase().includes('loco')
        );
        
        const summary = modificationKeys.flatMap(modName => {
          const trimmedModName = modName.trim();
          let completedLocos: { locoNo: string; status: string }[] = [];

          const allLocosForMod = allModifications
            .map(locoRecord => ({
              locoNo: String(locoRecord[locoNoKey] || '').trim(),
              status: String(locoRecord[modName] || '').trim(),
            }))
            .filter(loco => loco.locoNo && loco.locoNo.length > 0);

          const upperTrimmedModName = trimmedModName.toUpperCase();
          const isKavach = upperTrimmedModName.includes('KAVACH');
          const isCabAcMod = upperTrimmedModName.includes('CAB AC');
          const isV3Mod = upperTrimmedModName.includes('MPCS V3') || upperTrimmedModName === 'LSIP';

          // Detection logic
          if (isKavach) {
             completedLocos = allLocosForMod.filter(loco => loco.status.length > 0 && !loco.status.toUpperCase().includes('NOT'));
          } else if (isCabAcMod) {
            completedLocos = allLocosForMod.filter(loco => loco.status.toUpperCase().includes('WORKING'));
          } else if (isV3Mod) {
            completedLocos = allLocosForMod.filter(loco => loco.status.toUpperCase().includes('V3'));
          } else {
            // General logic: any non-empty non-nil value counts
            completedLocos = allLocosForMod.filter(loco => 
              loco.status.length > 0 && 
              loco.status.toUpperCase() !== 'NIL' && 
              loco.status !== '-' &&
              !loco.status.toUpperCase().includes('PENDING')
            );
          }

          if (completedLocos.length === 0) return [];

          return [{ 
              name: modName, 
              count: completedLocos.length, 
              locos: completedLocos.sort((a, b) => a.locoNo.localeCompare(b.locoNo, undefined, { numeric: true })) 
          }];
        });

        // Sort overall summary by count descending
        summary.sort((a, b) => b.count - a.count);

        setSummaryData(summary);
      } catch (err) {
        console.error("Modification Summary Error:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching summary data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="bg-bg-card p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-primary">
            WAG7 Modifications Summary
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Tracking {summaryData?.length || 0} unique modification types across the fleet.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2 text-sm font-semibold text-brand-secondary bg-blue-100 rounded-lg hover:bg-blue-200 transition-all shadow-sm"
        >
          &larr; Back to Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Modification Type</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Locomotives Completed</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {summaryData && summaryData.length > 0 ? (
              summaryData.map(mod => (
                <ModificationRow key={mod.name} modification={mod} />
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-text-secondary italic">
                  No modification records found in the current sheet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModificationsSummary;
