import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [users, accounts, channels, conversations] = await Promise.all([
    supabase.from("profiles").select("count").single(),
    supabase.from("accounts").select("count").single(),
    supabase.from("channels").select("count").single(),
    supabase.from("conversations").select("count").single(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Painel de Administra\u00e7\u00e3o</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Usu\u00e1rios" value={users.count ?? 0} />
        <StatCard title="Contas" value={accounts.count ?? 0} />
        <StatCard title="Canais" value={channels.count ?? 0} />
        <StatCard title="Conversas" value={conversations.count ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
