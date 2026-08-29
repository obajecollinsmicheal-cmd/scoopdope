# KYC Verification Guide

## KYC provider integration

KYC integration connects the platform to a third-party identity verification service.

Key integration points:

- **Provider API endpoint**: the URL used to submit verification requests and fetch results.
- **API credentials**: secure API keys or tokens stored in environment variables such as `KYC_PROVIDER_API_KEY`.
- **Provider configuration**: option flags for document types, identity sources, country-specific rules, and risk scoring.
- **Error handling**: handle provider rate limits, network failures, and invalid responses gracefully.

Providers may also support webhook callbacks, file uploads, and multi-step verification flows.

## Customer verification workflow

A typical verification workflow includes:

1. **Collect information**: gather user identity details and required documents (ID, selfie, address proof).
2. **Create verification request**: submit the user data to the KYC provider.
3. **Await result**: poll the provider or receive webhook events for status updates.
4. **Review outcome**:
   - **Verified**: identity checks passed.
   - **Pending**: additional information is required.
   - **Rejected**: verification failed due to mismatched data, unacceptable documents, or risk concerns.
5. **Notify the user**: update user-facing status and next steps.
6. **Persist status**: store the verification outcome in the user profile and audit logs.

## Webhook handling documentation

Webhooks are critical for real-time KYC event processing.

Best practices:

- **Validate signatures**: verify webhook payloads with the provider’s signature or HMAC token.
- **Use idempotent handlers**: process repeated events safely without duplicating actions.
- **Map provider statuses**: translate provider-specific status codes into internal states such as `pending`, `verified`, `rejected`, or `review_required`.
- **Handle retries**: accept and safely retry webhooks when the provider resends events after temporary failures.
- **Secure endpoints**: require authentication or secret tokens for inbound webhook calls.

Example webhook flow:

- `verification.created`
- `verification.updated`
- `verification.completed`
- `verification.failed`

Each event should update the user record, create an audit entry, and, when appropriate, notify support.

## Provider Integration

This section documents the KYC provider's webhook API contract and how events are mapped to the internal `KycStatus` enum.

### Provider Webhook Events

The KYC provider sends the following webhook event types to the configured endpoint (e.g., `https://api.scoopdope.app/v1/kyc/webhooks`):

#### `verification.created`
Fired when a new verification request is initiated.

**Payload:**
```json
{
  "event": "verification.created",
  "verification_id": "verif_123abc",
  "user_id": "user_456",
  "timestamp": "2026-07-30T10:00:00Z",
  "status": "pending"
}
```

**Internal Status Transition:** `unverified` → `pending`

#### `verification.submitted`
Fired when user documents have been submitted for review.

**Payload:**
```json
{
  "event": "verification.submitted",
  "verification_id": "verif_123abc",
  "user_id": "user_456",
  "timestamp": "2026-07-30T10:05:00Z",
  "status": "review_pending",
  "documents_count": 3
}
```

**Internal Status Transition:** `pending` → `pending` (remains pending, awaiting review)

#### `verification.completed`
Fired when the verification process is complete and the identity has been confirmed.

**Payload:**
```json
{
  "event": "verification.completed",
  "verification_id": "verif_123abc",
  "user_id": "user_456",
  "timestamp": "2026-07-30T10:30:00Z",
  "status": "approved",
  "confidence_score": 0.98
}
```

**Internal Status Transition:** `pending` → `verified`

#### `verification.rejected`
Fired when the verification process fails or documents are rejected.

**Payload:**
```json
{
  "event": "verification.rejected",
  "verification_id": "verif_123abc",
  "user_id": "user_456",
  "timestamp": "2026-07-30T10:20:00Z",
  "status": "rejected",
  "rejection_reason": "document_mismatch",
  "rejection_details": "Selfie does not match ID document"
}
```

**Internal Status Transition:** `pending` → `rejected`

**Rejection Reasons:**
- `document_mismatch`: Submitted documents do not match.
- `fraud_detected`: Suspicious activity or potential fraud detected.
- `document_expired`: ID or supporting documents have expired.
- `unsupported_country`: User's country of residence is not supported.
- `incomplete_submission`: Required documents are missing.

#### `verification.manual_review_required`
Fired when the provider's automated checks are inconclusive and human review is needed.

**Payload:**
```json
{
  "event": "verification.manual_review_required",
  "verification_id": "verif_123abc",
  "user_id": "user_456",
  "timestamp": "2026-07-30T10:15:00Z",
  "status": "manual_review",
  "reason": "low_confidence_score"
}
```

**Internal Status Transition:** `pending` → `review_required`

### Internal Status Mapping

The `KycStatus` enum on the backend is defined as:

```typescript
export enum KycStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REVIEW_REQUIRED = 'review_required',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}
```

**Provider Event to Internal Status Mapping:**

| Provider Event | Provider Status | Internal Status | Next Action |
|---|---|---|---|
| `verification.created` | `pending` | `PENDING` | Await document submission |
| `verification.submitted` | `review_pending` | `PENDING` | Await automated or manual review |
| `verification.completed` | `approved` | `VERIFIED` | Grant full platform access |
| `verification.rejected` | `rejected` | `REJECTED` | Notify user; allow re-submission after 7 days |
| `verification.manual_review_required` | `manual_review` | `REVIEW_REQUIRED` | Notify support team; estimate 24–48 hour turnaround |

### Error Handling and Provider Error Codes

The provider may return error responses in the following scenarios:

**HTTP 4xx Errors:**
- `400 Bad Request`: Invalid webhook payload or missing required fields. Log and discard.
- `401 Unauthorized`: Webhook signature validation failed. Return `403 Forbidden` and alert security team.
- `422 Unprocessable Entity`: Verification request contains invalid user data (e.g., invalid date format). Notify user to re-submit.

**HTTP 5xx Errors:**
- `500 Internal Server Error`: Provider service temporarily unavailable. Queue webhook for retry (up to 5 retries with exponential backoff).
- `503 Service Unavailable`: Provider is under maintenance. Retry within 1 hour.

**Webhook Retry Strategy:**
- Retry attempts: up to 5 times
- Initial backoff: 30 seconds
- Backoff multiplier: 2x (30s, 60s, 2m, 4m, 8m)
- After 5 failed retries: log as critical incident and alert support

### Webhook Signature Validation

All webhook requests are signed with an HMAC-SHA256 signature. Validate every webhook as follows:

1. Extract the `X-KYC-Signature` header from the incoming request.
2. Concatenate the request timestamp (from `X-KYC-Timestamp` header) and the raw JSON body.
3. Compute HMAC-SHA256 using the webhook secret (stored in `KYC_WEBHOOK_SECRET` environment variable).
4. Compare the computed signature with the `X-KYC-Signature` header (constant-time comparison).
5. If signatures do not match, reject the request with `403 Forbidden`.

**Example (Node.js):**
```javascript
const crypto = require('crypto');

function validateWebhookSignature(body, signature, timestamp, secret) {
  const message = `${timestamp}.${body}`;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
```

## Compliance requirements

KYC workflows must comply with data protection and anti-money laundering obligations.

- **Data minimization**: store only the information required for verification.
- **Encryption**: encrypt sensitive data at rest and in transit.
- **Access controls**: restrict access to KYC data to authorized personnel.
- **Retention policy**: keep personal data only as long as required by policy and law.
- **Audit logging**: log verification requests, status changes, and administrative reviews.
- **Regulatory checks**: include sanction-list screening, identity validation, and risk scoring where required.
- **Privacy notices**: obtain user consent and explain how identity data is used.

## User status management

Model customer verification with clear internal statuses:

- `unverified`: no KYC process has started.
- `pending`: verification is in progress.
- `verified`: identity has been confirmed.
- `rejected`: verification failed.
- `suspended`: access is limited due to suspicious activity or compliance issues.
- `expired`: verification must be refreshed because the existing check is no longer valid.

Status transitions should be driven by provider results, manual review, or policy changes. Keep the workflow auditable and allow administrators to re-trigger verification when needed.
