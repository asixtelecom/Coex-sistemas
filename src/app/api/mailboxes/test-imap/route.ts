import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { mailbox_id, host, port, username, password, ssl } = body;

  if (!mailbox_id || !host || !port || !username || !password) {
    return NextResponse.json(
      { error: "host, port, username, password são obrigatórios" },
      { status: 400 }
    );
  }

  if (host.includes('@')) {
    return NextResponse.json(
      { authorized: false, error: `O campo Host está com valor "${host}" — parece ser um e-mail. Deve ser o servidor IMAP (ex: imap.hostinger.com).` },
      { status: 200 }
    );
  }

  const tls = ssl ?? true;

  const client = new ImapFlow({
    host,
    port: parseInt(port, 10),
    auth: { user: username, pass: password },
    tls,
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
    return NextResponse.json({ authorized: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ authorized: false, error: message }, { status: 200 });
  }
}
