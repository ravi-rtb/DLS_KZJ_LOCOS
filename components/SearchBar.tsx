
import React, { useState } from 'react';
import { MagnifyingGlassIcon } from './Icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter Loco Number (e.g., 22003)"
        className="flex-grow w-full px-4 py-3 text-lg text-text-primary bg-bg-card border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light focus:border-brand-light transition duration-200 ease-in-out shadow-sm"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="flex items-center justify-center px-6 py-3 font-semibold text-white bg-brand-secondary rounded-lg hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition duration-200 ease-in-out shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        <MagnifyingGlassIcon className="h-6 w-6 mr-2"/>
        Search
      </button>
    </form>
  );
};

export default SearchBar;
