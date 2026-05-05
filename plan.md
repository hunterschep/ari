# AI Rental Agent MVP — engineering execution plan

## 0. End-state definition

The MVP is a **renter-side AI operating system** for apartment hunting. A user gives the product their rental criteria, availability, commute anchors, application documents, and communication preferences. The product then:

1. **Finds and refreshes rental units** from compliant data sources.
2. **Deduplicates, enriches, ranks, and explains** which units are worth pursuing.
3. **Drafts and sends landlord / broker outreach** through approved channels.
4. **Tracks every conversation** in one inbox.
5. **Negotiates tour scheduling** and writes confirmed tours to the user’s calendar.
6. **Builds an application packet** from saved renter data and uploaded documents.
7. **Advises on pricing, fee risk, comps, and negotiation angles.**
8. **Escalates ambiguous or risky actions** to the user or an internal human operator.

The MVP should not try to fully replace every rental website. It should become the renter’s **agentic command center** across listing discovery, outreach, scheduling, and application prep.

The engineering thesis: the product is not “a chatbot for apartments.” It is a **workflow engine with AI reasoning at decision points and deterministic tools for every action**.

---

# 1. Product boundaries for MVP

## 1.1 Must exist in MVP

### Renter onboarding

The user must be able to enter:

* Target city.
* Desired move-in date.
* Lease term.
* Budget range.
* Beds / baths.
* Neighborhoods.
* Commute anchors: work, school, partner’s work, gym, etc.
* Must-have filters: pets, laundry, elevator, doorman, outdoor space, dishwasher, furnished, parking, guarantor allowed, no-fee preference, etc.
* Deal-breakers.
* Tour availability windows.
* Preferred communication style.
* Application readiness profile:

  * legal name
  * email
  * phone
  * income
  * employment
  * occupants
  * pets
  * guarantor status
  * uploaded docs

### Listing discovery

The system must:

* Pull units from at least one licensed listing/property-data source.
* Support manual user-submitted listing URLs.
* Support admin-uploaded landlord / property-manager feeds.
* Normalize units into one canonical listing model.
* Refresh active listings on a schedule.
* Detect stale, duplicate, suspicious, or low-confidence listings.
* Store listing versions so the user can see price/status changes.

For the MVP, do not build the product around unauthorized scraping of major consumer marketplaces. Use licensed APIs, landlord-direct feeds, user-submitted URLs, and source-specific ingestion where terms permit. RentCast is a reasonable first data provider to prototype against because its API describes access to property records, rent estimates, active listings, and market trends across the U.S. Zillow’s developer surface is useful to understand the ecosystem, but its rentals feed integration is for property managers sending listing data into Zillow’s network, not a general “download all rentals” endpoint for this product. ([RentCast][1])

### Ranking and recommendation

The system must score each listing on:

* Fit to hard filters.
* Fit to soft preferences.
* Price relative to budget.
* Price relative to similar listings.
* Commute distance / time.
* Application competitiveness.
* Availability timing.
* Landlord / broker responsiveness.
* Building risk signals.
* Fee transparency.
* Confidence of listing freshness.

### Outreach

The system must:

* Draft messages to landlords / brokers.
* Let the user approve drafts.
* Send email or SMS where allowed.
* Track outbound messages.
* Parse inbound responses.
* Maintain conversation state per listing/contact.
* Detect common landlord replies:

  * available
  * unavailable
  * “when can you tour?”
  * “send application”
  * “what is your income?”
  * “do you have pets?”
  * “open house only”
  * “broker fee”
  * “deposit required”
  * “call me”
  * suspicious/scam behavior

Email can be implemented through a transactional email API. SendGrid’s v3 Web API provides a REST interface for sending email at scale, and Postmark/Resend are reasonable alternatives. SMS / WhatsApp can be implemented through Twilio, whose Programmable Messaging docs describe sending/receiving SMS, MMS, and WhatsApp, while Twilio Conversations supports back-and-forth messaging across channels. ([Twilio][2])

### Scheduling

The system must:

* Store user availability.
* Ask landlords for available tour slots.
* Parse proposed times from inbound messages.
* Suggest the best slots.
* Confirm with the landlord only after user approval unless the user has enabled an explicit auto-booking policy.
* Create calendar events.
* Send reminders.

Google Calendar is the first calendar integration. The Calendar API supports creating events through `events.insert`; timed events use `start.dateTime` and `end.dateTime`, and at minimum an event requires `start` and `end`. ([Google for Developers][3])

### Application packet

The system must:

* Let users upload documents.
* Store docs securely.
* Classify uploaded documents.
* Extract structured fields where possible.
* Create a reusable renter profile.
* Generate a landlord-ready application packet:

  * cover note
  * renter summary
  * employment/income summary
  * pet summary
  * guarantor summary, if relevant
  * uploaded document links or PDF attachments
* Require user approval before sending any application packet.

For document storage, use private object storage with presigned upload/download URLs. AWS S3 presigned URLs allow temporary access without making the bucket public, which fits sensitive application documents. ([AWS Documentation][4])

### Pricing advice

The system must:

* Compare listing price against similar units.
* Detect likely overpricing.
* Estimate total move-in cost.
* Flag suspicious or legally questionable fees.
* Suggest negotiation language.
* Explain whether the user should apply quickly, negotiate, tour first, or skip.

For NYC launch logic, the code must include local fee rules. The NYC FARE Act took effect on June 11, 2025 and prohibits brokers who represent landlords, including listing agents, from charging broker fees to tenants; landlords or agents must disclose tenant-paid fees in listings and rental agreements. New York law also caps background/credit-check reimbursement at the actual cost or $20, whichever is less, with waiver rules when the tenant provides a recent report. ([NYC Government][5])

### Admin console

The MVP needs an internal operations console from day one. AI products fail silently without it.

Admin users must be able to:

* Inspect agent runs.
* Replay tool calls.
* View failed listing ingestions.
* View outbound/inbound message logs.
* Manually correct listing/contact data.
* Pause a user’s automation.
* Approve or reject risky messages.
* Review compliance flags.
* Impersonate a user safely in read-only mode.
* Trigger workflow retries.

---

# 2. Non-goals for MVP

Do **not** build these in the first MVP:

* Native mobile app.
* Lease signing.
* Payments / rent deposits.
* Credit report ordering as a first-party screening bureau.
* Fully autonomous unsupervised applications.
* Fully autonomous phone calls.
* B2B landlord dashboard.
* MLS-wide integrations across every market.
* Unlicensed brokerage behavior.
* A marketplace where landlords post listings directly.
* Complex typography, animations, or visual polish beyond functional UI.

The MVP should feel powerful because it completes the rental workflow, not because it has a beautiful interface.

---

# 3. Recommended architecture

## 3.1 Stack

### Frontend

Use exactly what was specified:

* **Next.js**
* **TypeScript**
* **Tailwind**
* **shadcn/ui**

Additional frontend libraries:

* React Hook Form for forms.
* Zod for shared validation.
* TanStack Query for client data fetching/caching.
* Zustand or Jotai for lightweight local UI state.
* FullCalendar or React Big Calendar for tour/calendar UI.
* UploadThing or direct S3 presigned upload flow for documents.

### Backend

Use TypeScript across the backend.

Recommended backend stack:

* **API service:** NestJS or Fastify. I would choose **Fastify** for MVP speed and lower ceremony, with a clean modular folder structure.
* **Database:** PostgreSQL.
* **ORM:** Prisma.
* **Vector/search:** pgvector plus Postgres full-text search for MVP.
* **Workflow orchestration:** Temporal.
* **Queue/cache:** Redis or Valkey.
* **Object storage:** S3-compatible storage.
* **LLM provider:** OpenAI Responses API behind an internal provider interface.
* **Email:** Postmark or SendGrid.
* **SMS/WhatsApp:** Twilio.
* **Calendar:** Google Calendar first, Outlook later.
* **Maps/geocoding/routes:** Google Maps Platform or Mapbox.
* **Error tracking:** Sentry.
* **Observability:** OpenTelemetry + Grafana/Datadog.
* **Analytics:** PostHog.
* **Feature flags:** LaunchDarkly, Statsig, or self-hosted flags table.
* **Deployment:** Vercel for web, AWS ECS/Fargate or Render/Fly for API and workers.

Temporal is important because apartment hunting is a long-running workflow: messages may receive replies hours or days later, listings go stale, tours get rescheduled, and applications have multi-step states. Temporal’s TypeScript SDK models workflows as functions that store state and orchestrate activity functions, which is exactly the shape needed here. ([Temporal Docs][6])

Prisma can support PostgreSQL extensions, including pgvector, which is useful for semantic listing/search-profile matching and message/document retrieval. ([Prisma][7])

OpenAI’s Responses API supports model responses, built-in tools, and function calling to external systems; Structured Outputs can enforce schema adherence for JSON outputs. This is the right default for agent tool execution and structured extraction. ([OpenAI Developers][8])

Google Maps Geocoding can convert addresses to coordinates, and Google Routes can compute routes and route matrices, which is useful for commute-aware listing scoring. ([Google for Developers][9])

---

# 4. Monorepo structure

```txt
ai-rental-agent/
  apps/
    web/
      app/
      components/
      lib/
      hooks/
      styles/
    api/
      src/
        modules/
        routes/
        plugins/
        middleware/
        jobs/
    worker/
      src/
        workflows/
        activities/
        agents/
        tools/
    admin/
      app/
      components/
  packages/
    db/
      prisma/
      src/
    schemas/
      src/
        listing.ts
        renter-profile.ts
        messaging.ts
        scheduling.ts
        application.ts
        agent.ts
    ui/
    config/
    logger/
    integrations/
      rentcast/
      twilio/
      sendgrid/
      google-calendar/
      google-maps/
      openai/
      s3/
    agents/
      src/
        core/
        prompts/
        tool-registry/
        policies/
    shared/
      src/
        constants/
        utils/
        errors/
  infra/
    docker/
    terraform/
    scripts/
  tests/
    e2e/
    integration/
    fixtures/
```

Core principle: **all domain schemas live in `packages/schemas` and are shared across frontend, API, worker, and tests.**

---

# 5. Core system modules

## 5.1 Auth and user identity module

### What to code

* User registration/login.
* Session management.
* Role model:

  * `RENTER`
  * `ADMIN`
  * `OPS`
  * `DEVELOPER`
* User consent and authorization settings.
* OAuth connections:

  * Google Calendar
  * Gmail later, not first
  * Outlook later, not first

### Key tables

```txt
users
user_profiles
auth_accounts
user_consents
user_preferences
calendar_connections
```

### Critical implementation details

* Store consent as structured records, not booleans.
* Every autonomous action must be traceable to a consent record.
* Every outbound message must reference:

  * user ID
  * listing ID
  * contact ID
  * approval ID
  * policy ID
  * agent run ID

Example consent record:

```ts
type UserConsent = {
  id: string;
  userId: string;
  type:
    | "SEND_EMAIL_OUTREACH"
    | "SEND_SMS_OUTREACH"
    | "AUTO_BOOK_TOUR"
    | "SEND_APPLICATION_PACKET"
    | "READ_CALENDAR"
    | "WRITE_CALENDAR";
  status: "GRANTED" | "REVOKED";
  scope: "ONE_TIME" | "SESSION" | "ONGOING";
  constraints: {
    maxMessagesPerDay?: number;
    allowedChannels?: ("email" | "sms" | "whatsapp")[];
    requireApprovalAboveRiskScore?: number;
    allowedTemplates?: string[];
  };
  grantedAt: string;
  revokedAt?: string;
};
```

---

## 5.2 Renter profile module

### What to code

The renter profile is the canonical source of truth for what the agent knows about the user.

Data model:

```ts
type RenterProfile = {
  userId: string;
  legalName: string;
  email: string;
  phone?: string;
  targetCity: string;
  moveInDate: string;
  leaseTermMonths?: number;
  budgetMin?: number;
  budgetMax: number;
  bedroomsMin: number;
  bathroomsMin?: number;
  neighborhoods: string[];
  commuteAnchors: CommuteAnchor[];
  occupants: Occupant[];
  pets: Pet[];
  employment?: EmploymentProfile;
  income?: IncomeProfile;
  guarantor?: GuarantorProfile;
  preferences: RentalPreferences;
  dealBreakers: string[];
  messageTone: "direct" | "friendly" | "premium" | "urgent";
  applicationReadiness: "NOT_STARTED" | "PARTIAL" | "READY";
};
```

### Frontend pages

```txt
/onboarding/profile
/onboarding/search
/onboarding/availability
/onboarding/application
/settings/profile
/settings/automation
```

### Backend endpoints

```txt
GET    /v1/renter-profile
PATCH  /v1/renter-profile
POST   /v1/renter-profile/commute-anchors
DELETE /v1/renter-profile/commute-anchors/:id
POST   /v1/renter-profile/pets
PATCH  /v1/renter-profile/preferences
```

### Acceptance criteria

* User can complete onboarding in under 10 minutes.
* User can save incomplete onboarding and continue later.
* Search can start with only minimum required fields:

  * target city
  * move-in date
  * budget max
  * beds
  * neighborhoods or commute anchor
* Agent never invents user facts. If a fact is missing, it asks user or uses a neutral message.

---

## 5.3 Listing ingestion module

This is the hardest part of the MVP.

### Sources for MVP

Use four source types:

#### Source A — licensed listing API

Start with one provider such as RentCast.

Needed capabilities:

* Search active long-term rentals by city/state, bounding box, or criteria.
* Fetch listing details.
* Fetch rent estimates/comps.
* Fetch property/building details.

#### Source B — landlord/property-manager feeds

Build a generic CSV/JSON feed importer so small landlords or property managers can upload inventory.

Input formats:

* CSV upload.
* JSON upload.
* Admin-entered listing form.
* Future: webhook/feed endpoint.

#### Source C — user-submitted URLs

User pastes a listing URL. System extracts what it can, subject to source permissions, and creates a saved listing.

This is important because users will still find listings elsewhere. The AI Rental Agent must be able to work on top of any apartment the user brings.

#### Source D — internal manual listings

Ops can manually create/repair listings in admin.

This is not a hack. It is necessary for first customers. Real estate data is messy.

### What to code

```txt
packages/integrations/rentcast/
  client.ts
  mappers.ts
  types.ts
  fixtures.ts

apps/worker/src/activities/listing-ingestion/
  fetchRentcastListings.ts
  importLandlordFeed.ts
  normalizeListing.ts
  dedupeListing.ts
  enrichListing.ts
  refreshListingStatus.ts

apps/api/src/modules/listings/
  listing.routes.ts
  listing.service.ts
  listing.repository.ts
```

### Canonical listing model

```ts
type CanonicalListing = {
  id: string;
  source: ListingSource;
  sourceListingId?: string;
  sourceUrl?: string;

  status: "ACTIVE" | "PENDING" | "RENTED" | "STALE" | "UNKNOWN";
  confidence: number;

  title?: string;
  description?: string;

  address: {
    raw: string;
    normalized?: string;
    unit?: string;
    city: string;
    state: string;
    zip?: string;
    lat?: number;
    lng?: number;
    geohash?: string;
  };

  buildingId?: string;

  price: number;
  currency: "USD";
  bedrooms: number;
  bathrooms?: number;
  squareFeet?: number;

  availableDate?: string;
  leaseTermMonths?: number;

  fees: {
    brokerFeeRequired?: boolean;
    brokerFeeAmount?: number;
    applicationFee?: number;
    securityDeposit?: number;
    otherFees?: { label: string; amount?: number; required: boolean }[];
    feeDisclosureText?: string;
  };

  amenities: string[];
  petPolicy?: {
    cats?: boolean;
    dogs?: boolean;
    weightLimitLbs?: number;
    petFee?: number;
    petRent?: number;
  };

  media: {
    photos: string[];
    floorplans: string[];
    videos: string[];
    virtualTours: string[];
  };

  contacts: ListingContact[];

  listedAt?: string;
  lastSeenAt: string;
  lastRefreshedAt: string;

  rawSourcePayload?: unknown;
};
```

### Dedupe algorithm

Deduping must be deterministic and explainable.

Compute:

```txt
canonical_hash = hash(
  normalized_address +
  normalized_unit +
  bedrooms +
  bathrooms +
  approximate_price_bucket
)
```

Then run fuzzy matching:

* Address similarity.
* Unit similarity.
* Price delta.
* Bed/bath match.
* Photo perceptual hash match, if available.
* Source URL canonicalization.
* Contact overlap.

Deduping states:

```txt
UNIQUE
LIKELY_DUPLICATE
CONFIRMED_DUPLICATE
NEEDS_REVIEW
```

### Listing refresh workflow

Every listing has a freshness state:

```txt
FRESH: refreshed < 24h ago
AGING: refreshed 24–72h ago
STALE: not seen in source refresh > 72h
DEAD: source confirms unavailable/rented
UNKNOWN: source cannot verify
```

Workflow:

```txt
DailyListingRefreshWorkflow
  1. Fetch listings by city/search region.
  2. Normalize all raw listings.
  3. Upsert canonical listings.
  4. Version changed fields.
  5. Mark missing listings as aging/stale.
  6. Re-score affected user search sessions.
  7. Notify users only for high-fit new listings.
```

### Listing versioning

Store every meaningful change:

```txt
listing_versions
  id
  listing_id
  observed_at
  price
  status
  description
  fees_json
  availability_date
  raw_payload_hash
```

User-facing examples:

* “Price dropped from $4,200 to $3,950 today.”
* “This listing has not appeared in the source feed for 4 days.”
* “Broker fee disclosure changed.”

---

## 5.4 Building enrichment module

For top-city rentals, the unit is only half the story. The building matters.

### What to code

Create a building enrichment service:

```txt
apps/worker/src/activities/enrichment/
  geocodeAddress.ts
  enrichBuildingFromPublicData.ts
  computeCommuteTimes.ts
  fetchNearbyAmenities.ts
  computeBuildingRisk.ts
```

### Data sources

For NYC, use:

* NYC Open Data.
* PLUTO building/tax-lot data.
* DOB complaints/violations.
* DOB active violations.
* 311/HPD data later.

NYC Open Data publishes free public data from city agencies, and PLUTO contains extensive tax-lot-level land-use and geographic data. NYC Department of Buildings data includes complaints and violations datasets, which can be used as building-risk signals. ([NYC Open Data][10])

### Building model

```ts
type Building = {
  id: string;
  normalizedAddress: string;
  city: string;
  state: string;
  zip?: string;
  lat?: number;
  lng?: number;

  yearBuilt?: number;
  unitsCount?: number;
  buildingClass?: string;

  publicData: {
    violations?: PublicViolationSummary;
    complaints?: PublicComplaintSummary;
    taxLot?: unknown;
  };

  riskSignals: {
    openViolationsCount?: number;
    recentComplaintsCount?: number;
    severeViolationCount?: number;
    dataConfidence: number;
  };

  createdAt: string;
  updatedAt: string;
};
```

### Building risk score

Start simple:

```txt
risk_score =
  20 * severe_violation_count_recent_normalized +
  10 * open_violation_count_normalized +
  10 * recent_complaint_count_normalized +
  10 * missing_data_penalty
```

Then bucket:

```txt
LOW
MEDIUM
HIGH
UNKNOWN
```

Do not present this as a legal/habitability conclusion. Present it as: “Public-data risk signals.”

---

## 5.5 Search session module

A search session is the active apartment hunt.

### What to code

```ts
type SearchSession = {
  id: string;
  userId: string;
  status:
    | "DRAFT"
    | "ACTIVE"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED";

  criteria: SearchCriteria;
  automationPolicy: AutomationPolicy;

  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
};
```

### Search criteria

```ts
type SearchCriteria = {
  city: string;
  neighborhoods: string[];
  budgetMax: number;
  budgetMin?: number;
  bedroomsMin: number;
  bathroomsMin?: number;
  moveInDate: string;
  pets?: Pet[];
  mustHaves: string[];
  niceToHaves: string[];
  dealBreakers: string[];
  commuteAnchors: CommuteAnchor[];
};
```

### Automation policy

```ts
type AutomationPolicy = {
  autoFindListings: boolean;
  autoScoreListings: boolean;
  autoDraftMessages: boolean;
  autoSendMessages: boolean;
  autoBookTours: boolean;
  autoPrepareApplications: boolean;
  maxOutreachPerDay: number;
  requireApprovalFor: {
    firstMessage: boolean;
    followUps: boolean;
    tourConfirmation: boolean;
    applicationPacket: boolean;
    messagesWithPersonalFinancialInfo: boolean;
  };
};
```

### Search lifecycle

```txt
DRAFT
  -> ACTIVE
  -> PAUSED
  -> COMPLETED
```

### Backend endpoints

```txt
POST   /v1/search-sessions
GET    /v1/search-sessions
GET    /v1/search-sessions/:id
PATCH  /v1/search-sessions/:id
POST   /v1/search-sessions/:id/start
POST   /v1/search-sessions/:id/pause
POST   /v1/search-sessions/:id/refresh
GET    /v1/search-sessions/:id/results
```

---

# 6. Listing scoring engine

Do not use an LLM as the primary scorer. Use deterministic scoring first, then use the LLM to generate explanation text.

## 6.1 Score dimensions

```txt
hard_filter_score      0/1
budget_score           0–100
location_score         0–100
commute_score          0–100
amenity_score          0–100
availability_score     0–100
application_fit_score  0–100
pricing_score          0–100
building_risk_score    0–100
fee_score              0–100
freshness_score        0–100
contactability_score   0–100
```

## 6.2 Weighted score

```ts
const defaultWeights = {
  hardFilter: 1000,
  budget: 0.18,
  location: 0.14,
  commute: 0.14,
  amenities: 0.1,
  availability: 0.1,
  applicationFit: 0.08,
  pricing: 0.1,
  buildingRisk: 0.06,
  fee: 0.06,
  freshness: 0.05,
  contactability: 0.05,
};
```

Hard deal-breakers remove listings before ranking.

Examples:

* User has dog; listing says no pets → reject.
* User budget max $4,000; listing $5,000 → reject unless user allows stretch.
* Move-in date July 1; listing available September 1 → reject unless flexible.
* User requires elevator; building is walk-up → reject.

## 6.3 Scoring output

```ts
type ListingScore = {
  listingId: string;
  searchSessionId: string;
  totalScore: number;
  rank: number;
  recommendation:
    | "CONTACT_NOW"
    | "SAVE"
    | "MAYBE"
    | "SKIP"
    | "NEEDS_USER_REVIEW";

  dimensions: Record<string, number>;

  reasons: {
    positives: string[];
    negatives: string[];
    uncertainties: string[];
  };

  computedAt: string;
};
```

## 6.4 LLM explanation

LLM should receive only structured listing + score facts and output a short explanation.

Example structured output:

```ts
type ListingExplanation = {
  summary: string;
  whyGoodFit: string[];
  concerns: string[];
  recommendedNextAction:
    | "message_landlord"
    | "ask_question"
    | "book_tour"
    | "skip";
  suggestedQuestion?: string;
};
```

---

# 7. Agent architecture

## 7.1 Do not build “one giant agent”

Build multiple narrow agents with typed tools.

### Agents

```txt
SearchCoordinatorAgent
ListingScoutAgent
ListingVerifierAgent
FitScorerAgent
OutreachAgent
ConversationAgent
SchedulingAgent
ApplicationAgent
PricingAdvisorAgent
ComplianceGuard
```

The “agent” is not magic. It is:

```txt
prompt + context builder + tool permissions + output schema + policy guard + audit log
```

## 7.2 Agent orchestration

Use Temporal workflows for orchestration.

The LLM should never directly perform irreversible actions. It can propose tool calls. The backend policy layer approves or blocks the action.

```txt
User request
  -> API
  -> Temporal workflow
  -> Agent context builder
  -> LLM structured response/tool call
  -> Policy guard
  -> Tool execution
  -> DB write
  -> User/admin notification
```

## 7.3 Agent run model

```ts
type AgentRun = {
  id: string;
  workflowId?: string;
  agentName: string;
  userId?: string;
  searchSessionId?: string;
  listingId?: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "BLOCKED" | "NEEDS_APPROVAL";
  input: unknown;
  output?: unknown;
  model: string;
  promptVersion: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
};
```

## 7.4 Tool call model

```ts
type ToolCall = {
  id: string;
  agentRunId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: "PENDING" | "APPROVED" | "EXECUTED" | "FAILED" | "BLOCKED";
  riskScore: number;
  approvalId?: string;
  idempotencyKey: string;
  createdAt: string;
  executedAt?: string;
};
```

## 7.5 Tool registry

Example tools:

```ts
const tools = {
  searchListings,
  getListingDetails,
  enrichBuilding,
  computeCommute,
  scoreListing,
  createMessageDraft,
  sendEmail,
  sendSms,
  parseInboundMessage,
  proposeTourSlots,
  createCalendarEvent,
  generateApplicationPacket,
  createSecureDocumentLink,
  flagComplianceIssue,
  escalateToHuman,
};
```

Every tool must define:

```ts
type ToolDefinition<I, O> = {
  name: string;
  description: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  execute: (input: I, ctx: ToolContext) => Promise<O>;
};
```

## 7.6 Risk levels

```txt
LOW
  - read listing
  - compute score
  - draft message
  - summarize inbound response

MEDIUM
  - send basic availability email
  - create calendar hold
  - follow up on unanswered message

HIGH
  - send SMS
  - confirm tour
  - disclose income/employment details
  - share document links

CRITICAL
  - submit application
  - send ID/bank/paystub docs
  - send money/payment instruction
  - sign lease
```

MVP blocks or requires explicit user approval for all high and critical actions.

---

# 8. Agent workflows

## 8.1 Search workflow

```txt
SearchWorkflow(searchSessionId)

1. Load renter profile.
2. Load search criteria.
3. Pull candidate listings from active sources.
4. Normalize listings.
5. Dedupe listings.
6. Enrich listings:
   - geocode
   - building data
   - commute
   - price comps
   - contact data
7. Score listings.
8. Generate explanations for top listings.
9. Create user result queue.
10. If autoDraftMessages enabled:
    - create outreach drafts for CONTACT_NOW listings.
11. Notify user.
12. Sleep until next refresh interval.
13. Repeat while ACTIVE.
```

## 8.2 Outreach workflow

```txt
OutreachWorkflow(searchSessionId, listingId)

1. Load listing.
2. Load contact.
3. Load renter profile.
4. Check automation policy.
5. Check compliance policy.
6. Generate message draft.
7. If approval required:
   - create ApprovalRequest.
   - wait for approval.
8. Send message through selected channel.
9. Store outbound message.
10. Set follow-up timer.
11. Wait for inbound response or timeout.
12. If no response:
   - create follow-up draft.
13. If response received:
   - call ConversationAgent.
```

## 8.3 Conversation workflow

```txt
ConversationWorkflow(conversationId)

1. Parse inbound message.
2. Classify intent.
3. Extract:
   - availability
   - tour slots
   - fees
   - application requirements
   - screening requirements
   - contact info
   - red flags
4. Update listing/contact state.
5. Decide next action:
   - reply with answer
   - ask user
   - propose tour
   - prepare application
   - skip listing
   - escalate
6. Draft response.
7. Apply policy guard.
8. Send or request approval.
```

## 8.4 Scheduling workflow

```txt
SchedulingWorkflow(listingId, conversationId)

1. Load user availability.
2. Load landlord-proposed slots, if any.
3. Convert time zones.
4. Check calendar conflicts.
5. Rank tour slots.
6. Ask user for approval unless auto-book policy allows.
7. Confirm selected slot with landlord.
8. Create calendar event.
9. Add reminders.
10. Update tour status.
```

## 8.5 Application workflow

```txt
ApplicationWorkflow(listingId)

1. Load listing requirements.
2. Load renter profile.
3. Check missing application fields.
4. Check document vault.
5. Generate application checklist.
6. Generate packet.
7. Create secure document links or PDF bundle.
8. Request user approval.
9. Send packet only after approval.
10. Track response.
```

---

# 9. Messaging system

## 9.1 Conversation data model

```txt
contacts
  id
  name
  company
  role
  email
  phone
  source
  confidence

conversations
  id
  user_id
  listing_id
  contact_id
  channel
  status
  last_message_at
  next_follow_up_at

messages
  id
  conversation_id
  direction
  channel
  from
  to
  subject
  body
  normalized_body
  provider_message_id
  intent
  extracted_json
  sent_at
  received_at

message_drafts
  id
  conversation_id
  listing_id
  body
  subject
  generated_by_agent_run_id
  status
  risk_score
  approval_id

outbound_message_events
  id
  message_id
  provider
  event_type
  payload
  occurred_at
```

## 9.2 Message templates

Store templates as versioned records.

Examples:

```txt
availability_inquiry_v1
tour_request_v1
follow_up_v1
application_interest_v1
pet_disclosure_v1
fee_clarification_v1
price_negotiation_v1
```

Template variables:

```ts
type TemplateVariables = {
  renterFirstName: string;
  listingAddress?: string;
  moveInDate: string;
  incomeSummary?: string;
  petSummary?: string;
  requestedTourWindows?: string[];
  question?: string;
};
```

## 9.3 First outreach example

```txt
Hi {{contactName}},

I’m interested in {{listingAddressOrTitle}}. Is it still available for a {{moveInDate}} move-in?

I’m available to tour:
{{tourWindows}}

Thanks,
{{renterFirstName}}
```

Do not include income, employer, paystubs, ID, or sensitive info in first outreach.

## 9.4 Inbound parser output

```ts
type InboundMessageParse = {
  intent:
    | "AVAILABLE"
    | "UNAVAILABLE"
    | "TOUR_SLOTS_PROPOSED"
    | "ASKING_FOR_USER_INFO"
    | "APPLICATION_REQUESTED"
    | "FEE_DISCLOSURE"
    | "PRICE_NEGOTIATION"
    | "SCAM_RISK"
    | "OTHER";

  extracted: {
    proposedTourSlots?: ProposedSlot[];
    fees?: Fee[];
    requestedDocuments?: string[];
    questionsForUser?: string[];
    phoneNumber?: string;
    email?: string;
    applicationUrl?: string;
  };

  confidence: number;
  recommendedAction:
    | "reply"
    | "ask_user"
    | "schedule_tour"
    | "prepare_application"
    | "skip"
    | "escalate";
};
```

## 9.5 Messaging compliance guard

The product must include hard-coded messaging rules:

* No deceptive sender identity.
* No fake “I personally saw this apartment.”
* No false urgency.
* No invented income/employment/credit facts.
* No claims that the system is a licensed broker unless the business has licensed coverage.
* No automatic sharing of sensitive docs.
* No unsolicited SMS blasts.
* No marketing content in landlord outreach.

For email, the FTC’s CAN-SPAM business guidance requires accurate header information and non-deceptive subject lines for covered commercial email. For phone/text automation, FCC consumer guidance says rules require prior consent for robocalls/texts in covered contexts, and this area has legal complexity, so the MVP should use SMS conservatively and log consent/channel basis. ([Federal Trade Commission][11])

---

# 10. Scheduling system

## 10.1 Tour model

```ts
type Tour = {
  id: string;
  userId: string;
  listingId: string;
  conversationId?: string;

  status:
    | "REQUESTED"
    | "PROPOSED"
    | "USER_APPROVED"
    | "CONFIRMED"
    | "RESCHEDULE_REQUESTED"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW";

  proposedSlots: ProposedSlot[];
  selectedSlot?: ProposedSlot;

  calendarEventId?: string;
  location?: string;
  instructions?: string;

  createdAt: string;
  updatedAt: string;
};
```

## 10.2 Availability model

```ts
type UserAvailabilityRule = {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  validFrom?: string;
  validUntil?: string;
};
```

## 10.3 Slot ranking

Rank by:

* No calendar conflict.
* User preferred windows.
* Landlord proposed times.
* Travel time from previous tour.
* Listing priority score.
* Same-neighborhood batching.
* Soonest possible tour for high-demand listings.

## 10.4 Calendar event payload

```ts
type CalendarEventInput = {
  summary: string;
  location: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: { email: string }[];
  reminders: {
    useDefault: boolean;
    overrides?: { method: "email" | "popup"; minutes: number }[];
  };
};
```

---

# 11. Application packet system

## 11.1 Document vault

### What to code

* Secure upload.
* Document type selection.
* AI-assisted classification.
* Manual correction.
* Expiration dates.
* Redaction option.
* Secure share links.
* Audit logs for every document access.

### Document types

```txt
ID
PAYSTUB
BANK_STATEMENT
EMPLOYMENT_LETTER
TAX_RETURN
W2
OFFER_LETTER
CREDIT_REPORT
BACKGROUND_CHECK
PET_RECORD
GUARANTOR_DOC
OTHER
```

## 11.2 Document model

```ts
type ApplicationDocument = {
  id: string;
  userId: string;
  type: ApplicationDocumentType;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;

  status:
    | "UPLOADED"
    | "CLASSIFIED"
    | "NEEDS_REVIEW"
    | "APPROVED"
    | "EXPIRED"
    | "DELETED";

  extractedFields?: Record<string, unknown>;
  containsSensitiveData: boolean;
  expiresAt?: string;

  createdAt: string;
  updatedAt: string;
};
```

## 11.3 Application packet model

```ts
type ApplicationPacket = {
  id: string;
  userId: string;
  listingId: string;

  status:
    | "DRAFT"
    | "MISSING_INFO"
    | "READY_FOR_REVIEW"
    | "APPROVED"
    | "SENT"
    | "WITHDRAWN";

  renterSummary: string;
  coverMessage: string;
  includedDocumentIds: string[];
  secureShareUrl?: string;
  expiresAt?: string;

  createdByAgentRunId?: string;
  approvedAt?: string;
  sentAt?: string;
};
```

## 11.4 Application checklist generator

The agent receives:

* Listing requirements.
* Landlord message.
* User docs.
* Jurisdiction rules.
* User privacy settings.

It outputs:

```ts
type ApplicationChecklist = {
  requiredItems: {
    label: string;
    status: "AVAILABLE" | "MISSING" | "NEEDS_USER_CONFIRMATION";
    documentType?: ApplicationDocumentType;
  }[];
  warnings: string[];
  readyToSubmit: boolean;
};
```

## 11.5 Sensitive document policy

Rules:

* Never attach sensitive docs directly by default.
* Prefer expiring secure links.
* Allow user to revoke links.
* Watermark documents with recipient/listing when generating PDF bundles.
* Block sending ID/paystubs/bank statements without explicit approval.
* Log every share.

---

# 12. Pricing advisor

## 12.1 Inputs

* Listing price.
* Historical versions for same listing.
* Similar listings by:

  * neighborhood
  * beds/baths
  * square footage
  * amenities
  * building type
  * move-in date
* Rent estimate API, if available.
* User budget.
* Fee disclosure.
* Days on market.
* Responsiveness.
* Seasonality later.

## 12.2 Output

```ts
type PricingAdvice = {
  listingId: string;
  verdict:
    | "GOOD_DEAL"
    | "FAIR_PRICE"
    | "SLIGHTLY_OVERPRICED"
    | "OVERPRICED"
    | "INSUFFICIENT_DATA";

  estimatedFairRent?: {
    low: number;
    midpoint: number;
    high: number;
  };

  moveInCostEstimate: {
    firstMonthRent: number;
    securityDeposit?: number;
    brokerFee?: number;
    applicationFee?: number;
    otherFees?: Fee[];
    totalKnownCost: number;
    unknowns: string[];
  };

  negotiationAdvice: {
    shouldNegotiate: boolean;
    suggestedAsk?: string;
    messageDraft?: string;
  };

  warnings: string[];
};
```

## 12.3 Pricing algorithm

Start deterministic:

```txt
1. Pull 20–100 comparable active listings.
2. Filter by neighborhood radius and similar bed/bath.
3. Remove extreme outliers.
4. Calculate median and percentile band.
5. Adjust for:
   - square footage
   - amenities
   - building risk
   - no-fee / fee
   - move-in timing
6. Generate pricing verdict.
7. LLM writes explanation from computed facts.
```

No LLM should estimate rent from vibes. The LLM explains the math.

---

# 13. Compliance and policy engine

This product touches regulated-adjacent workflows: housing, communication, personal financial documents, identity, and possibly brokerage laws. The MVP needs policy gates coded into the product.

## 13.1 Policy guard design

```ts
type PolicyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  requiresAdminReview: boolean;
  reasonCodes: string[];
  redactedInput?: unknown;
};
```

Every risky tool call goes through:

```txt
Tool request
  -> PolicyGuard.evaluate()
  -> allow / require approval / block
  -> audit log
```

## 13.2 Policy areas

### Messaging policy

* Blocks deceptive identity.
* Blocks financial claims not in user profile.
* Blocks sensitive doc sharing.
* Blocks SMS when no channel basis exists.
* Blocks aggressive repeated follow-ups.
* Blocks harassment or discriminatory language.

### Housing fairness policy

* No advice or messages based on protected classes.
* No discriminatory screening recommendations.
* No “avoid this neighborhood because of demographics.”
* No generating landlord-facing content that reveals protected-class information unless user explicitly asks and it is appropriate.

### Broker/legal-status policy

* Product copy and outbound messages should not claim “licensed broker” unless the company actually has that coverage.
* System should say it is acting as renter-authorized software.
* For NYC, product should flag broker-fee requests where a landlord/listing agent appears to be charging the tenant despite the FARE Act. ([NYC Government][5])

### Fee policy

For NYC:

```ts
if (city === "NYC" && fee.type === "BROKER_FEE" && brokerRepresentsLandlord) {
  flag("NYC_FARE_ACT_POTENTIAL_VIOLATION");
}
```

For New York application fees:

```ts
if (state === "NY" && applicationFee > 20) {
  flag("NY_APPLICATION_FEE_CAP_EXCEEDED");
}
```

New York Real Property Law §238-a says the cumulative fee for background/credit checks may not exceed the actual cost or $20, whichever is less. ([NYSenate.gov][12])

---

# 14. Frontend product surface

Do not overdesign UI. Build functional screens that expose the workflow.

## 14.1 Pages

```txt
/
  Landing / waitlist / login

/onboarding
  User profile
  Search criteria
  Availability
  Application readiness
  Automation settings

/dashboard
  Active search overview
  New matches
  Pending approvals
  Upcoming tours
  Conversations needing reply

/search/:searchSessionId
  Ranked listings
  Filters
  Agent activity
  Refresh button

/listings/:listingId
  Listing detail
  Fit explanation
  Pricing advice
  Building signals
  Conversation
  Tour action
  Application action

/inbox
  All listing conversations
  Needs reply
  Awaiting landlord
  Follow-ups due

/tours
  Calendar/list view
  Tour details
  Reschedule/cancel

/application
  Renter profile
  Document vault
  Application packet drafts
  Missing info checklist

/settings/automation
  Consent
  Auto-send limits
  Approval settings
  Calendar/email connections

/admin
  Ops dashboard
  Agent runs
  Tool calls
  Listings
  Conversations
  Compliance flags
```

## 14.2 Components

```txt
SearchCriteriaForm
RenterProfileForm
AvailabilityEditor
ListingResultsTable
ListingCard
ListingFitScore
ListingExplanation
PricingAdvicePanel
BuildingRiskPanel
ApprovalQueue
MessageDraftReview
ConversationThread
TourSlotPicker
CalendarConnectionStatus
ApplicationChecklist
DocumentVault
ApplicationPacketPreview
AgentActivityTimeline
AdminToolCallInspector
AdminWorkflowInspector
```

## 14.3 Dashboard layout

The dashboard should be built around actions:

```txt
Needs your approval
New high-fit units
Tours to confirm
Landlords waiting on you
Applications ready
Listings going stale
```

Not around generic “chat.”

---

# 15. Backend API surface

## 15.1 Auth/user

```txt
GET    /v1/me
PATCH  /v1/me
GET    /v1/me/consents
POST   /v1/me/consents
PATCH  /v1/me/consents/:id/revoke
```

## 15.2 Renter profile

```txt
GET    /v1/renter-profile
PATCH  /v1/renter-profile
POST   /v1/renter-profile/validate
```

## 15.3 Search

```txt
POST   /v1/search-sessions
GET    /v1/search-sessions
GET    /v1/search-sessions/:id
PATCH  /v1/search-sessions/:id
POST   /v1/search-sessions/:id/start
POST   /v1/search-sessions/:id/pause
POST   /v1/search-sessions/:id/refresh
GET    /v1/search-sessions/:id/results
```

## 15.4 Listings

```txt
GET    /v1/listings/:id
POST   /v1/listings/import-url
POST   /v1/listings/:id/save
POST   /v1/listings/:id/reject
GET    /v1/listings/:id/score
GET    /v1/listings/:id/pricing-advice
GET    /v1/listings/:id/building-risk
```

## 15.5 Outreach

```txt
POST   /v1/listings/:id/message-drafts
GET    /v1/message-drafts/:id
PATCH  /v1/message-drafts/:id
POST   /v1/message-drafts/:id/approve
POST   /v1/message-drafts/:id/send
GET    /v1/conversations
GET    /v1/conversations/:id
POST   /v1/conversations/:id/reply-draft
POST   /v1/conversations/:id/send
```

## 15.6 Webhooks

```txt
POST /v1/webhooks/twilio/inbound
POST /v1/webhooks/twilio/status
POST /v1/webhooks/sendgrid/events
POST /v1/webhooks/postmark/inbound
POST /v1/webhooks/google-calendar
```

## 15.7 Tours

```txt
GET    /v1/tours
POST   /v1/listings/:id/tour-request
POST   /v1/tours/:id/select-slot
POST   /v1/tours/:id/confirm
POST   /v1/tours/:id/reschedule
POST   /v1/tours/:id/cancel
```

## 15.8 Calendar

```txt
GET    /v1/calendar/status
POST   /v1/calendar/google/oauth/start
GET    /v1/calendar/google/oauth/callback
POST   /v1/calendar/disconnect
```

## 15.9 Documents/applications

```txt
POST   /v1/documents/upload-url
POST   /v1/documents/complete-upload
GET    /v1/documents
GET    /v1/documents/:id
PATCH  /v1/documents/:id
DELETE /v1/documents/:id

POST   /v1/listings/:id/application-packet
GET    /v1/application-packets/:id
POST   /v1/application-packets/:id/approve
POST   /v1/application-packets/:id/send
POST   /v1/application-packets/:id/revoke-links
```

## 15.10 Approvals

```txt
GET    /v1/approvals
GET    /v1/approvals/:id
POST   /v1/approvals/:id/approve
POST   /v1/approvals/:id/reject
POST   /v1/approvals/:id/edit-and-approve
```

## 15.11 Admin

```txt
GET    /v1/admin/agent-runs
GET    /v1/admin/agent-runs/:id
GET    /v1/admin/tool-calls
GET    /v1/admin/workflows
POST   /v1/admin/workflows/:id/retry
GET    /v1/admin/compliance-flags
POST   /v1/admin/compliance-flags/:id/resolve
GET    /v1/admin/listings/review
PATCH  /v1/admin/listings/:id
```

---

# 16. Database schema outline

This is the minimum relational model.

```txt
users
  id
  email
  phone
  role
  created_at
  updated_at

renter_profiles
  id
  user_id
  legal_name
  target_city
  move_in_date
  budget_min
  budget_max
  bedrooms_min
  bathrooms_min
  profile_json
  application_readiness
  created_at
  updated_at

search_sessions
  id
  user_id
  status
  criteria_json
  automation_policy_json
  started_at
  paused_at
  completed_at
  created_at
  updated_at

listings
  id
  source
  source_listing_id
  source_url
  canonical_hash
  status
  confidence
  title
  description
  address_raw
  address_normalized
  unit
  city
  state
  zip
  lat
  lng
  price
  bedrooms
  bathrooms
  square_feet
  available_date
  fees_json
  amenities_json
  pet_policy_json
  media_json
  raw_payload_json
  listed_at
  last_seen_at
  last_refreshed_at
  created_at
  updated_at

listing_versions
  id
  listing_id
  observed_at
  status
  price
  fees_json
  availability_date
  payload_hash
  diff_json

buildings
  id
  address_normalized
  city
  state
  zip
  lat
  lng
  public_data_json
  risk_signals_json
  created_at
  updated_at

listing_scores
  id
  listing_id
  search_session_id
  total_score
  rank
  recommendation
  dimensions_json
  reasons_json
  computed_at

saved_listings
  id
  user_id
  search_session_id
  listing_id
  status
  notes
  created_at
  updated_at

contacts
  id
  name
  company
  role
  email
  phone
  source
  confidence
  created_at
  updated_at

listing_contacts
  listing_id
  contact_id
  relationship
  confidence

conversations
  id
  user_id
  listing_id
  contact_id
  channel
  status
  last_message_at
  next_follow_up_at
  created_at
  updated_at

messages
  id
  conversation_id
  direction
  channel
  from_value
  to_value
  subject
  body
  normalized_body
  provider
  provider_message_id
  intent
  extracted_json
  sent_at
  received_at
  created_at

message_drafts
  id
  conversation_id
  listing_id
  body
  subject
  status
  risk_score
  agent_run_id
  approval_id
  created_at
  updated_at

tours
  id
  user_id
  listing_id
  conversation_id
  status
  proposed_slots_json
  selected_slot_json
  calendar_event_id
  location
  instructions
  created_at
  updated_at

application_documents
  id
  user_id
  type
  file_name
  mime_type
  storage_key
  size_bytes
  status
  extracted_fields_json
  contains_sensitive_data
  expires_at
  created_at
  updated_at

application_packets
  id
  user_id
  listing_id
  status
  renter_summary
  cover_message
  included_document_ids_json
  secure_share_url
  expires_at
  agent_run_id
  approved_at
  sent_at
  created_at
  updated_at

approvals
  id
  user_id
  type
  status
  title
  body
  payload_json
  risk_score
  expires_at
  approved_at
  rejected_at
  created_at
  updated_at

agent_runs
  id
  workflow_id
  agent_name
  user_id
  search_session_id
  listing_id
  status
  input_json
  output_json
  model
  prompt_version
  error
  started_at
  completed_at

tool_calls
  id
  agent_run_id
  tool_name
  input_json
  output_json
  status
  risk_score
  approval_id
  idempotency_key
  created_at
  executed_at

workflow_runs
  id
  temporal_workflow_id
  workflow_type
  entity_type
  entity_id
  status
  started_at
  completed_at
  last_error

compliance_flags
  id
  user_id
  listing_id
  conversation_id
  flag_type
  severity
  status
  details_json
  created_at
  resolved_at

audit_logs
  id
  actor_type
  actor_id
  action
  entity_type
  entity_id
  metadata_json
  created_at
```

---

# 17. LLM implementation details

## 17.1 Provider abstraction

```ts
interface LlmProvider {
  generateStructured<T>(input: {
    system: string;
    messages: LlmMessage[];
    schema: z.ZodSchema<T>;
    tools?: ToolDefinition<any, any>[];
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<T>;

  runToolAgent(input: {
    agentName: string;
    system: string;
    messages: LlmMessage[];
    tools: ToolDefinition<any, any>[];
    maxSteps: number;
  }): Promise<AgentResult>;
}
```

## 17.2 Prompt versioning

Prompts must be versioned in code:

```txt
packages/agents/src/prompts/
  outreach-agent.v1.ts
  conversation-agent.v1.ts
  application-agent.v1.ts
  pricing-advisor.v1.ts
```

Each prompt includes:

* Role.
* Allowed actions.
* Disallowed actions.
* Required output schema.
* Risk rules.
* Examples.
* “Never invent user facts.”
* “If missing information, ask user.”

## 17.3 Context builder

Never dump the full database into the prompt.

Build narrow context:

```ts
type OutreachAgentContext = {
  renter: {
    firstName: string;
    moveInDate: string;
    pets?: string;
    publicContactEmail: string;
  };
  listing: {
    title: string;
    address?: string;
    price: number;
    bedrooms: number;
    availableDate?: string;
  };
  contact: {
    name?: string;
    email?: string;
    role?: string;
  };
  policy: {
    mayDiscloseIncome: boolean;
    maySendSms: boolean;
    requireApproval: boolean;
  };
};
```

## 17.4 Output schema example

```ts
const OutreachDraftSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
  riskScore: z.number().min(0).max(100),
  includedSensitiveInfo: z.boolean(),
  missingInfoQuestions: z.array(z.string()),
  recommendedChannel: z.enum(["email", "sms", "whatsapp"]),
});
```

## 17.5 Agent run loop

```ts
async function runAgentWithTools(params: RunAgentParams) {
  const agentRun = await db.agentRun.create(...);

  for (let step = 0; step < params.maxSteps; step++) {
    const modelResult = await llm.callWithTools({
      system: params.system,
      messages: params.messages,
      tools: params.tools,
    });

    await saveModelStep(agentRun.id, modelResult);

    if (modelResult.final) {
      return completeAgentRun(agentRun.id, modelResult.final);
    }

    for (const call of modelResult.toolCalls) {
      const tool = toolRegistry.get(call.name);
      const parsedInput = tool.inputSchema.parse(call.input);

      const policy = await policyGuard.evaluate({
        tool,
        input: parsedInput,
        userId: params.userId,
      });

      const toolCall = await db.toolCall.create({
        data: {
          agentRunId: agentRun.id,
          toolName: call.name,
          inputJson: parsedInput,
          status: policy.allowed ? "PENDING" : "BLOCKED",
          riskScore: policy.riskScore,
          idempotencyKey: makeIdempotencyKey(call),
        },
      });

      if (!policy.allowed) continue;

      if (policy.requiresApproval) {
        await createApproval(toolCall, policy);
        continue;
      }

      const output = await tool.execute(parsedInput, params.context);
      tool.outputSchema.parse(output);

      await db.toolCall.update({
        where: { id: toolCall.id },
        data: { outputJson: output, status: "EXECUTED" },
      });

      params.messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  throw new Error("Agent exceeded max steps");
}
```

---

# 18. Approval system

The approval system is central. It protects the user and makes the product trustworthy.

## 18.1 Approval types

```txt
SEND_FIRST_MESSAGE
SEND_FOLLOW_UP
SEND_SMS
CONFIRM_TOUR
SHARE_APPLICATION_PACKET
DISCLOSE_FINANCIAL_INFO
FLAGGED_COMPLIANCE_RESPONSE
```

## 18.2 Approval UI

Each approval card shows:

* Action type.
* Listing.
* Recipient.
* Exact message/body.
* Sensitive info included.
* Agent reasoning.
* Risk flags.
* Buttons:

  * approve
  * edit & approve
  * reject
  * ask agent to revise

## 18.3 Approval model

```ts
type Approval = {
  id: string;
  userId: string;
  type: ApprovalType;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  title: string;
  body: string;
  payload: unknown;
  riskScore: number;
  expiresAt?: string;
};
```

## 18.4 Auto-approval rules

For MVP, default to conservative:

```txt
Auto-draft: yes
Auto-send first email: no
Auto-send follow-up email: optional after user enables
Auto-send SMS: no
Auto-confirm tour: optional only after explicit policy
Auto-send application: never
```

---

# 19. Admin console

Build this early.

## 19.1 Admin pages

```txt
/admin
/admin/users
/admin/search-sessions
/admin/listings
/admin/listings/review
/admin/conversations
/admin/approvals
/admin/agent-runs
/admin/tool-calls
/admin/workflows
/admin/compliance-flags
/admin/integrations
```

## 19.2 Admin capabilities

### Listing review

* Merge duplicates.
* Mark listing stale.
* Fix address/unit.
* Attach contact.
* Override source data.
* Review suspicious listings.

### Conversation review

* Inspect parsed intent.
* Correct intent.
* Send manual reply as ops, with audit.
* Pause automation.

### Agent observability

* View prompt version.
* View input context.
* View model output.
* View tool calls.
* View policy decisions.
* Replay non-side-effect steps.

### Workflow control

* Retry failed workflow.
* Cancel workflow.
* Resume paused workflow.
* Force listing refresh.

---

# 20. Integrations

## 20.1 Listing data integration

### RentCast adapter

```ts
interface ListingSourceAdapter {
  source: ListingSource;

  searchRentals(input: ListingSearchInput): Promise<RawListing[]>;

  getListing(input: {
    sourceListingId: string;
  }): Promise<RawListing | null>;

  mapToCanonical(raw: RawListing): CanonicalListing;
}
```

Required code:

```txt
packages/integrations/rentcast/client.ts
packages/integrations/rentcast/types.ts
packages/integrations/rentcast/mappers.ts
packages/integrations/rentcast/errors.ts
```

### Landlord feed adapter

```ts
type LandlordFeedRow = {
  address: string;
  unit?: string;
  price: number;
  bedrooms: number;
  bathrooms?: number;
  availableDate?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  amenities?: string;
  photos?: string;
};
```

Code:

```txt
POST /v1/admin/landlord-feeds/upload
POST /v1/admin/landlord-feeds/:id/import
GET  /v1/admin/landlord-feeds/:id/errors
```

## 20.2 Messaging integration

### Email

Provider abstraction:

```ts
interface EmailProvider {
  send(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    metadata?: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
}
```

### SMS

```ts
interface SmsProvider {
  send(input: {
    from: string;
    to: string;
    body: string;
    metadata?: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
}
```

## 20.3 Calendar integration

```ts
interface CalendarProvider {
  listCalendars(userId: string): Promise<Calendar[]>;
  getBusyTimes(input: BusyTimeInput): Promise<BusyTime[]>;
  createEvent(input: CalendarEventInput): Promise<{ eventId: string }>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}
```

## 20.4 Maps integration

```ts
interface MapsProvider {
  geocode(address: string): Promise<GeocodeResult>;
  computeRouteMatrix(input: RouteMatrixInput): Promise<RouteMatrixResult>;
}
```

---

# 21. Security and privacy

## 21.1 Sensitive data

Sensitive data includes:

* ID documents.
* Pay stubs.
* Bank statements.
* Tax returns.
* Credit reports.
* Background checks.
* Phone numbers.
* Addresses.
* Income/employment info.

## 21.2 Required controls

* Encrypt sensitive fields at rest.
* Private S3 bucket only.
* Presigned upload/download links.
* Short link expirations.
* Document access audit logs.
* Role-based access control.
* Admin access logging.
* No sensitive docs in LLM prompts unless absolutely necessary.
* Redact docs before model processing where possible.
* Use OCR/document extraction selectively.
* Data deletion flow.
* User document revocation flow.
* Environment-specific secrets.
* Webhook signature verification.
* Rate limits.
* Idempotency keys for all outbound actions.

## 21.3 LLM data handling rule

Never send full uploaded documents to the LLM by default.

Instead:

```txt
document upload
  -> classify
  -> extract minimal structured fields
  -> user confirms
  -> only confirmed fields enter agent context
```

## 21.4 Audit events

Log:

```txt
USER_GRANTED_CONSENT
USER_REVOKED_CONSENT
LISTING_IMPORTED
MESSAGE_DRAFT_CREATED
MESSAGE_SENT
INBOUND_MESSAGE_RECEIVED
TOUR_CONFIRMED
DOCUMENT_UPLOADED
DOCUMENT_SHARED
APPLICATION_PACKET_SENT
AGENT_TOOL_CALL_BLOCKED
ADMIN_VIEWED_DOCUMENT
ADMIN_MODIFIED_LISTING
```

---

# 22. Testing plan

## 22.1 Unit tests

Test:

* Listing normalizers.
* Dedupe logic.
* Scoring logic.
* Policy guard.
* Message template rendering.
* Inbound parser schemas.
* Fee detection.
* Application checklist generation.

## 22.2 Integration tests

Test:

* RentCast adapter with fixtures.
* Email provider sandbox.
* Twilio webhook parsing.
* Calendar OAuth and event creation mock.
* S3 presigned upload/download.
* Temporal workflow happy paths.

## 22.3 E2E tests

Use Playwright.

Playwright supports TypeScript and auto-waits for actionable elements, which makes it appropriate for frontend E2E tests around onboarding, approvals, listing review, and scheduling. ([Playwright][13])

E2E flows:

```txt
1. User signs up.
2. User completes renter profile.
3. User starts search.
4. System imports fixture listings.
5. User sees ranked listings.
6. User approves first message.
7. Mock landlord replies with tour slots.
8. User confirms tour.
9. Calendar event is created.
10. User uploads docs.
11. Application packet is generated.
12. User approves packet.
```

## 22.4 Agent evaluation tests

Create eval fixtures:

```txt
available_reply.txt
unavailable_reply.txt
tour_slots_reply.txt
broker_fee_reply.txt
scam_reply.txt
application_request_reply.txt
ambiguous_reply.txt
```

For each, assert:

* Correct intent classification.
* Correct extracted fields.
* Correct recommended action.
* No sensitive leakage.
* Correct approval behavior.

## 22.5 Load tests

Initial targets:

```txt
10,000 listings imported/day
1,000 active users
100,000 stored messages
5,000 outbound messages/day
1,000 workflows concurrently waiting
```

---

# 23. MVP build milestones

## Phase 0 — Repo, infra, and foundations

### Build

* Monorepo.
* Web app shell.
* API service.
* Worker service.
* PostgreSQL + Prisma.
* Redis.
* Temporal.
* S3 bucket.
* Auth.
* RBAC.
* Audit logging.
* CI/CD.
* Basic admin console.

### Done when

* User can sign up.
* API is deployed.
* Worker is deployed.
* Admin can view users.
* Audit logs write correctly.
* CI runs tests and migrations.

---

## Phase 1 — Renter onboarding and search profile

### Build

* Renter profile form.
* Search criteria form.
* Availability editor.
* Automation settings.
* Profile validation.
* Search session create/start/pause.
* Basic dashboard.

### Done when

* User can create a complete search session.
* Search session is persisted.
* User can pause/resume.
* Admin can inspect search session.

---

## Phase 2 — Listing ingestion and normalization

### Build

* RentCast adapter or equivalent first licensed source.
* Landlord CSV importer.
* User-submitted listing URL flow.
* Canonical listing model.
* Dedupe logic.
* Listing versioning.
* Listing refresh workflow.
* Admin listing review screen.

### Done when

* System imports listings into canonical schema.
* Duplicate detection works on fixture data.
* Price/status changes create listing versions.
* Admin can fix/merge listings.

---

## Phase 3 — Enrichment and scoring

### Build

* Geocoding.
* Commute calculations.
* Building model.
* NYC public-data enrichment.
* Fit scoring engine.
* Pricing baseline.
* Listing explanation agent.
* Ranked search results page.

### Done when

* User sees ranked listings with explanations.
* Listings have commute estimates.
* Listings have pricing/budget notes.
* Listings have building-risk signal where available.
* Hard deal-breakers remove bad listings.

---

## Phase 4 — Outreach engine

### Build

* Contact model.
* Conversation model.
* Message drafts.
* Email provider.
* SMS provider behind policy guard.
* Approval flow.
* Message templates.
* Outbound send.
* Inbound webhooks.
* Conversation inbox.
* Conversation agent.

### Done when

* User can approve and send first outreach.
* Inbound replies attach to correct conversation.
* Agent classifies inbound replies.
* User can approve follow-up.
* Admin can inspect all messages/tool calls.

---

## Phase 5 — Scheduling

### Build

* Tour model.
* Slot parser.
* User slot selector.
* Calendar OAuth.
* Calendar busy-time check.
* Calendar event creation.
* Tour reminders.
* Reschedule/cancel flows.

### Done when

* Landlord reply with proposed slots becomes selectable tour options.
* User confirms a slot.
* Landlord receives confirmation.
* Calendar event is created.
* Tour status updates correctly.

---

## Phase 6 — Application packets

### Build

* Document upload.
* Document vault.
* Document classification.
* Application profile.
* Application checklist.
* Packet generator.
* Secure share links.
* Approval before send.
* Document access audit logs.

### Done when

* User uploads docs.
* System creates application checklist.
* Packet is generated.
* User approves before sending.
* Secure links expire/revoke correctly.

---

## Phase 7 — Pricing and fee intelligence

### Build

* Comparable listing retrieval.
* Fair-rent estimate calculation.
* Move-in cost calculator.
* NYC FARE fee flag.
* NY application-fee cap flag.
* Negotiation draft generator.
* Pricing advice panel.

### Done when

* User sees total known move-in cost.
* User sees price verdict.
* System flags suspicious/possibly unlawful fees.
* User can generate negotiation message.

---

## Phase 8 — Hardening and launch readiness

### Build

* Full test suite.
* Agent eval suite.
* Rate limits.
* Provider retry/idempotency.
* Monitoring dashboards.
* Error alerts.
* Admin replay tools.
* Data deletion flow.
* Security review.
* Cost tracking.
* Launch seed data.

### Done when

* A first customer can run a full search from onboarding to tour booking and application packet.
* Ops can manually recover failures.
* No sensitive action happens without logged approval.
* All external integrations have sandbox + production configuration.
* Product can be demoed live to investors without fake workflow gaps.

---

# 24. Critical implementation details by feature

## 24.1 Finding units

Code paths:

```txt
SearchSessionStarted event
  -> ListingIngestionWorkflow
  -> Source adapters
  -> Normalize
  -> Dedupe
  -> Enrich
  -> Score
  -> Results queue
```

Minimum source adapter interface:

```ts
interface RentalListingSource {
  search(input: {
    city: string;
    state: string;
    minPrice?: number;
    maxPrice?: number;
    bedroomsMin?: number;
    bathroomsMin?: number;
    neighborhoods?: string[];
    limit?: number;
  }): Promise<RawRentalListing[]>;

  getDetails(sourceListingId: string): Promise<RawRentalListing | null>;
}
```

## 24.2 Messaging landlords instantly

Code paths:

```txt
User clicks "Draft outreach"
  -> OutreachAgent generates draft
  -> PolicyGuard scores draft
  -> Approval created
  -> User approves
  -> Email/SMS provider sends
  -> Message persisted
  -> Follow-up timer scheduled
```

Must include idempotency:

```ts
const idempotencyKey = hash([
  userId,
  listingId,
  contactId,
  templateVersion,
  normalizedBody,
].join(":"));
```

## 24.3 Booking tours

Code paths:

```txt
Inbound webhook
  -> Message persisted
  -> ConversationAgent parses slots
  -> SchedulingWorkflow creates proposed Tour
  -> User approves slot
  -> Confirmation message sent
  -> Calendar event created
```

## 24.4 Preparing applications

Code paths:

```txt
User uploads docs
  -> S3 upload complete
  -> Document classification job
  -> User confirms doc type
  -> ApplicationAgent builds checklist
  -> Packet generated
  -> User approval
  -> Secure share link sent
```

## 24.5 Advising on pricing

Code paths:

```txt
Listing detail opened
  -> PricingAdvisorService loads comps
  -> Computes fair rent band
  -> Computes move-in cost
  -> Applies city/state fee rules
  -> LLM writes explanation
```

---

# 25. Data freshness and quality rules

## 25.1 Listing confidence

```ts
confidence =
  sourceReliabilityWeight
  + freshnessWeight
  + contactCompletenessWeight
  + addressConfidenceWeight
  + mediaConfidenceWeight
  - suspiciousPatternPenalty
```

## 25.2 Suspicious listing signals

Flag:

* Price far below market.
* No address.
* No verifiable contact.
* Requests money before tour/application.
* Contact domain mismatch.
* Same phone/email across unrelated suspicious listings.
* Listing text asks user to communicate off-platform in strange ways.
* Inbound message asks for deposit via wire/crypto/gift card.
* Listing has not been refreshed.

## 25.3 Contact confidence

```txt
HIGH
  Source provides named agent/landlord email and phone.

MEDIUM
  Source provides contact form or masked email.

LOW
  Contact inferred from listing text.

UNKNOWN
  No direct contact.
```

---

# 26. Failure handling

## 26.1 Provider failures

For every integration:

* Retry with exponential backoff.
* Store raw error.
* Do not duplicate sends.
* Surface status in admin.
* Notify user only if action is user-visible.

## 26.2 Agent failures

If model output fails schema:

```txt
1. Retry once with repair prompt.
2. If still invalid, mark agent run failed.
3. Create admin review task.
4. Do not execute any action.
```

## 26.3 Webhook failures

Inbound webhooks must be idempotent.

```ts
provider_event_id unique
```

If parsing fails:

```txt
Store raw webhook
Mark message as UNPARSED
Create admin review task
```

## 26.4 Calendar failures

If calendar event creation fails after landlord confirmation:

```txt
1. Mark tour CONFIRMED_CALENDAR_FAILED.
2. Notify user.
3. Let user retry calendar creation.
4. Do not resend landlord confirmation.
```

---

# 27. Production observability

## 27.1 Dashboards

Track:

```txt
Active users
Active search sessions
Listings imported/day
Listings deduped/day
Listing refresh failures
Average listing freshness
Messages sent/day
Inbound response rate
Approval latency
Tours requested
Tours confirmed
Application packets generated
Application packets sent
Agent failure rate
Tool call block rate
Provider API errors
Cost per active search
```

## 27.2 Agent metrics

```txt
Agent runs by type
Schema failure rate
Average steps per run
Tool calls per run
Approval-required rate
Blocked action rate
Human escalation rate
```

## 27.3 Alerts

Alert on:

```txt
Message provider down
Calendar provider down
Listing ingestion failure > threshold
Agent schema failure spike
Webhook failure spike
Unexpected outbound send volume
Document access anomaly
Admin access anomaly
```

---

# 28. Acceptance test: complete MVP journey

This is the investor/customer-ready demo path.

## Step 1 — User onboard

User enters:

```txt
City: NYC
Budget: $3,800
Bedrooms: 1+
Move-in: July 1
Neighborhoods: Williamsburg, Greenpoint, LIC
Pet: one cat
Commute anchor: office in Flatiron
Availability: Tue/Thu evenings, Sat morning
Automation: draft automatically, require approval to send
```

Expected:

* Search session becomes active.
* Agent starts listing discovery.

## Step 2 — System finds units

Expected:

* 30–100 candidate listings appear.
* Duplicates removed.
* Top 10 are ranked.
* Each has explanation.
* Each has pricing and commute notes.

## Step 3 — User approves outreach

Expected:

* Agent drafts outreach to top 5 listings.
* User approves 3.
* System sends messages.
* Conversations created.
* Follow-up timers scheduled.

## Step 4 — Landlord replies

Mock inbound:

```txt
Yes it’s available. We can show Thursday at 6pm or Saturday at 10am. Any pets?
```

Expected:

* ConversationAgent classifies as `TOUR_SLOTS_PROPOSED`.
* Extracts Thursday 6pm and Saturday 10am.
* Detects pet question.
* Drafts response mentioning one cat.
* Creates tour slot approval.

## Step 5 — User confirms tour

Expected:

* User chooses Saturday 10am.
* System confirms with landlord.
* Calendar event created.
* Tour appears in `/tours`.

## Step 6 — Application packet

Landlord asks:

```txt
Please send application, proof of income, ID, and pet info.
```

Expected:

* Agent creates checklist.
* User uploads docs.
* Packet generated.
* User approves.
* Secure link sent.
* Audit log records doc share.

## Step 7 — Pricing advice

Expected:

* Product shows fair-rent band.
* Move-in cost estimate.
* Fee warnings.
* Negotiation draft if price is high.

This flow proves the product.

---

# 29. Engineering team task breakdown

## Backend engineer 1 — platform/API

Owns:

* Fastify API.
* Auth integration.
* RBAC.
* Prisma models.
* REST endpoints.
* Audit logs.
* Admin APIs.

## Backend engineer 2 — workflows/agents

Owns:

* Temporal setup.
* Workflow definitions.
* Agent runner.
* Tool registry.
* Policy guard.
* Agent evals.

## Data/integrations engineer

Owns:

* Listing source adapters.
* Normalization.
* Dedupe.
* Enrichment.
* Geocoding.
* Public data.
* Pricing comps.

## Frontend engineer

Owns:

* Onboarding.
* Dashboard.
* Listings UI.
* Inbox.
* Tour UI.
* Application/document UI.
* Approval UI.

## Full-stack/ops engineer

Owns:

* Admin console.
* Provider webhooks.
* Observability.
* CI/CD.
* Deployment.
* Rate limits.

---

# 30. The first 20 tickets to create

1. Create monorepo with web/api/worker packages.
2. Add Prisma PostgreSQL schema baseline.
3. Add auth/session/RBAC.
4. Add audit log service.
5. Add renter profile CRUD.
6. Add search session CRUD.
7. Add Temporal worker and first test workflow.
8. Add listing canonical schema.
9. Add RentCast/source adapter interface.
10. Add landlord CSV importer.
11. Add listing normalization and dedupe.
12. Add listing refresh workflow.
13. Add listing scoring engine.
14. Add geocoding/commute service.
15. Add ranked listing results page.
16. Add agent runner with structured outputs.
17. Add outreach draft agent.
18. Add approval system.
19. Add email send provider.
20. Add inbound message webhook and conversation parser.

Next 20:

21. Add conversation inbox.
22. Add follow-up timers.
23. Add scheduling workflow.
24. Add Google Calendar OAuth.
25. Add calendar event creation.
26. Add tour UI.
27. Add document upload with S3 presigned URLs.
28. Add document vault.
29. Add document classifier.
30. Add application checklist.
31. Add application packet generator.
32. Add secure document sharing.
33. Add pricing advisor.
34. Add fee policy engine.
35. Add NYC public-data building enrichment.
36. Add compliance flag admin page.
37. Add agent/tool-call admin inspector.
38. Add E2E test suite.
39. Add observability dashboards.
40. Add launch seed/demo workflow.

---

# 31. MVP launch readiness checklist

The MVP is ready when all of this is true:

```txt
[ ] User can onboard.
[ ] User can create active search.
[ ] Listings import from at least one real source.
[ ] Listings can also be manually/admin imported.
[ ] Listings dedupe and refresh.
[ ] Listings are ranked and explained.
[ ] User can approve outreach.
[ ] Messages send through real provider.
[ ] Inbound replies are parsed.
[ ] Tour slots are extracted.
[ ] Calendar events are created.
[ ] User can upload documents.
[ ] Application packet can be generated.
[ ] Application packet requires approval before send.
[ ] Pricing advice exists.
[ ] Fee warnings exist for launch city.
[ ] Admin can inspect failures.
[ ] Agent actions are audited.
[ ] Sensitive actions require approval.
[ ] Basic security review is complete.
[ ] E2E demo path passes.
```

---

# 32. Final MVP shape

The final MVP should feel like this:

> “I tell the AI Rental Agent what I want. It finds the best units, explains which ones are worth my time, messages the right people, gets tour times, books my calendar, keeps the inbox organized, prepares my application, and warns me when pricing or fees look wrong.”

The core engineering bet is:

```txt
Listings + workflow orchestration + controlled communication + application packet automation
```

Not:

```txt
A pretty chat interface
```

Build the system as a durable workflow product with AI at the reasoning layer and strict deterministic controls at the action layer. That is what makes it credible for real users, first customers, and investors.

[1]: https://www.rentcast.io/api?utm_source=chatgpt.com "Real Estate & Property Data API"
[2]: https://www.twilio.com/docs/sendgrid/api-reference?utm_source=chatgpt.com "SendGrid v3 API reference"
[3]: https://developers.google.com/workspace/calendar/api/guides/create-events?utm_source=chatgpt.com "Create events | Google Calendar"
[4]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html?utm_source=chatgpt.com "Sharing objects with presigned URLs - AWS Documentation"
[5]: https://www.nyc.gov/site/dca/about/FAQ-Broker-Fees.page?utm_source=chatgpt.com "Fairness in Apartment Rental Expenses (FARE) Act - DCWP"
[6]: https://docs.temporal.io/develop/typescript?utm_source=chatgpt.com "TypeScript SDK developer guide"
[7]: https://www.prisma.io/docs/v6/postgres/database/postgres-extensions?utm_source=chatgpt.com "Postgres extensions | Prisma Documentation"
[8]: https://developers.openai.com/api/docs/guides/structured-outputs?utm_source=chatgpt.com "Structured model outputs | OpenAI API"
[9]: https://developers.google.com/maps/documentation/routes?utm_source=chatgpt.com "Google Maps Platform Documentation | Routes API"
[10]: https://opendata.cityofnewyork.us/?utm_source=chatgpt.com "NYC Open Data -"
[11]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business?utm_source=chatgpt.com "CAN-SPAM Act: A Compliance Guide for Business"
[12]: https://www.nysenate.gov/legislation/laws/RPP/238-A?utm_source=chatgpt.com "Legislation - Consolidated Laws of New York"
[13]: https://playwright.dev/docs/actionability?utm_source=chatgpt.com "Auto-waiting"
