import React from 'react';
import type { LocoDetails } from '../types';
import { InformationCircleIcon } from './Icons';
import { FRIENDLY_LABELS } from '../constants';

// FIX: Define props interface to resolve 'Cannot find name 'LocoDetailsCardProps''.
interface LocoDetailsCardProps {
  details: LocoDetails | null;
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

const LocoDetailsCard: React.FC<LocoDetailsCardProps> = ({ details }) => {
  if (!details) return null;

  // Filter out the 'type' property as requested and any empty values
  const filteredDetails = Object.entries(details).filter(
    // FIX: Ensure value exists and is treated as a string before calling .trim() to resolve 'Property 'trim' does not exist on type 'unknown''.
    ([key, value]) => key.toLowerCase() !== 'type' && value && String(value).trim() !== ''
  );

  return (
    <div className="bg-bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
        <InformationCircleIcon className="h-6 w-6 mr-3"/>
        Locomotive Details for #{details.locono}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {filteredDetails.map(([key, value]) => (
          <div key={key} className="border-b border-gray-200 py-2">
            <p className="text-sm font-semibold text-text-secondary">{formatLabel(key)}</p>
            {/* FIX: Cast value to string to be a valid ReactNode, resolving 'Type 'unknown' is not assignable to type 'ReactNode''. */}
            <p className="text-md text-text-primary">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocoDetailsCard;
