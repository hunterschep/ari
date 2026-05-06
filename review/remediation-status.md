# Remediation Status

Date: 2026-05-05

This file records the implementation work completed against the adversarial review. It does not supersede the original verdict in `review/README.md`: Ari still needs the database, workflow, provider, storage, ops, and agent-safety rebuild described there before it is customer-usable.

## Completed in This Pass

| Area | Status | Evidence |
|---|---:|---|
| Local demo auth boundary | Improved | `ENABLE_LOCAL_AUTH_FALLBACK` now defaults to false and local fallback must be explicitly enabled through server options or a non-production env flag. |
| Admin RBAC | Improved | Demo auth no longer bypasses admin role checks; admin routes require `ADMIN` or `OPS`. |
| CORS | Improved | API CORS now uses `WEB_ORIGIN` allowlist outside tests instead of accepting every origin. |
| Webhook spoofing | Improved | Twilio, SendGrid, Postmark, and Google Calendar webhook routes now require an HMAC `x-ari-signature` using provider-specific secrets or `WEBHOOK_SHARED_SECRET`. |
| Webhook audit fidelity | Improved | Accepted webhook events are recorded with `signatureVerified: true`; unsigned callbacks are rejected. |
| Runtime validation | Improved | Zod validation errors now return HTTP 400 instead of generic 500 responses. |
| Document upload safety | Improved | Upload metadata now rejects unsafe filenames, unsupported MIME types, oversize files, and storage keys outside the authenticated user prefix. |
| Upload sessions | Improved | Added `/v1/documents/upload-sessions` and `/v1/documents/upload-sessions/:id/complete`; completion now validates server-issued storage key, expected size, checksum, owner, expiry, and idempotent completion. |
| Duplicate sensitive side effects | Improved | Draft sends, tour confirmations, upload completion, packet generation, and packet sends now have basic idempotency guards in the in-memory store. |
| Prompt-injection fixtures | Improved | The reviewed prompt-injection examples now escalate as `SCAM_RISK` instead of becoming application requests or automation instructions. |
| Production startup validation | Improved | `assertProductionReadyConfig` now rejects production boot with local auth fallback, local DB/Redis defaults, missing provider secrets, missing webhook secrets, local document bucket, or missing Temporal/OpenAI/encryption config. |
| Production demo-store guard | Improved | `buildServer()` now fails under `NODE_ENV=production` unless an explicit store/repository implementation is supplied. |
| Public error responses | Improved | API errors now include `requestId`; internal 500s return a generic message instead of raw exception text. |
| Config boolean parsing | Improved | String env values such as `ENABLE_LOCAL_AUTH_FALLBACK=false` now parse as false instead of truthy. |
| Data request API | Improved | Added validated `GET/POST /v1/me/data-requests` with open-request deduplication and audit logging for export/delete requests. |
| Regression tests | Improved | Added tests for explicit demo auth, admin RBAC, signed webhooks, document validation, idempotent tour/packet operations, and prompt injection. |

## Verification

```txt
Command: npm run typecheck
Result: PASS
```

```txt
Command: npm run test
Result: PASS
Evidence: 5 Vitest files, 23 tests passed.
```

```txt
Command: npm run test:e2e -- tests/playwright/api-journey.spec.ts
Result: PASS
Evidence: 1 Playwright API journey passed.
```

## Still Launch-Blocking

The following adversarial-review blockers remain materially unresolved:

- Runtime state is still a single-user in-memory store, not PostgreSQL/Prisma-backed product state.
- Authentication still maps real Clerk tokens to the seeded demo user instead of persisted user rows.
- Object-level authorization is not meaningful until resources are persisted per user.
- Webhook verification uses Ari HMAC headers, not provider-native Twilio/SendGrid/Postmark/Google signature algorithms or replay windows.
- Email, SMS, calendar, and object storage providers are still mocks.
- Document links are still fake `ari.local` URLs; there is no private object store, malware scanning, recipient-bound share, access log, or deletion/export workflow.
- Idempotency is still in-memory and cannot survive process crashes; there is no transactional outbox.
- Temporal workflows remain placeholders and cannot recover multi-day search/outreach/scheduling/application flows.
- Listing ingestion remains fixture-backed and not launch-city credible.
- Agent/tool calls are not persisted with policy decisions, prompt versions, eval results, or full untrusted-content isolation.
- Admin tooling still cannot recover real failed workflows or provider failures.

## Next Required Implementation Phases

1. Replace the in-memory store with Prisma repositories, migrations, persisted users, and ownership checks.
2. Add a transactional outbox plus provider-native SendGrid/Twilio/Calendar adapters and provider-native webhook verification.
3. Build the document vault: private storage, upload sessions, malware scanning, recipient-bound expiring shares, revocation, access logs, and deletion/export.
4. Implement Temporal workflows for search refresh, outreach, inbound replies, scheduling, applications, retries, timers, cancellations, and admin recovery.
5. Wire agent runs/tool calls/policy decisions into persisted audit logs and expand prompt-injection/fair-housing evals.
