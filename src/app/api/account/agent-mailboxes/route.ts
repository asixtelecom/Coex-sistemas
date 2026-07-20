// ============================================================
// GET /api/account/agent-mailboxes
//
// Returns mailbox assignments for the account.
//   ?user_id=<uuid>  → returns that agent's assignments
//   (no param)       → returns all assignments (admin+ only)
//
// POST /api/account/agent-mailboxes
//
// Replaces mailbox assignments for a user.
// Body: { user_id: string, mailbox_ids: number[] }
// Admin+ only.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentAccount, requireRole, toErrorResponse } from "@/lib/auth/account";

export async function GET(req: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    let query = ctx.supabase
      .from("agent_mailboxes")
      .select("id, user_id, mailbox_id, mailboxes!inner(id, title, color, deleted)")
      .eq("account_id", ctx.accountId)
      .eq("mailboxes.deleted", false);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/account/agent-mailboxes]", error);
      return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
    }

    return NextResponse.json({ assignments: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("admin");
    const body = await req.json().catch(() => null) as {
      user_id?: string;
      mailbox_ids?: number[];
    } | null;

    if (!body?.user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }
    if (!Array.isArray(body.mailbox_ids)) {
      return NextResponse.json({ error: "mailbox_ids must be an array" }, { status: 400 });
    }

    // Delete existing
    const { error: delErr } = await ctx.supabase
      .from("agent_mailboxes")
      .delete()
      .eq("user_id", body.user_id)
      .eq("account_id", ctx.accountId);

    if (delErr) {
      console.error("[POST /api/account/agent-mailboxes] delete error:", delErr);
      return NextResponse.json({ error: "Failed to update assignments" }, { status: 500 });
    }

    // Insert new
    if (body.mailbox_ids.length > 0) {
      const rows = body.mailbox_ids.map((mid) => ({
        user_id: body.user_id,
        mailbox_id: mid,
        account_id: ctx.accountId,
      }));

      const { error: insErr } = await ctx.supabase
        .from("agent_mailboxes")
        .insert(rows);

      if (insErr) {
        console.error("[POST /api/account/agent-mailboxes] insert error:", insErr);
        return NextResponse.json({ error: "Failed to save assignments" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
