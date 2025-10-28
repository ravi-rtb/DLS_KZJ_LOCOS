
import React, { useState } from 'react';
import type { TractionFailure } from '../types';
import { APPS_SCRIPT_URL } from '../constants';
import { PencilIcon } from './Icons';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';

interface EditFailureModalProps {
  failure: TractionFailure;
  idToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EditFailureModal: React.FC<EditFailureModalProps> = ({ failure, idToken, onClose, onSuccess }) => {
  const [causeOfFailure, setCauseOfFailure] = useState(failure.causeoffailure || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Apps Script web apps often work best this way
        },
        body: JSON.stringify({
          locoNo: failure.locono,
          dateFailed: failure.datefailed,
          responsibility: failure.responsibility || '', // Added for authorization checks
          oldCauseOfFailure: failure.causeoffailure || '', // For logging
          newCauseOfFailure: causeOfFailure,
          idToken: idToken,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        onSuccess();
      } else {
        throw new Error(result.message || 'An unknown error occurred while saving.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-failure-title"
    >
      <div 
        className="bg-white shadow-xl rounded-lg w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b">
          <h2 id="edit-failure-title" className="text-lg font-bold text-brand-primary flex items-center">
            <PencilIcon className="h-5 w-5 mr-3" />
            Edit Cause of Failure
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <main className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
                <p><span className="font-semibold text-text-secondary">Loco No:</span> <span className="font-bold text-text-primary">{failure.locono}</span></p>
                <p><span className="font-semibold text-text-secondary">Date Failed:</span> <span className="font-bold text-text-primary">{failure.datefailed}</span></p>
            </div>

            <div>
              <label htmlFor="causeOfFailure" className="block text-sm font-medium text-text-secondary mb-1">
                Cause of Failure
              </label>
              <textarea
                id="causeOfFailure"
                value={causeOfFailure}
                onChange={(e) => setCauseOfFailure(e.target.value)}
                className="w-full px-3 py-2 text-text-primary bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-light focus:border-brand-light transition duration-150 ease-in-out"
                rows={5}
                required
                disabled={isLoading}
              />
            </div>
            
            {isLoading && <div className="py-4"><Loader /></div>}
            {error && <ErrorMessage message={error} />}

          </main>

          <footer className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition mr-3 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition disabled:bg-gray-400"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditFailureModal;
