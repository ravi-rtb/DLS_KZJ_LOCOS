import React, { useState } from 'react';
import type { LocoSchedule } from '../types';
import { LOCO_SCHEDULES_COLUMNS } from '../constants';
import { TableCellsIcon } from './Icons';

interface SchedulesTableProps {
  schedules: LocoSchedule[];
}

const SchedulesTable: React.FC<SchedulesTableProps> = ({ schedules }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (schedules.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <TableCellsIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-text-secondary">No schedule data found for this locomotive.</p>
      </div>
    );
  }

  const displayedSchedules = isExpanded ? schedules : schedules.slice(0, 5);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {LOCO_SCHEDULES_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedSchedules.map((schedule, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {LOCO_SCHEDULES_COLUMNS.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {schedule[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedules.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-brand-secondary bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
          >
            {isExpanded ? 'Show Less' : `Show ${schedules.length - 5} More...`}
          </button>
        </div>
      )}
    </>
  );
};

export default SchedulesTable;