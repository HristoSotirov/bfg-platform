import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

// ===== START LIST =====

export interface StartListPdfEvent {
  scheduledAt: string | undefined;
  disciplineLabel: string;
  eventTypeLabel: string;
  eventNumber: number;
  showNumber: boolean;
  participations: {
    lane: number;
    clubName: string;
    teamNumber: number;
    crew: { seat: string; name: string }[];
  }[];
}

export interface StartListPdfOptions {
  competitionName: string;
  location: string;
  dayLabel: string;
  events: StartListPdfEvent[];
}

// ===== RESULTS =====

export interface ResultsPdfDiscipline {
  label: string;
  standings: {
    rank: number | null;
    clubLabel: string;
    crew: { seat: string; name: string }[];
    time: string;
    points: number | null;
  }[];
}

export interface ResultsPdfOptions {
  competitionName: string;
  location: string;
  disciplines: ResultsPdfDiscipline[];
}

// ===== WEIGH-IN =====

export interface WeighInPdfEvent {
  scheduledAt: string | undefined;
  disciplineLabel: string;
  eventTypeLabel: string;
  eventNumber: number;
  showNumber: boolean;
  crews: {
    clubName: string;
    teamNumber: number;
    athletes: {
      seat: string;
      name: string;
      cardNumber: string;
      roleLabel: string;
      weightLimit: number | null;
      weightKg: number | null;
      comment: string | null;
    }[];
  }[];
}

export interface WeighInPdfOptions {
  competitionName: string;
  location: string;
  dayLabel: string;
  events: WeighInPdfEvent[];
}

// ===== SHARED =====

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

async function loadFonts(doc: jsPDF): Promise<void> {
  if (!cachedRegular || !cachedBold) {
    const [regularBuf, boldBuf] = await Promise.all([
      fetch('/assets/fonts/Roboto-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('/assets/fonts/Roboto-Bold.ttf').then(r => r.arrayBuffer()),
    ]);

    const toBase64 = (buf: ArrayBuffer): string => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    cachedRegular = toBase64(regularBuf);
    cachedBold = toBase64(boldBuf);
  }

  doc.addFileToVFS('Roboto-Regular.ttf', cachedRegular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal', undefined as any, 'Identity-H');

  doc.addFileToVFS('Roboto-Bold.ttf', cachedBold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold', undefined as any, 'Identity-H');
}

function formatTimeOnly(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('bg-BG', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Sofia',
    });
  } catch {
    return '';
  }
}

interface DocContext {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  contentWidth: number;
}

async function createDoc(competitionName: string, subtitle: string): Promise<DocContext> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadFonts(doc);
  doc.setFont('Roboto', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const marginBottom = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = 18;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.text(competitionName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  return { doc, y, pageWidth, pageHeight, marginLeft, marginRight, marginBottom, contentWidth };
}

function tableStyles(centeredColumns?: number[]): any {
  return {
    theme: 'plain',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      overflow: 'linebreak',
      textColor: [55, 65, 81],
      lineColor: [229, 231, 235],
      lineWidth: 0,
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 7,
      fillColor: [249, 250, 251],
      textColor: [156, 163, 175],
      lineWidth: 0,
    },
    bodyStyles: {
      lineWidth: 0,
    },
    tableLineWidth: 0,
    didParseCell: (data: any) => {
      if (data.section === 'head') {
        data.cell.styles.lineWidth = { top: 0, bottom: 0.2, left: 0, right: 0 };
        data.cell.styles.lineColor = [229, 231, 235];
        if (centeredColumns?.includes(data.column.index)) {
          data.cell.styles.halign = 'center';
        }
      } else if (data.section === 'body') {
        data.cell.styles.lineWidth = { top: 0, bottom: 0.1, left: 0, right: 0 };
        data.cell.styles.lineColor = [243, 244, 246];
      }
    },
    rowPageBreak: 'avoid',
    pageBreak: 'avoid',
  };
}

function safeName(text: string): string {
  return text.replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '').trim().replace(/\s+/g, '_');
}

// ===== START LIST PDF =====

export async function generateStartListPdf(options: StartListPdfOptions): Promise<void> {
  const { competitionName, location, dayLabel, events } = options;
  const ctx = await createDoc(competitionName, `${location}  |  ${dayLabel}`);
  const { doc, pageHeight, marginLeft, marginRight, contentWidth, marginBottom } = ctx;
  let { y } = ctx;

  for (const ev of events) {
    const time = formatTimeOnly(ev.scheduledAt);
    const numberSuffix = ev.showNumber ? ` ${ev.eventNumber}` : '';
    const title = `${time ? time + '   ' : ''}${ev.disciplineLabel}  —  ${ev.eventTypeLabel}${numberSuffix}`;

    const rows: RowInput[] = ev.participations.map(p => {
      const crewText = p.crew.map(c => `${c.seat} - ${c.name}`).join('\n');
      const clubText = p.teamNumber > 1 ? `${p.clubName} (${p.teamNumber})` : p.clubName;
      return [String(p.lane), clubText, crewText];
    });

    const estimatedRowHeight = ev.participations.reduce((sum, p) => {
      return sum + Math.max(6, p.crew.length * 4.5) + 2;
    }, 0);
    const estimatedTableHeight = estimatedRowHeight + 20;

    if (y + estimatedTableHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.text(title, marginLeft, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentWidth,
      head: [['Кор.', 'Клуб', 'Екипаж']],
      body: rows,
      ...tableStyles([0]),
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [55, 65, 81] },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto', fontSize: 7, textColor: [75, 85, 99] },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`${safeName(competitionName)}_${safeName(dayLabel)}.pdf`);
}

// ===== RESULTS PDF =====

export async function generateResultsPdf(options: ResultsPdfOptions): Promise<void> {
  const { competitionName, location, disciplines } = options;
  const ctx = await createDoc(competitionName, `${location}  |  Резултати`);
  const { doc, pageHeight, marginLeft, marginRight, contentWidth, marginBottom } = ctx;
  let { y } = ctx;

  for (const disc of disciplines) {
    if (disc.standings.length === 0) continue;

    const rows: RowInput[] = disc.standings.map(s => {
      const crewText = s.crew.map(c => `${c.seat} - ${c.name}`).join('\n');
      return [
        s.rank != null ? String(s.rank) : '-',
        s.clubLabel,
        crewText,
        s.time || '-',
        s.points != null ? String(s.points) : '-',
      ];
    });

    const estimatedRowHeight = disc.standings.reduce((sum, s) => {
      return sum + Math.max(6, s.crew.length * 4.5) + 2;
    }, 0);
    const estimatedTableHeight = estimatedRowHeight + 20;

    if (y + estimatedTableHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.text(disc.label, marginLeft, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentWidth,
      head: [['Място', 'Клуб', 'Екипаж', 'Време', 'Точки']],
      body: rows,
      ...tableStyles([0, 3, 4]),
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [55, 65, 81] },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto', fontSize: 7, textColor: [75, 85, 99] },
        3: { cellWidth: 22, halign: 'center', fontSize: 7 },
        4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`${safeName(competitionName)}_Резултати.pdf`);
}

// ===== WEIGH-IN PDF =====

export async function generateWeighInPdf(options: WeighInPdfOptions): Promise<void> {
  const { competitionName, location, dayLabel, events } = options;
  const ctx = await createDoc(competitionName, `${location}  |  Кантар  |  ${dayLabel}`);
  const { doc, pageHeight, marginLeft, marginRight, contentWidth, marginBottom } = ctx;
  let { y } = ctx;

  for (const ev of events) {
    const time = formatTimeOnly(ev.scheduledAt);
    const numberSuffix = ev.showNumber ? ` ${ev.eventNumber}` : '';
    const title = `${time ? time + '   ' : ''}${ev.disciplineLabel}  —  ${ev.eventTypeLabel}${numberSuffix}`;

    const rows: RowInput[] = [];
    for (const crew of ev.crews) {
      const clubText = crew.teamNumber > 1 ? `${crew.clubName} (${crew.teamNumber})` : crew.clubName;
      for (const a of crew.athletes) {
        rows.push([
          `${a.seat} - ${a.name}`,
          a.cardNumber,
          a.roleLabel,
          a.weightLimit != null ? `${a.weightLimit} кг` : '–',
          a.weightKg != null ? `${a.weightKg} кг` : '–',
          a.comment || '',
        ]);
      }
      // Add club separator row
      rows.push([{ content: clubText, colSpan: 6, styles: { fillColor: [249, 250, 251], fontStyle: 'bold', fontSize: 7, textColor: [75, 85, 99] } }]);
    }
    // Move club header to top of each group — reverse the logic
    const groupedRows: RowInput[] = [];
    for (const crew of ev.crews) {
      const clubText = crew.teamNumber > 1 ? `${crew.clubName} (${crew.teamNumber})` : crew.clubName;
      groupedRows.push([{ content: clubText, colSpan: 6, styles: { fillColor: [249, 250, 251], fontStyle: 'bold', fontSize: 7, textColor: [75, 85, 99] } }]);
      for (const a of crew.athletes) {
        groupedRows.push([
          `${a.seat} - ${a.name}`,
          a.cardNumber,
          a.roleLabel,
          a.weightLimit != null ? `${a.weightLimit} кг` : '–',
          a.weightKg != null ? `${a.weightKg} кг` : '–',
          a.comment || '',
        ]);
      }
    }

    const estimatedTableHeight = groupedRows.length * 7 + 20;

    if (y + estimatedTableHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.text(title, marginLeft, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentWidth,
      head: [['Атлет', 'Карта', 'Роля', 'Лимит', 'Тегло', 'Коментар']],
      body: groupedRows,
      ...tableStyles([3, 4]),
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, fontSize: 7 },
        2: { cellWidth: 18, fontSize: 7 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 30, fontSize: 7, textColor: [107, 114, 128] },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`${safeName(competitionName)}_Кантар_${safeName(dayLabel)}.pdf`);
}
