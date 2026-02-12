
import React, { useState, useMemo } from 'react';
import type { TractionFailure } from '../types';
import { PrinterIcon, FullScreenEnterIcon, FullScreenExitIcon, PhotoIcon, ChevronUpIcon, ChevronDownIcon, LinkIcon } from './Icons';
import MediaGalleryModal, { MediaItem } from './MediaGalleryModal';
import { parseDateDDMMYY } from '../services/googleSheetService';

interface FailureDetailsModalProps {
  failures: TractionFailure[];
  onClose: () => void;
}

const FailureDetailsModal: React.FC<FailureDetailsModalProps> = ({ failures, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<MediaItem[] | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof TractionFailure; direction: 'ascending' | 'descending' }>({ key: 'datefailed', direction: 'descending' });

  const handlePrint = () => {
    window.print();
  };

  const sortedFailures = useMemo(() => {
    let sortableItems = [...failures];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'datefailed') {
          const dateA = parseDateDDMMYY(a.datefailed || '');
          const dateB = parseDateDDMMYY(b.datefailed || '');
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        } else {
          const valA = (a[sortConfig.key] || '').toString().toLowerCase();
          const valB = (b[sortConfig.key] || '').toString().toLowerCase();
          if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
      });
    }
    return sortableItems;
  }, [failures, sortConfig]);

  const requestSort = (key: keyof TractionFailure) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof TractionFailure) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending'
      ? <ChevronUpIcon className="h-4 w-4 inline-block ml-1" />
      : <ChevronDownIcon className="h-4 w-4 inline-block ml-1" />;
  };

  const handleGalleryClick = (e: React.MouseEvent, link: string, type: 'media' | 'doc', locoNo?: string) => {
    // Check if it is a Folder link (legacy support) - open in new tab
    if (link.includes('/folders/')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation(); // Stop propagation in case table row clicks are handled

    // Parse format: "URL | Name" or just "URL"
    const items: MediaItem[] = link.split(',').map((itemStr, index) => {
        const parts = itemStr.split('|');
        const url = parts[0].trim();
        let label = '';

        if (parts.length > 1) {
             label = parts[1].trim();
        } else {
             if (type === 'media') {
                 label = `Media ${index + 1}`;
             } else {
                 label = `Document ${index + 1}${locoNo ? ` - ${locoNo}` : ''}`;
             }
        }
        return { url, label };
    }).filter(l => l.url.length > 0);

    if (items.length > 0) {
      setGalleryItems(items);
    }
  };

  return (
    <>
      {galleryItems && (
        <MediaGalleryModal 
          mediaItems={galleryItems} 
          onClose={() => setGalleryItems(null)} 
        />
      )}
      
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center print:static print:p-0 print:bg-transparent print:z-auto transition-all duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="failure-details-title"
      >
        <div 
          className={`bg-white shadow-xl flex flex-col print:shadow-none print:rounded-none print:max-h-full print:w-full transition-all duration-300 ${isFullScreen ? 'w-screen h-screen max-w-full max-h-full rounded-none' : 'w-full max-w-6xl max-h-[90vh] rounded-lg'}`}
          onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
        >
          <header className="flex justify-between items-center p-4 border-b print:hidden">
            <h2 id="failure-details-title" className="text-lg font-bold text-brand-primary">
              Failure Details ({failures.length} records)
            </h2>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
                aria-label={isFullScreen ? 'Exit full screen' : 'View in full screen'}
              >
                {isFullScreen ? (
                  <>
                    <FullScreenExitIcon className="h-4 w-4" />
                    <span>Exit</span>
                  </>
                ) : (
                  <>
                    <FullScreenEnterIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light transition"
                aria-label="Print details"
              >
                <PrinterIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
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
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[12%]">
                        <div onClick={() => requestSort('datefailed')} className="cursor-pointer hover:text-text-primary transition-colors group">
                            <div className="flex items-center gap-1">
                                Date Failed {getSortIcon('datefailed')}
                            </div>
                            <span className="text-[10px] font-normal normal-case text-gray-500 group-hover:text-gray-700">Train No</span>
                        </div>
                    </th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[14%]">
                        Loco No. +MU With<br />
                        <span className="text-[10px] font-normal normal-case text-gray-500">Schedule Details</span>
                    </th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[10%]">
                        <div onClick={() => requestSort('icmsmessage')} className="cursor-pointer hover:text-text-primary transition-colors">
                             <div className="flex items-center gap-1">ICMS/Msg {getSortIcon('icmsmessage')}</div>
                             <div>Division</div>
                             <div>Railway</div>
                        </div>
                    </th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[20%]">Brief Message</th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[24%]">Cause of Failure</th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[12%]">
                        <div onClick={() => requestSort('equipment')} className="cursor-pointer hover:text-text-primary transition-colors">
                            <div className="flex items-center gap-1">Equipment {getSortIcon('equipment')}</div>
                            <div>Component</div>
                        </div>
                    </th>
                    <th className="p-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider align-top w-[8%]">
                         <div onClick={() => requestSort('responsibility')} className="cursor-pointer hover:text-text-primary transition-colors flex items-center gap-1">
                            Section {getSortIcon('responsibility')}
                        </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedFailures.map((failure, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                        <div>{failure.datefailed}</div>
                        {failure.trainno && <div className="text-xs text-gray-500 font-medium mt-1">{failure.trainno}</div>}
                      </td>
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                        <div>
                            {failure.documentlink ? (
                            <a
                                href={failure.documentlink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => handleGalleryClick(e, failure.documentlink!, 'doc', failure.locono)}
                                className="font-bold text-brand-secondary hover:text-brand-primary hover:underline transition-colors cursor-pointer"
                                title={`View document for loco #${failure.locono}`}
                                aria-label={`View document for loco number ${failure.locono}`}
                            >
                                {failure.locono}
                            </a>
                            ) : (
                            <span className="font-bold">{failure.locono}</span>
                            )}
                            {failure.muwith ? ` + ${failure.muwith}` : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {failure.schparticulars ? (
                                <span className="block">{failure.schparticulars}</span>
                            ) : (
                                failure.lastsch && <span className="block">LS: {failure.lastsch} ({failure.lastschdate})</span>
                            )}
                        </div>
                      </td>
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                        {failure.icmsmessage && <p>{failure.icmsmessage}</p>}
                        {(failure.div || failure.rly) && <p>{failure.div}/{failure.rly}</p>}
                      </td>
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                        <span>{failure.briefmessage}</span>
                        {failure.medialink && (
                          <a
                            href={failure.medialink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleGalleryClick(e, failure.medialink!, 'media')}
                            className="inline-flex items-center gap-1 text-sm text-brand-secondary hover:text-brand-primary mt-2 cursor-pointer"
                            title={failure.medialink.includes('/folders/') ? "Open Drive Folder" : "View Media Gallery"}
                            aria-label="View media for this failure"
                          >
                            <PhotoIcon className="h-4 w-4" />
                            <span>View Media</span>
                          </a>
                        )}
                      </td>
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">{failure.causeoffailure}</td>
                      <td className="p-2 align-top text-text-primary whitespace-normal break-words">
                        {failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}
                      </td>
                       <td className="p-2 align-top text-text-primary whitespace-normal break-words">{failure.responsibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {sortedFailures.map((failure, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                        <div className="flex justify-between items-start border-b pb-2 mb-3">
                            <div>
                                <p className="font-bold text-base text-brand-primary">
                                    <span className="text-text-secondary font-medium">#{index + 1}</span> {failure.locono}
                                    {failure.muwith ? ` + ${failure.muwith}` : ''}
                                </p>
                                <p className="text-text-secondary">
                                    {failure.datefailed}
                                    {failure.trainno && <span className="text-xs font-medium ml-2">({failure.trainno})</span>}
                                </p>
                            </div>
                            {failure.documentlink && (
                                <a
                                    href={failure.documentlink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => handleGalleryClick(e, failure.documentlink!, 'doc', failure.locono)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-secondary bg-blue-100 rounded-md hover:bg-blue-200 transition-colors cursor-pointer"
                                    title={`View document for loco #${failure.locono}`}
                                    aria-label={`View document for loco number ${failure.locono}`}
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    View Doc
                                </a>
                            )}
                        </div>

                        <div className="space-y-3">
                            {(failure.schparticulars || failure.lastsch) && (
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-4"><p className="font-semibold text-text-secondary">Schedule</p></div>
                                    <div className="col-span-8">
                                        {failure.schparticulars ? (
                                            <p className="text-text-primary">{failure.schparticulars}</p>
                                        ) : (
                                            <p className="text-text-primary">LS: {failure.lastsch} ({failure.lastschdate})</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-4"><p className="font-semibold text-text-secondary">ICMS/Msg</p></div>
                                <div className="col-span-8">
                                    {failure.icmsmessage && <p className="text-text-primary">{failure.icmsmessage}</p>}
                                    {(failure.div || failure.rly) && <p className="text-text-primary">{failure.div}/{failure.rly}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-4"><p className="font-semibold text-text-secondary">Message</p></div>
                                <div className="col-span-8 text-text-primary">
                                    <span>{failure.briefmessage}</span>
                                    {failure.medialink && (
                                        <a
                                            href={failure.medialink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleGalleryClick(e, failure.medialink!, 'media')}
                                            className="inline-flex items-center gap-1 text-sm text-brand-secondary hover:text-brand-primary mt-1 cursor-pointer"
                                            title={failure.medialink.includes('/folders/') ? "Open Drive Folder" : "View Media Gallery"}
                                            aria-label="View media for this failure"
                                        >
                                            <PhotoIcon className="h-4 w-4" />
                                            <span>View Media</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-4"><p className="font-semibold text-text-secondary">Equipment</p></div>
                                <div className="col-span-8"><p className="text-text-primary">{failure.equipment || ''}{failure.component ? ` - ${failure.component}` : ''}</p></div>
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-4"><p className="font-semibold text-text-secondary">Section</p></div>
                                <div className="col-span-8"><p className="text-text-primary">{failure.responsibility}</p></div>
                            </div>

                            <div className="pt-1">
                                <p className="font-semibold text-text-secondary mb-1">Cause of Failure</p>
                                <p className="text-text-primary bg-white p-2 border rounded-md w-full">{failure.causeoffailure}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default FailureDetailsModal;
