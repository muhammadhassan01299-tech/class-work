import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, X } from 'lucide-react';
import { type DestinationItem } from '../data/siteConfig';
import { formatPKR } from '../utils/bookingMath';
import { filterDestinationSuggestions } from '../utils/destinationAutocomplete';

interface DestinationAutocompleteProps {
  id?: string;
  destinations: DestinationItem[];
  selectedDestinationId: string;
  query: string;
  onQueryChange: (nextQuery: string) => void;
  onSelectDestination: (dest: DestinationItem) => void;
  onClear?: () => void;
  error?: string | null;
  invalid?: boolean;
  placeholder?: string;
}

export function DestinationAutocomplete({
  id = 'quick-dest',
  destinations,
  selectedDestinationId,
  query,
  onQueryChange,
  onSelectDestination,
  onClear,
  error,
  invalid,
  placeholder = 'Type a valley, city, or region...',
}: DestinationAutocompleteProps) {
  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [showAllOnFocus, setShowAllOnFocus] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // When freshly focused with an already-selected full name, show all destinations until the user types
  const effectiveQuery = showAllOnFocus ? '' : query;
  const suggestions = filterDestinationSuggestions(destinations, effectiveQuery);

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAllOnFocus(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, []);

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveIndex(-1);
    } else if (activeIndex >= suggestions.length || activeIndex < 0) {
      setActiveIndex(0);
    }
  }, [suggestions.length, activeIndex]);

  const handleSelect = (dest: DestinationItem) => {
    onSelectDestination(dest);
    setIsOpen(false);
    setShowAllOnFocus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAllOnFocus(false);
    setIsOpen(true);
    setActiveIndex(0);
    onQueryChange(e.target.value);
  };

  const handleInputFocus = () => {
    const matchesCurrentSelection = destinations.some(
      (d) => d.id === selectedDestinationId && d.name === query
    );
    setShowAllOnFocus(matchesCurrentSelection);
    setIsOpen(true);
    const selectedIdx = destinations.findIndex((d) => d.id === selectedDestinationId);
    setActiveIndex(selectedIdx >= 0 && matchesCurrentSelection ? selectedIdx : 0);
  };

  const handleClearClick = () => {
    setShowAllOnFocus(false);
    setIsOpen(true);
    setActiveIndex(0);
    if (onClear) {
      onClear();
    } else {
      onQueryChange('');
    }
    inputRef.current?.focus();
  };

  const handleToggleList = () => {
    if (isOpen) {
      setIsOpen(false);
      setShowAllOnFocus(false);
      return;
    }
    const matchesCurrentSelection = destinations.some(
      (d) => d.id === selectedDestinationId && d.name === query
    );
    setShowAllOnFocus(matchesCurrentSelection);
    setIsOpen(true);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(Math.max(0, suggestions.length - 1));
        return;
      }
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
      return;
    }

    if (e.key === 'Enter' && isOpen && suggestions.length > 0 && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setShowAllOnFocus(false);
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      setShowAllOnFocus(false);
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && suggestions[activeIndex]
      ? `${id}-option-${suggestions[activeIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-[#023E8A] mb-1.5"
      >
        Destination
      </label>

      <div className="relative flex items-center">
        <MapPin
          className="w-4 h-4 text-[#0077B6] absolute left-3 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(error || invalid)}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 pr-14 py-2.5 rounded-xl border bg-white text-sm text-[#03045E] placeholder:text-[#0077B6]/60 focus:outline-none transition-colors ${
            error || invalid
              ? 'border-[#023E8A] ring-2 ring-[#00B4D8]/35'
              : 'border-[#90E0EF] focus:border-[#0077B6]'
          }`}
        />

        <div className="absolute right-2 flex items-center gap-0.5">
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClearClick}
              aria-label="Clear destination search"
              className="p-1 rounded-lg text-[#0077B6] hover:text-[#03045E] hover:bg-[#CAF0F8]/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleList}
            aria-label="Toggle destination suggestions"
            aria-expanded={isOpen}
            tabIndex={-1}
            className="p-1 rounded-lg text-[#0077B6] hover:text-[#03045E] hover:bg-[#CAF0F8]/70 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs font-bold text-[#023E8A]">
          {error}
        </p>
      )}

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-[340px] z-50 rounded-2xl bg-white border border-[#90E0EF] shadow-2xl overflow-hidden">
          <div className="px-3.5 py-2 border-b border-[#CAF0F8] bg-[#CAF0F8]/45 flex items-center justify-between">
            <span className="text-xs font-bold text-[#023E8A]">
              {showAllOnFocus || !query.trim()
                ? 'All Destinations'
                : `Matching Destinations (${suggestions.length})`}
            </span>
            <span className="text-[11px] font-semibold text-[#0077B6] tabular-nums">
              {destinations.length} valleys
            </span>
          </div>

          {suggestions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Destination suggestions"
              className="max-h-64 overflow-y-auto py-1"
            >
              {suggestions.map((dest, index) => {
                const isSelected = dest.id === selectedDestinationId;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={dest.id}
                    id={`${id}-option-${dest.id}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(dest)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-3 transition-colors ${
                        isActive
                          ? 'bg-[#CAF0F8]/85'
                          : isSelected
                          ? 'bg-[#ADE8F4]/35'
                          : 'hover:bg-[#CAF0F8]/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#03045E] truncate">
                          {dest.name}
                        </p>
                        <p className="text-xs text-[#0077B6] tabular-nums mt-0.5 truncate">
                          {dest.region} · {dest.durationLabel} · From {formatPKR(dest.basePricePKR)}
                        </p>
                      </div>
                      {isSelected && (
                        <Check
                          className="w-4 h-4 text-[#023E8A] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-sm font-bold text-[#03045E] mb-1">
                No matching destinations found
              </p>
              <p className="text-xs text-[#0077B6] mb-3">
                Try searching Naran, Hunza, Skardu, Swat, Chitral, or Azad Kashmir.
              </p>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearClick}
                className="px-3.5 py-1.5 rounded-xl bg-[#CAF0F8] hover:bg-[#ADE8F4] text-xs font-bold text-[#023E8A] border border-[#90E0EF] transition-colors"
              >
                Show all destinations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
