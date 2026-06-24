---
name: assoconnect-api
description: Integrate or query the AssoConnect API in this project. Use whenever the task involves AssoConnect data — contacts, members, donors, organizations, email campaigns, accounting, payments, invoices, collects/events/memberships, bank accounts — or adding a new endpoint to src/lib/assoconnect.ts. The API exposes ~404 endpoints across 7 modules, NOT just CRM.
---

# AssoConnect API

Server-only REST API. JSON-LD / Hydra format. Client lives in `src/lib/assoconnect.ts`.

## Fundamentals

| | |
|---|---|
| Base URL | `https://app.assoconnect.com/api/v1` |
| Auth | `X-AUTH-TOKEN: <key>` header (from `ASSOCONNECT_API_KEY`, server-only) |
| Accept | `application/ld+json` |
| Org ULID | `ASSOCONNECT_ORGANIZATION_ULID` (server-only) |
| Rate limit | 30 req/s — beyond this requests are rejected briefly |
| Pagination | 25/page default, 100 max. Params `page`, `itemsPerPage`. Navigate via `hydra:view` |
| Errors | `4xx` param errors, `5xx` server. Body is a `hydra:Error` with `hydra:description` |

Secrets are **server-only** — never `NEXT_PUBLIC_`, never import this module into a client component. Call it from Server Components, route handlers, or server actions.

## Modules (full endpoint reference in `docs/api/*.md`)

Do NOT assume CRM-only. The key fact: this API covers the whole AssoConnect platform.

| Module | File | ~Endpoints | Key resources |
|---|---|---|---|
| CRM | `docs/api/crm.md` | 59 | Contact, Person, Structure, Address, Organization, Network, CustomField, Webhook, StatsCrm |
| Emailing | `docs/api/emailing.md` | 22 | EmailCampaign, EmailCampaignMessage, EmailingApp, AdminNotification |
| Accounting | `docs/api/accounting.md` | 91 | Account, Entry, GeneralLedger, AccountingYear, Budget, Forecast, TaxReceipt-adjacent |
| Payment | `docs/api/payment.md` | 49 | Payment, Order, Invoice, ElectronicInvoice, Installment, TaxReceipt, PaymentRequest |
| Business Account | `docs/api/business-account.md` | 89 | BankAccount, BankEntry, ProAccount*, Psp*, CheckRemittance |
| Website | `docs/api/website.md` | 44 | Collect, EventCollect, MembershipCollect, DonationCollect, ProductCollect, PricingPlan, MembershipFunnel |
| Others | `docs/api/others.md` | 50 | Nonprofit, Platform, Subscription, Device, Apps, OAuthClient, Psp |

**Before integrating, grep the relevant `docs/api/*.md` for the exact path, method, path params, query filters, and request body.** The docs are the source of truth for shapes; don't invent fields.

## Client helpers (`src/lib/assoconnect.ts`)

- `assoConnect<T>(path)` — single typed GET against the base URL with auth. Use for a single resource.
- `fetchCollection<T>(path, { maxItems })` — follows `hydra:view.hydra:next` and flattens `hydra:member` across pages (default cap 100). Use for list endpoints.
- `assoConnectWrite<T>(path, body, method?)` — POST/PUT/PATCH with `Content-Type: application/json`. Surfaces the API error body in the thrown message. Use for creates/updates.

All are server-only (`import "server-only"` at top of file).

### Write wrappers already implemented
- `createContact(input)` — `POST /crm/contacts`. Auto-affiliates to the org (`relations` defaults to `AFFILIATION` with `ASSOCONNECT_ORGANIZATION_ULID`).
- `createAddress(input)` — `POST /crm/addresses`. Needs a `person` IRI + street1/city/country.
- `linkPersonToStructure(input)` — `POST /crm/structure_belonging_people`. Needs `person` and `structure` IRIs.

⚠️ Writes hit **production** AssoConnect data and are irreversible from here. The chatbot must confirm details with the user before emitting a `ready_to_create` action. Whether a write succeeds depends on the API key's scope (a CRM key may 403 on accounting/banking writes).

## Adding a new endpoint — the pattern

1. Find the endpoint in the matching `docs/api/*.md` (path, params, body, response resource).
2. Add a `type` for the resource (only the fields you consume) near the existing `Contact` / `Organization` types.
3. Add a thin wrapper using `assoConnect` (single) or `fetchCollection` (list).

```ts
// Single resource
export type EmailCampaign = {
  "@id": string;
  subject: string;
  status: string;
  nbTotalEmailsSent: number;
  scheduledAt: string | null;
};

export function getEmailCampaign(id: string) {
  return assoConnect<EmailCampaign>(`/communication/email_campaigns/${id}`);
}

// Collection (paginated, org-scoped)
export function getEmailCampaigns(
  organizationUlid = process.env.ASSOCONNECT_ORGANIZATION_ULID
) {
  if (!organizationUlid) throw new Error("ASSOCONNECT_ORGANIZATION_ULID is not set");
  return fetchCollection<EmailCampaign>(
    `/organizations/${organizationUlid}/communication/email_campaigns?itemsPerPage=100`
  );
}
```

## Conventions

- Many list endpoints are **org-scoped**: `/organizations/{organizationId}/...`. Default the arg to `process.env.ASSOCONNECT_ORGANIZATION_ULID` and throw if missing, like `getContacts`.
- Resource IRIs come back as `@id` (e.g. `/api/v1/crm/contacts/{id}`). To follow one, strip the `/api/v1` prefix before passing to `assoConnect` (base URL already includes it).
- Respect the 30 req/s limit — don't fan out unbounded `Promise.all` over hundreds of IRIs; batch or cap.
- Keep types minimal (only consumed fields) and let the response stay untyped-extra — the API returns more than you need.

## Chatbot integration

The chat route (`src/app/api/chat/route.ts`) lets Claude pick which data to fetch. When extending it to a new module, update the route's system prompt to describe the newly available resource and add a matching fetch branch — mirror the existing `fetch_contacts` action.
