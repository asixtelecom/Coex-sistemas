import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
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

  const body = await req.json();
  const { to, cc, bcc, subject, message, attachments } = body;

  if (!to || !subject) {
    return NextResponse.json({ error: "Para e Assunto são obrigatórios" }, { status: 400 });
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(message);

  try {
    if (mailbox.smtp_authorized && mailbox.smtp_host) {
      const transporter = nodemailer.createTransport({
        host: mailbox.smtp_host,
        port: mailbox.smtp_port || 465,
        secure: mailbox.smtp_ssl ?? true,
        auth: {
          user: mailbox.smtp_username,
          pass: mailbox.smtp_password,
        },
        tls: { rejectUnauthorized: false },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${mailbox.title}" <${mailbox.smtp_username}>`,
        to: to,
        cc: cc || undefined,
        bcc: bcc || mailbox.send_bcc_to || undefined,
        subject: subject,
      };

      if (isHtml) {
        mailOptions.html = message;
        mailOptions.text = message.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      } else {
        mailOptions.text = message;
      }

      if (attachments) {
        const urls = attachments.split(",").filter(Boolean);
        if (urls.length > 0) {
          mailOptions.attachments = urls.map((url: string) => ({
            path: url,
            filename: url.split("/").pop() || "attachment",
          }));
        }
      }

      await transporter.sendMail(mailOptions);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { error: insErr } = await supabase.from("mailbox_emails").insert({
      account_id: mailbox.account_id,
      mailbox_id: mailboxId,
      to: to,
      cc: cc || null,
      bcc: bcc || null,
      subject: subject,
      message: message,
      created_by: user.id,
      creator_name: profile?.full_name || user.email?.split("@")[0] || "Usuário",
      creator_email: user.email || "",
      is_read: true,
      is_starred: false,
      status: "",
      files: attachments || null,
      last_activity_at: new Date().toISOString(),
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ sent: false, error: message }, { status: 200 });
  }
}
