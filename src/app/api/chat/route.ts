import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getContacts,
  createContact,
  createAddress,
  linkPersonToStructure,
} from '@/lib/assoconnect';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedAction {
  status: 'ready_to_fetch' | 'ready_to_create' | 'needs_clarification';
  message: string;
  action?: string;
  visualizationType?: 'table' | 'bar' | 'pie' | 'summary';
  filters?: {
    type?: string | null;
    limit?: number;
  };
  payload?: {
    type?: 'person' | 'structure';
    firstname?: string;
    lastname?: string;
    name?: string;
    email?: string;
    landlinePhone?: string;
    mobilePhone?: string;
    dateOfBirth?: string;
    person?: string;
    structure?: string;
    street1?: string;
    street2?: string;
    postal?: string;
    city?: string;
    administrativeArea1?: string;
    administrativeArea2?: string;
    country?: string;
  };
}

const SYSTEM_PROMPT = `You are a helpful assistant that helps users query the AssoConnect API to extract contact and organization data.

## Available Data in AssoConnect API

### Contacts
The system has a contacts database with the following fields for each contact:
- firstname (optional)
- lastname (required)
- email (optional)
- landlinePhone (optional)
- mobilePhone (optional)
- type: "person" or "structure"

You can retrieve up to 100 contacts at a time.

## Visualization Types

Choose the most appropriate visualization type based on the data:
- **table**: For detailed contact lists with multiple fields. Use when users want to see comprehensive information.
- **bar**: For comparisons (e.g., count of persons vs structures, distribution across types).
- **pie**: For proportional data (e.g., percentage of persons vs structures).
- **summary**: For a quick overview with key statistics and metrics.

## What You Can Do

You can both **read** existing data and **create** new data:

1. **Fetch contacts** — list/visualize existing contacts.
2. **Create a contact** — a person (firstname + lastname) or a structure (name). Optional: email, landlinePhone, mobilePhone, dateOfBirth (YYYY-MM-DD for persons). New contacts are automatically affiliated to the current organization.
3. **Create an address** — a postal address attached to a person. Requires the person's identifier (IRI such as \`/api/v1/crm/people/{id}\`), plus street1, city and country. The 2-letter country code is required (e.g. "FR").
4. **Link a person to a structure** — attach a person to a structure. Requires the person's IRI and the structure's IRI (e.g. \`/api/v1/crm/contacts/{id}\`).

For addresses and links you need the contact identifier (the \`@id\` shown when listing contacts). If the user hasn't provided it, ask them to identify the contact first (e.g. by listing contacts).

## How to Respond

**One action per turn (STRICT).** A response contains AT MOST ONE \`\`\`json action block. Never put two or more action blocks in the same reply, and never batch several requests together. Do exactly ONE thing per turn — the single thing the user asked for. If the user asks for several distinct things, handle the first one now and offer to do the next one afterwards.

**Do only what is asked.** Never invent or add extra fetches the user did not request (for example, do NOT also fetch "the latest contacts" on the side when the user only asked for a distribution chart).

**Prose alone does nothing — emit the JSON action.** Announcing in plain text ("I'll fetch the contacts…") does NOT trigger anything. Whenever you decide to fetch or create, the reply MUST contain the corresponding \`\`\`json action block in that same message. Never promise to do something "next" and then send a message with no action block.

1. **Act directly on clear requests.** When a fetch/visualization request is clear (e.g. "the 3 latest contacts", "a pie chart of contacts by type"), respond immediately with the fetch action block — do NOT ask a clarifying question first. Only ask a clarifying question when the request is genuinely ambiguous. For creation (which is permanent), always restate every field and ask the user to confirm before emitting the create action.

   When the user asks for several things at once, emit the action block for the FIRST one now (so it runs this turn) and add one short line saying you'll handle the next one right after.

2. **To fetch data**, respond with:
   \`\`\`json
   {
     "status": "ready_to_fetch",
     "message": "I'll fetch the contacts with the following criteria: [describe]",
     "action": "fetch_contacts",
     "visualizationType": "table|bar|pie|summary",
     "filters": { "type": "person|structure|null", "limit": 100 }
   }
   \`\`\`

3. **To create a contact** (only after the user confirms the details):
   \`\`\`json
   {
     "status": "ready_to_create",
     "message": "Creating the contact: [restate details]",
     "action": "create_contact",
     "payload": {
       "type": "person",
       "firstname": "Jean",
       "lastname": "Valjean",
       "email": "j.valjean@example.com",
       "mobilePhone": "+33612345678"
     }
   }
   \`\`\`
   For a structure use \`"type": "structure"\` with \`"name"\` instead of firstname/lastname.

4. **To create an address** (after confirmation):
   \`\`\`json
   {
     "status": "ready_to_create",
     "message": "Creating the address for [person]: [restate]",
     "action": "create_address",
     "payload": {
       "person": "/api/v1/crm/people/{id}",
       "street1": "1 rue de la Paix",
       "postal": "75002",
       "city": "Paris",
       "country": "FR"
     }
   }
   \`\`\`

5. **To link a person to a structure** (after confirmation):
   \`\`\`json
   {
     "status": "ready_to_create",
     "message": "Linking [person] to [structure]",
     "action": "link_person_structure",
     "payload": {
       "person": "/api/v1/crm/people/{id}",
       "structure": "/api/v1/crm/contacts/{id}"
     }
   }
   \`\`\`

6. **When you don't have enough info**, respond with:
   \`\`\`json
   {
     "status": "needs_clarification",
     "message": "I need more information: [your clarifying questions]"
   }
   \`\`\`

## Allowed Operations (STRICT)

You may ONLY:
- **Read / fetch** existing contacts.
- **Create** new data (contacts, addresses, person-structure links) via the actions above.

You are NOT allowed to do anything else. If the user asks to **update, modify, edit, replace, delete, remove, merge, archive** data — or any operation other than reading and creating — you must politely refuse and explain that you only have permission to view and create data, not to modify or delete it. Do NOT emit any JSON action in that case; just reply conversationally with the refusal.

## Important Rules
- One action per turn: at most one JSON action block per reply — never two or more, and never several requests at once. But when you intend to act, the action block MUST be present (prose alone does nothing).
- Do only what the user explicitly asked. Do not add side requests of your own.
- Fetch directly when the request is clear; only ask a clarifying question when it is genuinely ambiguous. Always confirm the exact details before creating.
- Never invent required identifiers (person/structure IRIs). If you don't have them, ask.
- Be conversational and helpful.
- For fetches, always choose the visualization type that best represents the data.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          role: 'assistant',
          content:
            'Error: ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
          status: 'error',
        },
        { status: 500 }
      );
    }

    // Call Claude Sonnet to interpret the request
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    // With adaptive thinking, the response may lead with thinking blocks —
    // read the text block rather than assuming index 0.
    const textBlock = response.content.find((block) => block.type === 'text');
    const assistantMessage = textBlock?.type === 'text' ? textBlock.text : '';

    // Parse Claude's intent (fetch, create, or clarification). The model should
    // emit at most one action block, but stay resilient: scan every fenced
    // ```json block and act on the first valid one only — never more than a
    // single action per turn.
    let parseError = false;
    let parsedAction: ParsedAction | null = null;

    const jsonBlocks = [...assistantMessage.matchAll(/```json\s*([\s\S]*?)```/g)];
    for (const block of jsonBlocks) {
      try {
        parsedAction = JSON.parse(block[1].trim()) as ParsedAction;
        break;
      } catch {
        parseError = true;
      }
    }
    if (parsedAction) parseError = false;

    // Never echo the raw JSON action back to the user — show only the prose.
    const cleanContent =
      assistantMessage.replace(/```json[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const displayContent = cleanContent || parsedAction?.message || assistantMessage;

    // If Claude wants to fetch contacts, do it
    if (parsedAction?.status === 'ready_to_fetch' && parsedAction.action === 'fetch_contacts') {
      try {
        const contacts = await getContacts();

        let filtered = contacts;
        if (parsedAction.filters?.type) {
          filtered = contacts.filter((c) => c.type === parsedAction.filters?.type);
        }

        const limit = parsedAction.filters?.limit || 100;
        filtered = filtered.slice(0, limit);

        return NextResponse.json({
          role: 'assistant',
          content: displayContent,
          data: filtered,
          visualizationType: parsedAction.visualizationType || 'table',
          status: 'data_ready',
        });
      } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json({
          role: 'assistant',
          content: `I encountered an error while fetching contacts: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          status: 'error',
        });
      }
    }

    // If Claude wants to create data, do it
    if (parsedAction?.status === 'ready_to_create' && parsedAction.payload) {
      const p = parsedAction.payload;
      try {
        let created: { '@id'?: string };
        let label: string;

        if (parsedAction.action === 'create_contact') {
          if (!p.type) throw new Error('Contact type (person or structure) is required.');
          created = await createContact({
            type: p.type,
            firstname: p.firstname,
            lastname: p.lastname,
            name: p.name,
            email: p.email,
            landlinePhone: p.landlinePhone,
            mobilePhone: p.mobilePhone,
            dateOfBirth: p.dateOfBirth,
          });
          label = `Contact ${p.firstname ?? ''} ${p.lastname ?? p.name ?? ''}`.trim();
        } else if (parsedAction.action === 'create_address') {
          if (!p.person || !p.street1 || !p.city || !p.country) {
            throw new Error('Address requires person, street1, city and country.');
          }
          created = await createAddress({
            person: p.person,
            street1: p.street1,
            street2: p.street2,
            postal: p.postal,
            city: p.city,
            country: p.country,
            administrativeArea1: p.administrativeArea1,
            administrativeArea2: p.administrativeArea2,
          });
          label = `Address ${p.street1}, ${p.city}`;
        } else if (parsedAction.action === 'link_person_structure') {
          if (!p.person || !p.structure) {
            throw new Error('Linking requires both person and structure identifiers.');
          }
          created = await linkPersonToStructure({ person: p.person, structure: p.structure });
          label = 'Person–structure link';
        } else {
          throw new Error(`Unknown create action: ${parsedAction.action}`);
        }

        return NextResponse.json({
          role: 'assistant',
          content: `✅ ${label} created successfully.${created['@id'] ? ` (id: ${created['@id']})` : ''}`,
          status: 'created',
        });
      } catch (error) {
        console.error('Error creating resource:', error);
        return NextResponse.json({
          role: 'assistant',
          content: `❌ I couldn't create that: ${error instanceof Error ? error.message : 'Unknown error'}.`,
          status: 'error',
        });
      }
    }

    // Otherwise return Claude's conversational reply (clarification / confirmation request)
    return NextResponse.json({
      role: 'assistant',
      content: displayContent,
      status: parseError ? 'clarification_needed' : 'processing',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
        status: 'error',
      },
      { status: 500 }
    );
  }
}
