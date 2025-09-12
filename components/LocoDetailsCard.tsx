import React from 'react';
import type { LocoDetails } from '../types';
import { InformationCircleIcon } from './Icons';

interface LocoDetailsCardProps {
  details: LocoDetails | null;
  locoNo: string; // Add locoNo to display in the title
}

const LocoDetailsCard: React.FC<LocoDetailsCardProps> = ({ details, locoNo }) => {
  if (!details) return null;

  // Find the key for the loco number to exclude it from the grid, as it's in the title
  const locoNoKey = Object.keys(details).find(k => 
    k.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '') === 'locono'
  );

  // Filter out the loco number key and any empty values
  const filteredDetails = Object.entries(details).filter(
    ([key, value]) => key !== locoNoKey && value && String(value).trim() !== ''
  );

  return (
    <div className="bg-bg-card p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
        <InformationCircleIcon className="h-6 w-6 mr-3"/>
        Locomotive Details for #{locoNo}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {filteredDetails.map(([key, value]) => (
          <div key={key} className="border-b border-gray-200 py-2">
            <p className="text-sm font-semibold text-text-secondary">{key}</p>
            <p className="text-md text-text-primary">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocoDetailsCard;