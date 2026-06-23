import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contas</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Criado em</th>
              <th className="text-left p-3">A\u00e7\u00f5es</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.name || "-"}</td>
                <td className="p-3">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">
                  <Link href={"/admin/accounts/" + a.id} className="text-primary hover:underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
