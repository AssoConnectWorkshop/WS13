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

const SYSTEM_PROMPT = `You are a helpful assistant that helps users query and manage AssoConnect contact and organization data.

## Data
Contacts have these fields: firstname (optional), lastname, email, landlinePhone, mobilePhone, and type ("person" or "structure"). Up to 100 contacts can be fetched at a time.

## How you act
To actually DO something you MUST call the matching tool — describing it in plain text does nothing and nothing will happen.

- **fetch_contacts** — list, count, or visualize contacts. Choose the visualizationType that best fits the request: \`table\` (detailed lists), \`bar\` (comparisons, e.g. persons vs structures), \`pie\` (proportions / distribution by type), \`summary\` (key statistics). Optionally filter by type, and set a limit.
- **create_contact** / **create_address** / **link_person_structure** — create new data.

## Behaviour rules
- **One action per turn.** Call at most ONE tool per reply. If the user asks for several things at once, call the tool for the FIRST one now and add a short sentence saying you'll handle the next one right after.
- **Act directly on clear read/visualization requests.** "Give me the 3 latest contacts" or "a pie chart of contacts by type" are clear — call fetch_contacts immediately, do not ask a clarifying question first. Only ask a clarifying question when the request is genuinely ambiguous.
- **Do only what the user asked.** Never invent or add extra fetches the user did not request (for example, do not also fetch "the latest contacts" on the side when the user only asked for a distribution chart).
- **Creation is permanent.** Before calling any create_* tool, restate the exact details in plain text and wait for the user's explicit confirmation. Only call the create tool once they confirm.
- **You may ONLY read and create.** If the user asks to update, modify, edit, replace, delete, remove, merge, or archive data, politely refuse and explain you can only view and create data — do not call any tool.
- Be concise and conversational. Never invent identifiers (person/structure IRIs); if you don't have one, ask.`;

const tools: Anthropic.Tool[] = [
  {
    name: 'fetch_contacts',
    description:
      'Fetch the organization contacts and display them as a visualization. Use whenever the user wants to see, list, count, or visualize contacts.',
    input_schema: {
      type: 'object',
      properties: {
        visualizationType: {
          type: 'string',
          enum: ['table', 'bar', 'pie', 'summary'],
          description:
            'How to display the contacts: table (detailed list), bar (comparison), pie (proportions/distribution), summary (key stats).',
        },
        type: {
          type: 'string',
          enum: ['person', 'structure'],
          description: 'Optional filter to only persons or only structures. Omit to include all contacts.',
        },
        limit: {
          type: 'integer',
          description: 'Optional maximum number of contacts to display (1-100). Omit for all (up to 100).',
        },
      },
      required: ['visualizationType'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact (a person or a structure). Only call after the user confirms the details.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['person', 'structure'] },
        firstname: { type: 'string', description: 'Person first name.' },
        lastname: { type: 'string', description: 'Person last name.' },
        name: { type: 'string', description: 'Structure name (use instead of firstname/lastname for a structure).' },
        email: { type: 'string' },
        landlinePhone: { type: 'string' },
        mobilePhone: { type: 'string' },
        dateOfBirth: { type: 'string', description: 'YYYY-MM-DD, persons only.' },
      },
      required: ['type'],
    },
  },
  {
    name: 'create_address',
    description: 'Create a postal address attached to a person. Only call after the user confirms the details.',
    input_schema: {
      type: 'object',
      properties: {
        person: { type: 'string', description: 'Person IRI, e.g. /api/v1/crm/people/{id}.' },
        street1: { type: 'string' },
        street2: { type: 'string' },
        postal: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string', description: '2-letter country code, e.g. FR.' },
        administrativeArea1: { type: 'string' },
        administrativeArea2: { type: 'string' },
      },
      required: ['person', 'street1', 'city', 'country'],
    },
  },
  {
    name: 'link_person_structure',
    description: 'Link a person to a structure. Only call after the user confirms the details.',
    input_schema: {
      type: 'object',
      properties: {
        person: { type: 'string', description: 'Person IRI, e.g. /api/v1/crm/people/{id}.' },
        structure: { type: 'string', description: 'Structure IRI, e.g. /api/v1/crm/contacts/{id}.' },
      },
      required: ['person', 'structure'],
    },
  },
];

type FetchContactsInput = {
  visualizationType?: 'table' | 'bar' | 'pie' | 'summary';
  type?: 'person' | 'structure';
  limit?: number;
};

type CreateContactToolInput = {
  type?: 'person' | 'structure';
  firstname?: string;
  lastname?: string;
  name?: string;
  email?: string;
  landlinePhone?: string;
  mobilePhone?: string;
  dateOfBirth?: string;
};

type CreateAddressToolInput = {
  person?: string;
  street1?: string;
  street2?: string;
  postal?: string;
  city?: string;
  country?: string;
  administrativeArea1?: string;
  administrativeArea2?: string;
};

type LinkToolInput = { person?: string; structure?: string };

export async function POST(request: NextRequest) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          role: 'assistant',
          content: 'Error: ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
          status: 'error',
        },
        { status: 500 }
      );
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const assistantText = textBlock?.type === 'text' ? textBlock.text.trim() : '';

    // The model acts by calling exactly one tool. We never run more than one
    // action per turn, so only the first tool_use block is honored.
    const toolUse = response.content.find((block) => block.type === 'tool_use');

    if (toolUse && toolUse.type === 'tool_use') {
      if (toolUse.name === 'fetch_contacts') {
        try {
          const input = toolUse.input as FetchContactsInput;
          const contacts = await getContacts();

          let filtered = contacts;
          if (input.type === 'person' || input.type === 'structure') {
            filtered = contacts.filter((c) => c.type === input.type);
          }
          const limit = input.limit && input.limit > 0 ? input.limit : 100;
          filtered = filtered.slice(0, limit);

          return NextResponse.json({
            role: 'assistant',
            content: assistantText || 'Voici les contacts demandés.',
            data: filtered,
            visualizationType: input.visualizationType || 'table',
            status: 'data_ready',
          });
        } catch (error) {
          console.error('Error fetching contacts:', error);
          return NextResponse.json({
            role: 'assistant',
            content: `I encountered an error while fetching contacts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }. Please try again.`,
            status: 'error',
          });
        }
      }

      try {
        let created: { '@id'?: string };
        let label: string;

        if (toolUse.name === 'create_contact') {
          const p = toolUse.input as CreateContactToolInput;
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
        } else if (toolUse.name === 'create_address') {
          const p = toolUse.input as CreateAddressToolInput;
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
        } else if (toolUse.name === 'link_person_structure') {
          const p = toolUse.input as LinkToolInput;
          if (!p.person || !p.structure) {
            throw new Error('Linking requires both person and structure identifiers.');
          }
          created = await linkPersonToStructure({ person: p.person, structure: p.structure });
          label = 'Person–structure link';
        } else {
          throw new Error(`Unknown action: ${toolUse.name}`);
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

    // No tool call — Claude is asking a clarifying question or confirming details.
    return NextResponse.json({
      role: 'assistant',
      content: assistantText || 'Could you give me a bit more detail?',
      status: 'processing',
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
