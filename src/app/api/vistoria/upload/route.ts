import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const vistoriaId = formData.get("vistoriaId") as string | null;
    const type = formData.get("type") as string | null; // "photo" | "video"

    if (!file || !vistoriaId) {
      return NextResponse.json({ error: "file e vistoriaId são obrigatórios" }, { status: 400 });
    }

    const { data: vistoria, error: fetchError } = await supabase
      .from("vistorias")
      .select("vistoriador_id, data_vistoria, contact_name")
      .eq("id", vistoriaId)
      .single();

    if (fetchError || !vistoria) {
      return NextResponse.json({ error: "Vistoria não encontrada" }, { status: 404 });
    }

    const userId = vistoria.vistoriador_id;
    const date = (vistoria.data_vistoria || new Date().toISOString().split("T")[0]).slice(0, 10);
    const clientName = (vistoria.contact_name || "sem-nome")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const dir = path.join(process.cwd(), "public", "vistoria", "fotoevideo", userId, `${date}-${clientName}`);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({
      success: true,
      path: `/vistoria/fotoevideo/${userId}/${date}-${clientName}/${filename}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Erro interno ao salvar arquivo" }, { status: 500 });
  }
}
