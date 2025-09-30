

import React, { useState, useCallback, useEffect } from 'react';
import type { LocoDetails, LocoSchedule, TractionFailure, WAG7Modification } from './types';
import { getLocoData, getAllLocoNumbers } from './services/googleSheetService';
import { DOCUMENTS_URL } from './constants';
import SearchBar from './components/SearchBar';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import LocoDetailsCard from './components/LocoDetailsCard';
import SchedulesTable from './components/SchedulesTable';
import FailuresTable from './components/FailuresTable';
import WAG7ModificationsList from './components/WAG7ModificationsList';
import { WrenchScrewdriverIcon, CalendarDaysIcon, ClipboardDocumentListIcon, FolderIcon, TrainIcon } from './components/Icons';
import ModificationsSummary from './components/ModificationsSummary';
import FailuresSummary from './components/FailuresSummary';

// FIX: Removed React.FC type annotation to fix incorrect type inference by the compiler.
const App = () => {
  const [locoNo, setLocoNo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    details: LocoDetails | null;
    schedules: LocoSchedule[];
    failures: TractionFailure[];
    wag7Modifications: WAG7Modification[];
  } | null>(null);
  const [view, setView] = useState<'home' | 'summary' | 'failuresSummary'>('home');
  const [allLocoNumbers, setAllLocoNumbers] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocoNumbers = async () => {
      try {
        const numbers = await getAllLocoNumbers();
        setAllLocoNumbers(numbers);
      } catch (err) {
        console.error("Failed to fetch loco numbers for suggestions:", err);
      }
    };
    fetchLocoNumbers();
  }, []);

  const handleGoHome = useCallback(() => {
    setView('home');
    setData(null);
    setError(null);
    setLocoNo('');
  }, []);

  const handleSearch = useCallback(async (searchLocoNo: string) => {
    if (!searchLocoNo.trim()) {
      setError('Please enter a locomotive number.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    setLocoNo(searchLocoNo);

    try {
      const result = await getLocoData(searchLocoNo);
      if (!result.details) {
        setError(`No details found for locomotive #${searchLocoNo}. Please check the number and try again.`);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data. The Google Sheet might be inaccessible or the data format is incorrect.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderHomePage = () => (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <p className="text-center text-text-secondary mb-6">
          Search for a KZJD WAG7 locomotive number or explore the summary reports.
        </p>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} suggestions={allLocoNumbers} />

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
          <div 
            onClick={() => setView('summary')} 
            className="bg-bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setView('summary')}
            aria-label="View WAG7 modifications summary"
          >
            <ClipboardDocumentListIcon className="h-12 w-12 text-brand-primary mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Modifications Summary</h3>
            <p className="text-sm text-text-secondary">View a summary of all WAG7 modifications across the fleet.</p>
          </div>
          <div 
            onClick={() => setView('failuresSummary')} 
            className="bg-bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setView('failuresSummary')}
            aria-label="View failures summary"
          >
            <WrenchScrewdriverIcon className="h-12 w-12 text-brand-primary mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Failures Summary</h3>
            <p className="text-sm text-text-secondary">Explore an interactive, yearly breakdown of loco failures.</p>
          </div>
          <a 
            href={DOCUMENTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center"
            aria-label="Open documents folder"
          >
            <FolderIcon className="h-12 w-12 text-brand-primary mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Documents</h3>
            <p className="text-sm text-text-secondary">Access technical documents, reports, and manuals in Google Drive.</p>
          </a>
        </div>
      </div>

      <div className="mt-8 max-w-4xl mx-auto">
        {isLoading && <Loader />}
        {error && !isLoading && <ErrorMessage message={error} />}
        {data && !isLoading && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center text-brand-primary border-b pb-2">
              Showing Results for Loco #{locoNo}
            </h2>

            <LocoDetailsCard details={data.details} locoNo={locoNo} />

            <div className="bg-bg-card p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
                WAG7 Modifications for #{locoNo}
              </h2>
              <WAG7ModificationsList modifications={data.wag7Modifications} />
            </div>
            
            <div className="bg-bg-card p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                <CalendarDaysIcon className="h-6 w-6 mr-3" />
                Locomotive Schedules for #{locoNo}
              </h2>
              <SchedulesTable schedules={data.schedules} />
            </div>
            
            <div className="bg-bg-card p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                <WrenchScrewdriverIcon className="h-6 w-6 mr-3" />
                Online Failures for #{locoNo}
              </h2>
              <FailuresTable failures={data.failures} />
            </div>

          </div>
        )}
      </div>
    </main>
  );

  const renderSummaryView = () => (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ModificationsSummary onBack={() => setView('home')} />
    </main>
  );
  
  const renderFailuresSummaryView = () => (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <FailuresSummary onBack={() => setView('home')} />
    </main>
  );

  return (
    <div className="min-h-screen font-sans text-text-primary">
      <header className="bg-brand-primary shadow-md print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div 
            onClick={handleGoHome}
            className="flex items-center space-x-4 cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleGoHome()}
            aria-label="Go to home page"
          >
            <TrainIcon className="h-12 w-12 text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              DIESEL LOCO SHED - KAZIPET
            </h1>
          </div>
        </div>
      </header>
      
      {view === 'home' && renderHomePage()}
      {view === 'summary' && renderSummaryView()}
      {view === 'failuresSummary' && renderFailuresSummaryView()}


      <footer className="text-center py-6 text-text-secondary text-sm print:hidden">
        <p>&copy; {new Date().getFullYear()} Loco Data Summary. All data is sourced from Tcell-KZJD.</p>
      </footer>
    </div>
  );
};

export default App;