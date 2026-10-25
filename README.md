# InvParse — AI Invoice Parser & Accounting Review Hub

A modern, high-performance web application built in **React 19**, **Vite 6**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui** styling with custom OKLCH theme settings.

This application implements the complete **LLM Invoice Parser Client & Accounting Frontend API Specification (v0.2.0)** and brings the interactive **InvParse Invoice Review Mock** into a fully functional, production-ready frontend.

---

## 🚀 Quick Start

### 1. Run Development Server
```bash
# From inside this directory:
npm run dev
```
The app will start at `http://localhost:5173`.

### 2. Build for Production
```bash
npm run build
```
Generates an optimized production bundle inside `dist/`.

### 3. Preview Production Build
```bash
npm run preview
```

---

## 🎨 Theme & Styling

The frontend is styled using Tailwind CSS v4 and the exact **tweak cn** theme settings provided:
- **Color Space**: OKLCH variables for light and dark modes
- **Typography**: Outfit (`Outfit, sans-serif`) with JetBrains Mono for monetary values and tax codes
- **Borders & Shadows**: Subtle elevation shadows with custom radius tokens (`0.5rem`)
- **Interactive Dark Mode**: Live toggle in the topbar preserving user preference

---

## 🌟 Core Features & Modules

### 1. Dual Execution Modes (Mock Store & Live REST API)
- **⚡ Mock Store Mode (Default)**: Fully standalone with realistic preloaded multi-tenant data, docTR OCR word boxes, Irish VAT codes, and supplier history. Zero backend setup required to test the entire application.
- **🌐 Live REST API Mode**: Seamlessly points to your live FastAPI backend (configurable base URL, e.g. `http://localhost:8000`) with JWT Bearer authentication, multipart invoice uploads, Celery queue polling, and PATCH endpoints.
- Easily toggle modes at any time from the Topbar or Settings view!

### 2. Interactive Invoice Review Hub (`/invoices/:id`)
- **Workflow Stepper**: `1. Document Upload` ➔ `2. Review & Reconciliation` ➔ `3. Approved to Ledger`.
- **Interactive Document Canvas**:
  - Normalized bounding box math (`bboxToPixels`) displaying docTR / LLM word boxes.
  - Confidence color classes: **Green** ($\ge 85\%$), **Yellow** ($60-84\%$), **Red** ($< 60\%$).
  - Zoom in, zoom out, reset zoom controls.
  - Interactive box selection and field re-assignment (`POST /v1/invoices/:id/review/correct`).
- **Irish Statutory Section 60 VATCA 2010 Engine**:
  - Automatic detection of food/beverage expenses mapped to non-deductible codes (`413` or `429`).
  - Warning banner alerting reviewer that input VAT is strictly non-deductible under Section 60(1) unless items are stock acquired for resale.
  - Interactive **`🛒 Stock / Resale (Xero 300 / Claim VAT)`** button: Instantly converts lines to Xero 300, restores statutory Irish VAT rates (`T0`, `T135`, `T23`), recalculates claimable VAT, and clears the warning!
- **Real-Time 3-Way Reconciliation Strip**:
  1. Header balance formula: $|\text{total\_gross} - (\text{total\_net} + \text{total\_vat})| < 0.02$
  2. Line items sum vs Header balance ($\sum\text{line.net\_amount} \stackrel{?}{=} \text{total\_net}$, $\sum\text{line.vat\_amount} \stackrel{?}{=} \text{total\_vat}$)
  3. Claimable input VAT vs Blocked Section 60 VAT breakdown
- **Line Item Inspector**:
  - Details panel displaying GL category, Irish RTD code explanation, AI confidence score, and tax rationale.
- **Review Actions**:
  - `Approve Invoice` (1-click final approval clearing human review flag)
  - `Save Draft` (`PATCH /v1/invoices/:id/review`)
  - `Download Doc`

### 3. Document Ingestion Pipeline
- **Drag-and-Drop Uploader**: Accepts PDF, PNG, JPG, JPEG, TIFF files up to 35 MB.
- **Visual LLM Selector**: Choose from Gemini 2.5 Flash Lite, Gemini 2.0 Flash, Qwen 2.5 VL, and Llama 3.2 Vision.
- **Live Pipeline Visualizer**: Shows status transitions from `quarantined` (antivirus) ➔ `pending` (queue) ➔ `processing` (OCR & LLM vision) ➔ `completed` / `needs_review`.

### 4. Practice & Portfolio Management
- **Organization Switcher**: Practice administrators can switch context between the central firm (`Apex Accounting Practice`) and managed clients (`QuickStop Grocery Ltd`, `InvParse Demo Ltd`).
- **Role-Based Access & Scoping**:
  - `👑 Administrator`: Full management of users, organization settings, and invoice review.
  - `💼 Standard User`: Finance staff reviewing and approving invoices.
  - `🔒 Restricted Uploader`: Store-level staff with **uploader scoping** (restricted to only seeing invoices personally uploaded by their account).
- **Quick Role Switcher**: Easily test role behavior from the Topbar user menu.

### 5. Team & Users Directory (`/users`)
- Summary metric cards for Admins, Standard Users, and Restricted Uploaders.
- Add Team Member modal with 16-character secure password generator and interactive role picker cards.
- Status toggle (soft-delete deactivate / reactivate).

### 6. Full Accounting Hub Submodules
- **Dashboard**: Pipeline throughput, average extraction confidence, Celery queue depth, and activity feed.
- **Suppliers**: Master supplier directory with editable RAG bios that teach the extraction engine how to classify each vendor.
- **Sales**: Sales batch import and revenue GL coding preview.
- **Bank Reconciliation**: Statement transaction feed with auto-matching to supplier bills and GL accounts.
- **Chart of Accounts**: Standard Xero GL code mapping table (300, 310, 400, 412, 413, 420, 426, 429, 6100, 6200, 6300).
- **VAT Rates**: Ireland statutory RTD tax codes reference (`T0`, `T9`, `T135`, `T23`, `TN`, `TE`).
- **Reports**: Statutory Irish VAT3 declaration export, RTD return schedule, and Xero bills CSV batch.
- **Settings**: Live backend URL configuration, execution mode toggle, and organization custom notes.

---

## 📁 Project Architecture

```
front end/
├── src/
│   ├── components/
│   │   ├── auth/           # Login & Registration modals
│   │   ├── invoices/       # Invoices list table & Upload dropzone modal
│   │   ├── layout/         # Sidebar navigation & Topbar org switcher
│   │   ├── modules/        # Dashboard, Suppliers, Sales, Bank, COA, VAT, Reports, Settings
│   │   ├── review/         # ReviewHub, InvoiceCanvas, LineItemsTable, Section60Banner, Reconciliation
│   │   └── ui/             # Button, Badge, Card, Modal, Toast
│   ├── lib/
│   │   └── utils.ts        # cn(), formatCurrency(), bboxToPixels(), getBoxColor(), passwordGenerator()
│   ├── services/
│   │   ├── api.ts          # Unified service layer (Mock Store & Live REST API)
│   │   └── mockData.ts     # Realistic multi-tenant mock data and docTR bounding boxes
│   ├── types/
│   │   └── api.ts          # TypeScript models matching API specification v0.2.0
│   ├── App.tsx             # Root application shell with navigation and state
│   ├── index.css           # Tailwind CSS v4 tweak cn theme settings
│   └── main.tsx            # Application entry point
├── api_specification_frontend.md  # API Contract reference (v0.2.0)
├── invparse_accounting_hub_mock.html # Original HTML/CSS mock reference
├── package.json
├── tsconfig.json
└── vite.config.ts
```
