// ============================================================
// GET /api/account/members
//
// Lists every member of the caller's account. Any member can call
// it (the Members tab is shown to admins+, but agents/viewers see
// a read-only roster too).
//
// Field visibility
//   Sensitive fields (email) are returned only when the caller is
//   admin+. Agents and viewers see name + avatar + role + joined
//   date only. This mirrors the design decision from the planning
//   phase: "agent/viewer sees names only".
// ============================================================

import { NextResponse } from "next/server";

import { getCurrentAccount, requireRole, toErrorResponse } from "@/lib/auth/account";
import { canManageMembers, isAccountRole } from "@/lib/auth/roles";
import type { AccountMember } from "@/types"
import { supabaseAdmin } from "@/lib/automations/admin-client"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  account_role: string;
  created_at: string;
}
// ============================================================
// POST /api/account/members
//
// Creates a new member (agent) directly -- email + password.
// Owner/admin only. Uses the service role to create the auth
// user and insert a profile row scoped to the current account.
// ============================================================

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");
    const limit = checkRateLimit("admin:createAgent:" + ctx.userId, RATE_LIMITS.adminAction);
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Request body is required" }, { status: 400 });

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const role = body.role;
    if (!isAccountRole(role) || role === "owner")
      return NextResponse.json({ error: "Role must be one of admin, agent, viewer" }, { status: 400 });

    const admin = supabaseAdmin();
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("[create-agent] createUser error:", createError);
      if (createError.message?.includes("already"))
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: newUser.user.id, full_name: fullName, email,
      account_id: ctx.accountId, account_role: role,
    });

    if (profileError) {
      console.error("[create-agent] profile error:", profileError);
      await admin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: newUser.user.id, email, full_name: fullName, role },
    }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}


export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    // RLS on profiles allows reading any row whose account matches
    // the caller's, so this query is naturally account-scoped.
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, account_role, created_at")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/account/members] fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load members" },
        { status: 500 },
      );
    }

    const canSeeEmails = canManageMembers(ctx.role);

    const members: AccountMember[] = (data as ProfileRow[]).flatMap((row) => {
      // Defensive: the DB enum should never let an unknown role
      // through, but if a migration ever broadens the enum without
      // updating TS, skip the row rather than crash the page.
      if (!isAccountRole(row.account_role)) return [];
      return [
        {
          user_id: row.user_id,
          full_name: row.full_name ?? "",
          email: canSeeEmails ? row.email : null,
          avatar_url: row.avatar_url,
          role: row.account_role,
          joined_at: row.created_at,
        },
      ];
    });

    return NextResponse.json({ members });
  } catch (err) {
    return toErrorResponse(err);
  }
}
