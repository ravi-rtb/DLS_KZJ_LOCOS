import React from 'react';
import type { WAG7Modification } from '../types';
import { TableCellsIcon } from './Icons';

interface WAG7ModificationsListProps {
  modifications: WAG7Modification[];
}

const WAG7ModificationsList: React.FC<WAG7ModificationsListProps> = ({ modifications }) => {
  if (modifications.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <TableCellsIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-text-secondary">No WAG7 modification data found for this locomotive.</p>
      </div>
    );
  }

  // Find the key for the loco number once, to exclude it from all modification records.
  const locoNoKey = modifications.length > 0 
    ? Object.keys(modifications[0]).find(k => k.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '') === 'locono')
    : undefined;

  return (
    <div className="space-y-6">
      {modifications.map((mod, index) => {
        // Filter out the loco number key and any keys with empty values
        const filteredDetails = Object.entries(mod).filter(
          ([key, value]) => key !== locoNoKey && value && String(value).trim() !== ''
        );

        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
             {filteredDetails.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                {filteredDetails.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-text-secondary">{key}</p>
                    <p className="text-sm text-text-primary">{String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
               <p className="text-sm text-text-secondary">No details available for this modification record.</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WAG7ModificationsList;
