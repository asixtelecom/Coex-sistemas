import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: "Admin CRM",
  robots: { index: false, follow: false },
};

async function checkSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("user_id", user.id)
    .single();
  return profile?.system_role === "super_admin";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = await checkSuperAdmin();
  if (!isSuperAdmin) {
    redirect("/dashboard");
  }
  return <AdminShell>{children}</AdminShell>;
}
