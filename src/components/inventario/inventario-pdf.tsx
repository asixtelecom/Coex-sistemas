"use client";

import { jsPDF } from "jspdf";

function fmtBR(v: number | undefined | null, decimals = 2): string {
  if (v == null) return "0,00";
  return Number(v).toFixed(decimals).replace(".", ",");
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { cache: "force-cache" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface InventarioItem {
  name: string;
  qtd: number;
  total_m3: number;
}

interface ContactData {
  email?: string | null;
  address?: string | null;
}

interface CreatorData {
  name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

interface AccountData {
  name?: string;
  logo_url?: string | null;
  endereco?: string | null;
  footer_text?: string | null;
}

interface PdfInventario {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_document: string | null;
  origin_address: string | null;
  destination_address: string | null;
  obs: string | null;
  items: InventarioItem[];
  cubagem_total: number;
  created_by: string | null;
  created_at: string;
}

export async function generateInventarioPDF(
  inv: PdfInventario,
  account: AccountData | null,
  creator: CreatorData | null,
  contact: ContactData | null,
) {
  // Load images in parallel
  const [logoData, avatarData] = await Promise.all([
    account?.logo_url ? urlToBase64(account.logo_url) : Promise.resolve(null),
    creator?.avatar_url ? urlToBase64(creator.avatar_url) : Promise.resolve(null),
  ]);

  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18;

  const gray = [242, 242, 242] as const;
  const border = [200, 200, 200] as const;
  const dark = [17, 17, 17] as const;
  const muted = [85, 85, 85] as const;

  let y = m;

  // ── HEADER ──
  // Left: logo + company info
  let leftX = m;
  if (logoData) {
    const imgProps = doc.getImageProperties(logoData);
    const logoMaxH = 18;
    const logoRatio = imgProps.width / imgProps.height;
    const logoW = Math.min(logoMaxH * logoRatio, 40);
    const logoH = logoW / logoRatio;
    doc.addImage(logoData, "AUTO", leftX, y, logoW, logoH);
    leftX += logoW + 4;
  } else {
    leftX += 0;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  const nameX = logoData ? leftX : m;
  doc.text(account?.name ?? "Coex Sistemas", nameX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  if (account?.endereco) {
    const addrLines = account.endereco.split(",").filter(Boolean);
    let ay = y + 11;
    for (const line of addrLines) {
      doc.text(line.trim(), nameX, ay);
      ay += 4;
    }
  }

  // Right: doc number + date + responsible
  const rightX = pw - m;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("#" + inv.id.slice(0, 8).toUpperCase(), rightX, y + 4, { align: "right" });
  doc.text(formatDate(inv.created_at), rightX, y + 9, { align: "right" });

  // Responsible person section (right side)
  const respY = y + 18;
  const creatorName = creator?.name || "N/A";

  if (avatarData) {
    // Draw avatar circle
    const avatarSize = 8;
    const avatarX = rightX - avatarSize;
    const avatarY = respY - 2;
    try {
      doc.addImage(avatarData, "JPEG", avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      // fallback: draw a circle
      doc.setFillColor(gray[0], gray[1], gray[2]);
      doc.circle(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, "F");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Respons\u00e1vel", avatarData ? rightX - 12 : rightX, respY, { align: avatarData ? "right" : "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(creatorName, avatarData ? rightX - 12 : rightX, respY + 5, { align: avatarData ? "right" : "right" });

  y += 30;

  // ── TITLE ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("INVENT\u00c1RIO DE BENS M\u00d3VEIS", pw / 2, y, { align: "center" });

  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const subtitle =
    "(APARTAMENTO COM ELEVADOR, Caso algum item n\u00e3o possa ser transportado pelo elevador conforme, a partir do 3\u00aa andar \u00e9 cobrado uma taxa de R$50,00 por andar para transporte do item).";
  const subLines = doc.splitTextToSize(subtitle, pw - m * 4);
  doc.text(subLines, pw / 2, y, { align: "center" });

  y += subLines.length * 3 + 8;

  // ── CLIENT DATA BOX ──
  const boxTop = y;
  const boxH = 40;
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.rect(m, boxTop, pw - m * 2, boxH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Dados do Contratante", m + 6, boxTop + 7);

  // Left column
  const lx = m + 6;
  let colY = boxTop + 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Nome:", lx, colY);
  doc.setFont("helvetica", "normal");
  doc.text(inv.contact_name ?? "Sem nome", lx + 20, colY);

  colY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Telefone:", lx, colY);
  doc.setFont("helvetica", "normal");
  doc.text(inv.contact_phone ?? "-", lx + 20, colY);

  colY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("E-mail:", lx, colY);
  doc.setFont("helvetica", "normal");
  doc.text(contact?.email ?? "-", lx + 20, colY);

  // Right column
  const rx = pw / 2 + 4;
  colY = boxTop + 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Endere\u00e7o de origem:", rx, colY);
  doc.setFont("helvetica", "normal");
  doc.text(inv.origin_address ?? contact?.address ?? "-", rx, colY + 4);

  colY += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Endere\u00e7o de entrega:", rx, colY);
  doc.setFont("helvetica", "normal");
  doc.text(inv.destination_address ?? "-", rx, colY + 4);

  y = boxTop + boxH + 12;

  // ── ITEMS TABLE ──
  const tableX = m;
  const tableW = pw - m * 2;
  const rowH = 7;
  const colW = [tableW - 60, 30, 30];

  // Header
  doc.setFillColor(gray[0], gray[1], gray[2]);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.setDrawColor(dark[0], dark[1], dark[2]);
  doc.rect(tableX, y, tableW, rowH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);

  let cx = tableX + 4;
  doc.text("Descri\u00e7\u00e3o dos Itens", cx, y + 5);
  cx += colW[0];
  doc.text("Quantidade", cx + colW[1] / 2, y + 5, { align: "center" });
  cx += colW[1];
  doc.text("Volume (m\u00b3)", cx + colW[2] / 2, y + 5, { align: "center" });

  y += rowH;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setDrawColor(dark[0], dark[1], dark[2]);

  let totalQtd = 0;
  for (const item of inv.items) {
    totalQtd += item.qtd;

    if (y + rowH > ph - 55) {
      doc.addPage();
      y = m;
    }

    doc.rect(tableX, y, tableW, rowH, "S");

    cx = tableX + 4;
    doc.text(item.name, cx, y + 5);
    cx += colW[0];
    doc.text(String(item.qtd), cx + colW[1] / 2, y + 5, { align: "center" });
    cx += colW[1];
    doc.text(fmtBR(item.total_m3), cx + colW[2] / 2, y + 5, { align: "center" });

    y += rowH;
  }

  // Totals row
  if (y + rowH > ph - 55) {
    doc.addPage();
    y = m;
  }

  doc.rect(tableX, y, tableW, rowH, "S");
  doc.setFont("helvetica", "bold");

  cx = tableX + 4;
  doc.text("Totais", cx, y + 5);
  cx += colW[0];
  doc.text(String(totalQtd), cx + colW[1] / 2, y + 5, { align: "center" });
  cx += colW[1];
  doc.text(fmtBR(inv.cubagem_total), cx + colW[2] / 2, y + 5, { align: "center" });

  y += rowH + 8;

  // ── OBS ──
  if (inv.obs) {
    if (y + 20 > ph - 55) {
      doc.addPage();
      y = m;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text("Obs:", m, y);
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(inv.obs, pw - m * 2);
    doc.text(obsLines, m, y + 5);
    y += obsLines.length * 4 + 15;
  } else {
    y += 12;
  }

  // ── SIGNATURE AREA ──
  const sigY = Math.max(y, ph - 50);

  doc.setDrawColor(dark[0], dark[1], dark[2]);
  doc.line(m, sigY, m + 65, sigY);
  doc.line(pw - m - 65, sigY, pw - m, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Assinatura do Contratante", m, sigY + 5);
  doc.text(inv.contact_name ?? "", m, sigY + 10);

  doc.text("Assinatura da Empresa", pw - m - 65, sigY + 5);
  doc.text(account?.name ?? "Coex Sistemas", pw - m - 65, sigY + 10);

  // ── FOOTER ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const footerText = (account?.endereco ?? "") + "  |  Gerado em " + new Date().toLocaleString("pt-BR");
  const footerLines = doc.splitTextToSize(footerText, pw - m * 2);
  doc.text(footerLines, pw / 2, ph - 10, { align: "center" });

  doc.save("inventario-" + inv.id.slice(0, 8) + ".pdf");
}
