"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, UsersRound } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message || "Erro ao autenticar");
        setLoading(false);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_role")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();
        const redirectTo = profile?.account_role === "vistoria" ? "/vistoria" : "/dashboard";
        router.push(inviteToken ? `/join/${encodeURIComponent(inviteToken)}` : redirectTo);
      }
    } catch (e) {
      console.error("[LOGIN] Exception", e);
      setError("Erro de rede: " + String(e));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-4 py-8">
        <Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "#EF7D07" }}>
              {inviteToken ? (
                <UsersRound className="h-7 w-7 text-white" />
              ) : (
                <MessageSquare className="h-7 w-7 text-white" />
              )}
            </div>
            <CardTitle className="text-xl text-foreground">
              {inviteToken ? "Faça login para aceitar" : "Bem-vindo de volta"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {inviteToken
                ? "Faça login e iremos te levar ao convite."
                : "Entre na sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-muted-foreground">
                    Senha
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm hover:text-orange-600"
                    style={{ color: "#EF7D07" }}
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full text-white hover:brightness-110"
                style={{ backgroundColor: "#EF7D07" }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>

      {/* Right side - Image placeholder */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-orange-800 relative">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, #EF7D07 0%, transparent 50%), radial-gradient(circle at 75% 50%, #166534 0%, transparent 50%)"
        }} />
        <div className="relative flex flex-col items-center gap-6 px-12 text-center">
                    <img src="/imagem/616865668_18388106245177062_230337282631566022_n.jpg" alt="" className="h-auto w-full max-w-sm rounded-2xl shadow-2xl object-cover" />
          <h2 className="text-3xl font-bold text-white">MDJS Mudanças</h2>
          <p className="text-lg text-white/70">Transportando suas conquistas e realizando sonhos</p>
        </div>
      </div>
    </div>
  );
}
