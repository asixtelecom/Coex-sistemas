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

    const { error } = await supabase
      .from("internal_messages")
      .delete()
      .eq("id", id)
      .eq("sender_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete message error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
