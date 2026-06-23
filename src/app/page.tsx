import Image from "next/image";
import { getOrganization, getContacts } from "@/lib/assoconnect";
import { createClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/ChatInterface";
import { ResultsPanel } from "@/components/ResultsPanel";

export const dynamic = "force-dynamic";

async function testDatabase(): Promise<{ ok: boolean; tables: string[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_tables");
    if (error) throw error;
    return { ok: true, tables: data?.map((r: { table_name: string }) => r.table_name) ?? [] };
  } catch {
    return { ok: false, tables: [] };
  }
}

async function testApi(): Promise<{ ok: boolean; platformName: string | null }> {
  try {
    const org = await getOrganization();
    return { ok: true, platformName: org.name };
  } catch {
    return { ok: false, platformName: null };
  }
}

async function getFirstContact(): Promise<{ ok: boolean; contact: { firstname?: string; lastname: string } | null }> {
  try {
    const contacts = await getContacts();
    if (contacts.length === 0) {
      return { ok: false, contact: null };
    }
    const contact = contacts[0];
    return { ok: true, contact: { firstname: contact.firstname, lastname: contact.lastname } };
  } catch {
    return { ok: false, contact: null };
  }
}

export default async function Home() {
  const [db, api, contactResult] = await Promise.all([
    testDatabase(),
    testApi(),
    getFirstContact(),
  ]);
  const wsName = (await import("@/config/site")).siteConfig.name;

  return (
    <main className="flex min-h-screen bg-gray-50">
      <div className="absolute top-4 left-4 text-sm font-bold bg-black text-white px-3 py-1 rounded-full z-10">
        {wsName}
      </div>

      <ChatInterface />

      <ResultsPanel
        dbStatus={db}
        apiStatus={api}
        wsName={wsName}
        contactData={contactResult}
      />
    </main>
  );
}
