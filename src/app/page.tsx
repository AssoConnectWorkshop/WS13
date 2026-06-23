import Image from "next/image";
import { getOrganization } from "@/lib/assoconnect";
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

export default async function Home() {
  const [db, api] = await Promise.all([testDatabase(), testApi()]);
  const wsName = (await import("@/config/site")).siteConfig.name;

  return (
    <main className="flex min-h-screen bg-gray-50">
      <div className="absolute top-4 left-4 text-sm font-bold bg-black text-white px-3 py-1 rounded-full z-10">
        {wsName}
      </div>

      <ChatInterface />

      <ResultsPanel dbStatus={db} apiStatus={api} wsName={wsName} />
    </main>
  );
}
