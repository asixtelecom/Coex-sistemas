import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isAccountRole, FEATURE_PERMISSIONS, type FeaturePermissions } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/automations/admin-client";

function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[members route] unexpected RPC error:", err);
  return NextResponse.json(
    { error: "Failed to update member" },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRole:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    // Handle avatar update (admin can set any member's avatar)
    if (body.avatar !== undefined) {
      const admin = supabaseAdmin();

      if (body.avatar === null) {
        const { error } = await admin
          .from("profiles")
          .update({ avatar_url: null })
          .eq("user_id", userId);
        if (error) {
          console.error("[members route] avatar remove error:", error);
          return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
        }
        return NextResponse.json({ ok: true, avatar_url: null });
      }

      if (typeof body.avatar === "string" && body.avatar.startsWith("data:image/")) {
        const matches = body.avatar.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
        }

        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        const path = `${userId}/avatar-${Date.now()}.${ext}`;

        const { error: uploadError } = await admin.storage
          .from("avatars")
          .upload(path, buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
          });

        if (uploadError) {
          console.error("[members route] avatar upload error:", uploadError);
          return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
        }

        const {
          data: { publicUrl },
        } = admin.storage.from("avatars").getPublicUrl(path);

        const { error: updateError } = await admin
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("user_id", userId);
        if (updateError) {
          console.error("[members route] avatar profile update error:", updateError);
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, avatar_url: publicUrl });
      }

      return NextResponse.json({ error: "avatar must be a data:image URL or null" }, { status: 400 });
    }

    // Handle permissions update
    if (body.permissions !== undefined) {
      const perms = body.permissions as Record<string, boolean>;
      for (const key of Object.keys(perms)) {
        if (!(FEATURE_PERMISSIONS as readonly string[]).includes(key)) {
          return NextResponse.json(
            { error: `Unknown permission: ${key}` },
            { status: 400 },
          );
        }
      }
      const { error } = await ctx.supabase.rpc("set_member_permissions", {
        p_user_id: userId,
        p_permissions: perms,
      });

      if (error) {
        console.error("[members route] permissions update error:", error);
        return rpcErrorToResponse(error);
      }
      return NextResponse.json({ ok: true });
    }

    // Handle role update
    const role = body.role;
    if (!isAccountRole(role)) {
      return NextResponse.json(
        { error: "'role' must be one of owner, admin, agent, viewer" },
        { status: 400 },
      );
    }

    if (role === "owner") {
      return NextResponse.json(
        {
          error:
            "Use POST /api/account/transfer-ownership to promote a member to owner",
        },
        { status: 400 },
      );
    }

    const { error } = await ctx.supabase.rpc("set_member_role", {
      p_user_id: userId,
      p_new_role: role,
    });

    if (error) return rpcErrorToResponse(error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRemove:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const { data, error } = await ctx.supabase.rpc("remove_account_member", {
      p_user_id: userId,
    });

    if (error) return rpcErrorToResponse(error);

    return NextResponse.json({ ok: true, newPersonalAccountId: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
