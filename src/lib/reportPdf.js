import { jsPDF } from "jspdf";

const MAROON = [107, 29, 44];
const INK = [40, 40, 40];
const SOFT = [110, 110, 110];
const SEVERITY = {
  high: [192, 57, 43],
  medium: [183, 121, 31],
  low: [46, 158, 107],
};

export function downloadReportPdf({ report, generatedAt, kpis = [], statusCounts = [], filename = "helpdesk-analytics-report.pdf" }) {
  if (!report) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;
  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (text, { size = 10, bold = false, color = INK, indent = 0, gap = 4 } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text ?? ""), contentW - indent);
    const lineH = size * 1.4;
    lines.forEach((line) => {
      ensureSpace(lineH);
      doc.text(line, margin + indent, y + size);
      y += lineH;
    });
    y += gap;
  };

  const heading = (text) => {
    ensureSpace(34);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...MAROON);
    doc.text(text, margin, y + 12);
    y += 18;
    doc.setDrawColor(...MAROON);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  };

  const severityTag = (level, text, { indent = 0 } = {}) => {
    const color = SEVERITY[level] || SEVERITY.low;
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(`[${String(level || "low").toUpperCase()}]`, margin + indent, y + 9);
    const tagW = doc.getTextWidth(`[${String(level || "low").toUpperCase()}] `) + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(String(text ?? ""), contentW - indent - tagW);
    lines.forEach((line, i) => {
      if (i > 0) ensureSpace(14);
      doc.text(line, margin + indent + tagW, y + 10);
      y += 14;
    });
    y += 4;
  };

  // ---- Header band ----
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SPC Helpdesk - Analytics Report", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedAt ? generatedAt.toLocaleString() : new Date().toLocaleString()}`, margin, 52);
  y = 90;

  // ---- KPIs ----
  if (kpis.length) {
    heading("Key Metrics");
    kpis.forEach((k) => writeText(`${k.label}: ${k.value}`, { bold: false, gap: 2 }));
  }

  // ---- Status counts ----
  if (statusCounts.length) {
    heading("Status Breakdown");
    statusCounts.forEach((s) => writeText(`${s.label}: ${s.count}`, { gap: 2 }));
  }

  // ---- Summary ----
  heading("Summary");
  writeText(report.summary, { size: 10.5 });

  // ---- By status ----
  heading("By Status");
  writeText("Open", { bold: true, color: [224, 160, 48], gap: 1 });
  writeText(report.status_insights?.open);
  writeText("In Progress", { bold: true, color: [59, 130, 246], gap: 1 });
  writeText(report.status_insights?.in_progress);
  writeText("Resolved", { bold: true, color: [46, 158, 107], gap: 1 });
  writeText(report.status_insights?.resolved);

  // ---- Office insights ----
  if (report.office_insights?.length) {
    heading("Office Insights");
    report.office_insights.forEach((o) =>
      severityTag(o.severity, `${o.office} - ${o.observation}`)
    );
  }

  // ---- Recurring themes ----
  if (report.recurring_themes?.length) {
    heading("Recurring Themes");
    report.recurring_themes.forEach((t) =>
      writeText(`- ${t.theme} (~${t.approx_count})`, { gap: 2 })
    );
  }

  // ---- Recommendations ----
  if (report.recommendations?.length) {
    heading("Recommendations");
    report.recommendations.forEach((r) => severityTag(r.priority, r.action));
  }

  // ---- Needs attention ----
  heading("Needs Attention");
  if (!report.attention_tickets?.length) {
    writeText("Nothing flagged.", { color: SOFT });
  } else {
    report.attention_tickets.forEach((t) => {
      writeText(t.code, { bold: true, gap: 0 });
      writeText(t.reason, { indent: 10, color: SOFT, gap: 6 });
    });
  }

  // ---- Footer: page numbers ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const title = filename.replace(/\.pdf$/i, "");
  doc.setProperties({ title });


  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");

  doc.autoPrint();
  window.open(doc.output("bloburl", "_blank"));
}