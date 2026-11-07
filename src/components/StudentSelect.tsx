import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/StudentSelect.css';

export type StudentOption = {
  id: string;
  name: string;
};

type StudentSelectProps = {
  options: StudentOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  /** Label for the "no selection" option (e.g. "كل الطلبة"). Omit to hide it. */
  allOptionLabel?: string;
  disabled?: boolean;
};

// Searchable dropdown for picking a student — replaces long walls of name buttons.
export default function StudentSelect({
  options,
  value,
  onChange,
  placeholder = 'ابحث عن طالب...',
  allOptionLabel,
  disabled = false,
}: StudentSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.id === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((option) => option.name.includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="student-select" ref={containerRef} dir="rtl">
      <button
        type="button"
        className="student-select-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'student-select-value' : 'student-select-placeholder'}>
          {selected ? selected.name : allOptionLabel ?? placeholder}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`}></i>
      </button>

      {open && (
        <div className="student-select-menu" role="listbox">
          <div className="student-select-search">
            <i className="fas fa-magnifying-glass"></i>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
          </div>

          <ul className="student-select-list">
            {allOptionLabel && (
              <li>
                <button
                  type="button"
                  className={`student-select-option${value === null ? ' is-selected' : ''}`}
                  onClick={() => choose(null)}
                >
                  {allOptionLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="student-select-empty">لا يوجد طالب مطابق</li>
            ) : (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`student-select-option${option.id === value ? ' is-selected' : ''}`}
                    onClick={() => choose(option.id)}
                  >
                    {option.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
