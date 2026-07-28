// ============================================================
// /api/account
//
//   GET   — current caller's account + role. Any member.
//   PATCH — rename the account.                  Admin+.
//
// Why both verbs share a route file
//   They speak about the same singular resource (the caller's
//   account) and reuse the same `requireRole` plumbing. Splitting
//   them across files would duplicate the `account_id` lookup
//   without buying anything.
// ============================================================

import { NextResponse } from "next/server";

import {
  requireRole,
  getCurrentAccount,
  toErrorResponse,
} from "@/lib/auth/account";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    return NextResponse.json({
      account: ctx.account,
      role: ctx.role,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const MAX_NAME_LEN = 80;
const MAX_COMPANY_LEN = 100;

export async function PATCH(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:rename:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; company_name?: unknown; logo_url?: unknown }
      | null;

    const updates: Record<string, string | null> = {};

    // Account name (optional)
    if (body?.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json(
          { error: "'name' must be a string" },
          { status: 400 },
        );
      }
      const name = body.name.trim();
      if (name.length === 0) {
        return NextResponse.json(
          { error: "Account name cannot be empty" },
          { status: 400 },
        );
      }
      if (name.length > MAX_NAME_LEN) {
        return NextResponse.json(
          { error: `Account name must be ${MAX_NAME_LEN} characters or fewer` },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    // Company name (optional)
    if (body?.company_name !== undefined) {
      if (typeof body.company_name !== "string") {
        return NextResponse.json(
          { error: "'company_name' must be a string" },
          { status: 400 },
        );
      }
      const companyName = body.company_name.trim();
      if (companyName.length > MAX_COMPANY_LEN) {
        return NextResponse.json(
          { error: `Company name must be ${MAX_COMPANY_LEN} characters or fewer` },
          { status: 400 },
        );
      }
      updates.company_name = companyName || null;
    }

    // Logo URL (optional, null to clear)
    if (body?.logo_url !== undefined) {
      if (body.logo_url !== null && typeof body.logo_url !== "string") {
        return NextResponse.json(
          { error: "'logo_url' must be a string or null" },
          { status: 400 },
        );
      }
      updates.logo_url = body.logo_url || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await ctx.supabase
      .from("accounts")
      .update(updates)
      .eq("id", ctx.accountId)
      .select("id, name, company_name, logo_url")
      .single();

    if (error) {
      console.error("[PATCH /api/account] update error:", error);
      return NextResponse.json(
        { error: "Failed to update account" },
        { status: 500 },
      );
    }

    return NextResponse.json({ account: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
