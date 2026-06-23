import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getContacts } from '@/lib/assoconnect';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedAction {
  status: 'ready_to_fetch' | 'needs_clarification';
  message: string;
  action?: string;
  visualizationType?: 'table' | 'bar' | 'pie' | 'summary';
  filters?: {
    type?: string | null;
    limit?: number;
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

## How to Respond

1. **First interaction**: Ask clarifying questions to understand what data the user wants to see. Always ask at least one clarifying question to confirm you understand their request. For example:
   - "Do you want to see all contacts or specific ones?"
   - "Should I filter by contact type (person or structure)?"
   - "Which fields would you like to see (name, email, phone)?"

2. **After understanding**: When you have enough information, respond with a JSON object in this format:
   \`\`\`json
   {
     "status": "ready_to_fetch",
     "message": "I'll fetch the contacts with the following criteria: [describe what you'll fetch]",
     "action": "fetch_contacts",
     "visualizationType": "table|bar|pie|summary",
     "filters": {
       "type": "person|structure|null",
       "limit": 100
     }
   }
   \`\`\`

3. **When you don't have enough info**: Respond with:
   \`\`\`json
   {
     "status": "needs_clarification",
     "message": "I need more information: [your clarifying questions]"
   }
   \`\`\`

## Important Rules
- Always ask at least one clarifying question before attempting to fetch data
- Be conversational and helpful
- If the user's request is unclear, ask for clarification
- Suggest relevant filters and fields based on their use case
- Always choose the visualization type that best represents the data`;

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

    // Call Claude Haiku to interpret the request
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Check if Claude wants to fetch data
    let shouldFetchData = false;
    let parseError = false;
    let parsedAction: ParsedAction | null = null;

    try {
      const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsedAction = JSON.parse(jsonMatch[1]);
        if (parsedAction && parsedAction.status === 'ready_to_fetch') {
          shouldFetchData = true;
        }
      }
    } catch {
      parseError = true;
    }

    // If Claude wants to fetch and has action="fetch_contacts", do it
    if (shouldFetchData && parsedAction && parsedAction.action === 'fetch_contacts') {
      try {
        const contacts = await getContacts();

        // Filter if needed
        let filtered = contacts;
        if (parsedAction.filters?.type) {
          filtered = contacts.filter((c) => c.type === parsedAction.filters?.type);
        }

        // Limit results
        const limit = parsedAction.filters?.limit || 100;
        filtered = filtered.slice(0, limit);

        return NextResponse.json({
          role: 'assistant',
          content: assistantMessage,
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

    // Return Claude's response (asking for clarification or ready to fetch)
    return NextResponse.json({
      role: 'assistant',
      content: assistantMessage,
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
