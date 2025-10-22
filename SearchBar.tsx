import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon } from './Icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  suggestions: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, suggestions }) => {
  const [query, setQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

  const placeholderText = useMemo(() => {
    if (suggestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      return `Enter Loco Number (e.g., ${suggestions[randomIndex]})`;
    }
    return 'Enter Loco Number';
  }, [suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length > 0) {
      setFilteredSuggestions(
        suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
      );
      setIsSuggestionsVisible(true);
    } else {
      setFilteredSuggestions([]);
      setIsSuggestionsVisible(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsSuggestionsVisible(false);
    onSearch(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsVisible(false);
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-grow">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length > 0 && filteredSuggestions.length > 0) {
              setIsSuggestionsVisible(true);
            }
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow click events to register
            setTimeout(() => setIsSuggestionsVisible(false), 200);
          }}
          placeholder={placeholderText}
          className="w-full px-4 py-3 text-lg text-text-primary bg-bg-card border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-light focus:border-brand-light transition duration-200 ease-in-out shadow-sm"
          disabled={isLoading}
          autoComplete="off"
        />
        {isSuggestionsVisible && filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
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