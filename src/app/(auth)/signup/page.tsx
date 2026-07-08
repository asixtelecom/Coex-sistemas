"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { MessageSquare, CheckCircle, UsersRound } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Senhas não conferem");
      return;
    }

    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-500 px-4">
        <Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#EF7D07" }}>
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Verifique seu e-mail
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enviamos um link de confirmação para{" "}
               <span className="text-foreground">{email}</span>. Verifique sua
               caixa de entrada e clique no link para verificar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Voltar para login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Signup form */}
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
              {inviteToken ? "Criar conta & participar" : "Criar conta"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {inviteToken
                ? "Verifique seu e-mail e aceite o convite para entrar na sua equipe."
                : "Comece com o CRM Coex Sistemas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName" className="text-muted-foreground">
                  Nome completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Pelo menos 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground">
                  Confirmar senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                href={
                  inviteToken
                    ? `/login?invite=${encodeURIComponent(inviteToken)}`
                    : "/login"
                }
                className="hover:text-orange-600"
                style={{ color: "#EF7D07" }}
              >
                Entrar
              </Link>
            </p>
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
