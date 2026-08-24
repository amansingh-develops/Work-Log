import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { WorkEntry, Project } from "../types";
import { formatDate } from "../lib/utils";

export interface ExportReportOptions {
  entries: WorkEntry[];
  projectsMap: Map<string, Project>;
  userName?: string;
  projectName?: string;
  startDate: string;
  endDate: string;
}

// Group entries by date (sorted descending)
export function groupEntriesByDate(entries: WorkEntry[]): Record<string, WorkEntry[]> {
  const grouped: Record<string, WorkEntry[]> = {};
  // Sort entries descending by date and time
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  for (const entry of sorted) {
    if (!grouped[entry.date]) {
      grouped[entry.date] = [];
    }
    grouped[entry.date].push(entry);
  }
  return grouped;
}

// Generate TXT Content
export function generateTxtReport(options: ExportReportOptions): string {
  const { entries, projectsMap, userName, projectName, startDate, endDate } = options;
  const grouped = groupEntriesByDate(entries);
  const nowStr = new Date().toLocaleString();

  let txt = "";
  txt += "=================================================================\n";
  txt += "                       DAILY WORK LOG REPORT                     \n";
  txt += "=================================================================\n";
  txt += `Generated For:  ${userName || "Work Log User"}\n`;
  txt += `Scope/Project:  ${projectName || "All Projects"}\n`;
  txt += `Date Range:     ${formatDate(startDate)} - ${formatDate(endDate)}\n`;
  txt += `Total Entries:  ${entries.length}\n`;
  txt += `Generated On:   ${nowStr}\n`;
  txt += "=================================================================\n\n";

  if (entries.length === 0) {
    txt += "No work entries found for the selected filter range.\n";
    return txt;
  }

  for (const [date, dateEntries] of Object.entries(grouped)) {
    txt += `\n### DATE: ${formatDate(date)} (${dateEntries.length} ${dateEntries.length === 1 ? "entry" : "entries"})\n`;
    txt += "-----------------------------------------------------------------\n";

    dateEntries.forEach((entry, idx) => {
      const project = projectsMap.get(entry.projectId);
      const projName = project ? project.name : "Uncategorized";
      const tagsStr = entry.tags && entry.tags.length > 0 ? ` [${entry.tags.join("] [")}]` : "";
      const textToUse = (entry.activeVersion === "enhanced" && entry.enhancedText)
        ? entry.enhancedText
        : entry.rawText;

      txt += `\n${idx + 1}. [Project: ${projName}]${tagsStr}\n`;
      // Indent bullet points
      const lines = textToUse.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          txt += `   ${line.trim().startsWith("-") || line.trim().startsWith("•") ? line.trim() : `• ${line.trim()}`}\n`;
        }
      }
      if (entry.scheduledTaskId) {
        txt += `   └─ Google Task: Scheduled (${entry.scheduledTaskTitle || "Follow-up"})\n`;
      }
    });
  }

  txt += "\n\n=================================================================\n";
  txt += "End of Report\n";
  txt += "=================================================================\n";
  return txt;
}

// Download TXT
export function exportTxt(options: ExportReportOptions, filename = "work-log-report.txt") {
  const content = generateTxtReport(options);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

// Generate & Download PDF
export function exportPdf(options: ExportReportOptions, filename = "work-log-report.pdf") {
  const { entries, projectsMap, userName, projectName, startDate, endDate } = options;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let currentY = 20;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DAILY WORK LOG REPORT", margin + 8, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(
    `For: ${userName || "Developer"}   |   Project: ${projectName || "All Projects"}   |   Range: ${startDate} to ${endDate}`,
    margin + 8,
    currentY + 20
  );

  currentY += 36;

  // Summary statistics pill box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 2, 2, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total Entries: ${entries.length}`, margin + 6, currentY + 9);
  
  const datesCount = new Set(entries.map((e) => e.date)).size;
  doc.text(`Active Days: ${datesCount}`, margin + 55, currentY + 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, currentY + 9);

  currentY += 22;

  if (entries.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text("No work log entries found for the selected criteria.", margin, currentY + 10);
    doc.save(filename);
    return;
  }

  const grouped = groupEntriesByDate(entries);

  for (const [date, dateEntries] of Object.entries(grouped)) {
    // Check if new page needed for date header
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Date Header Bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, currentY, pageWidth - margin * 2, 8, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(formatDate(date), margin + 4, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${dateEntries.length} ${dateEntries.length === 1 ? "item" : "items"}`, pageWidth - margin - 20, currentY + 5.5);

    currentY += 12;

    // Entries for this date
    for (const entry of dateEntries) {
      const project = projectsMap.get(entry.projectId);
      const projName = project ? project.name : "General";
      const tagsStr = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join("] [")}]` : "";
      const textToUse = (entry.activeVersion === "enhanced" && entry.enhancedText)
        ? entry.enhancedText
        : entry.rawText;

      // Project & Tag line
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.text(`• ${projName}`, margin + 2, currentY);

      if (tagsStr) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(tagsStr, margin + 8 + doc.getTextWidth(`• ${projName}`), currentY);
      }

      currentY += 5;

      // Bullet points / Text body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const splitText = doc.splitTextToSize(textToUse, pageWidth - margin * 2 - 8);
      
      for (const line of splitText) {
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(line, margin + 6, currentY);
        currentY += 4.5;
      }

      if (entry.scheduledTaskId) {
        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(`✓ Google Task scheduled: ${entry.scheduledTaskTitle || "Follow-up"}`, margin + 6, currentY);
        currentY += 4.5;
      }

      currentY += 3; // spacing between entries
    }

    currentY += 4;
  }

  // Page numbering
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Work Log Report — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(filename);
}

// Generate & Download DOCX
export async function exportDocx(options: ExportReportOptions, filename = "work-log-report.docx") {
  const { entries, projectsMap, userName, projectName, startDate, endDate } = options;
  const grouped = groupEntriesByDate(entries);

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: "DAILY WORK LOG REPORT",
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Generated For: ", bold: true }),
        new TextRun({ text: userName || "Developer", bold: false }),
        new TextRun({ text: "   |   Project: ", bold: true }),
        new TextRun({ text: projectName || "All Projects", bold: false }),
        new TextRun({ text: "   |   Date Range: ", bold: true }),
        new TextRun({ text: `${startDate} to ${endDate}`, bold: false }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Total Entries: ${entries.length}  |  Generated on: ${new Date().toLocaleString()}`, italics: true, color: "666666" }),
      ],
      spacing: { after: 300 },
    }),
  ];

  if (entries.length === 0) {
    paragraphs.push(
      new Paragraph({
        text: "No work log entries found for the selected criteria.",
        spacing: { after: 200 },
      })
    );
  } else {
    for (const [date, dateEntries] of Object.entries(grouped)) {
      paragraphs.push(
        new Paragraph({
          text: `${formatDate(date)} (${dateEntries.length} ${dateEntries.length === 1 ? "entry" : "entries"})`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      for (const entry of dateEntries) {
        const project = projectsMap.get(entry.projectId);
        const projName = project ? project.name : "General";
        const tagsStr = entry.tags && entry.tags.length > 0 ? ` [${entry.tags.join("] [")}]` : "";
        const textToUse = (entry.activeVersion === "enhanced" && entry.enhancedText)
          ? entry.enhancedText
          : entry.rawText;

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `• ${projName}`, bold: true, color: "1E3A8A" }),
              new TextRun({ text: tagsStr ? `  ${tagsStr}` : "", italics: true, color: "555555" }),
            ],
            spacing: { before: 80, after: 40 },
          })
        );

        const lines = textToUse.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            paragraphs.push(
              new Paragraph({
                text: `    ${line.trim().startsWith("-") || line.trim().startsWith("•") ? line.trim() : `• ${line.trim()}`}`,
                spacing: { after: 40 },
              })
            );
          }
        }

        if (entry.scheduledTaskId) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `    ✓ Google Task Scheduled: ${entry.scheduledTaskTitle || "Follow-up"}`,
                  italics: true,
                  color: "10B981",
                }),
              ],
              spacing: { after: 60 },
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
