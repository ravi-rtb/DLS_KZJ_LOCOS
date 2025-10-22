import React from 'react';
import type { WAGModification } from '../types';
import { TableCellsIcon } from './Icons';
import { FRIENDLY_LABELS } from '../constants';

interface ModificationsListProps {
  modifications: WAGModification[];
}

// Function to format keys into readable labels
const formatLabel = (key: string): string => {
  if (!key) return '';
  const lowerKey = key.toLowerCase();
  
  // Use the friendly name from constants if available
  if (FRIENDLY_LABELS[lowerKey]) {
    return FRIENDLY_LABELS[lowerKey];
  }

  // Fallback for unknown keys: capitalize the first letter
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const ModificationsList: React.FC<ModificationsListProps> = ({ modifications }) => {
  if (modifications.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <TableCellsIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
        <p className="text-text-secondary">No modification data found for this locomotive.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modifications.map((mod, index) => {
        // Filter out locono and any keys with empty values
        const filteredDetails = Object.entries(mod).filter(
          // FIX: Ensure value is treated as a string before calling .trim() to resolve 'Property 'trim' does not exist on type 'unknown''.
          ([key, value]) => key.toLowerCase() !== 'locono' && value && String(value).trim() !== ''
        );

        return (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
             {filteredDetails.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                {filteredDetails.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-text-secondary">{formatLabel(key)}</p>
                    {/* FIX: Ensure value is cast to a string to be a valid ReactNode, resolving 'Type 'unknown' is not assignable to type 'ReactNode''. */}
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

export default ModificationsList;
