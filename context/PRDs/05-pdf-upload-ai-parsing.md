# PRD 05: PDF Upload & AI-Powered Bill Parsing

**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-02-08
**Dependencies:** PRD 01 (Platform Overview), PRD 04 (Billing Cycles & Bill Splitting)
**Phase:** Phase 2 (scaffold upload UI in Phase 1, implement parsing in Phase 2)

---

## 1. Overview

PDF upload and AI-powered bill parsing allow owners to upload utility bill PDFs instead of manually entering bill details. The system sends the PDF to the Claude API (Anthropic) for structured data extraction, returns a pre-filled form with confidence indicators, and lets the owner review and confirm before saving. This reduces data entry time and errors.

## 2. Goals

- Reduce bill entry time from 2-3 minutes per bill to under 30 seconds.
- Extract key bill fields automatically from PDF documents.
- Provide confidence scoring so owners know which fields to verify.
- Maintain human-in-the-loop review: no bill is saved without owner confirmation.
- Graceful fallback to manual entry if parsing fails.

## 3. Phased Implementation

| Phase | Scope |
|-------|-------|
| Phase 1 (MVP) | Upload UI scaffolded. PDF stored in Supabase Storage. No parsing. Owner enters fields manually after upload. |
| Phase 2 | Full AI parsing via Claude API. Confidence scoring. Pre-filled review form. |

## 4. Upload Flow

### 4.1 Phase 1 Flow (MVP - Upload Only)

```
1. Owner clicks "Add Bill" on cycle detail page
2. Bill form includes "Upload PDF (optional)" file input
3. Owner selects a PDF file from their device
4. On form submit:
   a. PDF uploaded to Supabase Storage
   b. Bill record created with pdf_url pointing to stored file
   c. Owner fills all fields manually
5. PDF is stored for future reference and Phase 2 parsing
```

### 4.2 Phase 2 Flow (Full Parsing)

```
1. Owner clicks "Add Bill" on cycle detail page
2. Owner uploads a PDF file
3. System shows "Parsing bill..." loading state
4. Backend:
   a. PDF stored in Supabase Storage
   b. PDF read as base64
   c. Sent to Claude API with structured extraction prompt
   d. Claude returns JSON with extracted fields + confidence scores
5. Frontend receives parsed data
6. Bill form is pre-filled with parsed values
7. Each field shows confidence indicator:
   - Green checkmark: high confidence
   - Yellow warning: medium confidence
   - Red alert: low confidence
8. Owner reviews each field:
   - Accept as-is (click away or tab)
   - Modify (edit the field)
   - Reject (clear the field, enter manually)
9. Owner submits the reviewed form
10. Bill created with source='pdf_parsed'
```

## 5. User Stories

### US-PDF-01: Upload Bill PDF (Phase 1)
> As an owner, I want to upload a PDF of my utility bill so that I have a digital record attached to the bill entry.

**Acceptance Criteria:**
- [ ] File input on the bill entry form accepts PDF files only.
- [ ] File size limit: 10 MB.
- [ ] Upload progress indicator shown during upload.
- [ ] After upload, PDF filename displayed with a link to view/download.
- [ ] PDF stored in Supabase Storage at path: `{property_id}/{cycle_id}/{bill_id}.pdf`.
- [ ] Bill record's `pdf_url` field populated with the storage URL.
- [ ] Owner can remove the uploaded PDF before submitting the form.
- [ ] Upload is optional; owner can submit the bill form without a PDF.

### US-PDF-02: View Uploaded PDF (Phase 1)
> As an owner, I want to view a previously uploaded bill PDF so that I can reference the original document.

**Acceptance Criteria:**
- [ ] Bill detail view shows a "View PDF" link/button if `pdf_url` is set.
- [ ] Clicking opens the PDF in a new browser tab.
- [ ] PDF URL is a signed URL with expiration (not publicly accessible).
- [ ] If PDF is missing from storage, show appropriate error message.

### US-PDF-03: AI-Parse Bill PDF (Phase 2)
> As an owner, I want the system to automatically extract bill details from an uploaded PDF so that I don't have to type them manually.

**Acceptance Criteria:**
- [ ] After upload, system automatically initiates parsing.
- [ ] Loading state shown: "Analyzing your bill..." with spinner.
- [ ] Parsing completes within 15 seconds (timeout at 30 seconds).
- [ ] Form fields pre-filled with parsed values.
- [ ] Each field shows confidence indicator (green/yellow/red).
- [ ] Owner can modify any pre-filled field before submitting.
- [ ] If parsing fails, form fields remain empty with message: "Could not parse this bill. Please enter details manually."
- [ ] Bill saved with `source='pdf_parsed'` when created from parsed data.

### US-PDF-04: Review Parsed Fields (Phase 2)
> As an owner, I want to review and correct AI-parsed bill fields so that I can ensure accuracy before saving.

**Acceptance Criteria:**
- [ ] Pre-filled form clearly indicates which fields were parsed vs. empty.
- [ ] Confidence indicators use consistent visual language:
  - High confidence (green): Field likely correct, quick visual confirmation.
  - Medium confidence (yellow): Field may need verification, review recommended.
  - Low confidence (red): Field uncertain, manual verification required.
- [ ] Owner can accept all fields at once ("Looks good, save") or edit individually.
- [ ] Changed fields are tracked: if owner modifies a parsed value, original parsed value shown on hover (for debugging).
- [ ] Form validation applies to parsed values just like manual entry.

### US-PDF-05: Parsing Failure Fallback (Phase 2)
> As an owner, I want to manually enter bill details if AI parsing fails or produces low-confidence results.

**Acceptance Criteria:**
- [ ] If Claude API call fails (timeout, error, rate limit), show friendly error message.
- [ ] "Enter Manually" button always available, even during parsing.
- [ ] Owner can dismiss parsing results and start with a blank form.
- [ ] Failed parsing does not prevent bill creation.
- [ ] Parsing errors are logged for debugging (not shown to user in detail).

## 6. Claude API Integration

### 6.1 API Configuration

| Property | Value |
|----------|-------|
| Model | claude-sonnet-4-20250514 (or latest stable) |
| Max Tokens | 1024 |
| Temperature | 0 (deterministic extraction) |
| Input | PDF as base64-encoded document |
| Output | Structured JSON |

### 6.2 Extraction Prompt

```
SYSTEM PROMPT:
You are a utility bill parser. Extract structured information from the
provided utility bill PDF. Return a JSON object with the following fields.
If a field cannot be determined, set its value to null and its confidence
to "low".

EXPECTED OUTPUT FORMAT:
{
  "provider": {
    "value": "string - utility company name",
    "confidence": "high | medium | low"
  },
  "category": {
    "value": "internet | electricity | water | gas | trash | other",
    "confidence": "high | medium | low"
  },
  "amount": {
    "value": "number - total amount due in dollars (e.g., 150.99)",
    "confidence": "high | medium | low"
  },
  "service_start": {
    "value": "string - YYYY-MM-DD format",
    "confidence": "high | medium | low"
  },
  "service_end": {
    "value": "string - YYYY-MM-DD format",
    "confidence": "high | medium | low"
  },
  "account_number": {
    "value": "string - account or customer number (optional)",
    "confidence": "high | medium | low"
  }
}

INSTRUCTIONS:
- "amount" should be the TOTAL AMOUNT DUE, not a subtotal or previous balance.
- "service_start" and "service_end" define the billing period.
- "category" should map to the closest match from the allowed values.
- If the bill covers multiple services, extract the primary one.
- Dates must be in YYYY-MM-DD format.
- Amount must be a decimal number (e.g., 150.99, not "$150.99").
```

### 6.3 API Call Implementation

```
FUNCTION parseBillPdf(pdfBuffer: Buffer):

  1. Convert PDF to base64: base64Pdf = pdfBuffer.toString('base64')

  2. Call Claude API:
     response = await anthropic.messages.create({
       model: 'claude-sonnet-4-20250514',
       max_tokens: 1024,
       temperature: 0,
       messages: [{
         role: 'user',
         content: [
           {
             type: 'document',
             source: {
               type: 'base64',
               media_type: 'application/pdf',
               data: base64Pdf
             }
           },
           {
             type: 'text',
             text: 'Extract the bill information from this utility bill.'
           }
         ]
       }],
       system: SYSTEM_PROMPT
     })

  3. Parse JSON from response.content[0].text
  4. Validate against expected schema
  5. Return parsed fields with confidence scores

  ERROR HANDLING:
  - API timeout (30s): return { error: 'timeout' }
  - Invalid JSON response: return { error: 'parse_error' }
  - API rate limit: return { error: 'rate_limit' }
  - Any other error: return { error: 'unknown', message: error.message }
```

## 7. Confidence Scoring

### 7.1 Visual Indicators

| Confidence | Icon | Color | Tooltip |
|------------|------|-------|---------|
| High | CheckCircle | Green (#22c55e) | "AI is confident about this field" |
| Medium | AlertTriangle | Yellow (#eab308) | "AI suggests reviewing this field" |
| Low | AlertCircle | Red (#ef4444) | "AI is uncertain - please verify" |

### 7.2 Confidence Rules

| Scenario | Expected Confidence |
|----------|-------------------|
| Clear, well-formatted bill from major provider | High on all fields |
| Handwritten or scanned bill | Medium to Low |
| Bill in non-English language | Low on most fields |
| Multiple amounts on bill (subtotals, taxes) | Medium on amount |
| Ambiguous service dates | Medium on dates |
| Unknown utility category | Low on category |
| Bill with no clear service period | Low on dates |

## 8. File Storage

### 8.1 Supabase Storage Configuration

| Property | Value |
|----------|-------|
| Bucket Name | `bill-pdfs` |
| Access | Private (signed URLs for access) |
| File Path | `{property_id}/{cycle_id}/{bill_id}.pdf` |
| Max File Size | 10 MB |
| Allowed MIME Types | `application/pdf` |
| Signed URL Expiry | 1 hour |

### 8.2 Storage RLS Policies

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Owner upload | INSERT | User is the property owner |
| Owner read | SELECT | User is the property owner |
| Owner delete | DELETE | User is the property owner |
| Admin full access | ALL | User role is admin |
| Tenant read (Phase 2) | SELECT | Tenant is active member of the property |

### 8.3 File Lifecycle

```
UPLOAD:
  1. Generate bill ID (UUID) before upload
  2. Upload PDF to: bill-pdfs/{property_id}/{cycle_id}/{bill_id}.pdf
  3. Store the storage path in bills.pdf_url

VIEW:
  1. Generate signed URL from storage path
  2. Signed URL expires after 1 hour
  3. Open in new tab or inline viewer

DELETE:
  1. When bill is deleted, also delete the PDF from storage
  2. Implement via database trigger or server action
```

## 9. Rate Limiting

### 9.1 Parsing Rate Limits

| Limit | Value | Scope |
|-------|-------|-------|
| Per property per day | 10 parses | Prevents runaway API costs |
| Per user per hour | 5 parses | Prevents abuse |
| Global per minute | 20 parses | Protects API quota |

### 9.2 Rate Limit Response

```
IF rate limit exceeded:
  1. Return error: { error: 'rate_limit', retry_after: seconds }
  2. Show user message: "You've reached the parsing limit.
     You can parse more bills in [time]. Enter details manually for now."
  3. "Enter Manually" button remains available
  4. Upload still works (PDF stored), just no parsing
```

### 9.3 Implementation

- Track parse count in a `parse_usage` table or Redis cache.
- Check limits before calling Claude API.
- Reset daily limits at midnight UTC.
- Configurable via environment variables.

## 10. UI Components

### 10.1 Component Hierarchy

```
BillForm (organism)
  PdfUploadZone (molecule)
    DropZone (atom) - drag & drop area
    FileInput (atom) - fallback file picker
    UploadProgress (atom) - progress bar
    FilePreview (molecule) - filename + size + remove button
  ParsingIndicator (molecule) - "Analyzing..." spinner (Phase 2)
  ParsedFieldRow (molecule) x N (Phase 2)
    Input (atom) - the form field
    ConfidenceBadge (atom) - green/yellow/red indicator
    OriginalValueTooltip (atom) - shows parsed value on hover if edited
  BillFormFields (molecule)
    CategorySelect (atom)
    ProviderInput (atom)
    AmountInput (atom)
    DateRangePicker (molecule)
    NotesTextarea (atom)
  SubmitButton (atom)
```

### 10.2 Phase 1 UI (MVP)

The MVP UI includes only the upload component without parsing:

```
+--------------------------------------------------+
| Add Bill                                         |
|                                                  |
| Upload PDF (optional)                            |
| +----------------------------------------------+ |
| |  [cloud icon]                                 | |
| |  Drag & drop your bill PDF here              | |
| |  or click to browse                          | |
| |  PDF only, max 10 MB                         | |
| +----------------------------------------------+ |
|                                                  |
| Category:     [Electricity ▾]                    |
| Provider:     [________________________]         |
| Amount ($):   [________________________]         |
| Service From: [____/____/________]               |
| Service To:   [____/____/________]               |
| Notes:        [________________________]         |
|                                                  |
| [Cancel]                        [Save Bill]      |
+--------------------------------------------------+
```

### 10.3 Phase 2 UI (With Parsing)

```
+--------------------------------------------------+
| Add Bill                                         |
|                                                  |
| Upload PDF                                       |
| +----------------------------------------------+ |
| |  electricity_jan_2025.pdf (2.3 MB)  [x]      | |
| +----------------------------------------------+ |
|                                                  |
| [spinner] Analyzing your bill...                 |
|                                                  |
| -- after parsing completes --                    |
|                                                  |
| Category:     [Electricity ▾]     [green check]  |
| Provider:     [City Power Co___]  [green check]  |
| Amount ($):   [150.99_________]   [green check]  |
| Service From: [01/01/2025_____]   [yellow warn]  |
| Service To:   [01/31/2025_____]   [green check]  |
| Notes:        [________________________]         |
|                                                  |
| [Cancel]  [Enter Manually]      [Save Bill]      |
+--------------------------------------------------+
```

## 11. Supported Formats

| Format | Phase 1 (MVP) | Phase 2 |
|--------|:------------:|:-------:|
| PDF (digital/text) | Upload only | Full parsing |
| PDF (scanned/image) | Upload only | Parsing (lower confidence) |
| Image (JPG/PNG) | Not supported | Future |
| Email attachment | Not supported | Future |

## 12. Error Handling

| Error | User-Facing Message | Action |
|-------|-------------------|--------|
| File too large (> 10 MB) | "File is too large. Maximum size is 10 MB." | Prevent upload |
| Invalid file type | "Only PDF files are supported." | Prevent upload |
| Upload failed | "Upload failed. Please try again." | Retry button |
| Parsing timeout | "Bill analysis took too long. Please enter details manually." | Manual entry |
| Parsing API error | "Could not analyze this bill. Please enter details manually." | Manual entry |
| Rate limit exceeded | "Parsing limit reached. You can parse more bills in X minutes." | Manual entry |
| Invalid parsed JSON | "Could not read bill format. Please enter details manually." | Manual entry |
| Storage quota exceeded | "Storage limit reached. Please contact support." | Block upload |

## 13. Security Considerations

| Concern | Mitigation |
|---------|------------|
| PDF malware | Supabase Storage scans uploads. PDFs only opened server-side for API calls. |
| Data privacy | PDFs stored in private bucket with RLS. Signed URLs expire after 1 hour. |
| API key exposure | Claude API key stored as server-side environment variable, never sent to client. |
| Injection via PDF | Claude API processes PDF as document, not executable. Structured output validated. |
| Cost control | Rate limiting prevents excessive API usage. Monitor costs via Anthropic dashboard. |

## 14. Cost Estimation (Phase 2)

| Parameter | Value |
|-----------|-------|
| Average PDF size | 200 KB |
| Input tokens per parse | ~2,000 (estimated) |
| Output tokens per parse | ~300 |
| Cost per parse (claude-sonnet) | ~$0.01 |
| Estimated parses per month (50 properties) | 500 |
| Estimated monthly Claude API cost | ~$5.00 |

## 15. Server Actions

| Action | Input | Phase | Description |
|--------|-------|-------|-------------|
| `uploadBillPdf` | File, property_id, cycle_id, bill_id | Phase 1 | Upload PDF to Supabase Storage |
| `deleteBillPdf` | bill_id | Phase 1 | Delete PDF from Supabase Storage |
| `getSignedPdfUrl` | bill_id | Phase 1 | Generate signed URL for PDF viewing |
| `parseBillPdf` | bill_id | Phase 2 | Send PDF to Claude API, return parsed fields |
| `checkParseRateLimit` | property_id | Phase 2 | Check if parsing is allowed within rate limits |

## 16. Technical Notes

- Use Next.js API route (not server action) for PDF upload because server actions have a 1 MB body limit by default. File uploads need streaming.
- Store the Anthropic API key in environment variable `ANTHROPIC_API_KEY`.
- Use the Anthropic TypeScript SDK (`@anthropic-ai/sdk`) for API calls.
- PDF parsing runs server-side only. Never send API keys or raw PDF data to the client.
- Consider caching parsed results in case the owner navigates away and returns.
- In Phase 1, the upload zone should be visually complete but show a "Coming soon: AI bill parsing" tooltip on the parsing badge area.
- Index `bills(pdf_url)` for efficient lookups when cleaning up orphaned PDFs.

## 17. Open Questions

1. Should we support batch upload (multiple PDFs at once)?
2. Should we keep parsed data separate from the final bill record for audit purposes?
3. Should tenants be able to view the original PDF (useful for transparency)?
4. What should happen to PDFs when a bill is deleted -- keep for audit or delete?
5. Should we support re-parsing a PDF if the first attempt had low confidence?

---

*This concludes the initial PRD suite (01-05) for FairSplit. Additional PRDs will cover email notifications, tenant invoicing, bill flagging, and Stripe integration as those phases begin.*
