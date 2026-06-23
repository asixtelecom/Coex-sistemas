"use client";

import type { Deal } from "@/types";
import { jsPDF } from "jspdf";

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "-";
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}

export async function generatePedidoPDF(deal: Deal) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18;

  // Colors
  const primary = [41, 98, 255] as const;
  const lightBg = [245, 247, 250] as const;
  const border = [200, 200, 200] as const;
  const dark = [30, 30, 30] as const;
  const muted = [120, 120, 120] as const;

  let y = m;

  // ── HEADER ──
  // Left side: company placeholder
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(m, y, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Coex Sistemas CRM", m + 12, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("CRM & Gestão de Mudanças", m + 12, y + 11);

  // Right side: order info
  const rightX = pw - m;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("#PED-" + deal.id.slice(0, 8).toUpperCase(), rightX, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Emissão: " + new Date().toLocaleDateString("pt-BR"), rightX, y + 10, { align: "right" });
  doc.text("Responsável: " + (deal.assignee?.full_name ?? "N/A"), rightX, y + 15, { align: "right" });

  y += 22;

  // Separator line
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(m, y, pw - m, y);
  y += 10;

  // ── TITLE ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("INVENTÁRIO DE BENS MÓVEIS", pw / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const subtitle = "APARTAMENTO COM ELEVADOR, Caso algum item não possa ser transportado pelo elevador conforme, a partir do 3ª andar é cobrado uma taxa de R$50,00 por andar para transporte do item.";
  const subtitleLines = doc.splitTextToSize(subtitle, pw - m * 4);
  doc.text(subtitleLines, pw / 2, y + 5, { align: "center" });

  y += 12 + subtitleLines.length * 4;

  // ── CLIENT DATA BOX ──
  const boxH = 42;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(m, y, pw - m * 2, boxH, 3, 3, "F");
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.roundedRect(m, y, pw - m * 2, boxH, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Dados do Cliente", m + 8, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Nome:", m + 8, y + 16);
  doc.setFont("helvetica", "bold");
  doc.text(deal.contact?.name ?? "Sem nome", m + 28, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFontSize(8);
  if (deal.contact?.phone) {
    doc.text("Tel: " + deal.contact.phone, m + 8, y + 23);
  }

  // Addresses inside box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Origem:", m + 8, y + 33);
  doc.setFont("helvetica", "normal");
  doc.text(deal.origin_address ?? "-", m + 28, y + 33);
  doc.setFont("helvetica", "bold");
  doc.text("Destino:", (pw / 2) + 5, y + 33);
  doc.setFont("helvetica", "normal");
  doc.text(deal.destination_address ?? "-", (pw / 2) + 28, y + 33);

  y += boxH + 12;

  // ── SERVICE TABLE ──
  const colW = [50, 30, 30, 35];
  const tableX = m;
  const tableW = pw - m * 2;
  const rowH = 8;

  // Header row
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  const headers = ["Serviço", "Início", "Término", "Valor"];
  let cx = tableX + 4;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 5.5);
    cx += colW[i] || 0;
  });

  y += rowH;

  // Data row
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setFillColor(255, 255, 255);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.rect(tableX, y, tableW, rowH, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(dark[0], dark[1], dark[2]);

  cx = tableX + 4;
  const rowData = [deal.title, formatDate(deal.created_at), formatDate(deal.end_date), formatCurrency(deal.value)];
  rowData.forEach((val, i) => {
    doc.text(val, cx, y + 5.5);
    cx += colW[i] || 0;
  });

  y += rowH + 12;

  // ── OBSERVATIONS ──
  if (deal.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text("Observações", m, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    const notesLines = doc.splitTextToSize(deal.notes, tableW);
    doc.text(notesLines, m, y);
    y += notesLines.length * 5 + 10;
  }

  // ── SIGNATURE AREA ──
  const sigY = Math.max(y + 10, ph - 55);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(m, sigY, m + 70, sigY);
  doc.line(pw - m - 70, sigY, pw - m, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Assinatura do Cliente", m, sigY + 5);
  doc.text(deal.contact?.name ?? "", m, sigY + 10);
  doc.text("Assinatura da Empresa", pw - m - 70, sigY + 5);
  doc.text("Coex Sistemas", pw - m - 70, sigY + 10);

  // ── FOOTER ──
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(
    "Coex Sistemas CRM  |  Gerado em " + new Date().toLocaleString("pt-BR"),
    pw / 2,
    ph - 8,
    { align: "center" }
  );

  doc.save("pedido_" + deal.id.slice(0, 8) + ".pdf");
}
