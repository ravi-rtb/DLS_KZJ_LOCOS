
import React, { useState, useEffect, useMemo } from 'react';
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

const findLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    return Object.keys(obj).find(k => 
        k.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '') === 'locono'
    );
};

const ModificationRow: React.FC<{ modification: ModificationSummary }> = ({ modification }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="cursor-pointer hover:bg-gray-50 border-b border-gray-200"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
      >
        <td className="px-6 py-4 font-medium text-text-primary">{modification.name}</td>
        <td className="px-6 py-4 text-text-primary text-center font-semibold">{modification.count}</td>
        <td className="px-6 py-4 text-right">
           <ChevronDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={3} className="p-0 bg-gray-50">
            <div className="p-4">
              <div className="overflow-auto max-h-60 border rounded-md">
                <table className="min-w-full">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase w-16">Sl No.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Loco No.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Date / Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modification.locos.length > 0 ? (
                      modification.locos.map((loco, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-text-primary whitespace-nowrap text-center">{index + 1}</td>
                          <td className="px-4 py-2 text-sm text-text-primary whitespace-nowrap">{loco.locoNo}</td>
                          <td className="px-4 py-2 text-sm text-text-primary whitespace-nowrap">{loco.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-sm text-text-secondary">No locomotives found for this modification.</td>
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
            throw new Error("Could not find 'Loco Number' column in the modifications sheet.");
        }
        
        const excludedMods = new Set(["SPM Make", "Pull Rod Modification"]);
        const modificationKeys = Object.keys(allModifications[0]).filter(
          k => k !== locoNoKey && !excludedMods.has(k)
        );
        
        const summary = modificationKeys.map(modName => {
          const trimmedModName = modName.trim();
          let completedLocos: { locoNo: string; status: string }[] = [];

          const allLocosForMod = allModifications
            .map(locoRecord => ({
              locoNo: String(locoRecord[locoNoKey] || ''),
              // Do NOT trim status initially to preserve raw data structure
              status: String(locoRecord[modName] || ''),
            }))
            .filter(loco => loco.locoNo); // Ensure loco has a number

          // Define special conditions
          const upperTrimmedModName = trimmedModName.toUpperCase();
          const isKavach = upperTrimmedModName.includes('KAVACH');
          const isCabAcMod = upperTrimmedModName === 'CAB AC';
          const isV3Mod = upperTrimmedModName.includes('MPCS V3') || upperTrimmedModName === 'LSIP';

          if (isKavach) {
             // Kavach: Count ANY non-empty value (text, dates, symbols).
             // We check .trim().length > 0 to exclude cells that are purely whitespace, 
             // but include any cell with visible text/numbers.
             completedLocos = allLocosForMod.filter(loco => loco.status.trim().length > 0);
          } else if (isCabAcMod) {
            // New rule for CAB AC: count and list only if status contains 'Working'
            completedLocos = allLocosForMod.filter(loco => loco.status.toUpperCase().includes('WORKING'));
          } else if (isV3Mod) {
            // Special rule: count and list only if status contains 'V3'
            completedLocos = allLocosForMod.filter(loco => loco.status.toUpperCase().includes('V3'));
          } else {
            // Default rule: count and list if status is not empty (ignoring whitespace)
            completedLocos = allLocosForMod.filter(loco => loco.status.trim().length > 0);
          }

          return { 
              name: modName, 
              count: completedLocos.length, 
              locos: completedLocos.sort((a, b) => a.locoNo.localeCompare(b.locoNo)) 
          };
        });

        setSummaryData(summary);
      } catch (err) {
        console.error(err);
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
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-xl font-bold text-brand-primary">
          WAG7 Modifications Summary
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-brand-secondary bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
        >
          &larr; Back to Search
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Modification</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Locos Completed</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand/Collapse</span></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {summaryData && summaryData.map(mod => (
              <ModificationRow key={mod.name} modification={mod} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModificationsSummary;
