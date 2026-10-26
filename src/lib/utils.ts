import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'EUR'): string {
  if (amount === null || amount === undefined || amount === '') return '€0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '€0.00';
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNegative ? `-${symbol}${absFormatted}` : `${symbol}${absFormatted}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${(val * 100).toFixed(0)}%`;
}

export function bboxToPixels(bbox: [number, number, number, number], imagePixelWidth: number, imagePixelHeight: number) {
  const [x0, y0, x1, y1] = bbox;
  return {
    left: Math.round(x0 * imagePixelWidth),
    top: Math.round(y0 * imagePixelHeight),
    width: Math.round((x1 - x0) * imagePixelWidth),
    height: Math.round((y1 - y0) * imagePixelHeight),
  };
}

export function getBoxColor(box: { field?: string | null; field_confidence?: number; confidence?: number }) {
  const conf = box.field_confidence ?? box.confidence ?? 0;
  if (!box.field) return { bg: 'rgba(148, 163, 184, 0.15)', border: '#94a3b8', text: '#64748b' }; // Unmapped gray
  if (conf >= 0.85) return { bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981', text: '#047857' }; // High green
  if (conf >= 0.60) return { bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b', text: '#b45309' }; // Med yellow
  return { bg: 'rgba(239, 68, 68, 0.18)', border: '#ef4444', text: '#b91c1c' }; // Low red
}

export function formatApiError(err: any, status = 500): string {
  if (!err) return `Request failed (${status})`;
  if (typeof err === 'string') return err;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail
      .map((d: any) => {
        const field = Array.isArray(d.loc)
          ? d.loc.filter((x: string) => x !== 'body').join('.')
          : d.loc || '';
        return field ? `${field}: ${d.msg}` : d.msg || JSON.stringify(d);
      })
      .join('; ');
  }
  if (err.message && typeof err.message === 'string') return err.message;
  return JSON.stringify(err);
}

export function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%^&*()_+~|}{[]';
  const all = upper + lower + digits + specials;

  let pwd = '';
  // Ensure at least one of each
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += specials[Math.floor(Math.random() * specials.length)];

  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return pwd
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

export function isNonIrishPurchase(
  invoice?: {
    seller_vat?: string | null;
    seller_name?: string | null;
    currency?: string | null;
    supplier_address?: string | null;
    line_items?: Array<{
      vat_rate?: number;
      vat_code?: string;
      tax_treatment_notes?: string | null;
      reasoning?: string | null;
    }>;
  } | null,
  item?: {
    vat_rate?: number;
    vat_code?: string;
    tax_treatment_notes?: string | null;
    reasoning?: string | null;
  } | null
): boolean {
  if (!invoice && !item) return false;

  // 1. Check seller_vat country code (any 2-letter alpha prefix that is NOT 'IE')
  const sellerVat = (invoice?.seller_vat || '').trim().toUpperCase();
  if (sellerVat.length >= 2) {
    const prefix = sellerVat.slice(0, 2);
    if (/^[A-Z]{2}$/.test(prefix) && prefix !== 'IE') {
      return true;
    }
  }

  // 2. Check currency
  const currency = (invoice?.currency || '').trim().toUpperCase();
  if (currency && currency !== 'EUR' && !sellerVat.startsWith('IE')) {
    return true;
  }

  // 3. Check supplier address for foreign countries
  const address = (invoice?.supplier_address || '').toLowerCase();
  if (
    address.includes('united kingdom') ||
    address.includes('great britain') ||
    address.includes('england') ||
    address.includes('scotland') ||
    address.includes('wales') ||
    address.includes('northern ireland') ||
    address.includes('london') ||
    address.includes('france') ||
    address.includes('germany') ||
    address.includes('deutschland') ||
    address.includes('usa') ||
    address.includes('united states') ||
    address.includes('croatia') ||
    address.includes('italy') ||
    address.includes('spain') ||
    address.includes('netherlands') ||
    address.includes('poland')
  ) {
    if (!sellerVat.startsWith('IE')) {
      return true;
    }
  }

  // 4. Check seller name for foreign entity designations without IE VAT
  const sellerName = (invoice?.seller_name || '').toLowerCase();
  if (
    sellerName.includes(' gmbh') ||
    sellerName.includes(' d.o.o') ||
    sellerName.includes(' s.a.r.l') ||
    sellerName.includes(' s.r.l') ||
    sellerName.includes(' s.p.a') ||
    sellerName.includes(' llc') ||
    sellerName.includes(' inc.')
  ) {
    if (!sellerVat.startsWith('IE')) {
      return true;
    }
  }

  // 5. Check item-level tax notes / reasoning
  if (item) {
    const notes = `${item.tax_treatment_notes || ''} ${item.reasoning || ''}`.toLowerCase();
    if (
      notes.includes('foreign') ||
      notes.includes('non-irish') ||
      notes.includes('outside ireland') ||
      notes.includes('uk vat')
    ) {
      return true;
    }
    const foreignRates = [20.0, 19.0, 25.0, 27.0, 22.0, 16.0, 14.0, 10.0, 7.0];
    if (typeof item.vat_rate === 'number' && foreignRates.includes(item.vat_rate) && !sellerVat.startsWith('IE')) {
      return true;
    }
  }

  // 6. Check if any line items in invoice have foreign notes
  if (invoice?.line_items) {
    const hasForeignLine = invoice.line_items.some((li) => {
      const n = `${li.tax_treatment_notes || ''} ${li.reasoning || ''}`.toLowerCase();
      return (
        n.includes('foreign') ||
        n.includes('non-irish') ||
        n.includes('outside ireland') ||
        n.includes('uk vat')
      );
    });
    if (hasForeignLine) return true;
  }

  return false;
}

/**
 * Formats a supplier name so it is never all uppercase and never all lowercase.
 * Starting letters of each word are capitalized (Title Case).
 * Common legal acronyms (LP, LLC, PLC, DAC, TSB, AIB, etc.) and prefixes (Mc, O') are preserved cleanly.
 */
export function formatSupplierName(name: string | null | undefined): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();

  const capitalizeToken = (token: string): string => {
    if (!token) return token;
    // Keep leading punctuation like quotes, parentheses, brackets
    if (['"', "'", '(', '['].includes(token[0])) {
      return token[0] + capitalizeToken(token.slice(1));
    }
    // Handle apostrophes like O'Connor, D'Souza
    if (token.length > 2 && token[1] === "'" && /^[a-zA-Z]$/.test(token[0])) {
      return token[0].toUpperCase() + "'" + token.charAt(2).toUpperCase() + token.slice(3).toLowerCase();
    }
    // Handle Mc prefix like McDonald, McEntee
    if (token.length > 3 && token.slice(0, 2).toLowerCase() === 'mc' && /^[a-zA-Z]$/.test(token[0])) {
      return 'Mc' + token.charAt(2).toUpperCase() + token.slice(3).toLowerCase();
    }
    // Handle common legal/banking acronyms
    const cleanUpper = token.toUpperCase().replace(/[.,)]+$/, '');
    const legalAcronyms = new Set(['LP', 'LLC', 'PLC', 'DAC', 'TSB', 'AIB', 'BOI']);
    if (legalAcronyms.has(cleanUpper)) {
      const suffix = token.slice(cleanUpper.length);
      return cleanUpper + suffix;
    }
    if (cleanUpper === 'LTD') {
      const suffix = token.slice(cleanUpper.length);
      return 'Ltd' + suffix;
    }
    // First letter uppercase, rest lowercase
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  };

  const capitalizeWord = (word: string): string => {
    if (word.includes('-')) {
      return word.split('-').map(capitalizeToken).join('-');
    }
    if (word.includes('/')) {
      return word.split('/').map(capitalizeToken).join('/');
    }
    return capitalizeToken(word);
  };

  return trimmed.split(/\s+/).map(capitalizeWord).join(' ');
}

