import React, { useState, useCallback } from 'react';
import type { LocoDetails, LocoSchedule, TractionFailure, WAG7Modification } from './types';
import { getLocoData } from './services/googleSheetService';
import SearchBar from './components/SearchBar';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import LocoDetailsCard from './components/LocoDetailsCard';
import SchedulesTable from './components/SchedulesTable';
import FailuresTable from './components/FailuresTable';
import WAG7ModificationsList from './components/WAG7ModificationsList';
import { TrainIcon, WrenchScrewdriverIcon, CalendarDaysIcon, ClipboardDocumentListIcon } from './components/Icons';

const App: React.FC = () => {
  const [locoNo, setLocoNo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    details: LocoDetails | null;
    schedules: LocoSchedule[];
    failures: TractionFailure[];
    wag7Modifications: WAG7Modification[];
  } | null>(null);

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

  return (
    <div className="min-h-screen font-sans text-text-primary">
      <header className="bg-brand-primary shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrainIcon className="h-8 w-8 text-brand-accent"/>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              DIESEL LOCO SHED KAZIPET - Locomotive Data
            </h1>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-text-secondary mb-6">
            Enter a locomotive number below to retrieve its details, schedules, modifications and failure history.
          </p>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>

        <div className="mt-8">
          {isLoading && <Loader />}
          {error && !isLoading && <ErrorMessage message={error} />}
          {data && !isLoading && (
            <div className="space-y-8">
              <LocoDetailsCard details={data.details} locoNo={locoNo} />

              <div className="bg-bg-card p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                  <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
                  WAG7 Modifications
                </h2>
                <WAG7ModificationsList modifications={data.wag7Modifications} />
              </div>
              
              <div className="bg-bg-card p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                  <CalendarDaysIcon className="h-6 w-6 mr-3" />
                  Locomotive Schedules
                </h2>
                <SchedulesTable schedules={data.schedules} />
              </div>
              
              <div className="bg-bg-card p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-brand-primary flex items-center mb-4">
                  <WrenchScrewdriverIcon className="h-6 w-6 mr-3" />
                  Online Failures
                </h2>
                <FailuresTable failures={data.failures} />
              </div>

            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-text-secondary text-sm">
        <p>&copy; {new Date().getFullYear()} Loco Data Summary. All data is sourced from Tcell-KZJD.</p>
      </footer>
    </div>
  );
};

export default App;
