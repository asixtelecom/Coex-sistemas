import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, account_role, system_role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Usu\u00e1rios</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Conta</th>
              <th className="text-left p-3">Sistema</th>
              <th className="text-left p-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.full_name || "-"}</td>
                <td className="p-3">{p.email}</td>
                <td className="p-3">{p.account_role || "-"}</td>
                <td className="p-3">{p.system_role === "super_admin" ? "Super Admin" : "-"}</td>
                <td className="p-3">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
