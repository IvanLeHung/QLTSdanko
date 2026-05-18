import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check, Filter } from 'lucide-react';
import api from '../lib/api';

// --- 1. AUTOCOMPLETE INPUT ---
export const AutocompleteInput: React.FC<{
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  endpoint: string;
  icon?: React.ReactNode;
  className?: string;
}> = ({ placeholder, value, onChange, endpoint, icon, className = '' }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length < 2 || !isOpen) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(endpoint, { params: { q: value } });
        setSuggestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, endpoint, isOpen]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        {icon && <div className="absolute left-3 top-2.5 text-slate-400">{icon}</div>}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-xl ${icon ? 'pl-9' : 'px-4'} pr-4 py-2 text-[13px] font-[600] text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-50/50 focus:border-primary-500 transition-all shadow-sm h-[38px]`}
        />
      </div>
      {isOpen && (suggestions.length > 0 || loading) && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-[12px] text-slate-400 italic">Đang tìm...</div>
          ) : (
            suggestions.map((s: any, i) => {
              const label = typeof s === 'string' ? s : s.label;
              const val = typeof s === 'string' ? s : s.value;
              return (
                <button
                  key={i}
                  className="w-full text-left px-4 py-2 text-[13px] font-[600] text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    onChange(val);
                    setIsOpen(false);
                  }}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// --- 2. MULTI-SELECT DROPDOWN ---
export const MultiSelect: React.FC<{
  label: string;
  selected: string[];
  onChange: (vals: string[]) => void;
  options: { label: string; value: string }[];
}> = ({ label, selected, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(s => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-4 py-2 bg-white border rounded-xl text-[13px] font-[600] transition-all h-[38px] shadow-sm ${
          selected.length > 0 ? 'border-primary-500 text-primary-700 bg-primary-50/10' : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <span>{selected.length > 0 ? `${label}: ${selected.length}` : label}</span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-64 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors"
              onClick={() => toggle(opt.value)}
            >
              <span className={`text-[13px] ${selected.includes(opt.value) ? 'font-[700] text-primary-700' : 'font-[600] text-slate-600'}`}>
                {opt.label}
              </span>
              {selected.includes(opt.value) && <Check className="h-4 w-4 text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 3. POPOVER FILTER ---
export const PopoverFilter: React.FC<{
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ label, icon, isActive, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-4 py-2 bg-white border rounded-xl text-[13px] font-[600] transition-all h-[38px] shadow-sm ${
          isActive ? 'border-primary-500 text-primary-700 bg-primary-50/10' : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        {icon && <span className="mr-2">{icon}</span>}
        <span>{label}</span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] p-6 animate-in zoom-in-95 duration-100 min-w-[300px]">
          {children}
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-[800] hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 4. FILTER CHIP ---
export const FilterChip: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
}> = ({ label, value, onRemove }) => (
  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm animate-in fade-in zoom-in-95 duration-200">
    <span className="text-[11px] font-[800] text-slate-400 uppercase tracking-wider mr-1.5">{label}:</span>
    <span className="text-[12px] font-[700] text-slate-700">{value}</span>
    <button onClick={onRemove} className="ml-2 p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);
