import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutocompleteOption {
  id: number | string;
  name: string;
  category?: string;
  brand?: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function Autocomplete({
  value,
  onChange,
  onSelect,
  options = [],
  isLoading = false,
  placeholder = "Start typing...",
  className,
  disabled = false,
  error = false
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (options.length > 0 && value.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(0);
    } else {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [options, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.name);
    onSelect?.(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleOptionClick(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    if (options.length > 0 && value.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow for option clicks
    setTimeout(() => {
      if (e.currentTarget && document.activeElement && !e.currentTarget.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 200);
  };

  return (
    <div className="relative" onBlur={handleInputBlur}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          className,
          error ? "border-red-500" : "",
          "pr-8"
        )}
      />
      
      {isOpen && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-2 text-sm text-gray-500 text-center">
              Loading...
            </div>
          ) : options.length === 0 ? (
            <div className="p-2 text-sm text-gray-500 text-center">
              No products found
            </div>
          ) : (
            <ul ref={listRef} className="py-1">
              {options.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                      index === highlightedIndex ? "bg-gray-100" : ""
                    )}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="font-medium">{option.name}</div>
                    {(option.category || option.brand) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.category}
                        {option.category && option.brand && " • "}
                        {option.brand}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}