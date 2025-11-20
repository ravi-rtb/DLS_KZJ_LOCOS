
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon } from './Icons';

export interface MediaItem {
  url: string;
  label: string;
}

interface MediaGalleryModalProps {
  mediaItems: MediaItem[];
  onClose: () => void;
}

const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({ mediaItems, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // extract ID and convert to preview URL
  const getEmbedUrl = (url: string) => {
    try {
      // Handle Google Drive Links
      if (url.includes('drive.google.com')) {
        // Extract ID (matches /d/ID or id=ID)
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  }, [mediaItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  }, [mediaItems.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') onClose();
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentItem = mediaItems[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex flex-col h-screen w-screen">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-black bg-opacity-50 absolute top-0 w-full z-10">
        <div className="text-sm font-medium truncate pr-4">
          <span className="text-gray-400 mr-2">{currentIndex + 1} / {mediaItems.length}</span>
          {currentItem.label}
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors focus:outline-none flex-shrink-0"
          aria-label="Close Gallery"
        >
          <span className="text-2xl font-bold leading-none">&times;</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow relative flex items-center justify-center w-full h-full p-2 sm:p-8 pt-16 pb-24">
        
        {/* Previous Button */}
        {mediaItems.length > 1 && (
          <button 
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 text-white p-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-80 rounded-full focus:outline-none z-20 transition-all"
            aria-label="Previous Image"
          >
            <ChevronDownIcon className="h-8 w-8 transform rotate-90" />
          </button>
        )}

        {/* The Media Frame */}
        <div className="w-full h-full max-w-6xl mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-2xl relative">
           <iframe 
             src={getEmbedUrl(currentItem.url)} 
             className="w-full h-full border-0"
             allow="autoplay"
             title={`Media content: ${currentItem.label}`}
           />
        </div>

        {/* Next Button */}
        {mediaItems.length > 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-2 sm:right-4 text-white p-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-80 rounded-full focus:outline-none z-20 transition-all"
            aria-label="Next Image"
          >
            <ChevronDownIcon className="h-8 w-8 transform -rotate-90" />
          </button>
        )}
      </div>

      {/* Thumbnail Strip (Bottom) */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-0 w-full bg-black bg-opacity-80 p-4 flex justify-center gap-2 overflow-x-auto z-10 h-20">
          {mediaItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-12 h-12 rounded-md border-2 transition-all overflow-hidden relative group ${
                currentIndex === idx ? 'border-brand-secondary bg-gray-700' : 'border-transparent bg-gray-800 hover:bg-gray-700'
              }`}
              title={item.label}
              aria-label={`Go to ${item.label}`}
            >
              <span className="flex items-center justify-center w-full h-full text-white text-xs font-bold">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGalleryModal;
