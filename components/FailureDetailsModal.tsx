import React from 'react';
import type { TractionFailure } from '../types';
import { PrinterIcon } from './Icons';

interface FailureDetailsModalProps {
  failures: TractionFailure[];
  onClose: () => void;
}

const FailureDetailsModal: React.FC<FailureDetailsModalProps> = ({ failures, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 print:static print:p-0 print:bg-transparent print:z-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="failure-details-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col print:shadow-none print:rounded-none print:max-h-full print:w-full"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 id="failure-details-title" className="text-lg font-bold text-brand-primary">
            Failure Details ({failures.length} records)
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
              aria-label="Print details"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
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
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Date Failed</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Loco No. +MU With</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">ICMS/Message<br />Division<br />Railway</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Brief Message</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Cause of Failure</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Equipment<br />Component</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Responsibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {failures.map((failure, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 align-top text-text-primary whitespace-nowrap">{failure.datefailed}</td>
                    <td className="p-2 align-top text-text-primary whitespace-nowrap">
                      <span className="font-bold">{failure.locono}</span> {failure.muwith ? `+ ${failure.muwith}` : ''}
                    </td>
                    <td className="p-2 align-top text-text-primary whitespace-nowrap">
                      {failure.icmsmessage && <p>{failure.icmsmessage}</p>}
                      {(failure.div || failure.rly) && <p>{failure.div}/{failure.rly}</p>}
                    </td>
                    <td className="p-2 align-top text-text-primary whitespace-normal min-w-[150px]">{failure.briefmessage}</td>
                    <td className="p-2 align-top text-text-primary whitespace-normal min-w-[150px]">{failure.causeoffailure}</td>
                    <td className="p-2 align-top text-text-primary whitespace-nowrap">
                      {failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}
                    </td>
                     <td className="p-2 align-top text-text-primary whitespace-nowrap">{failure.responsibility}</td>
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