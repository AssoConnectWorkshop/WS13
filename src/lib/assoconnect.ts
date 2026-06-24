import "server-only";

const BASE_URL = "https://app.assoconnect.com/api/v1";

export type Organization = {
  "@id": string;
  "@type": string;
  brand: string;
  isAdvanced: boolean;
  isLegalIndependent: boolean;
  logoUrl: string;
  name: string;
  parent: string | null;
  phoneNumber: string;
  url: string;
};

export type Contact = {
  "@id": string;
  "@type": string;
  type: "person" | "structure";
  firstname?: string;
  lastname: string;
  email?: string;
  landlinePhone?: string;
  mobilePhone?: string;
};

export type HydraCollection<T> = {
  "@type": string;
  "hydra:member": T[];
  "hydra:totalItems": number;
  "hydra:view"?: {
    "hydra:next"?: string;
    "hydra:last"?: string;
  };
};

export async function assoConnect<T>(path: string): Promise<T> {
  const token = process.env.ASSOCONNECT_API_KEY;
  if (!token) throw new Error("ASSOCONNECT_API_KEY is not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/ld+json",
      "X-AUTH-TOKEN": token,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`AssoConnect ${path} failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchCollection<T>(
  path: string,
  { maxItems = 100 }: { maxItems?: number } = {}
): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;

  while (next && items.length < maxItems) {
    const page: HydraCollection<T> = await assoConnect<HydraCollection<T>>(next);
    items.push(...page["hydra:member"]);
    const view = page["hydra:view"]?.["hydra:next"];
    next = view ? view.replace("/api/v1", "") : null;
  }

  return items.slice(0, maxItems);
}

export async function assoConnectWrite<T>(
  path: string,
  body: unknown,
  method: "POST" | "PUT" | "PATCH" = "POST"
): Promise<T> {
  const token = process.env.ASSOCONNECT_API_KEY;
  if (!token) throw new Error("ASSOCONNECT_API_KEY is not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/ld+json",
      "Content-Type": "application/json",
      "X-AUTH-TOKEN": token,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `AssoConnect ${method} ${path} failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }

  return res.json() as Promise<T>;
}

function orgIri(ulid = process.env.ASSOCONNECT_ORGANIZATION_ULID): string {
  if (!ulid) throw new Error("ASSOCONNECT_ORGANIZATION_ULID is not set");
  return `/api/v1/organizations/${ulid}`;
}

export type CreateContactInput = {
  type: "person" | "structure";
  firstname?: string;
  lastname?: string;
  name?: string;
  email?: string;
  landlinePhone?: string;
  mobilePhone?: string;
  dateOfBirth?: string;
  customFields?: Record<string, unknown>;
  relations?: Array<{ type: string; organization: string; createdAt?: string }>;
};

export function createContact(input: CreateContactInput): Promise<Contact> {
  const relations =
    input.relations && input.relations.length > 0
      ? input.relations
      : [{ type: "AFFILIATION", organization: orgIri() }];

  return assoConnectWrite<Contact>("/crm/contacts", { ...input, relations });
}

export type CreateAddressInput = {
  person: string;
  street1: string;
  city: string;
  country: string;
  street2?: string;
  postal?: string;
  administrativeArea1?: string;
  administrativeArea2?: string;
  latitude?: string;
  longitude?: string;
};

export function createAddress(input: CreateAddressInput) {
  return assoConnectWrite<{ "@id": string }>("/crm/addresses", input);
}

export type LinkPersonToStructureInput = {
  person: string;
  structure: string;
};

export function linkPersonToStructure(input: LinkPersonToStructureInput) {
  return assoConnectWrite<{ "@id": string }>(
    "/crm/structure_belonging_people",
    input
  );
}

export function getOrganization(ulid = process.env.ASSOCONNECT_ORGANIZATION_ULID) {
  if (!ulid) throw new Error("ASSOCONNECT_ORGANIZATION_ULID is not set");
  return assoConnect<Organization>(`/organizations/${ulid}`);
}

export async function getContacts(
  organizationUlid = process.env.ASSOCONNECT_ORGANIZATION_ULID
): Promise<Contact[]> {
  if (!organizationUlid) throw new Error("ASSOCONNECT_ORGANIZATION_ULID is not set");
  return fetchCollection<Contact>(
    `/organizations/${organizationUlid}/contacts?itemsPerPage=100`
  );
}
