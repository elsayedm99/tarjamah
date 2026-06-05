// ─────────────────────────────────────────────────────────────
// Tarjama — Export Service
// Exports translated pages as DOCX or PDF with proper RTL support.
// ─────────────────────────────────────────────────────────────

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
} from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import type { PageData } from '../types';

// ── DOCX Export ─────────────────────────────────────────────

/**
 * Exports translated pages to a .docx file with RTL Arabic text.
 */
export async function exportToDocx(
  projectName: string,
  pages: PageData[],
  options: {
    includeSource?: boolean;
    includePageNumbers?: boolean;
  } = {},
): Promise<void> {
  const { includeSource = false, includePageNumbers = true } = options;

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: projectName,
          bold: true,
          size: 32,
          font: 'Arial',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // Spacing after title
  children.push(
    new Paragraph({
      children: [],
      spacing: { after: 400 },
    }),
  );

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const translatedText = page.translatedText?.trim();

    // Copied original — embed page image
    if (page.isCopiedOriginal && page.originalPageImageDataUrl) {
      // Page break before (except first page)
      if (i > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      // Convert data URL to buffer
      const base64 = page.originalPageImageDataUrl.split(',')[1];
      const byteChars = atob(base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let j = 0; j < byteChars.length; j++) {
        byteArray[j] = byteChars.charCodeAt(j);
      }

      // A4 at 1 inch margins → ~6.5" wide, scale height proportionally
      // Approximate the image aspect from data URL by loading into an Image
      // For docx we use fixed A4-ish dimensions: 6.5" × 9.2" (landscape-safe)
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: byteArray,
              transformation: { width: 468, height: 660 }, // ~6.5"×9.2" at 72dpi
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      );

      continue;
    }

    if (!translatedText && !includeSource) continue;

    // Page header
    if (includePageNumbers) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `— صفحة ${page.pageNumber} / Page ${page.pageNumber} —`,
              bold: true,
              size: 18,
              color: '666666',
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        }),
      );
    }

    // Source text (optional)
    if (includeSource && page.sourceText?.trim()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Source:',
              bold: true,
              size: 18,
              color: '999999',
              font: 'Arial',
            }),
          ],
          spacing: { before: 100, after: 50 },
        }),
      );

      const sourceParas = page.sourceText.split(/\n\s*\n/).filter(Boolean);
      for (const para of sourceParas) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                size: 22,
                font: 'Arial',
                color: '555555',
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 120 },
          }),
        );
      }

      // Divider before translation
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '─────────────────────────────',
              size: 16,
              color: 'CCCCCC',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
        }),
      );
    }

    // Translated text (RTL Arabic)
    if (translatedText) {
      const translatedParas = translatedText.split(/\n\s*\n/).filter(Boolean);
      for (const para of translatedParas) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                size: 24,
                font: 'Arial',
                rightToLeft: true,
              }),
            ],
            bidirectional: true,
            alignment: AlignmentType.START,
            spacing: { after: 150, line: 360 },
          }),
        );
      }
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '(لم تتم الترجمة بعد — Not yet translated)',
              size: 20,
              color: 'AAAAAA',
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
      );
    }

    // Page break (except after the last page)
    if (i < pages.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          bidi: true,
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },

        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectName} — Translation.docx`);
}

// ── PDF Export ───────────────────────────────────────────────

/**
 * Exports translated pages to a PDF file.
 * Uses jsPDF with manual text layout for Arabic RTL support.
 */
export async function exportToPdf(
  projectName: string,
  pages: PageData[],
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(projectName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  yPos += 10;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const translatedText = page.translatedText?.trim();

    if (!translatedText) continue;

    // Page header
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(`Page ${page.pageNumber}`, pageWidth / 2, yPos, { align: 'center' });
    pdf.setTextColor(0);
    yPos += 8;

    // Translated text — split into lines that fit the page
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    const lines = pdf.splitTextToSize(translatedText, contentWidth);

    for (const line of lines) {
      if (yPos > pageHeight - margin - 10) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(line, margin, yPos);
      yPos += 6;
    }

    yPos += 8;

    // Page break for next page
    if (i < pages.length - 1) {
      pdf.addPage();
      yPos = margin;
    }
  }

  // Page numbers only (no branding)
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(180);
    pdf.text(
      `${p} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    );
  }

  pdf.save(`${projectName} — Translation.pdf`);
}
