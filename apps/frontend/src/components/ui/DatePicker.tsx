'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplay(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatValue(date: Date) {
  // yyyy-mm-dd — matches <input type="date"> value format
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build a 6-row × 7-column grid of Date|null representing the calendar month. */
function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  // Pad to a multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  /** Controlled selected date */
  value?: Date | null;
  /** Called when the user selects a date */
  onChange?: (date: Date) => void;
  /** Dates before this are disabled */
  minDate?: Date;
  /** Dates after this are disabled */
  maxDate?: Date;
  /** Label shown above the input trigger */
  label?: string;
  /** Placeholder when no date is selected */
  placeholder?: string;
  /** Native input name attribute (used if rendered inside a form) */
  name?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  placeholder = 'Select a date',
  name,
  id: idProp,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const calendarId = `${inputId}-calendar`;

  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((value ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((value ?? today).getMonth());

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync view when controlled value changes
  useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const rows = buildCalendarGrid(viewYear, viewMonth);
  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function isDisabled(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function handleSelect(date: Date) {
    if (isDisabled(date)) return;
    onChange?.(date);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const displayValue = value ? formatDisplay(value) : '';

  return (
    <div ref={containerRef} className="relative inline-block w-full max-w-xs">
      {/* Hidden native input for form serialization */}
      {name && (
        <input type="hidden" name={name} value={value ? formatValue(value) : ''} />
      )}

      {/* Visible label */}
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? calendarId : undefined}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <span className={displayValue ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayValue || placeholder}
        </span>
        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 ml-2 shrink-0" aria-hidden="true" />
      </button>

      {/* Calendar dialog */}
      {open && (
        <div
          id={calendarId}
          role="dialog"
          aria-modal="true"
          aria-label={`Calendar — choose a date, currently showing ${monthLabel}`}
          className="absolute z-50 mt-1 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span
              aria-live="polite"
              aria-atomic="true"
              className="text-sm font-semibold text-gray-800 dark:text-gray-100"
            >
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Calendar grid */}
          <table
            role="grid"
            aria-label="Calendar"
            className="w-full border-collapse"
          >
            <thead>
              <tr role="row">
                {DAYS_OF_WEEK.map(day => (
                  <th
                    key={day}
                    scope="col"
                    aria-label={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][DAYS_OF_WEEK.indexOf(day)]}
                    className="w-9 h-9 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} role="row">
                  {row.map((date, colIdx) => {
                    if (!date) {
                      return (
                        <td
                          key={`empty-${colIdx}`}
                          role="gridcell"
                          aria-disabled="true"
                          className="w-9 h-9"
                        />
                      );
                    }

                    const selected = !!(value && sameDay(date, value));
                    const disabled = isDisabled(date);
                    const isToday = sameDay(date, today);

                    return (
                      <td
                        key={date.toISOString()}
                        role="gridcell"
                        aria-label={formatDisplay(date)}
                        aria-selected={selected}
                        aria-disabled={disabled}
                        className="w-9 h-9 text-center p-0"
                      >
                        <button
                          type="button"
                          tabIndex={disabled ? -1 : 0}
                          disabled={disabled}
                          onClick={() => handleSelect(date)}
                          className={[
                            'w-8 h-8 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                            selected
                              ? 'bg-blue-600 text-white font-semibold'
                              : isToday
                              ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30'
                              : disabled
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                          ].join(' ')}
                        >
                          {date.getDate()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
            <button
              type="button"
              onClick={() => handleSelect(today)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
