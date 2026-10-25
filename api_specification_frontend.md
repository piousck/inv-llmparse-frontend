# LLM Invoice Parser — Client & Accounting Frontend API Specification (v0.2.0)

This specification defines the complete REST API contract and client-side behavior required for designing and implementing the client-facing and accounting-practice-facing web applications. All provider-only internal endpoints (such as platform-wide tenant provisioning, super-admin overrides, and global benchmark suites) have been intentionally excluded.

---

## 1. Architectural Overview & Actor Roles

The platform operates as a multi-tenant hierarchy designed for accounting firms managing client portfolios and standalone commercial businesses.

```
       ┌────────────────────────────────────────────────────────┐
       │             ACCOUNTING PRACTICE (org_type=accounting)   │
       │  Portfolio Administrator (role=admin)                  │
       │  Staff Accountant (role=standard)                      │
       │  Document Clerk (role=restricted)                      │
       └──────────────┬───────────────────────────┬─────────────┘
                      │ manages                   │ manages
                      ▼                           ▼
        ┌───────────────────────────┐ ┌───────────────────────────┐
        │    CLIENT ORG A           │ │    CLIENT ORG B           │
        │ (managing_org_id=firm.id) │ │ (managing_org_id=firm.id) │
        └───────────────────────────┘ └───────────────────────────┘

       ┌────────────────────────────────────────────────────────┐
       │             STANDALONE COMPANY (org_type=client)       │
       │  Company Administrator (role=admin)                    │
       │  Finance / AP Staff (role=standard)                    │
       │  Store Uploader / Site Staff (role=restricted)         │
       └────────────────────────────────────────────────────────┘
```

### 1.1 Organization Types (`org_type`)
- **`accounting` (Accounting Practice)**: A multi-organization account. Can register and manage multiple client organizations (`managing_org_id = accounting_org.id`) and switch active workspace context between managed clients.
- **`client` (Standalone Company or Managed Client)**: An isolated operational company (e.g. retail shop, construction subcontractor, cafe). Can only view and process invoices within its own organization.

### 1.2 User Roles (`role`)
- **`admin` (Organization / Practice Administrator)**:
  - Full management of users (`/v1/users`) within the permitted organization scope.
  - Accounting Admins can provision new managed client companies (`POST /v1/organizations`).
  - Full access to upload, review, edit, approve, and delete invoices.
- **`standard` (Finance / Accounting Staff)**:
  - Can upload invoices, view jobs, review extracted line items, apply corrections, and approve invoices.
  - Cannot create, modify, or delete user accounts or organization settings.
- **`restricted` (Uploader-Only / Store-Level Staff)**:
  - Can upload invoices (`POST /v1/invoices`) for the assigned organization.
  - **Uploader Scoping**: When listing invoices or jobs, restricted users **only see documents they uploaded personally** (`created_by_user_id == user.id`).
  - Cannot approve reviews, manage team members, or view other colleagues' documents.

### 1.3 Authentication & Headers
- All authenticated endpoints require a standard HTTP Bearer token header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
- All request payloads containing JSON bodies must specify:
  ```http
  Content-Type: application/json
  ```
- **JWT Payload Decoded Structure**:
  ```json
  {
    "sub": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
    "user_id": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "organization_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "org_type": "client",
    "managing_org_id": null,
    "email": "admin@construction.ie",
    "role": "admin",
    "side": "user_org",
    "tier": "org_admin",
    "roles": ["submit", "view", "correct"],
    "iat": 1725480000,
    "exp": 1725487200
  }
  ```

---

## 2. Authentication & Onboarding APIs

### 2.1 Public Self-Service Registration
Allows prospective customers to create an organization, configure the tenant boundary, and provision the initial administrator account in a single atomic transaction.

- **Endpoint**: `POST /v1/auth/register`
- **Authentication**: None (Public)
- **Status Code**: `201 Created`

#### Request Body (`application/json`)
```json
{
  "organization_name": "Apex Accounting Practice",
  "org_type": "accounting",
  "industry": "general",
  "email": "contact@apexpractice.ie",
  "password": "SecurePassword123!",
  "display_name": "Sarah Connor"
}
```

| Field | Type | Required | Constraints / Description |
| :--- | :--- | :--- | :--- |
| `organization_name` | string | **Yes** | 2–100 characters. Name of company or accounting firm. |
| `org_type` | string | **Yes** | Must be strictly `"accounting"` or `"client"`. (`"provider"` is forbidden). |
| `industry` | string | No | Preset code: `"retail_wholesale"`, `"construction"`, `"hospitality"`, `"tech_saas"`, `"general"`. Default: `"general"`. |
| `email` | string | **Yes** | Valid email address. Unique across all active users. |
| `password` | string | **Yes** | Minimum 8 characters. Minimum 1 uppercase, 1 lowercase, 1 number. |
| `display_name` | string | No | User's full name. Defaults to username portion of email if omitted. |

#### Response (`201 Created`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 7200,
  "user": {
    "id": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "organization_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "email": "contact@apexpractice.ie",
    "display_name": "Sarah Connor",
    "side": "user_org",
    "tier": "org_admin",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-09-05T10:30:00Z"
  },
  "organization": {
    "id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "name": "Apex Accounting Practice",
    "org_type": "accounting",
    "managing_org_id": null,
    "industry": "general",
    "custom_accounting_notes": null,
    "is_active": true,
    "created_at": "2026-09-05T10:30:00Z"
  }
}
```

---

### 2.2 User Login (Email / Password)
Exchanges user credentials for an active JWT session.

- **Endpoint**: `POST /v1/auth/user/token`
- **Authentication**: None (Public)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "email": "contact@apexpractice.ie",
  "password": "SecurePassword123!"
}
```

#### Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 7200
}
```

#### Error Codes
- `401 Unauthorized`: `"Invalid credentials"` or `"User account is inactive"`.

---

## 3. Organization Portfolio Management APIs

### 3.1 List Accessible Organizations
Returns organizations the authenticated user is permitted to see.
- **Accounting Firm Users**: Returns their accounting firm (`org_type: "accounting"`) plus **all client organizations managed by the firm** (`managing_org_id == firm.id`).
- **Client Org Users**: Returns only their own organization.

- **Endpoint**: `GET /v1/organizations`
- **Authorization**: Bearer JWT (`standard` or `admin`)
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
[
  {
    "id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "name": "Apex Accounting Practice",
    "org_type": "accounting",
    "managing_org_id": null,
    "industry": "general",
    "custom_accounting_notes": null,
    "is_active": true,
    "created_at": "2026-09-04T12:00:00Z"
  },
  {
    "id": "7f8b9c1d-1234-4a5b-9876-cba098765432",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "name": "QuickStop Grocery Ltd",
    "org_type": "client",
    "managing_org_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "industry": "retail_wholesale",
    "custom_accounting_notes": "Grocery retail shop. All food, beverage, and consumable inventory items are goods for resale (stock in trade, Xero 300 Purchases) and are 100% VAT-deductible under Section 60(2) VATCA 2010.",
    "is_active": true,
    "created_at": "2026-09-04T14:30:00Z"
  }
]
```

---

### 3.2 Create Managed Client Organization
Allows an Accounting Firm Administrator to register a client company in their practice portfolio.

- **Endpoint**: `POST /v1/organizations`
- **Authorization**: Bearer JWT (`admin` role in an `accounting` org)
- **Status Code**: `201 Created`

#### Request Body (`application/json`)
```json
{
  "name": "QuickStop Grocery Ltd",
  "org_type": "client",
  "industry": "retail_wholesale",
  "custom_accounting_notes": "Grocery retail shop. All food and drink lines are resale inventory (Xero 300 / Section 60(2))."
}
```

> [!NOTE]
> For accounting administrators, `managing_org_id` is automatically locked to their own firm ID on the server side, ensuring practice hierarchy integrity.

---

### 3.3 Update Organization Details & Accounting Notes
Updates business profile, industry categorization, or custom GL notes.

- **Endpoint**: `PATCH /v1/organizations/{org_id}`
- **Authorization**: Bearer JWT (`admin` role)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "name": "QuickStop Grocery Ltd (Store #1)",
  "industry": "retail_wholesale",
  "custom_accounting_notes": "Grocery retail shop. All food, beverage, and consumable inventory items are goods for resale (stock in trade, Xero 300 Purchases) and are 100% VAT-deductible under Section 60(2) VATCA 2010.",
  "is_active": true
}
```

---

## 4. Team & User Management APIs

### 4.1 List Users
Returns team members within the administrator's permitted boundary.

- **Endpoint**: `GET /v1/users`
- **Authorization**: Bearer JWT (`admin` role)
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
[
  {
    "id": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "organization_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "email": "sarah@apexpractice.ie",
    "display_name": "Sarah Connor",
    "side": "user_org",
    "tier": "org_admin",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-09-04T12:00:00Z"
  },
  {
    "id": "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
    "organization_id": "7f8b9c1d-1234-4a5b-9876-cba098765432",
    "email": "clerk@quickstop.ie",
    "display_name": "John Store Clerk",
    "side": "user_org",
    "tier": "viewer",
    "role": "restricted",
    "is_active": true,
    "created_at": "2026-09-04T15:00:00Z"
  }
]
```

---

### 4.2 Create Team Member
Provisions a new user with a specified role.

- **Endpoint**: `POST /v1/users`
- **Authorization**: Bearer JWT (`admin` role)
- **Status Code**: `201 Created`

#### Request Body (`application/json`)
```json
{
  "email": "john.ap@apexpractice.ie",
  "password": "SecureGeneratedPassword123!",
  "display_name": "John AP Specialist",
  "organization_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
  "role": "standard"
}
```

| Field | Type | Options | Description |
| :--- | :--- | :--- | :--- |
| `email` | string | valid email | New user login email. Must be globally unique. |
| `password` | string | >= 8 chars | Initial password (provide a 16-character secure generator in UI). |
| `display_name`| string | optional | User's full name. |
| `organization_id` | UUID | UUID | Target organization (must be caller's org or a managed client). |
| `role` | string | `"admin"`, `"standard"`, `"restricted"` | Access tier for the new user. |

---

### 4.3 Update User Role or Status
- **Endpoint**: `PATCH /v1/users/{user_id}`
- **Authorization**: Bearer JWT (`admin` role)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "display_name": "John AP Lead",
  "role": "admin",
  "is_active": true
}
```

---

### 4.4 Deactivate User (Soft Delete)
- **Endpoint**: `DELETE /v1/users/{user_id}`
- **Authorization**: Bearer JWT (`admin` role)
- **Status Code**: `200 OK` (returns updated UserResponse with `is_active: false`)

---

## 5. Document Ingestion & Processing Pipeline

```
 [User File Drop] 
        │
        ▼
 POST /v1/invoices (Multipart/form-data) ──► Returns 202 Accepted (job_id)
        │
        ▼
 Polling GET /v1/jobs/{job_id} (every 1.5s - 2.5s)
        │
   ┌────┴───────────────────────────┐
   ▼                                ▼
[status: "processing"]     [status: "completed" / "needs_review"]
(Show progress spinner)             │
                                    ▼
                          Fetch GET /v1/invoices/{invoice_id}
                          Fetch GET /v1/invoices/{invoice_id}/review
```

### 5.1 Available Visual LLM Models
Returns the available visual extraction models.

- **Endpoint**: `GET /v1/llm/models`
- **Authentication**: Optional
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
{
  "models": [
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.0-flash",
    "qwen/qwen-2.5-vl-72b-instruct:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free"
  ],
  "default": "google/gemini-2.5-flash-lite"
}
```

---

### 5.2 Upload Document
Submits an invoice image or PDF for automated multi-stage OCR and visual LLM extraction.

- **Endpoint**: `POST /v1/invoices`
- **Authorization**: Bearer JWT (`roles` must include `"submit"`)
- **Content-Type**: `multipart/form-data`
- **Status Code**: `202 Accepted`

#### Form Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | Binary File | **Yes** | Supported formats: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`. Maximum 35 MB. Validated by magic bytes. |
| `organization_id`| UUID | **Yes** | Target organization UUID to attribute the document to. |
| `llm_model` | string | No | Optional LLM override. Defaults to server setting if omitted. |

#### Response (`202 Accepted`)
```json
{
  "job_id": "1348e88f-7a24-465a-90e8-56929acce002",
  "status": "quarantined",
  "created_at": "2026-09-05T11:00:00.000Z"
}
```

#### Upload Errors
- `413 Payload Too Large`: File exceeds maximum upload size (35 MB).
- `415 Unsupported Media Type`: Non-document format (e.g. `.exe`, `.zip`).
- `422 Unprocessable Entity`: Zero-byte file or missing `organization_id`.
- `429 Too Many Requests`: Exceeded 30 uploads/minute per tenant.

---

### 5.3 Poll Job Status
Poll this endpoint while processing is underway.

- **Endpoint**: `GET /v1/jobs/{job_id}`
- **Authorization**: Bearer JWT
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
{
  "job_id": "1348e88f-7a24-465a-90e8-56929acce002",
  "status": "completed",
  "created_at": "2026-09-05T11:00:00.000Z",
  "updated_at": "2026-09-05T11:00:05.450Z",
  "invoice_id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
  "error_code": null,
  "error_message": null,
  "document_confidence": 0.94
}
```

#### Job Lifecycle States (`status`)
| Status | Meaning | Recommended UI Action |
| :--- | :--- | :--- |
| `quarantined` | Virus scan running. | Show "Scanning file for threats…" |
| `pending` | In Celery queue awaiting worker. | Show "Queued for extraction…" |
| `processing` | OCR, layout segmentation & LLM vision active. | Show animated progress indicator (poll every 1.5s). |
| `completed` | Extraction successful; reconciliation balanced. | Stop polling. Fetch `invoice_id` and display Review Hub. |
| `needs_review` | Extraction finished, but totals mismatch or low confidence. | Stop polling. Fetch `invoice_id` and open in Review Hub with review alert. |
| `failed` | Parsing or validation failure. | Stop polling. Display `error_message` with retry option. |

---

## 6. Invoice List & Workspace Query APIs

### 6.1 List Organization Invoices (Paginated & Filtered)
Retrieves invoice history and status for a given organization.

- **Endpoint**: `GET /v1/organizations/{org_id}/invoices`
- **Authorization**: Bearer JWT
- **Status Code**: `200 OK`

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `status_filter` | string | `"all"` | Filters: `"all"`, `"completed"`, `"needs_review"`, `"failed"`, `"processing"`. |
| `search` | string | null | Substring match across `invoice_number`, `seller_name`, or `original_filename`. |
| `page` | integer | 1 | 1-indexed page number. |
| `page_size` | integer | 20 | Items per page (min 1, max 100). |

#### Response (`200 OK`)
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "items": [
    {
      "job_id": "1348e88f-7a24-465a-90e8-56929acce002",
      "invoice_id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
      "invoice_number": "INV-2026-901",
      "invoice_date": "2026-08-30",
      "seller_name": "Musgrave Wholesale Partners",
      "total_gross": 1450.75,
      "currency": "EUR",
      "job_status": "completed",
      "requires_human_review": false,
      "ocr_confidence": 0.94,
      "error_code": null,
      "error_message": null,
      "original_filename": "Invoice362.jpg",
      "duplicate_of_job_id": null,
      "created_by_user_id": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
      "created_at": "2026-09-05T11:00:00Z"
    }
  ]
}
```

> [!IMPORTANT]
> If the authenticated user has `role: "restricted"`, the server automatically appends `created_by_user_id == user.id` to the database query. The frontend does not need to apply manual client-side filtering.

---

## 7. Invoice Review, Geometry & Line-Item APIs

### 7.1 Get Full Invoice Details
Returns full header metadata, extracted tax totals, and detailed line items.

- **Endpoint**: `GET /v1/invoices/{invoice_id}`
- **Authorization**: Bearer JWT
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
{
  "id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
  "job_id": "1348e88f-7a24-465a-90e8-56929acce002",
  "tenant_id": "4d1885fa-8b3c-4b6d-b78b-faeebcf1d0ac",
  "organization_id": "7f8b9c1d-1234-4a5b-9876-cba098765432",
  "created_by_user_id": "3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e",
  "invoice_number": "INV-2026-901",
  "invoice_date": "2026-08-30",
  "due_date": "2026-09-30",
  "currency": "EUR",
  "seller_name": "Musgrave Wholesale Partners",
  "seller_vat": "IE9501234H",
  "buyer_name": "QuickStop Grocery Ltd",
  "buyer_vat": "IE3456789K",
  "total_net": 1250.00,
  "total_vat": 200.75,
  "total_gross": 1450.75,
  "requires_human_review": false,
  "ocr_confidence": 0.94,
  "organization_supplier_id": "2c9a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
  "global_supplier_id": "1b8a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
  "selected_supplier_name": "Musgrave Wholesale Partners",
  "supplier_address": "St. Margaret's Road, Ballymun, Dublin 11",
  "line_items": [
    {
      "id": "e4a2b1c0-4321-4def-9876-0fedcba98765",
      "item_code": "GROC-001",
      "description": "Avonmore Fresh Milk 2L (Pack of 6)",
      "package_type": "Pack",
      "unit_quantity": 6.0,
      "unit_measure": "units",
      "quantity": 10.0,
      "unit_price": 12.00,
      "net_value": 120.00,
      "net_amount": 120.00,
      "vat_rate": 0.0,
      "vat_code": "T0",
      "xero_account_code": "300",
      "xero_expense_category": "Direct Costs",
      "entertainment_context": "not_applicable",
      "vat_deductible": true,
      "income_tax_deductible": true,
      "needs_customer_confirmation": false,
      "confirmation_reason": null,
      "tax_treatment_notes": "Section 60(2) stock-in-trade resale exception",
      "vat_amount": 0.00,
      "gross_amount": 120.00
    },
    {
      "id": "e5a2b1c0-4321-4def-9876-0fedcba98766",
      "item_code": "BEV-044",
      "description": "Coca Cola 330ml Can (Slab of 24)",
      "package_type": "Case",
      "unit_quantity": 24.0,
      "unit_measure": "cans",
      "quantity": 5.0,
      "unit_price": 18.00,
      "net_value": 90.00,
      "net_amount": 90.00,
      "vat_rate": 23.0,
      "vat_code": "T23",
      "xero_account_code": "300",
      "xero_expense_category": "Direct Costs",
      "entertainment_context": "not_applicable",
      "vat_deductible": true,
      "income_tax_deductible": true,
      "needs_customer_confirmation": false,
      "confirmation_reason": null,
      "tax_treatment_notes": "Standard rated soft drinks for resale under Section 60(2)",
      "vat_amount": 20.70,
      "gross_amount": 110.70
    }
  ],
  "created_at": "2026-09-05T11:00:00Z",
  "updated_at": "2026-09-05T11:00:05Z"
}
```

---

### 7.2 Get Interactive Review Surface (OCR Word Boxes & Geometry)
Returns high-resolution page rendering URLs and word-level bounding boxes for interactive visual verification.

- **Endpoint**: `GET /v1/invoices/{invoice_id}/review`
- **Authorization**: Bearer JWT
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
{
  "invoice_id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
  "page_count": 1,
  "pages": [
    {
      "page": 1,
      "image_url": "/v1/invoices/f5a2b1c0-4321-4def-9876-0fedcba98765/page-image/1"
    }
  ],
  "boxes": [
    {
      "id": "w_12",
      "text": "INV-2026-901",
      "bbox": [0.654, 0.122, 0.781, 0.141],
      "confidence": 0.98,
      "page": 1,
      "field": "invoice_number",
      "field_confidence": 0.98,
      "source": "llm"
    },
    {
      "id": "w_35",
      "text": "1,450.75",
      "bbox": [0.720, 0.880, 0.815, 0.902],
      "confidence": 0.95,
      "page": 1,
      "field": "total_gross",
      "field_confidence": 0.95,
      "source": "llm"
    }
  ],
  "fields": [
    {
      "name": "invoice_number",
      "value": "INV-2026-901",
      "confidence": 0.98,
      "source": "llm",
      "evidence": []
    },
    {
      "name": "total_gross",
      "value": "1450.75",
      "confidence": 0.95,
      "source": "llm",
      "evidence": []
    }
  ]
}
```

---

### 7.3 Bounding Box Normalization & Pixel Math
The coordinates in `bbox` are normalized floating-point numbers between `0.0` and `1.0`:
`bbox = [x0, y0, x1, y1]` where:
- `x0`: Left edge ratio (`0.0` = left of image, `1.0` = right of image)
- `y0`: Top edge ratio (`0.0` = top of image, `1.0` = bottom of image)
- `x1`: Right edge ratio
- `y1`: Bottom edge ratio

#### JavaScript Conversion Function
```javascript
export function bboxToPixels(bbox, imagePixelWidth, imagePixelHeight) {
  const [x0, y0, x1, y1] = bbox;
  return {
    left: Math.round(x0 * imagePixelWidth),
    top: Math.round(y0 * imagePixelHeight),
    width: Math.round((x1 - x0) * imagePixelWidth),
    height: Math.round((y1 - y0) * imagePixelHeight),
  };
}
```

#### Color Classification Classes
```javascript
export function getBoxColor(box) {
  if (!box.field) return 'gray'; // Unmapped OCR token (#94a3b8)
  if (box.field_confidence >= 0.85) return 'green'; // High confidence (#10b981)
  if (box.field_confidence >= 0.60) return 'yellow'; // Medium confidence (#f59e0b)
  return 'red'; // Low confidence (#ef4444)
}
```

---

### 7.4 Submit Review Corrections
Applies reviewer edits to header fields and line items. Writes an immutable audit trail entry.

- **Endpoint**: `PATCH /v1/invoices/{invoice_id}/review`
- **Authorization**: Bearer JWT (`roles` must include `"correct"`)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "invoice_number": "INV-2026-901-REV",
  "invoice_date": "2026-08-30",
  "due_date": "2026-09-30",
  "currency": "EUR",
  "seller_name": "Musgrave Wholesale Partners",
  "seller_vat": "IE9501234H",
  "buyer_name": "QuickStop Grocery Ltd",
  "buyer_vat": "IE3456789K",
  "total_net": 1250.00,
  "total_vat": 200.75,
  "total_gross": 1450.75,
  "reviewer_notes": "Verified Section 60(2) stock-in-trade resale exception.",
  "line_items": [
    {
      "id": "e4a2b1c0-4321-4def-9876-0fedcba98765",
      "item_code": "GROC-001",
      "description": "Avonmore Fresh Milk 2L (Pack of 6)",
      "quantity": 10.0,
      "unit_price": 12.00,
      "net_value": 120.00,
      "net_amount": 120.00,
      "vat_rate": 0.0,
      "vat_code": "T0",
      "xero_account_code": "300",
      "vat_deductible": true,
      "income_tax_deductible": true,
      "vat_amount": 0.00,
      "gross_amount": 120.00
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "invoice_id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
  "status": "reviewed",
  "updated_fields": [
    "invoice_number",
    "reviewer_notes",
    "line_items"
  ],
  "audit_log_id": "d1c2b3a4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "correction_id": "c2b3a4d1-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
}
```

---

### 7.5 Approve Review (1-Click Final Approval)
Approves all current extractions without making further edits. Clears `requires_human_review`.

- **Endpoint**: `POST /v1/invoices/{invoice_id}/review/approve`
- **Authorization**: Bearer JWT (`roles` must include `"correct"`)
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
{
  "invoice_id": "f5a2b1c0-4321-4def-9876-0fedcba98765",
  "status": "approved",
  "requires_human_review": false,
  "next_invoice_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e"
}
```

---

### 7.6 Assign Word Boxes to Field
Assigns bounding box words selected on the canvas to a field.

- **Endpoint**: `POST /v1/invoices/{invoice_id}/review/correct`
- **Authorization**: Bearer JWT (`roles` must include `"correct"`)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "field": "invoice_number",
  "box_ids": ["w_12", "w_13"]
}
```

---

### 7.7 Lasso Line Items Region (Table Re-Extraction)
When automatic table segmentation misses rows or boundaries, the user can draw a marquee rectangle around the table.

- **Endpoint**: `POST /v1/invoices/{invoice_id}/line-items-region`
- **Authorization**: Bearer JWT (`roles` must include `"correct"`)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "box_ids": ["w_40", "w_41", "w_42", "w_43", "w_44", "w_45"]
}
```

---

### 7.8 Download Document & Rendered Page Image
- **Original Document**: `GET /v1/invoices/{invoice_id}/document`
  - Returns raw binary (`application/pdf` or image MIME). Includes `Content-Disposition: inline; filename="..."`.
- **Rendered Page Image**: `GET /v1/invoices/{invoice_id}/page-image/{page}`
  - Returns `image/png` stream of the specified page (1-indexed).

---

## 8. Irish VAT & Tax Compliance Specifications

The frontend MUST implement real-time validation and statutory formatting for Irish Revenue and UK HMRC accounting compliance.

### 8.1 Statutory Irish Return of Trading Details (RTD) Codes
| Code | Rate | Description | Examples |
| :--- | :--- | :--- | :--- |
| **`T0`** | 0.0% | Zero-rated goods & basic foodstuffs | Milk, bread, fresh meat, tea, books, animal feed. |
| **`T9`** | 9.0% | Second reduced rate | Newspapers, periodicals. |
| **`T135`**| 13.5%| Reduced rate | Restaurant meals, hot takeaway food, electricity, building services, hairdressing. |
| **`T23`** | 23.0%| Standard rate | Soft drinks, alcohol, electronics, clothing, consultancy, general expenses. |
| **`TN`** | 0.0% | Non-deductible / Section 60 disallowance | Client entertainment, private food/drink consumption, passenger motor fuel. |
| **`TE`** | 0.0% | Exempt from VAT | Financial services, medical care, insurance. |

---

### 8.2 Section 60 Irish VATCA 2010 Compliance Engine

#### Statutory Rule 1: Section 60(1) Disallowance
Under Section 60(1) Value Added Tax Consolidation Act 2010, input VAT incurred by a business on **food, drink, and entertainment** is **strictly non-deductible**.
- Must be coded to Xero **`413 Entertainment`**
- `vat_deductible` must be set to `false` (Non-Deductible)
- `vat_code` must be set to **`TN`** (excluded from RTD purchase boxes)

#### Statutory Rule 2: Section 60(2)(a)(i) Stock-in-Trade Resale Exception
Under Section 60(2)(a)(i) VATCA 2010, the disallowance **DOES NOT APPLY** to goods acquired as stock-in-trade for supply in the ordinary course of business (e.g. grocery shops, supermarkets, convenience stores, wholesalers).
- Groceries, beverages, and consumable inventory items for resale MUST be coded to Xero **`300 Purchases`** (Direct Costs)
- `vat_deductible` must be set to `true` (Claimable)
- `vat_code` must retain its statutory rate: **`T0`**, **`T135`**, or **`T23`**
- `entertainment_context` must be `"not_applicable"`

#### Required Frontend Interactive Resale Button
When any line item on an invoice is coded as `413` or `429` with food/beverage descriptions, the review UI MUST display a Section 60 banner containing:

```html
<button id="btn-set-all-resale" class="btn btn-warning">
  🛒 Stock / Resale (Xero 300 / Claim VAT)
</button>
```

**Button Click Behavior**:
1. Iterates all line items where Xero code is `413` or `429`.
2. Sets `xero_account_code = "300"`.
3. Sets `vat_deductible = true`.
4. Converts `vat_code` from `"TN"` back to statutory rate (`"T0"` if 0%, `"T135"` if 13.5%, `"T23"` if 23%).
5. Recalculates `total_claimable_vat` and clears the Section 60 warning.

---

### 8.3 Standard Xero Chart of Accounts Mapping Table
| Code | Name | Typical Classification |
| :--- | :--- | :--- |
| **`300`** | Purchases | Cost of Goods Sold / Resale inventory (100% VAT claimable) |
| **`310`** | Cost of Goods Sold | Direct production expenses |
| **`400`** | Advertising & Marketing | General overhead (T23) |
| **`412`** | Electricity & Gas | Utilities (T135) |
| **`413`** | Entertainment | Section 60 client entertainment (TN / non-deductible) |
| **`414`** | Freight & Courier | Delivery & shipping expenses |
| **`417`** | Motor Vehicle Expenses | Vehicle servicing & parts |
| **`420`** | Office Supplies | Stationery, paper, packing materials |
| **`426`** | Subscriptions | Software / SaaS tools |
| **`429`** | General Expenses | Sundry operating expenses |
| **`490`** | Travel & Accommodation | Business travel (hotel accommodation T135) |

---

## 9. Real-Time Frontend Reconciliation Formulas

The review UI MUST evaluate and display these three balances in real time:

1. **Header Balance Formula**:
   $$\text{Discrepancy} = \left| \text{total\_gross} - (\text{total\_net} + \text{total\_vat}) \right|$$
   - Discrepancy $< 0.02$: Balanced (Display green check `✓ Balanced`)
   - Discrepancy $\ge 0.02$: Out of balance (Display red alert banner `⚠ Discrepancy: €X.XX`)

2. **Line Item Sum vs Header Balance**:
   $$\sum \text{line.net\_amount} \stackrel{?}{=} \text{total\_net}$$
   $$\sum \text{line.vat\_amount} \stackrel{?}{=} \text{total\_vat}$$

3. **Claimable vs Blocked Input VAT**:
   $$\text{Claimable VAT} = \sum_{\text{vat\_deductible} = \text{true}} \text{line.vat\_amount}$$
   $$\text{Blocked Section 60 VAT} = \sum_{\text{vat\_deductible} = \text{false}} \text{line.vat\_amount}$$

---

## 10. Organization Suppliers & Master Bios

### 10.1 List Organization Suppliers
- **Endpoint**: `GET /v1/organizations/{org_id}/suppliers`
- **Authorization**: Bearer JWT
- **Status Code**: `200 OK`

#### Response (`200 OK`)
```json
[
  {
    "id": "2c9a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
    "organization_id": "7f8b9c1d-1234-4a5b-9876-cba098765432",
    "canonical_name": "Musgrave Wholesale Partners",
    "aliases": ["Musgrave", "Musgrave MarketPlace"],
    "vat_number": "IE9501234H",
    "iban": "IE29AIBK93115212345678",
    "address": "St. Margaret's Road, Ballymun, Dublin 11",
    "business_description": "Wholesale food, beverage, and retail grocery supplier.",
    "is_active": true,
    "created_at": "2026-09-01T10:00:00Z"
  }
]
```

### 10.2 Update Supplier Master Bio
Updating `business_description` teaches the extraction engine how to classify this vendor on future invoice uploads.

- **Endpoint**: `PATCH /v1/organizations/{org_id}/suppliers/{supplier_id}`
- **Authorization**: Bearer JWT (`admin` or `standard`)
- **Status Code**: `200 OK`

#### Request Body (`application/json`)
```json
{
  "business_description": "Wholesale grocery supplier. All lines are goods for resale under Section 60(2)."
}
```

---

## 11. Error Responses & Frontend Error Handling

The API returns standard RFC 7807 / FastAPI HTTP error envelopes.

### 11.1 Standard Error Envelope
```json
{
  "detail": "Invalid organization scope"
}
```

### 11.2 Validation Error Envelope (`422 Unprocessable Entity`)
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error"
    }
  ]
}
```

### 11.3 Recommended Frontend Error Parser
```javascript
export function formatApiError(err, status = 500) {
  if (!err) return `Request failed (${status})`;
  if (typeof err === 'string') return err;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map(d => {
      const field = Array.isArray(d.loc)
        ? d.loc.filter(x => x !== 'body').join('.')
        : (d.loc || '');
      return field ? `${field}: ${d.msg}` : (d.msg || JSON.stringify(d));
    }).join('; ');
  }
  if (err.message && typeof err.message === 'string') return err.message;
  return JSON.stringify(err);
}
```

---

## 12. Complete UI Screen & Component Requirements

Any client-facing frontend implementation should provide the following views:

1. **Public Registration Screen (`/register`)**:
   - Organization Name, Industry Preset selector, Admin Full Name, Email, Password (with 16-character secure password generator).
   - Card toggle for Account Type: **`🏢 Accounting Practice`** vs **`🏬 Standalone Company`**.
   - Immediate automatic login upon submission.

2. **Workspace & Review Hub (`/invoices`)**:
   - Header with active organization switcher (for accounting practices), current user badge, and sign-out button.
   - Upload Dropzone: Drag-and-drop file upload with visual LLM model picker and progress spinner.
   - Recent Invoices Table: Search bar, status tabs (`All`, `Needs Review`, `Completed`, `Failed`), pagination controls.
   - Split-screen Review Panel:
     - Left: Interactive canvas displaying rendered page image, zoom controls, and docTR word boxes with confidence color classes.
     - Right: Extracted fields form, line items table with Xero code pickers and RTD VAT rate pickers, and real-time reconciliation balances.
     - Warning banner: Section 60 client entertainment alert with `🛒 Stock / Resale (Xero 300 / Claim VAT)` action button.
     - Action buttons: `Approve All`, `Save Changes`, `Download Document`.

3. **Team & Users Management Screen (`/users`)**:
   - Metric summary cards: Total Users, Admins, Standard Users, Restricted Uploaders.
   - Add Team Member modal: Email, password generator, organization assignment, and interactive Role Picker cards (`👑 Administrator`, `💼 Standard User`, `🔒 Restricted Uploader`).
   - Active Users Directory table: Search filter, role dropdown changer, and deactivate/reactivate buttons.
