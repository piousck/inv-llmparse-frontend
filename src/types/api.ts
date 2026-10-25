export type Role = 'admin' | 'standard' | 'restricted';
export type OrgType = 'provider' | 'accounting' | 'client';
export type IndustryCode = string;

export type JobStatus = 'quarantined' | 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed' | 'partial_review';

export interface User {
  id: string;
  tenant_id: string;
  organization_id: string;
  email: string;
  display_name: string;
  side: string;
  tier: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  org_type: OrgType;
  managing_org_id: string | null;
  industry: IndustryCode;
  custom_accounting_notes: string | null;
  capitalization_threshold?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ProviderSettings {
  app_env?: string;
  primary_vision_provider?: string;
  primary_vision_model?: string;
  openrouter_model?: string;
  openrouter_free_models?: string[];
  enable_section_ocr?: boolean;
  enable_doctr_fallback?: boolean;
  enable_llm_primary_extraction?: boolean;
  vision_timeout_seconds?: number;
  openrouter_timeout_seconds?: number;
  jwt_access_token_expire_minutes?: number;
  default_capitalization_threshold: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  organization: Organization;
}

export interface InvoiceListItem {
  job_id: string;
  invoice_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  seller_name: string;
  total_net?: number;
  total_vat?: number;
  total_gross: number;
  currency: string;
  job_status: JobStatus;
  requires_human_review: boolean;
  ocr_confidence: number;
  error_code: string | null;
  error_message: string | null;
  original_filename: string;
  duplicate_of_job_id: string | null;
  created_by_user_id: string;
  is_partial?: boolean;
  page_count?: number;
  created_at: string;
  is_approved?: boolean;
  status?: string;
  approved_at?: string;
  payment_method?: string | null;
  payment_status?: string | null;
  amount_paid?: number | null;
  is_cash_paid?: boolean;
  payment_details?: string | null;
  is_period_locked?: boolean;
  locked_year_name?: string | null;
  invoice_direction?: 'payable' | 'receivable' | string;
  buyer_name?: string | null;
  processing_path?: string | null;
  document_type?: string | null;
}


export interface PaginatedInvoices {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: InvoiceListItem[];
}

export interface LineItem {
  id: string;
  item_code?: string | null;
  description: string;
  package_type?: string | null;
  unit_quantity?: number | null;
  unit_measure?: string | null;
  quantity: number;
  unit_price: number;
  net_value?: number;
  net_amount: number;
  vat_rate: number;
  vat_code: string;
  xero_account_code: string;
  xero_expense_category?: string;
  entertainment_context?: string;
  vat_deductible: boolean;
  income_tax_deductible: boolean;
  needs_customer_confirmation?: boolean;
  confirmation_reason?: string | null;
  tax_treatment_notes?: string | null;
  vat_amount: number;
  gross_amount: number;
  confidence?: number;
  reasoning?: string;
}

export interface InvoicePageImage {
  page: number;
  image_url: string;
  filename?: string;
}

export interface InvoiceDetail {
  id: string;
  job_id: string;
  tenant_id: string;
  organization_id: string;
  created_by_user_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  seller_name: string;
  seller_vat: string;
  buyer_name: string;
  buyer_vat: string;
  total_net: number;
  total_vat: number;
  total_gross: number;
  requires_human_review: boolean;
  ocr_confidence: number;
  organization_supplier_id?: string;
  global_supplier_id?: string;
  selected_supplier_name?: string;
  supplier_address?: string;
  line_items: LineItem[];
  created_at: string;
  updated_at: string;
  reviewer_notes?: string;
  document_url?: string;
  document_type?: 'pdf' | 'image';
  page_image_url?: string;
  page_count?: number;
  page_numbers?: number[];
  pages?: InvoicePageImage[];
  extracted_data?: Record<string, any>;
  is_approved?: boolean;
  status?: string;
  approved_at?: string;
  is_draft?: boolean;
  payment_method?: string | null;
  payment_status?: string | null;
  amount_paid?: number | null;
  is_cash_paid?: boolean;
  payment_details?: string | null;
  is_period_locked?: boolean;
  locked_year_name?: string | null;
}


export interface ReviewBox {
  id: string;
  text: string;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] normalized 0.0 to 1.0
  confidence: number;
  page: number;
  field?: string;
  field_confidence?: number;
  source: string;
}

export interface ReviewSurface {
  invoice_id: string;
  page_count: number;
  pages: {
    page: number;
    image_url: string;
  }[];
  boxes: ReviewBox[];
  fields: {
    name: string;
    value: string;
    confidence: number;
    source: string;
    evidence?: any[];
  }[];
}

export interface Supplier {
  id: string;
  organization_id: string;
  canonical_name: string;
  aliases: string[];
  vat_number: string;
  iban: string;
  address: string;
  business_description: string;
  is_active: boolean;
  created_at: string;
  invoice_count?: number;
  total_invoiced?: number;
  total_paid?: number;
  balance?: number;
}

export interface SupplierInvoiceLineItem {
  id: string;
  line_number: number;
  description: string | null;
  item_code: string | null;
  quantity: number | null;
  unit_price: number | null;
  vat_rate: number | null;
  vat_code: string | null;
  tax_amount: number | null;
  net_amount: number | null;
  gross_amount: number | null;
  xero_account_code: string | null;
}

export interface SupplierInvoice {
  id: string;
  job_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  total_net: number | null;
  total_vat: number | null;
  total_gross: number | null;
  requires_human_review: boolean;
  payment_method?: string | null;
  payment_status?: string | null;
  amount_paid?: number | null;
  is_cash_paid?: boolean;
  payment_details?: string | null;
  line_items: SupplierInvoiceLineItem[];
}

export interface SupplierPayment {
  id: string;
  bank_transaction_id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  allocated_amount: number;
  confidence_score: number;
  match_method: string;
  status: string;
  created_at: string;
  txn_date: string | null;
  txn_description: string | null;
  direction: string | null;
  reference_text: string | null;
}

export interface SupplierActivity {
  supplier: Supplier;
  invoices: SupplierInvoice[];
  payments: SupplierPayment[];
  total_invoiced: number;
  total_paid: number;
  balance: number;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  invoice_id: string | null;
  error_code: string | null;
  error_message: string | null;
  document_confidence: number | null;
  original_filename?: string | null;
  processing_path?: 'invoice' | 'bank_statement' | 'supplier_statement' | 'other' | string | null;
  result?: {
    statement_id?: string;
    transaction_count?: number;
    imported_count?: number;
    duplicate_count?: number;
    document_type?: string;
    invoice_id?: string;
    [key: string]: any;
  } | null;
}

export interface IrishVatRateDefinition {
  code: string;
  rate: number;
  label: string;
  description: string;
  examples: string;
}

export const IRISH_VAT_RATES: IrishVatRateDefinition[] = [
  { code: 'T0', rate: 0.0, label: '0.0% Zero Rate', description: 'Zero-rated goods & basic foodstuffs', examples: 'Milk, bread, fresh meat, tea, books, animal feed.' },
  { code: 'T9', rate: 9.0, label: '9.0% Second Reduced', description: 'Second reduced rate', examples: 'Newspapers, periodicals, sporting facilities.' },
  { code: 'T135', rate: 13.5, label: '13.5% Reduced Rate', description: 'Reduced rate', examples: 'Restaurant meals, hot takeaway food, electricity, building services.' },
  { code: 'T23', rate: 23.0, label: '23.0% Standard Rate', description: 'Standard rate', examples: 'Soft drinks, alcohol, electronics, clothing, consultancy.' },
  { code: 'TN', rate: 0.0, label: '0.0% Non-Deductible', description: 'Section 60 VATCA 2010 disallowance', examples: 'Client entertainment, private food/drink, petrol.' },
  { code: 'TE', rate: 0.0, label: '0.0% Exempt', description: 'Exempt from VAT', examples: 'Financial services, medical care, insurance.' },
];

export interface XeroAccountCodeDefinition {
  code: string;
  name: string;
  category: string;
  defaultVatCode: string;
}

export interface OrganizationGLAccount {
  id: string;
  tenant_id: string;
  organization_id: string;
  code: string;
  name: string;
  category: string;
  default_tax_rate?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationGLAccountCreate {
  code: string;
  name: string;
  category: string;
  default_tax_rate?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface OrganizationGLAccountUpdate {
  code?: string;
  name?: string;
  category?: string;
  default_tax_rate?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export const XERO_ACCOUNT_CODES: XeroAccountCodeDefinition[] = [
  // 1. Revenue
  { code: '200', name: 'Sales / Turnover', category: 'Revenue', defaultVatCode: 'T23' },
  { code: '205', name: 'Services Revenue', category: 'Revenue', defaultVatCode: 'T23' },
  { code: '210', name: 'Commission & Other Income', category: 'Revenue', defaultVatCode: 'T23' },
  { code: '220', name: 'DRS Handling Fee Income', category: 'Revenue', defaultVatCode: 'T0' },
  { code: '260', name: 'Government Grants & Subsidies', category: 'Revenue', defaultVatCode: 'TE' },

  // 2. Direct Costs / Cost of Sales
  { code: '300', name: 'Purchases (Stock / Resale)', category: 'Direct Costs', defaultVatCode: 'T23' },
  { code: '310', name: 'Cost of Goods Sold', category: 'Direct Costs', defaultVatCode: 'T23' },
  { code: '315', name: 'Food & Beverage Supplies', category: 'Direct Costs', defaultVatCode: 'T135' },
  { code: '320', name: 'Direct Subcontractor Costs (RCT)', category: 'Direct Costs', defaultVatCode: 'T135' },
  { code: '330', name: 'Plant & Equipment Hire', category: 'Direct Costs', defaultVatCode: 'T23' },
  { code: '340', name: 'Hosting & Cloud Infrastructure', category: 'Direct Costs', defaultVatCode: 'T23' },

  // 3. Operating Overheads
  { code: '270', name: 'Staff Salaries & Wages', category: 'Operating Expense', defaultVatCode: 'TE' },
  { code: '400', name: 'Advertising & Marketing', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '401', name: 'Audit & Accountancy', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '404', name: 'Bank Fees', category: 'Operating Expense', defaultVatCode: 'TE' },
  { code: '408', name: 'Cleaning', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '412', name: 'Electricity & Gas (Utilities)', category: 'Operating Expense', defaultVatCode: 'T135' },
  { code: '413', name: 'Entertainment (Section 60 Non-Deductible)', category: 'Operating Expense', defaultVatCode: 'TN' },
  { code: '414', name: 'Freight & Courier', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '415', name: 'Insurance', category: 'Operating Expense', defaultVatCode: 'TE' },
  { code: '417', name: 'Motor Vehicle Expenses', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '420', name: 'Office Supplies', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '422', name: 'Printing & Stationery', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '424', name: 'Rent & Rates', category: 'Operating Expense', defaultVatCode: 'TE' },
  { code: '425', name: 'Repairs & Maintenance', category: 'Operating Expense', defaultVatCode: 'T135' },
  { code: '426', name: 'Subscriptions & Software', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '427', name: 'Telephone & Internet', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '429', name: 'General Expenses', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '461', name: 'IT Software & Licensing', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '462', name: 'Computer Equipment (Expensed)', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '480', name: 'Legal Fees', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '485', name: 'Consulting & Professional Fees', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '490', name: 'Travel & Accommodation', category: 'Operating Expense', defaultVatCode: 'T135' },
  { code: '493', name: 'Staff Training', category: 'Operating Expense', defaultVatCode: 'TE' },
  { code: '6100', name: 'Office Furniture (Minor)', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '6200', name: 'Office Supplies & Stationery', category: 'Operating Expense', defaultVatCode: 'T23' },
  { code: '6300', name: 'IT Hardware & Consumables', category: 'Operating Expense', defaultVatCode: 'T23' },

  // 4. Current Assets
  { code: '090', name: 'Bank Account (Current)', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '091', name: 'Bank Account (Savings / Deposit)', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '092', name: 'Petty Cash', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '610', name: 'Accounts Receivable (Trade Debtors)', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '620', name: 'Prepayments', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '630', name: 'Inventory / Stock on Hand', category: 'Current Asset', defaultVatCode: 'TE' },
  { code: '820', name: 'VAT Control Account / Input Tax', category: 'Current Asset', defaultVatCode: 'TE' },

  // 5. Fixed Assets & Accumulated Depreciation
  { code: '710', name: 'Office Equipment (Capitalised)', category: 'Fixed Assets', defaultVatCode: 'T23' },
  { code: '711', name: 'Accumulated Depreciation - Office Equipment', category: 'Fixed Assets', defaultVatCode: 'TE' },
  { code: '720', name: 'Computer Equipment (Capitalised)', category: 'Fixed Assets', defaultVatCode: 'T23' },
  { code: '721', name: 'Accumulated Depreciation - Computer Equipment', category: 'Fixed Assets', defaultVatCode: 'TE' },
  { code: '740', name: 'Motor Vehicles', category: 'Fixed Assets', defaultVatCode: 'T23' },
  { code: '741', name: 'Accumulated Depreciation - Motor Vehicles', category: 'Fixed Assets', defaultVatCode: 'TE' },
  { code: '760', name: 'Fixtures & Fittings', category: 'Fixed Assets', defaultVatCode: 'T23' },
  { code: '761', name: 'Accumulated Depreciation - Fixtures & Fittings', category: 'Fixed Assets', defaultVatCode: 'TE' },
  { code: '764', name: 'Plant & Machinery', category: 'Fixed Assets', defaultVatCode: 'T23' },
  { code: '769', name: 'Accumulated Depreciation - Plant & Machinery', category: 'Fixed Assets', defaultVatCode: 'TE' },

  // 6. Current Liabilities
  { code: '800', name: 'Accounts Payable (Trade Creditors)', category: 'Current Liability', defaultVatCode: 'TE' },
  { code: '805', name: 'Credit Card', category: 'Current Liability', defaultVatCode: 'TE' },
  { code: '814', name: 'PAYE/PRSI Liability', category: 'Current Liability', defaultVatCode: 'TE' },
  { code: '821', name: 'Output VAT', category: 'Current Liability', defaultVatCode: 'TE' },
  { code: '825', name: 'RCT Liability', category: 'Current Liability', defaultVatCode: 'TE' },
  { code: '840', name: 'Accruals', category: 'Current Liability', defaultVatCode: 'TE' },

  // 7. Non-Current Liabilities
  { code: '870', name: 'Bank Loans / Long-Term Borrowings', category: 'Non-Current Liability', defaultVatCode: 'TE' },
  { code: '875', name: 'Directors Loan Account', category: 'Non-Current Liability', defaultVatCode: 'TE' },

  // 8. Equity / Capital
  { code: '900', name: 'Share Capital / Ordinary Shares', category: 'Equity', defaultVatCode: 'TE' },
  { code: '960', name: 'Retained Earnings', category: 'Equity', defaultVatCode: 'TE' },
  { code: '970', name: 'Owner Drawings', category: 'Equity', defaultVatCode: 'TE' },
  { code: '980', name: 'Owner Funds Introduced', category: 'Equity', defaultVatCode: 'TE' },
];

export interface IndustryPreset {
  industry_code: IndustryCode;
  display_name: string;
  description: string;
  industry_rules: string;
  prompt_overrides?: Record<string, string>;
  is_active?: boolean;
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    industry_code: 'general',
    display_name: 'General Business (Standard Default)',
    description: 'Standard defaults for organisations without a specific industry profile.',
    industry_rules:
      'Apply standard Xero Chart of Accounts mapping rules. Follow printed VAT rates and Ireland Revenue VAT rate schedule current at invoice date. Use most specific matching Xero code; otherwise use documented fallback code.',
  },
  {
    industry_code: 'retail_wholesale',
    display_name: 'Retail & FMCG (Goods for Resale - 300 Purchases)',
    description: 'Retail, wholesale, grocery, and FMCG purchase invoices.',
    industry_rules:
      'Purchases of food, beverages, and grocery stock are goods acquired for resale (Section 60(2)(a)(i) VATCA 2010), NOT entertainment. Map to Xero 300 (Purchases), mark vat_deductible: true (set entertainment_context: "not_applicable"), and assign statutory RTD rate codes (T0, T135, T23). Never map resale inventory to 413 or TN. Apply multi-rate Irish VAT breakdown: Zero rate 0% (T0 for basic foodstuffs), Second Reduced 9%, Reduced 13.5% (T135 for hot/prepared food and beverages), Standard 23% (T23), Exempt. Separate container/pallet deposits from goods value (deposits are outside VAT).',
  },
  {
    industry_code: 'hospitality',
    display_name: 'Hospitality, Restaurants & Catering (Section 60 Non-Deductible - 413)',
    description: 'Irish hospitality purchase invoices, food & beverage supplies, and venue operations.',
    industry_rules:
      'Vendor is in hospitality sector (restaurants, cafes, catering, pubs, hotels, event venues). Strict Section 60 Irish VATCA applies: meals, drinks, and entertainment are non-deductible. Food/drink/catering must map to Xero code "413" (Entertainment), never "429" (General Expenses). Restaurant food, cafe food, hot takeaways, and hot drinks (tea/coffee) carry 13.5% VAT (code "T135"), NEVER 9% ("T9"). For client entertainment where input VAT is non-deductible under Section 60, mark vat_deductible: false (for RTD reporting, non-deductible items map to "TN" to exclude from RTD purchase boxes). Takeaway packaging fees, delivery charges, and service charges must be extracted as separate line items (coded 420 for packaging, 414 for delivery). Tips and gratuities are zero-rated when separately itemised. Separate staff-canteen consumption from client entertainment where the invoice distinguishes them.',
  },
  {
    industry_code: 'construction',
    display_name: 'Construction, Trades & Engineering (RCT & Reverse Charge)',
    description: 'Construction services with RCT and reverse-charge VAT.',
    industry_rules:
      'Vendor is in construction sector (building, trades, plant hire, engineering). Detect Relevant Contracts Tax (RCT) on contractor/subcontractor payments. Apply reverse-charge VAT (Irish VATCA Section 16 / Article 44 B2B rule) to subcontracted construction services where the invoice omits an Irish VAT rate. Separate plant hire from materials: materials carry standard VAT at 23%, plant hire may be subject to reverse charge. Flag RCT-deductible payments for human review.',
  },
  {
    industry_code: 'tech_saas',
    display_name: 'Software, IT & Professional Services (Reverse Charge Cross-Border)',
    description: 'SaaS, software development, cloud infrastructure, and IT consultancy invoices.',
    industry_rules:
      'Vendor is in software / IT / professional services. Apply reverse charge for cross-border B2B SaaS and digital services (EU Article 44 / Irish VATCA Section 34). Distinguish client entertainment from staff welfare: client entertainment is non-deductible and maps to "413" (Entertainment); staff welfare maps to "welfare" categories. Cross-border digital services usually have no Irish VAT rate line — do not invent one; mark for review when the invoice is B2B EU.',
  },
  {
    industry_code: 'agriculture_farming',
    display_name: 'Agriculture, Farming & Agri-Business',
    description: 'Dairy, beef, tillage, sheep farming, agricultural contracting, and livestock operations.',
    industry_rules:
      'Vendor is in agriculture, livestock farming, or agri-contracting. 1. FLAT-RATE FARMER COMPENSATORY ADDITION (4.8%): Unregistered farmers charge an addition of 4.8% on agricultural produce/supplies -> map vat_code: "T48", vat_rate: 4.8%. 2. ZERO-RATED FARM INPUTS: Fertiliser, animal feed, lime, oral veterinary medicines, seed grain, and pasture seed are Zero-Rated (0%) -> map to Xero "300" (Farm Purchases / Inputs), vat_code: "T0". 3. REDUCED RATE (13.5%): Agricultural contracting services, machinery hire with operator, artificial insemination, veterinary call-out professional services carry 13.5% VAT -> assign "T135". 4. STANDARD RATE (23%): Machinery parts, fencing, hardware, veterinary consumables (needles, bandages, disinfectant), and commercial tractor fuel carry 23% -> assign "T23". Marked Gas Oil (Green Diesel) carries 13.5% VAT and is 100% deductible for agricultural machinery.',
  },
  {
    industry_code: 'healthcare_medical',
    display_name: 'Healthcare, Medical & Dental Practices',
    description: 'Medical clinics, dental surgeries, pharmacies, diagnostic imaging, and healthcare practices.',
    industry_rules:
      'Vendor is in healthcare, medical practice, dentistry, or pharmacy operations. 1. EXEMPT MEDICAL SUPPLIES (SECTION 60 / SCHEDULE 1 VATCA): Professional medical consultations, doctor visits, physiotherapy, dental surgery, and nursing care provided by registered medical practitioners are strictly EXEMPT from VAT ("TE"). 2. ZERO-RATED HUMAN MEDICINES: Oral medicines (capsules, tablets, syrups) for human use are Zero-Rated ("T0"). Non-oral medicines (creams, sprays, injectables) generally carry 23% ("T23") unless explicitly zero-rated under statutory instrument. 3. MEDICAL CONSUMABLES & PPE: Syringes, needles, surgical gloves, dressings, dental impression compounds carry standard 23% VAT ("T23"). 4. CAPITAL MEDICAL EQUIPMENT: Ultrasound machines, dental chairs, X-ray scanners, ECG monitors over capital threshold map to Fixed Assets "764" (Plant & Machinery / Medical Equipment). 5. PARTIAL EXEMPTION RESTRICTIONS: When a medical business provides both exempt healthcare and taxable cosmetic treatments, input VAT on clinic overheads may be subject to partial attribution.',
  },
  {
    industry_code: 'legal_financial',
    display_name: 'Legal, Professional & Financial Services',
    description: 'Law firms, solicitors, barristers, corporate advisory, wealth management, and accounting practices.',
    industry_rules:
      'Vendor is in legal / professional / financial services. 1. DISBURSEMENTS VS PROFESSIONAL FEES: Statutory client outlays incurred strictly as agent on client\'s behalf (Land Registry fees, stamp duty, court search fees, summons serving, company registration office fees) are OUTSIDE THE SCOPE OF VAT or EXEMPT ("TN" or "TE") with zero VAT charged. Professional legal fees, counsel fees, consultation, and legal drafting carry Standard 23% VAT ("T23"). 2. BARRISTER & COUNSEL FEES: Barrister fee notes carry 23% standard VAT; ensure counsel VAT number is captured. 3. CROSS-BORDER ADVISORY: Cross-border legal/tax advice from non-Irish lawyers (UK, US, EU) is subject to reverse-charge VAT under Irish Section 34 / EU Article 44 -> customer accounts for VAT, assign "T0X" or reverse-charge note. 4. BANKING & INSURANCE: Bank transaction fees, credit card merchant fees, loan administration, and indemnity insurance are strictly EXEMPT ("TE") from VAT. 5. PROFESSIONAL SUBSCRIPTIONS: Law Society of Ireland, Bar Council, ACCA, Chartered Accountants Ireland fees are Exempt ("TE") -> map to Xero "426".',
  },
  {
    industry_code: 'manufacturing_engineering',
    display_name: 'Manufacturing & Industrial Engineering',
    description: 'Industrial manufacturing, precision engineering, food processing, and fabrication plants.',
    industry_rules:
      'Vendor is in manufacturing, precision engineering, or industrial production. 1. SECTION 56 AUTHORISATION (ZERO-RATING): Qualifying Irish export manufacturers holding a valid Revenue Section 56 Authorisation (Form 13B) can purchase goods and services at Zero Rate ("T0") without paying VAT at point of purchase. When an invoice cites Section 56 or prints 0% with 13B notice, assign vat_code "T0", tax_treatment_notes: "Sec 56 13B Authorisation". 2. DIRECT RAW MATERIALS: Metals, plastic resins, chemicals, electronic components, and packaging that become part of the finished product are direct stock-in-trade -> MUST be coded to Xero "300" (Purchases / Raw Materials), 100% deductible ("T23"). 3. INDUSTRIAL ENERGY: High-voltage manufacturing electricity and natural gas carry reduced rates (13.5% or 9%) -> assign "T135", Xero "412". 4. INDUSTRIAL MACHINERY: Heavy production equipment, CNC machines, tooling jigs, and production lines over capital threshold map to Fixed Assets "764" (Plant & Machinery). 5. FACTORY CONSUMABLES & TOOLING: Drill bits, cutting fluids, machine lubricants, and maintenance supplies map to Xero "425".',
  },
  {
    industry_code: 'real_estate_property',
    display_name: 'Real Estate & Property Management',
    description: 'Commercial and residential property management, estate agencies, and facility operations.',
    industry_rules:
      'Vendor is in real estate, property management, or facility operations. 1. RESIDENTIAL VS COMMERCIAL RENT: Residential letting is strictly EXEMPT from VAT ("TE"). Commercial rent is exempt UNLESS the landlord has exercised a valid Landlord Option to Tax (Section 97 VATCA 2010), in which case rent carries Standard 23% VAT ("T23"). 2. PROPERTY REPAIRS (SECTION 16 IMMOVABLE GOODS): Painting, plumbing, electrical repairs, decorating, and routine maintenance of buildings carry the Reduced 13.5% rate ("T135"), NEVER 23%. 3. COMMERCIAL RATES & WATER: Local council commercial rates and Irish Water charges are exempt / outside VAT scope -> assign "TN" or "TE", Xero "424" or "412". 4. PROPERTY MANAGEMENT & AGENCY FEES: Estate agent fees, service charges, letting fees carry standard 23% VAT ("T23"). 5. CAPITAL GOODS SCHEME (CGS): Major property refurbishments, structural extensions, and acquisitions over capital thresholds must be coded to Fixed Assets "740" (Buildings & Capital Improvements) and flagged for CGS tracking.',
  },
  {
    industry_code: 'transport_logistics',
    display_name: 'Transport, Freight & Fleet Logistics',
    description: 'Road haulage, courier services, maritime freight, warehousing, and fleet operations.',
    industry_rules:
      'Vendor is in transport, road haulage, or freight logistics. 1. DIESEL VS PETROL (SECTION 60 VATCA 2010): Commercial road diesel for qualifying goods vehicles (HGVs, vans) is 100% VAT deductible at standard 23% -> assign vat_code "T23", vat_deductible: true, Xero code "417". Motor Petrol is strictly NON-DEDUCTIBLE under Section 60(1) -> MUST assign vat_code "TN", vat_deductible: false, tax_treatment_notes: "Petrol non-deductible (Sec 60)". 2. MOTORWAY TOLLS: Irish toll charges (eFlow, M50, toll plazas) include standard 23% VAT and are 100% deductible -> assign vat_code "T23", vat_deductible: true, Xero "417". 3. CROSS-BORDER CARRIAGE OF GOODS: International freight transport directly linked to intra-EU or international goods movement under Section 56 / Article 148 is Zero-Rated -> code "T0X" or "T0". 4. DEMURRAGE & WAREHOUSING: Storage and demurrage carry standard 23% VAT -> Xero "300" or "414". 5. FLEET VEHICLES: Heavy commercial vehicles (trucks, tractor units, refrigerated trailers) over capitalisation threshold map to Fixed Assets "760" (Motor Vehicles).',
  },
];

export interface BankAccountDto {
  id: string;
  name: string;
  bank_name: string;
  account_number_last4?: string | null;
  currency: string;
  created_at: string;
}

export interface BankStatementUploadResult {
  statement_id: string;
  source_filename: string;
  file_hash: string;
  status: 'processing' | 'extracted' | 'reconciled' | 'reconcile_failed';
  cached: boolean;
  transaction_count: number;
  redirected_to_invoice?: boolean;
  redirected_to_supplier_statement?: boolean;
  job_id?: string;
  document_type?: string;
  message?: string;
  opening_balance?: number | null;
  closing_balance?: number | null;
  reconciliation_details?: Record<string, any>;
  reconciliation?: {
    passed: boolean;
    discrepancy?: number | null;
    credits_total: number;
    debits_total: number;
  };
  matching?: {
    auto_allocated: number;
    pending_review: number;
    unmatched: number;
  };
}

export interface BankStatementDto {
  id: string;
  tenant_id?: string;
  organization_id: string;
  bank_account_id?: string;
  source_filename: string;
  file_hash?: string;
  uploaded_at: string;
  period_start?: string | null;
  period_end?: string | null;
  opening_balance?: number | string | null;
  closing_balance?: number | string | null;
  status: 'processing' | 'extracted' | 'reconciled' | 'reconcile_failed';
  reconciliation_details?: {
    formula?: string;
    discrepancy?: number;
    credits_total?: number;
    debits_total?: number;
    [key: string]: any;
  };
  transaction_count: number;
  created_at?: string;
}

export interface BankTransactionDto {
  id: string;
  statement_id: string;
  row_index: number;
  txn_date: string;
  description: string;
  counterparty_name?: string | null;
  amount: number | string;
  direction: 'debit' | 'credit';
  running_balance?: number | string | null;
  reference_text?: string | null;
  extraction_confidence?: number | string | null;
  status?: 'imported' | 'pending_duplicate_review' | 'rejected';
  duplicate_of_id?: string | null;
  duplicate_reason?: string | null;
  created_at?: string;
}

export interface MatchCandidateDto {
  invoice_id: string;
  invoice_number?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  invoice_date?: string | null;
  invoice_total: number | string;
  balance_remaining: number | string;
  confidence_score: number | string;
  match_method: string;
  reason: string;
}

export interface PaymentAllocationDto {
  id: string;
  bank_transaction_id: string;
  invoice_id?: string | null;
  supplier_id?: string | null;
  allocated_amount: number | string;
  confidence_score: number | string;
  match_method: string;
  status: 'auto' | 'pending_review' | 'confirmed' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  invoice_number?: string | null;
  supplier_name?: string | null;
}

export interface ReviewQueueItemDto {
  transaction: BankTransactionDto;
  statement_id: string;
  statement_filename: string;
  current_allocation?: PaymentAllocationDto | null;
  candidates: MatchCandidateDto[];
}

export interface DuplicateQueueItemDto {
  transaction: BankTransactionDto;
  duplicate_of?: BankTransactionDto | null;
  duplicate_of_statement_filename?: string | null;
  duplicate_of_allocated_invoice?: string | null;
  reason?: string | null;
}

export interface DuplicateReviewResponseDto {
  transaction: BankTransactionDto;
  allocations: PaymentAllocationDto[];
  message: string;
}

export interface BulkUnlockRequest {
  invoice_ids: string[];
}

export interface BulkUnlockResponse {
  unlocked_count: number;
  invoice_ids: string[];
}

export interface AccountingYear {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingYearCreate {
  name: string;
  start_date: string;
  end_date: string;
}

export interface AccountingYearUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
}



