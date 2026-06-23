import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    await supabase.from("user_presence").upsert(
      {
        user_id: userId,
        last_seen_at: new Date().toISOString(),
        status: "offline",
      },
      { onConflict: "user_id" }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
