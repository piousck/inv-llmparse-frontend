import { useState, useEffect, useCallback } from 'react';

export type DateFormatOption =
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'DD MMM YYYY'
  | 'MM/DD/YYYY'
  | 'DD-MM-YYYY'
  | 'DD.MM.YYYY'
  | 'D MMM YYYY';

export const DATE_FORMAT_STORAGE_KEY = 'invparse_date_format';
export const DEFAULT_DATE_FORMAT: DateFormatOption = 'DD/MM/YYYY';

export const DATE_FORMAT_OPTIONS: { id: DateFormatOption; label: string; example: string }[] = [
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK / Ireland / Europe)', example: '31/12/2024' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Standard)', example: '2024-12-31' },
  { id: 'DD MMM YYYY', label: 'DD MMM YYYY (Accounting Standard)', example: '31 Dec 2024' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Standard)', example: '12/31/2024' },
  { id: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '31-12-2024' },
  { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '31.12.2024' },
  { id: 'D MMM YYYY', label: 'D MMM YYYY', example: '5 Dec 2024' },
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Retrieve active user date format preference from localStorage.
 */
export function getActiveDateFormat(): DateFormatOption {
  if (typeof window === 'undefined') return DEFAULT_DATE_FORMAT;
  try {
    const saved = localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
    if (saved && DATE_FORMAT_OPTIONS.some((o) => o.id === saved)) {
      return saved as DateFormatOption;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_DATE_FORMAT;
}

/**
 * Persist active date format preference and notify all listening components.
 */
export function setActiveDateFormat(format: DateFormatOption): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DATE_FORMAT_STORAGE_KEY, format);
    window.dispatchEvent(new CustomEvent('invparse_date_format_changed', { detail: format }));
  } catch (err) {
    console.error('Failed to set date format preference:', err);
  }
}

/**
 * Parse an incoming date representation into year, month (1-12), and day (1-31).
 * Specifically avoids UTC-to-local timezone shift bugs on date-only strings (e.g. "2024-12-15").
 */
function parseDateParts(
  input: string | number | Date | null | undefined
): { year: number; month: number; day: number } | null {
  if (!input && input !== 0) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return {
      year: input.getFullYear(),
      month: input.getMonth() + 1,
      day: input.getDate(),
    };
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  }

  const str = String(input).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'no date') {
    return null;
  }

  // Matches "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" or "YYYY/MM/DD"
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // Matches "DD/MM/YYYY" or "DD-MM-YYYY" or "DD.MM.YYYY"
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    // Assume DD/MM/YYYY if p1 <= 31 and p2 <= 12
    if (p2 <= 12 && p1 <= 31) {
      return { year, month: p2, day: p1 };
    }
    // If p1 <= 12 and p2 > 12 (like 12/25/2024), it was MM/DD/YYYY
    if (p1 <= 12 && p2 <= 31) {
      return { year, month: p1, day: p2 };
    }
  }

  // Fallback to JS Date parser
  const fallbackDate = new Date(str);
  if (!isNaN(fallbackDate.getTime())) {
    return {
      year: fallbackDate.getFullYear(),
      month: fallbackDate.getMonth() + 1,
      day: fallbackDate.getDate(),
    };
  }

  return null;
}

/**
 * Format any date input (string, Date, timestamp) according to the user's active date format setting.
 *
 * @param input Date string (e.g. "2024-12-15"), timestamp, or Date object
 * @param formatOverride Optional explicit format override
 * @param fallback Fallback string when date is missing or invalid (defaults to "—")
 */
export function formatAppDate(
  input: string | number | Date | null | undefined,
  formatOverride?: DateFormatOption,
  fallback = '—'
): string {
  const parts = parseDateParts(input);
  if (!parts) return fallback;

  const { year, month, day } = parts;
  const fmt = formatOverride || getActiveDateFormat();

  const dd = String(day).padStart(2, '0');
  const d = String(day);
  const mm = String(month).padStart(2, '0');
  const mmm = MONTH_NAMES_SHORT[month - 1] || mm;
  const yyyy = String(year);

  switch (fmt) {
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'DD MMM YYYY':
      return `${dd} ${mmm} ${yyyy}`;
    case 'D MMM YYYY':
      return `${d} ${mmm} ${yyyy}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${yyyy}`;
    case 'DD.MM.YYYY':
      return `${dd}.${mm}.${yyyy}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

/**
 * React hook that subscribes to date format changes across the app.
 * Returns the current dateFormat, a setter function, and a bound formatDate function.
 */
export function useDateFormat() {
  const [dateFormat, setDateFormatState] = useState<DateFormatOption>(getActiveDateFormat);

  useEffect(() => {
    const handleFormatChange = (e: Event) => {
      const customEvent = e as CustomEvent<DateFormatOption>;
      if (customEvent.detail) {
        setDateFormatState(customEvent.detail);
      } else {
        setDateFormatState(getActiveDateFormat());
      }
    };

    window.addEventListener('invparse_date_format_changed', handleFormatChange);
    window.addEventListener('storage', handleFormatChange);

    return () => {
      window.removeEventListener('invparse_date_format_changed', handleFormatChange);
      window.removeEventListener('storage', handleFormatChange);
    };
  }, []);

  const setDateFormat = useCallback((newFormat: DateFormatOption) => {
    setActiveDateFormat(newFormat);
    setDateFormatState(newFormat);
  }, []);

  const formatDate = useCallback(
    (input: string | number | Date | null | undefined, customFmt?: DateFormatOption, fallback = '—') => {
      return formatAppDate(input, customFmt || dateFormat, fallback);
    },
    [dateFormat]
  );

  return {
    dateFormat,
    setDateFormat,
    formatDate,
  };
}
