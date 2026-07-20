import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readdir } from "fs/promises";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vistoriaId: string }> },
) {
  try {
    const { vistoriaId } = await params;

    const { data: vistoria, error } = await supabase
      .from("vistorias")
      .select("vistoriador_id, data_vistoria, contact_name")
      .eq("id", vistoriaId)
      .single();

    if (error || !vistoria) {
      return NextResponse.json({ error: "Vistoria não encontrada" }, { status: 404 });
    }

    const userId = vistoria.vistoriador_id;
    const date = (vistoria.data_vistoria || "").slice(0, 10);
    const clientName = (vistoria.contact_name || "sem-nome")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    const dir = path.join(process.cwd(), "public", "vistoria", "fotoevideo", userId, `${date}-${clientName}`);

    let files: { name: string; url: string; type: string }[] = [];
    try {
      files = (await readdir(dir)).map((f) => ({
        name: f,
        url: `/vistoria/fotoevideo/${userId}/${date}-${clientName}/${f}`,
        type: f.match(/\.(mp4|webm|mov|avi)$/i) ? "video" : "image",
      }));
    } catch {
      files = [];
    }

    return NextResponse.json({ files });
  } catch (err) {
    console.error("List media error:", err);
    return NextResponse.json({ error: "Erro ao listar mídias" }, { status: 500 });
  }
}
