import React from 'react';
import type { TractionFailure } from '../types';
import { TableCellsIcon } from './Icons';

interface FailuresTableProps {
  failures: TractionFailure[];
}

const FailuresTable: React.FC<FailuresTableProps> = ({ failures }) => {
  if (failures.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <TableCellsIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-text-secondary">No failure data found for this locomotive.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Date Failed</th>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Loco No. +MU With</th>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">ICMS/Message<br />Division<br />Railway</th>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Brief Message</th>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Cause of Failure</th>
            <th className="p-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top">Component<br />System</th>
          </tr>
        </thead>
        <tbody>
          {failures.map((failure, index) => (
            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="p-3 align-top text-sm text-text-primary whitespace-nowrap">{failure.datefailed}</td>
              <td className="p-3 align-top text-sm text-text-primary whitespace-nowrap">
                <span className="font-bold">{failure.locono}</span> {failure.muwith ? `+ ${failure.muwith}` : ''}
              </td>
              <td className="p-3 align-top text-sm text-text-primary whitespace-nowrap">
                {failure.icmsmessage && <p>{failure.icmsmessage}</p>}
                {(failure.div || failure.rly) && <p>{failure.div}/{failure.rly}</p>}
              </td>
              <td className="p-3 align-top text-sm text-text-primary whitespace-normal min-w-[200px]">{failure.briefmessage}</td>
              <td className="p-3 align-top text-sm text-text-primary whitespace-normal min-w-[200px]">{failure.causeoffailure}</td>
              <td className="p-3 align-top text-sm text-text-primary whitespace-nowrap">
                {failure.component || ''}{failure.system ? `-${failure.system}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FailuresTable;