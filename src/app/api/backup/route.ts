import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { readFile, writeFile, readdir, unlink, stat, mkdir } from "fs/promises";
import { join } from "path";

const BACKUP_DIR = join(process.cwd(), "backups");

function supabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TABLES = [
  "accounts",
  "profiles",
  "channels",
  "whatsapp_config",
  "tags",
  "custom_fields",
  "pipeline_stages",
  "deals",
  "contacts",
  "contact_phones",
  "contact_tags",
  "contact_custom_values",
  "contact_notes",
  "message_templates",
  "mailbox_templates",
  "broadcasts",
  "broadcast_recipients",
  "automations",
  "automation_steps",
  "flows",
  "flow_nodes",
  "mailboxes",
  "cubagem_master_items",
];

function sqlEscape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return `'${val}'::timestamptz`;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return `'${val}'::uuid`;
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInsertSQL(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(`-- ${table}: ${rows.length} registros`);
  for (const row of rows) {
    const values = cols.map((c) => sqlEscape(row[c]));
    lines.push(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`
    );
  }
  return lines.join("\n") + "\n";
}

function generateSchemaSQL(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`);
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const sample = rows[0][col];
    let pgType = "text";
    if (sample === null) pgType = "text";
    else if (typeof sample === "boolean") pgType = "boolean";
    else if (typeof sample === "number") {
      pgType = Number.isInteger(sample) ? "integer" : "numeric";
    } else if (typeof sample === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(sample)) pgType = "timestamptz";
      else if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(sample)) pgType = "uuid";
      else if (sample.length > 500) pgType = "text";
      else pgType = "text";
    } else if (Array.isArray(sample) || typeof sample === "object") pgType = "jsonb";
    const comma = i < cols.length - 1 ? "," : "";
    lines.push(`  ${col} ${pgType}${comma}`);
  }
  lines.push(");\n");
  return lines.join("\n") + "\n";
}

// GET — lista backups ou baixa um específico
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileParam = request.nextUrl.searchParams.get("file");

  if (fileParam) {
    if (!fileParam.endsWith(".zip") || fileParam.includes("..")) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    try {
      const data = await readFile(join(BACKUP_DIR, fileParam));
      return new NextResponse(data, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileParam}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  try {
    await readdir(BACKUP_DIR);
  } catch {
    return NextResponse.json({ backups: [] });
  }

  const files = await readdir(BACKUP_DIR);
  const backups = [];
  for (const f of files.filter((f) => f.endsWith(".zip"))) {
    try {
      const s = await stat(join(BACKUP_DIR, f));
      backups.push({ name: f, size: s.size, created: s.birthtime.toISOString() });
    } catch {
      continue;
    }
  }
  backups.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );
  return NextResponse.json({ backups });
}

// POST — criar backup
export async function POST(request: NextRequest) {
  let accountId: string;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    accountId = profile.account_id;
  } catch (err: any) {
    return NextResponse.json({ error: "Auth error: " + err.message }, { status: 500 });
  }

  const admin = supabaseAdmin();
  const zip = new JSZip();
  const manifest: Record<string, number> = {};
  const tableData: Record<string, Record<string, unknown>[]> = {};

  for (const table of TABLES) {
    try {
      const { data, error } = await admin
        .from(table)
        .select("*")
        .eq("account_id", accountId);
      if (error) continue;
      if (data && data.length > 0) {
        zip.file(`${table}.json`, JSON.stringify(data, null, 2));
        tableData[table] = data;
        manifest[table] = data.length;
      }
    } catch {
      continue;
    }
  }

  // Gerar schema.sql
  let schemaSQL = `-- Backup Coex CRM — Schema\n-- Data: ${new Date().toISOString()}\n-- Account: ${accountId}\n\n`;
  let dataSQL = `-- Backup Coex CRM — Dados\n-- Data: ${new Date().toISOString()}\n-- Account: ${accountId}\n\n`;
  dataSQL += "SET session_replication_role = 'replica';\n\n";

  for (const [table, rows] of Object.entries(tableData)) {
    schemaSQL += generateSchemaSQL(table, rows);
    dataSQL += generateInsertSQL(table, rows);
  }

  dataSQL += "\nSET session_replication_role = 'origin';\n";

  zip.file("schema.sql", schemaSQL);
  zip.file("data.sql", dataSQL);
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: "1.0",
        account_id: accountId,
        created_at: new Date().toISOString(),
        tables: manifest,
      },
      null,
      2
    )
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await mkdir(BACKUP_DIR, { recursive: true });

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  await writeFile(join(BACKUP_DIR, filename), buffer);

  return NextResponse.json({ success: true, filename });
}

// DELETE — remover backup
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileParam = request.nextUrl.searchParams.get("file");
  if (!fileParam || !fileParam.endsWith(".zip") || fileParam.includes("..")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  try {
    await unlink(join(BACKUP_DIR, fileParam));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
