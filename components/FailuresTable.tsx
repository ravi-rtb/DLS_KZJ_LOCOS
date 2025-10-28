
import React, { useState, useMemo } from 'react';
import type { TractionFailure, UserProfile } from '../types';
import { TableCellsIcon, ChevronUpIcon, ChevronDownIcon, PhotoIcon, PencilIcon, LinkIcon } from './Icons';
import { parseDateDDMMYY } from '../services/googleSheetService';
import EditFailureModal from './EditFailureModal';

interface FailuresTableProps {
  failures: TractionFailure[];
  user: UserProfile | null;
  idToken: string | null;
  onDataUpdate: () => void;
}

const FailuresTable: React.FC<FailuresTableProps> = ({ failures, user, idToken, onDataUpdate }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof TractionFailure; direction: 'ascending' | 'descending' }>({ key: 'datefailed', direction: 'descending' });
  const [editingFailure, setEditingFailure] = useState<TractionFailure | null>(null);

  const sortedFailures = useMemo(() => {
    let sortableItems = [...failures];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'datefailed') {
          const dateA = parseDateDDMMYY(a.datefailed);
          const dateB = parseDateDDMMYY(b.datefailed);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        } else {
          const valA = a[sortConfig.key] || '';
          const valB = b[sortConfig.key] || '';
          if (valA < valB) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (valA > valB) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [failures, sortConfig]);

  const requestSort = (key: keyof TractionFailure) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof TractionFailure) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' 
      ? <ChevronUpIcon className="h-4 w-4 text-text-primary" /> 
      : <ChevronDownIcon className="h-4 w-4 text-text-primary" />;
  };

  if (failures.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <TableCellsIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-text-secondary">No failure data found for this locomotive.</p>
      </div>
    );
  }

  const handleEditSuccess = () => {
    setEditingFailure(null);
    onDataUpdate();
  }
  
  const cutoffDate = useMemo(() => new Date(Date.UTC(2024, 3, 1)), []); // April is month 3

  return (
    <>
      {editingFailure && idToken && (
        <EditFailureModal
          failure={editingFailure}
          idToken={idToken}
          onClose={() => setEditingFailure(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[4%]">S.No.</th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">
                <button onClick={() => requestSort('datefailed')} className="flex items-center gap-1 transition-colors hover:text-text-primary">
                  Date Failed {getSortIcon('datefailed')}
                </button>
              </th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">Loco No. +MU With</th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[9%]">
                <button onClick={() => requestSort('icmsmessage')} className="flex items-center gap-1 text-left transition-colors hover:text-text-primary">
                  <span>ICMS/Msg<br />Division<br />Railway</span> {getSortIcon('icmsmessage')}
                </button>
              </th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[20%]">Brief Message</th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[32%]">Cause of Failure</th>
              <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">
                <button onClick={() => requestSort('equipment')} className="flex items-center gap-1 text-left transition-colors hover:text-text-primary">
                  <span>Equipment<br />Component</span> {getSortIcon('equipment')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFailures.map((failure, index) => {
              const failureDate = parseDateDDMMYY(failure.datefailed);
              const isEditable = failureDate && failureDate >= cutoffDate;

              return (
              <tr key={`${failure.locono}-${failure.datefailed}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 align-top text-sm text-text-primary text-center">{index + 1}</td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">{failure.datefailed}</td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">
                  {failure.documentlink ? (
                    <a
                      href={failure.documentlink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-brand-secondary hover:text-brand-primary hover:underline transition-colors"
                      title={`Open document for loco #${failure.locono}`}
                      aria-label={`Open document for loco number ${failure.locono}`}
                    >
                      {failure.locono}
                    </a>
                  ) : (
                    <span className="font-bold">{failure.locono}</span>
                  )}
                  {failure.muwith ? ` + ${failure.muwith}` : ''}
                </td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">
                  {failure.icmsmessage && <p>{failure.icmsmessage}</p>}
                  {(failure.div || failure.rly) && <p>{failure.div}/{failure.rly}</p>}
                </td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">
                  {failure.briefmessage}
                  {failure.medialink && (
                    <a
                      href={failure.medialink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-brand-secondary hover:text-brand-primary ml-2"
                      title="View Media in Google Drive"
                      aria-label="View media for this failure"
                    >
                      <PhotoIcon className="h-5 w-5" />
                    </a>
                  )}
                </td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">
                  <div className="flex justify-between items-start gap-2">
                    <span>{failure.causeoffailure}</span>
                    {user && (
                      isEditable ? (
                        <button
                          onClick={() => setEditingFailure(failure)}
                          className="text-brand-secondary hover:text-brand-primary flex-shrink-0"
                          title="Edit Cause of Failure"
                          aria-label="Edit cause of failure for this record"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0" title="Editing is only available for failures from April 2024 onwards.">
                          <PencilIcon className="h-5 w-5" />
                        </span>
                      )
                    )}
                  </div>
                </td>
                <td className="p-3 align-top text-sm text-text-primary whitespace-normal break-words">
                  {failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedFailures.map((failure, index) => {
          const failureDate = parseDateDDMMYY(failure.datefailed);
          const isEditable = failureDate && failureDate >= cutoffDate;

          return (
            <div key={`${failure.locono}-${failure.datefailed}-${index}-mobile`} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              <div className="flex justify-between items-start border-b pb-2 mb-3">
                <div>
                  <p className="font-bold text-base text-brand-primary">
                    <span className="text-text-secondary font-medium">#{index + 1}</span> {failure.locono}
                    {failure.muwith ? ` + ${failure.muwith}` : ''}
                  </p>
                  <p className="text-text-secondary">{failure.datefailed}</p>
                </div>
                 {failure.documentlink && (
                    <a
                      href={failure.documentlink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-secondary bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                      title={`Open document for loco #${failure.locono}`}
                      aria-label={`Open document for loco number ${failure.locono}`}
                    >
                      <LinkIcon className="h-4 w-4" />
                      View Doc
                    </a>
                  )}
              </div>
              
              <div className="space-y-3">
                 <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4"><p className="font-semibold text-text-secondary">ICMS/Msg</p></div>
                    <div className="col-span-8"><p className="text-text-primary">{failure.icmsmessage}</p></div>
                 </div>
                 <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4"><p className="font-semibold text-text-secondary">Div/Rly</p></div>
                    <div className="col-span-8"><p className="text-text-primary">{failure.div}{failure.rly && `/${failure.rly}`}</p></div>
                 </div>
                 <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4"><p className="font-semibold text-text-secondary">Message</p></div>
                    <div className="col-span-8 text-text-primary">
                      <span>{failure.briefmessage}</span>
                      {failure.medialink && (
                        <a
                          href={failure.medialink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-secondary hover:text-brand-primary mt-1"
                          title="View Media in Google Drive"
                          aria-label="View media for this failure"
                        >
                          <PhotoIcon className="h-4 w-4" />
                          <span>View Media</span>
                        </a>
                      )}
                    </div>
                 </div>
                 <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4"><p className="font-semibold text-text-secondary">Equipment</p></div>
                    <div className="col-span-8"><p className="text-text-primary">{failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}</p></div>
                 </div>
                 <div className="pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-text-secondary">Cause of Failure</p>
                      {user && (
                        isEditable ? (
                          <button
                            onClick={() => setEditingFailure(failure)}
                            className="text-brand-secondary hover:text-brand-primary flex-shrink-0"
                            title="Edit Cause of Failure"
                            aria-label="Edit cause of failure for this record"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <span className="text-gray-300 cursor-not-allowed flex-shrink-0" title="Editing is only available for failures from April 2024 onwards.">
                            <PencilIcon className="h-5 w-5" />
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-text-primary bg-white p-2 border rounded-md w-full">{failure.causeoffailure}</p>
                 </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  );
};

export default FailuresTable;
