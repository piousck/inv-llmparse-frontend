import { InvoiceDetail } from '../types/api';

export type GlCategory =
  | 'Direct Costs'
  | 'Operating Expense'
  | 'Fixed Assets'
  | 'Current Assets'
  | 'Current Asset'
  | 'Current Liabilities'
  | 'Current Liability'
  | 'Non-Current Liability'
  | 'Revenue'
  | 'Equity';

export type AccountType = 'Asset' | 'Liability' | 'Expense' | 'Revenue' | 'Equity';

export interface ContributingTransaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  sellerName: string;
  lineId?: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  netAmount: number;
  vatRate: number;
  vatCode: string;
  vatAmount: number;
  vatClaimed: number;
  grossAmount: number;
  postingType: 'debit' | 'credit';
  amount: number;
  currency: string;
  taxTreatmentNotes?: string | null;
  isSection60Resale?: boolean;
  isForeignNonClaimable?: boolean;
}

export interface GlAccountBalance {
  code: string;
  name: string;
  category: GlCategory;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
  transactionCount: number;
  transactions: ContributingTransaction[];
}

export interface TrialBalanceReport {
  accounts: GlAccountBalance[];
  totalDebits: number;
  totalCredits: number;
  totalNetDebits: number;
  totalNetCredits: number;
  isBalanced: boolean;
  variance: number;
  invoiceCount: number;
  totalVolume: number;
}

export interface FormattedCategoryGroup {
  id: string;
  name: string;
  codeRange: string;
  category: GlCategory;
  accounts: GlAccountBalance[];
  subtotalDebit: number;
  subtotalCredit: number;
  netBalance: number;
  percentageOfTotal: number;
}

export interface ProfitAndLossLine {
  accountCode?: string;
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  transactions?: ContributingTransaction[];
}

export interface ProfitAndLossReport {
  turnover: { lines: ProfitAndLossLine[]; total: number };
  costOfSales: { lines: ProfitAndLossLine[]; total: number };
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: { lines: ProfitAndLossLine[]; total: number };
  operatingProfit: number;
  netProfit: number;
  allPnlTransactions: ContributingTransaction[];
}

export interface FinancialStatementsResult {
  trialBalance: TrialBalanceReport;
  formattedTb: FormattedCategoryGroup[];
  pnl: ProfitAndLossReport;
  invoiceCount: number;
  unapprovedInvoiceCount: number;
  unapprovedGrossVolume: number;
  salesCount: number;
  totalGrossVolume: number;
}

export const STANDARD_GL_ACCOUNTS: Record<
  string,
  { name: string; category: GlCategory; type: AccountType }
> = {
  // 1. Revenue (200 series)
  '200': { name: 'Sales / Turnover', category: 'Revenue', type: 'Revenue' },
  '205': { name: 'Services Revenue', category: 'Revenue', type: 'Revenue' },
  '210': { name: 'Commission & Other Income', category: 'Revenue', type: 'Revenue' },
  '220': { name: 'DRS Handling Fee Income', category: 'Revenue', type: 'Revenue' },
  '260': { name: 'Government Grants & Subsidies', category: 'Revenue', type: 'Revenue' },
  '4000': { name: 'Sales - Standard Rate (23%)', category: 'Revenue', type: 'Revenue' },
  '4010': { name: 'Sales - Reduced Rate (13.5%)', category: 'Revenue', type: 'Revenue' },
  '4020': { name: 'Sales - Services / Zero / Exempt', category: 'Revenue', type: 'Revenue' },

  // 2. Direct Costs / Cost of Sales (300 series)
  '300': { name: 'Purchases (Stock for Resale)', category: 'Direct Costs', type: 'Expense' },
  '310': { name: 'Cost of Goods Sold', category: 'Direct Costs', type: 'Expense' },
  '315': { name: 'Food & Beverage Supplies', category: 'Direct Costs', type: 'Expense' },
  '320': { name: 'Direct Subcontractor Costs (RCT)', category: 'Direct Costs', type: 'Expense' },
  '330': { name: 'Plant & Equipment Hire', category: 'Direct Costs', type: 'Expense' },
  '340': { name: 'Hosting & Cloud Infrastructure', category: 'Direct Costs', type: 'Expense' },

  // 3. Operating Overheads / Expenses (400 series & 6000 series)
  '270': { name: 'Staff Salaries & Wages', category: 'Operating Expense', type: 'Expense' },
  '400': { name: 'Advertising & Marketing', category: 'Operating Expense', type: 'Expense' },
  '401': { name: 'Audit & Accountancy Fees', category: 'Operating Expense', type: 'Expense' },
  '404': { name: 'Bank & Merchant Fees', category: 'Operating Expense', type: 'Expense' },
  '408': { name: 'Cleaning & Sanitation', category: 'Operating Expense', type: 'Expense' },
  '412': { name: 'Light, Power & Heating (Utilities)', category: 'Operating Expense', type: 'Expense' },
  '413': { name: 'Staff & Client Entertainment (S.60)', category: 'Operating Expense', type: 'Expense' },
  '414': { name: 'Freight, Delivery & Courier', category: 'Operating Expense', type: 'Expense' },
  '415': { name: 'Commercial Insurance', category: 'Operating Expense', type: 'Expense' },
  '417': { name: 'Motor Vehicle Expenses & Fuel', category: 'Operating Expense', type: 'Expense' },
  '420': { name: 'Office Supplies & Consumables', category: 'Operating Expense', type: 'Expense' },
  '422': { name: 'Printing & Stationery', category: 'Operating Expense', type: 'Expense' },
  '424': { name: 'Rent & Premises Rates', category: 'Operating Expense', type: 'Expense' },
  '425': { name: 'Repairs & Maintenance', category: 'Operating Expense', type: 'Expense' },
  '426': { name: 'Subscriptions & Memberships', category: 'Operating Expense', type: 'Expense' },
  '427': { name: 'Telephone & Internet', category: 'Operating Expense', type: 'Expense' },
  '429': { name: 'General Administrative Expenses', category: 'Operating Expense', type: 'Expense' },
  '461': { name: 'IT Software & Cloud Licensing', category: 'Operating Expense', type: 'Expense' },
  '462': { name: 'Computer Equipment (Expensed)', category: 'Operating Expense', type: 'Expense' },
  '480': { name: 'Legal & Professional Fees', category: 'Operating Expense', type: 'Expense' },
  '485': { name: 'Consulting & Advisory Fees', category: 'Operating Expense', type: 'Expense' },
  '490': { name: 'Travel & Subsistence', category: 'Operating Expense', type: 'Expense' },
  '493': { name: 'Staff Training & Education', category: 'Operating Expense', type: 'Expense' },
  '6100': { name: 'Office Furniture & Fixtures', category: 'Operating Expense', type: 'Expense' },
  '6200': { name: 'Office Supplies & Stationery', category: 'Operating Expense', type: 'Expense' },
  '6300': { name: 'IT Hardware & Equipment', category: 'Operating Expense', type: 'Expense' },

  // 4. Current Assets (090 & 600 series)
  '090': { name: 'Bank Account (Current)', category: 'Current Assets', type: 'Asset' },
  '091': { name: 'Bank Account (Savings / Deposit)', category: 'Current Assets', type: 'Asset' },
  '092': { name: 'Petty Cash', category: 'Current Assets', type: 'Asset' },
  '600': { name: 'Bank Current Account', category: 'Current Assets', type: 'Asset' },
  '610': { name: 'Accounts Receivable (Trade Debtors)', category: 'Current Assets', type: 'Asset' },
  '620': { name: 'Prepayments', category: 'Current Assets', type: 'Asset' },
  '630': { name: 'Inventory / Stock on Hand', category: 'Current Assets', type: 'Asset' },
  '820': { name: 'VAT Control Account / Input Tax', category: 'Current Assets', type: 'Asset' },

  // 5. Fixed Assets (700 series)
  '710': { name: 'Office Equipment (Capitalised)', category: 'Fixed Assets', type: 'Asset' },
  '711': { name: 'Accumulated Depreciation - Office Equipment', category: 'Fixed Assets', type: 'Asset' },
  '720': { name: 'Computer Equipment (Capitalised)', category: 'Fixed Assets', type: 'Asset' },
  '721': { name: 'Accumulated Depreciation - Computer Equipment', category: 'Fixed Assets', type: 'Asset' },
  '740': { name: 'Motor Vehicles (Capitalised)', category: 'Fixed Assets', type: 'Asset' },
  '741': { name: 'Accumulated Depreciation - Motor Vehicles', category: 'Fixed Assets', type: 'Asset' },
  '760': { name: 'Fixtures & Fittings', category: 'Fixed Assets', type: 'Asset' },
  '761': { name: 'Accumulated Depreciation - Fixtures & Fittings', category: 'Fixed Assets', type: 'Asset' },
  '764': { name: 'Plant & Machinery', category: 'Fixed Assets', type: 'Asset' },
  '769': { name: 'Accumulated Depreciation - Plant & Machinery', category: 'Fixed Assets', type: 'Asset' },

  // 6. Current Liabilities (800 - 869)
  '800': { name: 'Accounts Payable (Trade Creditors)', category: 'Current Liabilities', type: 'Liability' },
  '805': { name: 'Credit Card', category: 'Current Liabilities', type: 'Liability' },
  '814': { name: 'PAYE/PRSI Liability', category: 'Current Liabilities', type: 'Liability' },
  '821': { name: 'Output VAT', category: 'Current Liabilities', type: 'Liability' },
  '825': { name: 'RCT Liability', category: 'Current Liabilities', type: 'Liability' },
  '840': { name: 'Accruals', category: 'Current Liabilities', type: 'Liability' },

  // 7. Non-Current Liabilities (870 - 899)
  '870': { name: 'Bank Loans / Long-Term Borrowings', category: 'Non-Current Liability', type: 'Liability' },
  '875': { name: 'Directors Loan Account', category: 'Non-Current Liability', type: 'Liability' },

  // 8. Equity / Capital (900 - 999)
  '900': { name: 'Share Capital / Ordinary Shares', category: 'Equity', type: 'Equity' },
  '960': { name: 'Retained Earnings', category: 'Equity', type: 'Equity' },
  '970': { name: 'Owner Drawings', category: 'Equity', type: 'Equity' },
  '980': { name: 'Owner Funds Introduced', category: 'Equity', type: 'Equity' },

  // Reconciliation & Discrepancies
  '999': { name: 'Document Extraction & Rounding Variance', category: 'Operating Expense', type: 'Expense' },
};

export function getAccountMeta(code: string): { name: string; category: GlCategory; type: AccountType } {
  if (STANDARD_GL_ACCOUNTS[code]) {
    return STANDARD_GL_ACCOUNTS[code];
  }
  const num = parseInt(code, 10);
  if (!isNaN(num)) {
    if (num < 100) return { name: `Bank / Cash (${code})`, category: 'Current Assets', type: 'Asset' };
    if (num >= 200 && num < 300) return { name: `Revenue (${code})`, category: 'Revenue', type: 'Revenue' };
    if (num >= 300 && num < 400) return { name: `Direct Costs (${code})`, category: 'Direct Costs', type: 'Expense' };
    if (num >= 400 && num < 500) return { name: `Operating Expense (${code})`, category: 'Operating Expense', type: 'Expense' };
    if (num >= 600 && num < 700) return { name: `Current Asset (${code})`, category: 'Current Assets', type: 'Asset' };
    if (num >= 700 && num < 800) return { name: `Fixed Asset (${code})`, category: 'Fixed Assets', type: 'Asset' };
    if (num >= 800 && num < 870) return { name: `Current Liability (${code})`, category: 'Current Liabilities', type: 'Liability' };
    if (num >= 870 && num < 900) return { name: `Non-Current Liability (${code})`, category: 'Non-Current Liability', type: 'Liability' };
    if (num >= 900 && num < 1000) return { name: `Equity (${code})`, category: 'Equity', type: 'Equity' };
    if (num >= 6000 && num < 7000) return { name: `Operating Expense (${code})`, category: 'Operating Expense', type: 'Expense' };
  }
  return { name: `Account ${code}`, category: 'Operating Expense', type: 'Expense' };
}

/**
 * Checks whether an invoice is officially approved and eligible for ledger posting.
 * An invoice is approved if requires_human_review is false or is_approved/status is set.
 */
export const isInvoiceApproved = (inv: InvoiceDetail): boolean => {
  if ((inv as any).is_approved === true || (inv as any).status === 'approved') return true;
  return inv.requires_human_review === false;
};

export function deriveFinancialStatements(
  invoices: InvoiceDetail[],
  salesItems: any[] = []
): FinancialStatementsResult {
  const accountMap = new Map<string, GlAccountBalance>();

  const getOrCreateAccount = (code: string): GlAccountBalance => {
    if (!accountMap.has(code)) {
      const meta = getAccountMeta(code);
      accountMap.set(code, {
        code,
        name: meta.name,
        category: meta.category,
        accountType: meta.type,
        totalDebit: 0,
        totalCredit: 0,
        netDebit: 0,
        netCredit: 0,
        transactionCount: 0,
        transactions: [],
      });
    }
    return accountMap.get(code)!;
  };

  const addDebit = (code: string, amount: number, tx: ContributingTransaction) => {
    if (amount === 0) return;
    const acc = getOrCreateAccount(code);
    acc.totalDebit = Math.round((acc.totalDebit + amount) * 100) / 100;
    acc.transactionCount += 1;
    acc.transactions.push({ ...tx, postingType: 'debit', amount });
  };

  const addCredit = (code: string, amount: number, tx: ContributingTransaction) => {
    if (amount === 0) return;
    const acc = getOrCreateAccount(code);
    acc.totalCredit = Math.round((acc.totalCredit + amount) * 100) / 100;
    acc.transactionCount += 1;
    acc.transactions.push({ ...tx, postingType: 'credit', amount });
  };

  let totalGrossVolume = 0;

  // 1. Strict accounting ledger boundary: only approved invoices post to GL
  const approvedInvoices = invoices.filter(isInvoiceApproved);
  const unapprovedInvoices = invoices.filter((inv) => !isInvoiceApproved(inv));
  const unapprovedGrossVolume = Math.round(
    unapprovedInvoices.reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0) * 100
  ) / 100;

  for (const inv of approvedInvoices) {
    totalGrossVolume += Number(inv.total_gross || 0);

    const isForeign =
      inv.currency !== 'EUR' ||
      inv.seller_vat?.startsWith('GB') ||
      (Boolean(inv.seller_vat) && !inv.seller_vat.startsWith('IE'));

    // Accounts Payable Credit entry for the full invoice gross
    addCredit('800', Number(inv.total_gross || 0), {
      id: `tx-ap-${inv.id}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      sellerName: inv.seller_name,
      description: `Bill Posting: ${inv.seller_name} (${inv.invoice_number})`,
      netAmount: Number(inv.total_net || 0),
      vatRate: 0,
      vatCode: '',
      vatAmount: Number(inv.total_vat || 0),
      vatClaimed: 0,
      grossAmount: Number(inv.total_gross || 0),
      postingType: 'credit',
      amount: Number(inv.total_gross || 0),
      currency: inv.currency,
      isForeignNonClaimable: isForeign,
    });

    let invoiceLineDebitsTotal = 0;

    // Process line items
    for (const line of inv.line_items || []) {
      const lineNet = Number(line.net_amount || line.net_value || 0);
      const lineVat = Number(line.vat_amount || 0);
      const lineGross = Number(line.gross_amount || lineNet + lineVat);

      // Determine claimable VAT
      const isClaimable = !isForeign && line.vat_deductible !== false && line.vat_code !== 'TN';
      const claimedVat = isClaimable ? lineVat : 0;

      // When VAT is non-claimable, non-recoverable VAT forms part of the gross expense debit under Irish GAAP / FRS 102.
      const expenseDebit = isClaimable ? lineNet : lineGross;
      const accountCode = line.xero_account_code || '429';

      invoiceLineDebitsTotal = Math.round((invoiceLineDebitsTotal + expenseDebit + claimedVat) * 100) / 100;

      // Debit expense or asset account
      addDebit(accountCode, expenseDebit, {
        id: `tx-line-${line.id || Math.random().toString(36).substring(2)}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        sellerName: inv.seller_name,
        lineId: line.id,
        description: line.description || 'General invoice item',
        quantity: line.quantity,
        unitPrice: line.unit_price,
        netAmount: lineNet,
        vatRate: Number(line.vat_rate || 0),
        vatCode: line.vat_code || (line.vat_rate > 0 ? `T${line.vat_rate}` : 'T0'),
        vatAmount: lineVat,
        vatClaimed: claimedVat,
        grossAmount: lineGross,
        postingType: 'debit',
        amount: expenseDebit,
        currency: inv.currency,
        taxTreatmentNotes: line.tax_treatment_notes || line.reasoning,
        isSection60Resale:
          line.xero_account_code === '300' &&
          (line.tax_treatment_notes?.includes('Section 60') ||
            line.tax_treatment_notes?.includes('resale')),
        isForeignNonClaimable: isForeign,
      });

      // Debit VAT Control (Account 820) if deductible (handles non-zero including negative VAT from discounts/credits)
      if (claimedVat !== 0) {
        addDebit('820', claimedVat, {
          id: `tx-vat-${line.id || Math.random().toString(36).substring(2)}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          sellerName: inv.seller_name,
          lineId: line.id,
          description: `Input VAT (${line.vat_code} ${line.vat_rate}%) - ${line.description}`,
          quantity: line.quantity,
          unitPrice: line.unit_price,
          netAmount: lineNet,
          vatRate: Number(line.vat_rate || 0),
          vatCode: line.vat_code || 'T23',
          vatAmount: lineVat,
          vatClaimed: claimedVat,
          grossAmount: lineGross,
          postingType: 'debit',
          amount: claimedVat,
          currency: inv.currency,
        });
      }
    }

    // Double-entry validation & self-balancing guardrail:
    // If line items debits differ from invoice gross credit (e.g. OCR rounding or extraction discrepancy),
    // allocate the difference to maintain strict double-entry balance.
    const invGross = Number(inv.total_gross || 0);
    const lineDiscrepancy = Math.round((invGross - invoiceLineDebitsTotal) * 100) / 100;
    if (Math.abs(lineDiscrepancy) >= 0.01) {
      const varianceCode = Math.abs(lineDiscrepancy) <= 0.50 ? '429' : '999';
      if (lineDiscrepancy > 0) {
        addDebit(varianceCode, lineDiscrepancy, {
          id: `tx-disc-deb-${inv.id}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          sellerName: inv.seller_name,
          description: `Line Extraction Discrepancy (${inv.invoice_number}): Lines (€${invoiceLineDebitsTotal.toFixed(2)}) vs Gross (€${invGross.toFixed(2)})`,
          netAmount: lineDiscrepancy,
          vatRate: 0,
          vatCode: '',
          vatAmount: 0,
          vatClaimed: 0,
          grossAmount: lineDiscrepancy,
          postingType: 'debit',
          amount: lineDiscrepancy,
          currency: inv.currency,
        });
      } else {
        const creditAmt = Math.abs(lineDiscrepancy);
        addCredit(varianceCode, creditAmt, {
          id: `tx-disc-cred-${inv.id}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.invoice_date,
          sellerName: inv.seller_name,
          description: `Line Extraction Discrepancy (${inv.invoice_number}): Lines (€${invoiceLineDebitsTotal.toFixed(2)}) vs Gross (€${invGross.toFixed(2)})`,
          netAmount: creditAmt,
          vatRate: 0,
          vatCode: '',
          vatAmount: 0,
          vatClaimed: 0,
          grossAmount: creditAmt,
          postingType: 'credit',
          amount: creditAmt,
          currency: inv.currency,
        });
      }
    }
  }

  // 2. Process sales invoices (if available in system)
  for (const sale of salesItems) {
    const saleNet = Number(sale.net || 0);
    const saleVat = Number(sale.vat || 0);
    const saleGross = saleNet + saleVat;
    const saleId = sale.id || `sale-${Math.random().toString(36).substring(2)}`;
    const revenueCode = sale.revenueGl ? sale.revenueGl.split(' ')[0] : '200';

    // Credit Revenue
    addCredit(revenueCode, saleNet, {
      id: `tx-sale-rev-${saleId}`,
      invoiceId: saleId,
      invoiceNumber: `SALE-${saleId.toUpperCase()}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      sellerName: sale.customer || 'Sales Debtor',
      description: `Revenue: ${sale.customer || 'Customer invoice'}`,
      netAmount: saleNet,
      vatRate: parseFloat(sale.rate) || 23,
      vatCode: 'T23',
      vatAmount: saleVat,
      vatClaimed: 0,
      grossAmount: saleGross,
      postingType: 'credit',
      amount: saleNet,
      currency: 'EUR',
    });

    // Credit Output VAT to 820 if VAT applicable
    if (saleVat > 0) {
      addCredit('820', saleVat, {
        id: `tx-sale-vat-${saleId}`,
        invoiceId: saleId,
        invoiceNumber: `SALE-${saleId.toUpperCase()}`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        sellerName: sale.customer || 'Sales Debtor',
        description: `Output VAT: ${sale.customer || 'Customer'}`,
        netAmount: saleNet,
        vatRate: parseFloat(sale.rate) || 23,
        vatCode: 'T23',
        vatAmount: saleVat,
        vatClaimed: 0,
        grossAmount: saleGross,
        postingType: 'credit',
        amount: saleVat,
        currency: 'EUR',
      });
    }

    // Debit Accounts Receivable 610
    addDebit('610', saleGross, {
      id: `tx-sale-ar-${saleId}`,
      invoiceId: saleId,
      invoiceNumber: `SALE-${saleId.toUpperCase()}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      sellerName: sale.customer || 'Sales Debtor',
      description: `Debtor Receivable: ${sale.customer}`,
      netAmount: saleNet,
      vatRate: 0,
      vatCode: '',
      vatAmount: saleVat,
      vatClaimed: 0,
      grossAmount: saleGross,
      postingType: 'debit',
      amount: saleGross,
      currency: 'EUR',
    });
  }

  // Calculate Net Debits/Credits and prepare reports
  const allAccounts = Array.from(accountMap.values()).map((acc) => {
    const net = Math.round((acc.totalDebit - acc.totalCredit) * 100) / 100;
    return {
      ...acc,
      netDebit: net > 0 ? net : 0,
      netCredit: net < 0 ? Math.abs(net) : 0,
    };
  });

  // Sort accounts by GL code
  allAccounts.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.code.localeCompare(b.code);
  });

  // Compute Total Debits and Credits (Gross movements and Net balances)
  const totalDebits = Math.round(allAccounts.reduce((sum, a) => sum + a.totalDebit, 0) * 100) / 100;
  const totalCredits = Math.round(allAccounts.reduce((sum, a) => sum + a.totalCredit, 0) * 100) / 100;
  const totalNetDebits = Math.round(allAccounts.reduce((sum, a) => sum + a.netDebit, 0) * 100) / 100;
  const totalNetCredits = Math.round(allAccounts.reduce((sum, a) => sum + a.netCredit, 0) * 100) / 100;
  const variance = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;
  const isBalanced = variance < 0.01;

  const trialBalance: TrialBalanceReport = {
    accounts: allAccounts,
    totalDebits,
    totalCredits,
    totalNetDebits,
    totalNetCredits,
    isBalanced,
    variance,
    invoiceCount: invoices.length,
    totalVolume: Math.round(totalGrossVolume * 100) / 100,
  };

  // 3. Formatted Trial Balance Groups (8 Standard Final Accounts Sections)
  const categoryDefinitions: Array<{
    id: string;
    name: string;
    codeRange: string;
    category: GlCategory;
  }> = [
    {
      id: 'cat-rev',
      name: 'Turnover & Operating Revenue',
      codeRange: '200 - 299 / 4000 series',
      category: 'Revenue',
    },
    {
      id: 'cat-direct',
      name: 'Cost of Sales & Direct Stock Purchases',
      codeRange: '300 - 399',
      category: 'Direct Costs',
    },
    {
      id: 'cat-overheads',
      name: 'Operating Overheads & Administration',
      codeRange: '400 - 499 / 6000 series',
      category: 'Operating Expense',
    },
    {
      id: 'cat-current-assets',
      name: 'Current Assets & Trade Debtors',
      codeRange: '090 - 099 / 600 - 699',
      category: 'Current Assets',
    },
    {
      id: 'cat-fixed-assets',
      name: 'Fixed Capital Assets & Equipment',
      codeRange: '700 - 799',
      category: 'Fixed Assets',
    },
    {
      id: 'cat-liabilities',
      name: 'Current Liabilities & Trade Creditors',
      codeRange: '800 - 869',
      category: 'Current Liabilities',
    },
    {
      id: 'cat-non-current-liabilities',
      name: 'Non-Current Liabilities & Term Debt',
      codeRange: '870 - 899',
      category: 'Non-Current Liability',
    },
    {
      id: 'cat-equity',
      name: 'Capital & Retained Equity',
      codeRange: '900 - 999',
      category: 'Equity',
    },
  ];

  const totalExpenseSum = allAccounts
    .filter((a) => a.category === 'Direct Costs' || a.category === 'Operating Expense')
    .reduce((s, a) => s + (a.totalDebit - a.totalCredit), 0);

  const formattedTb: FormattedCategoryGroup[] = categoryDefinitions.map((cat) => {
    const accounts = allAccounts.filter((a) => {
      if (cat.category === 'Current Assets' || cat.category === 'Current Asset') {
        return a.category === 'Current Assets' || a.category === 'Current Asset';
      }
      if (cat.category === 'Current Liabilities' || cat.category === 'Current Liability') {
        return a.category === 'Current Liabilities' || a.category === 'Current Liability';
      }
      return a.category === cat.category;
    });
    const subtotalDebit = Math.round(accounts.reduce((s, a) => s + a.totalDebit, 0) * 100) / 100;
    const subtotalCredit = Math.round(accounts.reduce((s, a) => s + a.totalCredit, 0) * 100) / 100;
    const netBalance = Math.round((subtotalDebit - subtotalCredit) * 100) / 100;
    const percentageOfTotal =
      totalExpenseSum > 0 && (cat.category === 'Direct Costs' || cat.category === 'Operating Expense')
        ? Math.round((Math.abs(netBalance) / totalExpenseSum) * 100)
        : 0;

    return {
      id: cat.id,
      name: cat.name,
      codeRange: cat.codeRange,
      category: cat.category,
      accounts,
      subtotalDebit,
      subtotalCredit,
      netBalance,
      percentageOfTotal,
    };
  });

  // 4. Profit & Loss Statement (P&L)
  const turnoverAccounts = allAccounts.filter((a) => a.category === 'Revenue');
  const turnoverLines: ProfitAndLossLine[] = turnoverAccounts.map((a) => ({
    accountCode: a.code,
    label: `${a.code} · ${a.name}`,
    amount: Math.round((a.totalCredit - a.totalDebit) * 100) / 100,
    transactions: a.transactions,
  }));
  const totalTurnover = Math.round(turnoverLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

  const costOfSalesAccounts = allAccounts.filter((a) => a.category === 'Direct Costs');
  const costOfSalesLines: ProfitAndLossLine[] = costOfSalesAccounts.map((a) => ({
    accountCode: a.code,
    label: `${a.code} · ${a.name}`,
    amount: Math.round((a.totalDebit - a.totalCredit) * 100) / 100,
    transactions: a.transactions,
  }));
  const totalCostOfSales = Math.round(costOfSalesLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

  const grossProfit = Math.round((totalTurnover - totalCostOfSales) * 100) / 100;
  const grossMarginPercent =
    totalTurnover > 0 ? Math.round((grossProfit / totalTurnover) * 100) : 0;

  const operatingExpenseAccounts = allAccounts.filter((a) => a.category === 'Operating Expense');
  const operatingExpenseLines: ProfitAndLossLine[] = operatingExpenseAccounts.map((a) => ({
    accountCode: a.code,
    label: `${a.code} · ${a.name}`,
    amount: Math.round((a.totalDebit - a.totalCredit) * 100) / 100,
    transactions: a.transactions,
  }));
  const totalOperatingExpenses =
    Math.round(operatingExpenseLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

  const operatingProfit = Math.round((grossProfit - totalOperatingExpenses) * 100) / 100;
  const netProfit = operatingProfit; // Before tax / interest

  const allPnlTransactions = [
    ...turnoverAccounts.flatMap((a) => a.transactions),
    ...costOfSalesAccounts.flatMap((a) => a.transactions),
    ...operatingExpenseAccounts.flatMap((a) => a.transactions),
  ];

  const pnl: ProfitAndLossReport = {
    turnover: { lines: turnoverLines, total: totalTurnover },
    costOfSales: { lines: costOfSalesLines, total: totalCostOfSales },
    grossProfit,
    grossMarginPercent,
    operatingExpenses: { lines: operatingExpenseLines, total: totalOperatingExpenses },
    operatingProfit,
    netProfit,
    allPnlTransactions,
  };

  return {
    trialBalance,
    formattedTb,
    pnl,
    invoiceCount: approvedInvoices.length,
    unapprovedInvoiceCount: unapprovedInvoices.length,
    unapprovedGrossVolume,
    salesCount: salesItems.length,
    totalGrossVolume: Math.round(totalGrossVolume * 100) / 100,
  };
}

/**
 * Generate CSV export for Trial Balance
 */
export function exportTrialBalanceCsv(tb: TrialBalanceReport, orgName = 'Acme Accounting'): void {
  const headers = ['GL Code', 'Account Name', 'Category', 'Account Type', 'Debit (€)', 'Credit (€)', 'Tx Count'];
  const rows = tb.accounts.map((a) => [
    `"${a.code}"`,
    `"${a.name.replace(/"/g, '""')}"`,
    `"${a.category}"`,
    `"${a.accountType}"`,
    a.totalDebit.toFixed(2),
    a.totalCredit.toFixed(2),
    a.transactionCount,
  ]);

  rows.push([
    '"TOTAL"',
    '"Total Debits & Credits"',
    '""',
    `"${tb.isBalanced ? 'BALANCED' : 'OUT OF BALANCE'}"`,
    tb.totalDebits.toFixed(2),
    tb.totalCredits.toFixed(2),
    '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [`# Trial Balance - ${orgName} - Generated ${new Date().toISOString()}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `trial_balance_${orgName.toLowerCase().replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate CSV export for Formatted Trial Balance
 */
export function exportFormattedTbCsv(
  groups: FormattedCategoryGroup[],
  pnl?: ProfitAndLossReport | null,
  orgName = 'Acme Accounting'
): void {
  const headers = ['Category Group', 'GL Code', 'Account Name', 'Debit (€)', 'Credit (€)', 'Net Balance (€)', 'Tx Count'];
  const rows: string[][] = [];

  for (const group of groups) {
    rows.push([`"--- ${group.name.toUpperCase()} (${group.codeRange}) ---"`, '""', '""', '""', '""', '""', '""']);
    for (const a of group.accounts) {
      const net = (a.totalDebit - a.totalCredit).toFixed(2);
      rows.push([
        `"${group.name}"`,
        `"${a.code}"`,
        `"${a.name.replace(/"/g, '""')}"`,
        a.totalDebit.toFixed(2),
        a.totalCredit.toFixed(2),
        net,
        a.transactionCount.toString(),
      ]);
    }
    rows.push([
      `"SUBTOTAL ${group.name}"`,
      '""',
      '""',
      group.subtotalDebit.toFixed(2),
      group.subtotalCredit.toFixed(2),
      group.netBalance.toFixed(2),
      '""',
    ]);
    rows.push(['', '', '', '', '', '', '']);
  }

  if (pnl) {
    rows.push(['"=== OPERATING RESULTS & NET PROFIT / (LOSS) ==="', '""', '""', '""', '""', '""', '""']);
    rows.push(['"Total Turnover (Revenue)"', '""', '""', '""', pnl.turnover.total.toFixed(2), pnl.turnover.total.toFixed(2), '""']);
    rows.push(['"Cost of Sales (COGS)"', '""', '""', pnl.costOfSales.total.toFixed(2), '""', (-pnl.costOfSales.total).toFixed(2), '""']);
    rows.push(['"Gross Profit"', '""', '""', '""', '""', pnl.grossProfit.toFixed(2), '""']);
    rows.push(['"Operating Expenses / Overheads"', '""', '""', pnl.operatingExpenses.total.toFixed(2), '""', (-pnl.operatingExpenses.total).toFixed(2), '""']);
    rows.push([
      `"${pnl.netProfit >= 0 ? 'NET PROFIT FOR PERIOD' : 'NET LOSS FOR PERIOD'}"`,
      '""',
      '""',
      '""',
      '""',
      pnl.netProfit.toFixed(2),
      '""',
    ]);
    rows.push(['', '', '', '', '', '', '']);
  }

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [`# Formatted Trial Balance - ${orgName} - Generated ${new Date().toISOString()}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `formatted_trial_balance_${orgName.toLowerCase().replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate CSV export for Profit & Loss Statement
 */
export function exportPnlCsv(pnl: ProfitAndLossReport, orgName = 'Acme Accounting'): void {
  const headers = ['P&L Section', 'Account / Line Item', 'Amount (€)'];
  const rows: string[][] = [];

  rows.push(['"REVENUE / TURNOVER"', '""', '""']);
  for (const line of pnl.turnover.lines) {
    rows.push(['"Turnover"', `"${line.label.replace(/"/g, '""')}"`, line.amount.toFixed(2)]);
  }
  rows.push(['"TOTAL TURNOVER"', '""', pnl.turnover.total.toFixed(2)]);
  rows.push(['', '', '']);

  rows.push(['"COST OF SALES / PURCHASES"', '""', '""']);
  for (const line of pnl.costOfSales.lines) {
    rows.push(['"Cost of Sales"', `"${line.label.replace(/"/g, '""')}"`, line.amount.toFixed(2)]);
  }
  rows.push(['"TOTAL COST OF SALES"', '""', pnl.costOfSales.total.toFixed(2)]);
  rows.push(['', '', '']);

  rows.push(['"GROSS PROFIT / (LOSS)"', `"${pnl.grossMarginPercent}% Margin"`, pnl.grossProfit.toFixed(2)]);
  rows.push(['', '', '']);

  rows.push(['"OPERATING EXPENSES / OVERHEADS"', '""', '""']);
  for (const line of pnl.operatingExpenses.lines) {
    rows.push(['"Operating Overhead"', `"${line.label.replace(/"/g, '""')}"`, line.amount.toFixed(2)]);
  }
  rows.push(['"TOTAL OPERATING EXPENSES"', '""', pnl.operatingExpenses.total.toFixed(2)]);
  rows.push(['', '', '']);

  rows.push(['"OPERATING PROFIT (EBITDA)"', '""', pnl.operatingProfit.toFixed(2)]);
  rows.push(['"NET PROFIT / (LOSS) BEFORE TAX"', '""', pnl.netProfit.toFixed(2)]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [`# Profit & Loss Statement - ${orgName} - Generated ${new Date().toISOString()}`, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `profit_and_loss_${orgName.toLowerCase().replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
