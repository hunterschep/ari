# Ari

Ari is a renter-side AI operating system for apartment hunting. The repo implements the `plan.md` MVP as a TypeScript monorepo with a Next.js web app, Fastify API, worker workflow modules, shared schemas, provider adapters, Prisma schema, and tests.

## Local

```bash
npm install
npm run dev:api
npm run dev:web
```

Web: `http://localhost:3000`

API: `http://localhost:4000/health`

The app runs with seeded local data and mock providers by default. Real providers are isolated behind adapters in `packages/integrations`.

## Verification

```bash
npm run typecheck
npm test
npm run test:e2e
npm --workspace @ari/db run prisma:validate
```

## Implemented Surfaces

- Renter onboarding and search profile.
- Listing ingestion adapters, normalization, dedupe, freshness, versioning, and admin review.
- Deterministic ranking, pricing advice, NYC/NY fee rules, and explanation text.
- Approval-gated outreach drafts, send providers, conversations, inbound parsing, and follow-up state.
- Tour slot extraction, user slot approval, calendar event creation, and tour state.
- Document vault, classification, application checklist, packet generation, approval, send, and revocation.
- Policy guard, consent records, audit logs, compliance flags, agent/tool-call models, and admin observability.
