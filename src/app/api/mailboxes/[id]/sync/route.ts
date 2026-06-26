import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const mailboxId = parseInt(id, 10);
  if (isNaN(mailboxId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { data: mailbox, error: mbErr } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .eq("deleted", false)
    .single();

  if (mbErr || !mailbox) {
    return NextResponse.json({ error: "Caixa de e-mail não encontrada" }, { status: 404 });
  }
  if (!mailbox.imap_authorized) {
    return NextResponse.json({ error: "IMAP não autorizado" }, { status: 400 });
  }

  const client = new ImapFlow({
    host: mailbox.imap_host,
    port: mailbox.imap_port || 993,
    auth: { user: mailbox.imap_username, pass: mailbox.imap_password },
    tls: mailbox.imap_ssl ?? true,
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const { data: existing } = await supabase
        .from("mailbox_emails")
        .select("email_id")
        .eq("mailbox_id", mailboxId)
        .not("email_id", "is", null)
        .order("email_id", { ascending: false })
        .limit(1);

      const lastUid = existing?.[0]?.email_id || 0;
      let range: string;
      if (lastUid > 0) {
        range = `${lastUid + 1}:*`;
      } else {
        const status = await client.status("INBOX", { messages: true });
        const total = status.messages || 0;
        const start = Math.max(1, total - 49);
        range = `${start}:*`;
      }
      const existingUids = new Set((existing || []).map((e) => e.email_id));

      let inserted = 0;
      let scanned = 0;

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        source: true,
        internalDate: true,
      }, { uid: true })) {
        const uid = msg.uid;
        if (!uid) continue;

        scanned++;

        const envelope = msg.envelope;
        if (!envelope) continue;

        const from = envelope.from?.[0];
        const to = envelope.to?.[0];

        const fromName = from ? from.name || null : null;
        const fromAddr = from ? from.address || "" : "";
        const toAddr = to ? to.address || "" : "";
        const ccAddr = envelope.cc
          ? envelope.cc.map((c: { address?: string }) => c.address || "").join(", ")
          : null;
        const subject = envelope.subject || "(sem assunto)";

        let body = "";
        if (msg.source) {
          try {
            const parsed = await simpleParser(msg.source);
            body = parsed.html || parsed.text || "";
          } catch {
            const raw = msg.source.toString("utf-8");
            const parts = raw.split(/\r?\n\r?\n/);
            if (parts.length > 1) {
              body = parts.slice(1).join("\n\n").trim();
            }
          }
        }

        const internalDate = msg.internalDate
          ? new Date(msg.internalDate).toISOString()
          : new Date().toISOString();

        const { error: insErr } = await supabase.from("mailbox_emails").insert({
          account_id: mailbox.account_id,
          mailbox_id: mailboxId,
          to: toAddr,
          cc: ccAddr,
          subject,
          message: body,
          email_id: uid,
          created_by: null,
          creator_name: fromName,
          creator_email: fromAddr,
          is_read: false,
          is_starred: false,
          status: "",
          last_activity_at: internalDate,
          created_at: internalDate,
        });

        if (!insErr) inserted++;
      }

      lock.release();
      await client.logout();

      return NextResponse.json({ synced: true, scanned, inserted });
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err: unknown) {
    try { await client.logout(); } catch {}
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ synced: false, error: message }, { status: 200 });
  }
}
