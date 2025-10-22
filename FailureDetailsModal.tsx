
import React, { useState } from 'react';
import type { TractionFailure } from '../types';
import { PrinterIcon, FullScreenEnterIcon, FullScreenExitIcon, PhotoIcon } from './Icons';

interface FailureDetailsModalProps {
  failures: TractionFailure[];
  onClose: () => void;
}

const FailureDetailsModal: React.FC<FailureDetailsModalProps> = ({ failures, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center print:static print:p-0 print:bg-transparent print:z-auto transition-all duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="failure-details-title"
    >
      <div 
        className={`bg-white shadow-xl flex flex-col print:shadow-none print:rounded-none print:max-h-full print:w-full transition-all duration-300 ${isFullScreen ? 'w-screen h-screen max-w-full max-h-full rounded-none' : 'w-full max-w-6xl max-h-[90vh] rounded-lg'}`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 id="failure-details-title" className="text-lg font-bold text-brand-primary">
            Failure Details ({failures.length} records)
          </h2>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
              aria-label={isFullScreen ? 'Exit full screen' : 'View in full screen'}
            >
              {isFullScreen ? (
                <>
                  <FullScreenExitIcon className="h-4 w-4" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <FullScreenEnterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
              aria-label="Print details"
            >
              <PrinterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </header>

        <main className="p-4 overflow-auto">
          <h2 className="text-xl font-bold text-center mb-4 hidden print:block">
            Failure Details ({failures.length} records)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[8%]">Date Failed</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[12%]">Loco No. +MU With</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">ICMS/Message<br />Division<br />Railway</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[20%]">Brief Message</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[25%]">Cause of Failure</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[15%]">Equipment<br />Component</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {failures.map((failure, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">{failure.datefailed}</td>
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">
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
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                      {failure.icmsmessage && <p>{failure.icmsmessage}</p>}
                      {(failure.div || failure.rly) && <p>{failure.div}/{failure.rly}</p>}
                    </td>
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                      <span>{failure.briefmessage}</span>
                      {failure.medialink && (
                        <a
                          href={failure.medialink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-secondary hover:text-brand-primary mt-2"
                          title="View Media in Google Drive"
                          aria-label="View media for this failure"
                        >
                          <PhotoIcon className="h-4 w-4" />
                          <span>View Media</span>
                        </a>
                      )}
                    </td>
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">{failure.causeoffailure}</td>
                    <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                      {failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}
                    </td>
                     <td className="p-2 align-top text-text-primary whitespace-normal break-words">{failure.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FailureDetailsModal;
