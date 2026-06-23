import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = _req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { headers: { Authorization: "Bearer " + authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Remove users participation (other user still has access)
    const { error: partError } = await supabase
      .from("internal_conversation_participants")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id);

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete conversation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
