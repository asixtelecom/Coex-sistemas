import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const LOG_DIR = "/www/wwwroot/coexsistemas.techvoz.com.br/conv_inte";

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
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

    const { senderName, receiverName, content, mediaType } = await req.json();
    if (!senderName || !receiverName) {
      return NextResponse.json({ error: "senderName and receiverName required" }, { status: 400 });
    }

    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const a = sanitizeName(senderName);
    const b = sanitizeName(receiverName);
    const participants = [a, b].sort().join("_");
    const filePath = path.join(LOG_DIR, participants + ".txt");

    const now = new Date();
    const pad2 = (n: number) => n.toString().padStart(2, "0");
    const ts = pad2(now.getDate()) + "/" + pad2(now.getMonth() + 1) + "/" + now.getFullYear() + " " + pad2(now.getHours()) + ":" + pad2(now.getMinutes()) + ":" + pad2(now.getSeconds());

    let logContent: string;
    if (mediaType === "audio") {
      logContent = "envio de audio";
    } else if (mediaType === "image") {
      logContent = "envio de imagem";
    } else if (mediaType === "video") {
      logContent = "envio de video";
    } else if (mediaType && mediaType !== "text") {
      logContent = "envio de documento";
    } else {
      logContent = content || "mensagem vazia";
    }

    const line = "[" + ts + "] " + senderName + " mandou " + logContent + " para " + receiverName + "\n\n";
    fs.appendFileSync(filePath, line, "utf-8");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Chat log error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
