/**
 * Utilitaires tableur côté client, sans dépendre de `xlsx` (vulnérable).
 * - lecture .xlsx via exceljs (importé dynamiquement → hors du bundle principal)
 * - lecture .csv parsée à la main
 * - exports .xlsx (exceljs) et .csv (natif)
 */

type Row = Record<string, string>;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Découpe une ligne CSV en respectant les guillemets. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === ";") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Lit un fichier .csv ou .xlsx en lignes { ENTÊTE: valeur }. */
export async function readSpreadsheet(file: File): Promise<Row[]> {
  const isCsv = /\.csv$/i.test(file.name) || file.type.includes("csv");

  if (isCsv) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    const headers = splitCsvLine(lines[0]).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = splitCsvLine(line);
      const row: Row = {};
      headers.forEach((h, i) => {
        if (h) row[h] = (cells[i] ?? "").trim();
      });
      return row;
    });
  }

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const cellText = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
      const o = v as { text?: string; result?: unknown };
      if (typeof o.text === "string") return o.text;
      if (o.result !== undefined) return String(o.result);
      return "";
    }
    return String(v);
  };

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col] = cellText(cell.value).trim();
  });

  const rows: Row[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Row = {};
    let hasValue = false;
    row.eachCell((cell, col) => {
      const key = headers[col];
      if (!key) return;
      const text = cellText(cell.value);
      if (text !== "") hasValue = true;
      obj[key] = text;
    });
    if (hasValue) rows.push(obj);
  });
  return rows;
}

/** Génère et télécharge un .xlsx à partir d'un tableau de lignes (aoa). */
export async function downloadXlsx(
  filename: string,
  sheetName: string,
  aoa: (string | number)[][],
  colWidths?: number[]
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  aoa.forEach((r) => ws.addRow(r));
  if (colWidths) ws.columns = colWidths.map((w) => ({ width: w }));
  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}

/** Échappe une valeur pour CSV. */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Génère et télécharge un .csv (séparateur `;`, BOM pour Excel). */
export function downloadCsv(filename: string, aoa: (string | number)[][]): void {
  const content = "﻿" + aoa.map((r) => r.map(csvCell).join(";")).join("\r\n");
  triggerDownload(new Blob([content], { type: "text/csv;charset=utf-8" }), filename);
}
