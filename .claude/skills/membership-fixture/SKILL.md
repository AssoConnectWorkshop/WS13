---
name: membership-fixture
description: Données fictives de collectes d'adhésion pour le développement et les tests. Use whenever you need to work with membership collects, pricing plans, members, or donations in this project — the fixture is the mock data source for all membership-related features since the AssoConnect API does not expose collect endpoints.
---

# Membership Fixture

Fichier de données fictives pour les collectes d'adhésion. Chemin : `data/membership-collects-fixture.json`

## Structure

```
collects[]
  ├── @id, @type, name, description, status
  ├── startDate, endDate, organization
  ├── pricingPlans[]
  │     ├── @id, name, description, price, currency
  │     ├── type: "membership" | "donation"
  │     ├── frequency: "annual" | "once"
  │     └── optional: true  (uniquement sur les plans de type donation)
  └── members[]
        ├── @id, name, email, status
        ├── membership          (toujours présent)
        │     ├── plan: { @id, name, price, type }
        │     └── selectedAt
        └── donation            (optionnel — seulement si l'adhérent a donné)
              ├── plan: { @id, name, type }
              ├── amount
              └── selectedAt
```

## Collectes disponibles

| ID | Nom | Plans adhésion | Plan don |
|---|---|---|---|
| `01ARZ3NDEKTSV4RRFFQ` | Adhésion 2024 - Association Générale | PLAN001 (50€), PLAN002 (25€ étudiant) | PLAN003 |
| `01ARZ3NDEKTSV4RRFFQ1` | Collecte Jeunesse 2024 | PLAN004 (30€ classique), PLAN005 (60€ premium) | PLAN006 |
| `01ARZ3NDEKTSV4RRFFQ2` | Programme Partenaires Privilégiés | PLAN007 (150€ bronze), PLAN008 (300€ argent), PLAN009 (600€ or) | PLAN010 |

Chaque collecte a ~30 membres. Environ 50 % sont donateurs.

## Lire les données (TypeScript serveur)

```ts
import fixtureData from '@/data/membership-collects-fixture.json';

// Types minimaux
type PricingPlan = {
  '@id': string;
  name: string;
  price: number | null;
  type: 'membership' | 'donation';
  frequency?: string;
  optional?: boolean;
};

type MemberSelection = {
  plan: { '@id': string; name: string; price: number; type: string };
  selectedAt: string;
};

type DonationSelection = {
  plan: { '@id': string; name: string; type: string };
  amount: number;
  selectedAt: string;
};

type Member = {
  '@id': string;
  name: string;
  email: string;
  status: string;
  membership: MemberSelection;
  donation?: DonationSelection;
};

type Collect = {
  '@id': string;
  '@type': string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  pricingPlans: PricingPlan[];
  members: Member[];
};

const collects: Collect[] = fixtureData.collects as Collect[];
```

## Patterns courants

```ts
// Tous les membres d'une collecte
const collect = collects.find(c => c['@id'].includes('01ARZ3NDEKTSV4RRFFQ'));
const members = collect?.members ?? [];

// Membres donateurs uniquement
const donors = members.filter(m => m.donation != null);

// Total des dons d'une collecte
const totalDonations = members
  .filter(m => m.donation)
  .reduce((sum, m) => sum + (m.donation!.amount ?? 0), 0);

// Regrouper par plan d'adhésion
const byPlan = members.reduce((acc, m) => {
  const planId = m.membership.plan['@id'];
  acc[planId] = (acc[planId] ?? []).concat(m);
  return acc;
}, {} as Record<string, Member[]>);

// Plans d'adhésion uniquement (hors dons)
const membershipPlans = collect?.pricingPlans.filter(p => p.type === 'membership') ?? [];
```

## Ajouter la fixture à l'API de chat

Si tu étends le chatbot pour exposer ces données, ajoute un outil `fetch_collects` dans `src/app/api/chat/route.ts` en miroir de `fetch_contacts` — importe le fichier JSON côté serveur et filtre/agrège selon les paramètres de l'outil. Met à jour le `SYSTEM_PROMPT` pour décrire les collectes disponibles.
