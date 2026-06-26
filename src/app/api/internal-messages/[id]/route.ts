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

    const { data: msg, error: fetchError } = await supabase
      .from("internal_messages")
      .select("sender_id")
      .eq("id", id)
      .single();

    if (fetchError || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msg.sender_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: delError } = await supabase
      .from("internal_messages")
      .delete()
      .eq("id", id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete message error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
