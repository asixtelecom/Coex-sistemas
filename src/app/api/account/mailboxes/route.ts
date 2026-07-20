// ============================================================
// GET /api/account/mailboxes
//
// Returns all non-deleted mailboxes for the caller's account.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data, error } = await ctx.supabase
      .from("mailboxes")
      .select("id, title, color")
      .eq("account_id", ctx.accountId)
      .eq("deleted", false)
      .order("title");

    if (error) {
      console.error("[GET /api/account/mailboxes]", error);
      return NextResponse.json({ error: "Failed to load mailboxes" }, { status: 500 });
    }

    return NextResponse.json({ mailboxes: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}
