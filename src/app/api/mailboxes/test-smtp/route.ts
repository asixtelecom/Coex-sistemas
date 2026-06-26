import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
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

  const secure = ssl ?? true;

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure,
    auth: { user: username, pass: password },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    return NextResponse.json({ authorized: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ authorized: false, error: message }, { status: 200 });
  }
}
