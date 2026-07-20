import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactName = searchParams.get("contact_name")?.trim();
    const contactId = searchParams.get("contact_id")?.trim();

    if (!contactName && !contactId) {
      return NextResponse.json({ error: "contact_name or contact_id required" }, { status: 400 });
    }

    let query = admin
      .from("vistorias")
      .select("id, data_vistoria, total_cubagem, vistoriador_id, contact_id, vistoriador:profiles!vistorias_vistoriador_id_fkey(name)")
      .order("data_vistoria", { ascending: false });

    if (contactId && contactName) {
      query = query.or(`contact_id.eq.${contactId},contact_name.ilike.%${contactName}%`);
    } else if (contactId) {
      query = query.eq("contact_id", contactId);
    } else if (contactName) {
      query = query.ilike("contact_name", `%${contactName}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[vistoria/search] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[vistoria/search] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
