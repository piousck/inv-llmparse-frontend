import { InvoiceDetail } from '../types/api';

/**
 * Generates an authentic SVG document image for an invoice,
 * formatted as a standard A4 commercial tax invoice image.
 */
export function generateInvoiceDocumentSvg(invoice: InvoiceDetail): string {
  const width = 800;
  const height = 1100;

  const isMusgrave = invoice.seller_name.toLowerCase().includes('musgrave');
  const isAcme = invoice.seller_name.toLowerCase().includes('acme');

  const sellerLogoColor = isMusgrave ? '#dc2626' : isAcme ? '#1e40af' : '#0f766e';
  const accentColor = isMusgrave ? '#b91c1c' : isAcme ? '#2563eb' : '#0d9488';

  const rows = invoice.line_items.map((item, idx) => {
    const yPos = 410 + idx * 45;
    return `
      <g transform="translate(48, ${yPos})">
        <line x1="0" y1="36" x2="704" y2="36" stroke="#e2e8f0" stroke-width="1" />
        <text x="0" y="22" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#1e293b">${escapeXml(item.description)}</text>
        <text x="440" y="22" font-family="monospace" font-size="12" font-weight="500" fill="#475569" text-anchor="middle">${item.quantity ?? 1}</text>
        <text x="510" y="22" font-family="monospace" font-size="12" font-weight="500" fill="#475569" text-anchor="end">€${Number(item.unit_price ?? 0).toFixed(2)}</text>
        <text x="580" y="22" font-family="monospace" font-size="12" font-weight="600" fill="#475569" text-anchor="middle">${Number(item.vat_rate ?? 0)}%</text>
        <text x="704" y="22" font-family="monospace" font-size="12" font-weight="700" fill="#0f172a" text-anchor="end">€${Number(item.net_amount ?? 0).toFixed(2)}</text>
      </g>
    `;
  }).join('');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.08" />
    </filter>
    <pattern id="grid-subtle" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f8fafc" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Paper Sheet Background -->
  <rect width="${width}" height="${height}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <rect width="${width}" height="${height}" fill="url(#grid-subtle)" />

  <!-- Top Accent Banner -->
  <rect x="0" y="0" width="${width}" height="8" fill="${accentColor}" />

  <!-- Seller Header / Brand -->
  <g transform="translate(48, 50)">
    <rect x="0" y="0" width="38" height="38" rx="8" fill="${sellerLogoColor}" />
    <text x="19" y="25" font-family="sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">
      ${escapeXml(invoice.seller_name.charAt(0))}
    </text>

    <text x="50" y="20" font-family="Inter, sans-serif" font-size="18" font-weight="900" fill="#0f172a" letter-spacing="-0.5">
      ${escapeXml(invoice.seller_name.toUpperCase())}
    </text>
    <text x="50" y="36" font-family="Inter, sans-serif" font-size="11" font-weight="500" fill="#64748b">
      ${escapeXml(invoice.supplier_address || 'Wholesale Distribution Park, Dublin, Ireland')}
    </text>
    <text x="50" y="52" font-family="monospace" font-size="11" font-weight="700" fill="#334155">
      VAT Reg: ${escapeXml(invoice.seller_vat)} · CRO: 489210
    </text>
  </g>

  <!-- Right: Commercial Invoice Meta -->
  <g transform="translate(752, 50)" text-anchor="end">
    <text x="0" y="20" font-family="Inter, sans-serif" font-size="22" font-weight="900" fill="${accentColor}" letter-spacing="2">
      INVOICE
    </text>
    <text x="0" y="42" font-family="monospace" font-size="14" font-weight="800" fill="#0f172a">
      ${escapeXml(invoice.invoice_number)}
    </text>
    <text x="0" y="60" font-family="monospace" font-size="11" font-weight="500" fill="#64748b">
      Date: ${escapeXml(invoice.invoice_date)}
    </text>
    <text x="0" y="76" font-family="monospace" font-size="11" font-weight="500" fill="#64748b">
      Due: ${escapeXml(invoice.due_date)}
    </text>
  </g>

  <!-- Divider Line -->
  <line x1="48" y1="140" x2="752" y2="140" stroke="#e2e8f0" stroke-width="2" />

  <!-- Bill To & Payment Info -->
  <g transform="translate(48, 160)">
    <rect x="0" y="0" width="340" height="95" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="16" y="22" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="#94a3b8" letter-spacing="1">
      BILL TO / CUSTOMER:
    </text>
    <text x="16" y="44" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#0f172a">
      ${escapeXml(invoice.buyer_name)}
    </text>
    <text x="16" y="62" font-family="Inter, sans-serif" font-size="11" font-weight="500" fill="#475569">
      Main Commercial Street, Dublin 2, Ireland
    </text>
    <text x="16" y="78" font-family="monospace" font-size="11" font-weight="600" fill="#334155">
      Customer VAT Reg: ${escapeXml(invoice.buyer_vat)}
    </text>
  </g>

  <g transform="translate(412, 160)">
    <rect x="0" y="0" width="340" height="95" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="16" y="22" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="#94a3b8" letter-spacing="1">
      PAYMENT TERMS:
    </text>
    <text x="16" y="44" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#0f172a">
      Net 30 Days · Direct Bank Transfer (SEPA)
    </text>
    <text x="16" y="62" font-family="monospace" font-size="11" font-weight="500" fill="#475569">
      IBAN: IE29AIBK93115212345678
    </text>
    <text x="16" y="78" font-family="monospace" font-size="11" font-weight="600" fill="#334155">
      BIC / Swift: AIBKIE2D
    </text>
  </g>

  <!-- Line Items Table Header -->
  <g transform="translate(48, 280)">
    <rect x="0" y="0" width="704" height="32" rx="4" fill="#f1f5f9" />
    <text x="12" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#475569" letter-spacing="0.5">ITEM DESCRIPTION</text>
    <text x="440" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#475569" text-anchor="middle">QTY</text>
    <text x="510" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#475569" text-anchor="end">PRICE</text>
    <text x="580" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#475569" text-anchor="middle">VAT %</text>
    <text x="692" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#475569" text-anchor="end">NET (€)</text>
  </g>

  <!-- Line Item Rows -->
  <g id="line-items">
    ${rows}
  </g>

  <!-- Totals Section Box -->
  <g transform="translate(452, 690)">
    <rect x="0" y="0" width="300" height="135" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    
    <text x="16" y="28" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#64748b">Subtotal Net Amount</text>
    <text x="284" y="28" font-family="monospace" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€${Number(invoice.total_net ?? 0).toFixed(2)}</text>

    <text x="16" y="56" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#64748b">Total Irish VAT</text>
    <text x="284" y="56" font-family="monospace" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€${Number(invoice.total_vat ?? 0).toFixed(2)}</text>

    <line x1="16" y1="75" x2="284" y2="75" stroke="#cbd5e1" stroke-width="1.5" />

    <text x="16" y="105" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#0f172a">TOTAL DUE (${invoice.currency})</text>
    <text x="284" y="105" font-family="monospace" font-size="17" font-weight="900" fill="${accentColor}" text-anchor="end">€${Number(invoice.total_gross ?? 0).toFixed(2)}</text>
  </g>

  <!-- Barcode & Statutory Notice Footer -->
  <g transform="translate(48, 860)">
    <line x1="0" y1="0" x2="704" y2="0" stroke="#e2e8f0" stroke-width="1" />
    
    <!-- Barcode simulation -->
    <g transform="translate(0, 20)">
      <rect x="0" y="0" width="3" height="35" fill="#334155" />
      <rect x="6" y="0" width="2" height="35" fill="#334155" />
      <rect x="11" y="0" width="4" height="35" fill="#334155" />
      <rect x="18" y="0" width="1" height="35" fill="#334155" />
      <rect x="22" y="0" width="3" height="35" fill="#334155" />
      <rect x="28" y="0" width="2" height="35" fill="#334155" />
      <rect x="33" y="0" width="4" height="35" fill="#334155" />
      <rect x="40" y="0" width="2" height="35" fill="#334155" />
      <rect x="45" y="0" width="3" height="35" fill="#334155" />
      <rect x="52" y="0" width="1" height="35" fill="#334155" />
      <rect x="56" y="0" width="4" height="35" fill="#334155" />
      <rect x="63" y="0" width="2" height="35" fill="#334155" />
      <rect x="68" y="0" width="3" height="35" fill="#334155" />
      <text x="0" y="47" font-family="monospace" font-size="8" fill="#64748b">*${escapeXml(invoice.invoice_number)}*</text>
    </g>

    <!-- Statutory Irish Stamp -->
    <g transform="translate(200, 20)">
      <rect x="0" y="0" width="170" height="42" rx="4" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,2" />
      <text x="85" y="18" font-family="Inter, sans-serif" font-size="9" font-weight="800" fill="#047857" text-anchor="middle">TAX COMPLIANT INVOICE</text>
      <text x="85" y="32" font-family="monospace" font-size="8" font-weight="600" fill="#059669" text-anchor="middle">IRISH VATCA 2010 · RTD READY</text>
    </g>

    <!-- Footer Note -->
    <text x="704" y="35" font-family="Inter, sans-serif" font-size="9" font-weight="500" fill="#94a3b8" text-anchor="end">
      Page 1 of 1 · Electronic Tax Document · Generated for ${escapeXml(invoice.buyer_name)}
    </text>
  </g>
</svg>
  `.trim();

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
