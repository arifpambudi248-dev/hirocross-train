import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import type { TrainingSession, ReadinessLog, PhysicalTest } from '@/types/database';

// Brand color: HIROCROSS_TRAIN Red
const BRAND_RED: [number, number, number] = [220, 38, 38];

// Add branding header to PDF
const addPDFHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Title with white HIROCROSS_TRAIN
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(BRAND_RED[0], BRAND_RED[1], BRAND_RED[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('HIROCROSS_TRAIN', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });
  }
  
  doc.setTextColor(0, 0, 0);
  
  return 45;
};

export interface ExportData {
  athleteName: string;
  weeklyLoad: number;
  avgDailyLoad: number;
  latestFitness: number;
  latestFatigue: number;
  latestForm: number;
  latestACWR: number;
  latestReadiness: number;
  readinessZone: string;
  sessions: TrainingSession[];
  readinessLogs: ReadinessLog[];
  physicalTests: PhysicalTest[];
}

export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  
  let yPos = addPDFHeader(doc, 'Laporan Latihan Atlet', data.athleteName);
  
  doc.setFontSize(10);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, yPos);
  yPos += 8;
  
  // Summary metrics
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Metrik', 14, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const metrics = [
    ['Beban Latihan 7 Hari', `${data.weeklyLoad.toFixed(0)} (Rata-rata: ${data.avgDailyLoad.toFixed(0)})`],
    ['Fitness (CTL)', data.latestFitness.toFixed(0)],
    ['Fatigue (ATL)', data.latestFatigue.toFixed(0)],
    ['Form (TSB)', data.latestForm.toFixed(0)],
    ['ACWR', data.latestACWR.toFixed(2)],
    ['Readiness Score', `${data.latestReadiness.toFixed(0)} (${data.readinessZone})`],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Metrik', 'Nilai']],
    body: metrics,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Training sessions
  if (data.sessions.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sesi Latihan Terkini', 14, yPos);
    yPos += 8;
    
    const sessionData = data.sessions.slice(-10).map(s => [
      s.date,
      s.session_name || '-',
      s.duration_min?.toString() || '-',
      s.rpe?.toString() || '-',
      s.load_final?.toString() || '-',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Tanggal', 'Nama Sesi', 'Durasi (min)', 'RPE', 'Beban']],
      body: sessionData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Physical tests
  if (data.physicalTests.length > 0 && yPos < 250) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Hasil Tes Fisik', 14, yPos);
    yPos += 8;
    
    const testData = data.physicalTests.slice(0, 10).map(t => [
      t.test_date,
      t.category,
      t.test_name,
      `${t.value} ${t.unit}`,
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Tanggal', 'Kategori', 'Tes', 'Hasil']],
      body: testData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED },
    });
  }
  
  // Save
  doc.save(`laporan-latihan-${data.athleteName}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = async (data: ExportData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HIROCROSS_TRAIN';
  workbook.created = new Date();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Ringkasan');
  summarySheet.columns = [
    { header: 'Metrik', key: 'metric', width: 25 },
    { header: 'Nilai', key: 'value', width: 30 },
  ];
  
  // Add title
  summarySheet.insertRow(1, ['Laporan Latihan Atlet']);
  summarySheet.insertRow(2, ['Nama Atlet', data.athleteName]);
  summarySheet.insertRow(3, ['Tanggal Laporan', new Date().toLocaleDateString('id-ID')]);
  summarySheet.insertRow(4, []);
  
  // Add metrics
  summarySheet.addRow({ metric: 'Beban Latihan 7 Hari', value: data.weeklyLoad.toFixed(0) });
  summarySheet.addRow({ metric: 'Rata-rata Harian', value: data.avgDailyLoad.toFixed(0) });
  summarySheet.addRow({ metric: 'Fitness (CTL)', value: data.latestFitness.toFixed(0) });
  summarySheet.addRow({ metric: 'Fatigue (ATL)', value: data.latestFatigue.toFixed(0) });
  summarySheet.addRow({ metric: 'Form (TSB)', value: data.latestForm.toFixed(0) });
  summarySheet.addRow({ metric: 'ACWR', value: data.latestACWR.toFixed(2) });
  summarySheet.addRow({ metric: 'Readiness Score', value: data.latestReadiness.toFixed(0) });
  summarySheet.addRow({ metric: 'Readiness Zone', value: data.readinessZone });
  
  // Training sessions sheet
  if (data.sessions.length > 0) {
    const sessionsSheet = workbook.addWorksheet('Sesi Latihan');
    sessionsSheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Nama Sesi', key: 'session_name', width: 20 },
      { header: 'Durasi (min)', key: 'duration', width: 12 },
      { header: 'RPE', key: 'rpe', width: 8 },
      { header: 'Beban Auto', key: 'load_auto', width: 12 },
      { header: 'Beban Manual', key: 'load_manual', width: 12 },
      { header: 'Beban Final', key: 'load_final', width: 12 },
      { header: 'Catatan', key: 'notes', width: 30 },
    ];
    
    data.sessions.forEach(s => {
      sessionsSheet.addRow({
        date: s.date,
        session_name: s.session_name || '-',
        duration: s.duration_min || 0,
        rpe: s.rpe || 0,
        load_auto: s.load_auto || 0,
        load_manual: s.load_manual || 0,
        load_final: s.load_final || 0,
        notes: s.notes || '',
      });
    });
    
    // Style header
    sessionsSheet.getRow(1).font = { bold: true };
  }
  
  // Readiness logs sheet
  if (data.readinessLogs.length > 0) {
    const readinessSheet = workbook.addWorksheet('Readiness');
    readinessSheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'VJ', key: 'vj', width: 10 },
      { header: 'RHR', key: 'rhr', width: 10 },
      { header: 'VJ Score', key: 'vj_score', width: 10 },
      { header: 'RHR Score', key: 'rhr_score', width: 10 },
      { header: 'Readiness Score', key: 'readiness_score', width: 15 },
      { header: 'Zona', key: 'zone', width: 15 },
      { header: 'Catatan', key: 'notes', width: 30 },
    ];
    
    data.readinessLogs.forEach(r => {
      readinessSheet.addRow({
        date: r.date,
        vj: r.vj,
        rhr: r.rhr,
        vj_score: r.vj_score,
        rhr_score: r.rhr_score,
        readiness_score: r.readiness_score,
        zone: r.readiness_zone,
        notes: r.notes || '',
      });
    });
    
    readinessSheet.getRow(1).font = { bold: true };
  }
  
  // Physical tests sheet
  if (data.physicalTests.length > 0) {
    const testsSheet = workbook.addWorksheet('Tes Fisik');
    testsSheet.columns = [
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Kategori', key: 'category', width: 15 },
      { header: 'Nama Tes', key: 'test_name', width: 25 },
      { header: 'Nilai', key: 'value', width: 12 },
      { header: 'Satuan', key: 'unit', width: 10 },
      { header: 'Catatan', key: 'notes', width: 30 },
    ];
    
    data.physicalTests.forEach(t => {
      testsSheet.addRow({
        date: t.test_date,
        category: t.category,
        test_name: t.test_name,
        value: t.value,
        unit: t.unit,
        notes: t.notes || '',
      });
    });
    
    testsSheet.getRow(1).font = { bold: true };
  }
  
  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `laporan-latihan-${data.athleteName}-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

export interface AthleteComparisonData {
  athleteId: string;
  athleteName: string;
  weeklyLoad: number;
  fitness: number;
  fatigue: number;
  form: number;
  acwr: number;
  readiness: number;
  readinessZone: string;
}

export const exportComparisonToPDF = (athletes: AthleteComparisonData[]) => {
  const doc = new jsPDF();
  
  const yPos = addPDFHeader(doc, 'Perbandingan Performa Atlet', `Tanggal: ${new Date().toLocaleDateString('id-ID')}`);
  
  const comparisonData = athletes.map(a => [
    a.athleteName,
    a.weeklyLoad.toFixed(0),
    a.fitness.toFixed(0),
    a.fatigue.toFixed(0),
    a.form.toFixed(0),
    a.acwr.toFixed(2),
    a.readiness.toFixed(0),
    a.readinessZone,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Atlet', 'Beban 7H', 'CTL', 'ATL', 'TSB', 'ACWR', 'Readiness', 'Zona']],
    body: comparisonData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
  });
  
  doc.save(`perbandingan-atlet-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportComparisonToExcel = async (athletes: AthleteComparisonData[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HIROCROSS_TRAIN';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Perbandingan');
  sheet.columns = [
    { header: 'Nama Atlet', key: 'name', width: 25 },
    { header: 'Beban 7 Hari', key: 'weeklyLoad', width: 12 },
    { header: 'Fitness (CTL)', key: 'fitness', width: 12 },
    { header: 'Fatigue (ATL)', key: 'fatigue', width: 12 },
    { header: 'Form (TSB)', key: 'form', width: 12 },
    { header: 'ACWR', key: 'acwr', width: 10 },
    { header: 'Readiness', key: 'readiness', width: 12 },
    { header: 'Zona Readiness', key: 'zone', width: 15 },
  ];
  
  athletes.forEach(a => {
    sheet.addRow({
      name: a.athleteName,
      weeklyLoad: a.weeklyLoad.toFixed(0),
      fitness: a.fitness.toFixed(0),
      fatigue: a.fatigue.toFixed(0),
      form: a.form.toFixed(0),
      acwr: a.acwr.toFixed(2),
      readiness: a.readiness.toFixed(0),
      zone: a.readinessZone,
    });
  });
  
  sheet.getRow(1).font = { bold: true };
  
  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `perbandingan-atlet-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Session Exercise Types
export interface SessionExercise {
  exercise_name: string;
  exercise_type: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  repetitions: number | null;
  total_volume: number | null;
}

export interface SessionWithExercises {
  id: string;
  date: string;
  session_name: string | null;
  rpe: number | null;
  duration_minutes: number | null;
  load_final: number;
  notes: string | null;
  exercises?: SessionExercise[];
}

export const exportSessionDetailToPDF = (
  session: SessionWithExercises,
  athleteName: string
) => {
  const doc = new jsPDF();
  
  const sessionDate = new Date(session.date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  let yPos = addPDFHeader(doc, 'Detail Sesi Latihan', `${athleteName} - ${sessionDate}`);
  
  // Session Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Sesi", 14, yPos);
  yPos += 8;
  
  const sessionInfo = [
    ["Nama Sesi", session.session_name || "Latihan"],
    ["Durasi", `${session.duration_minutes} menit`],
    ["RPE", `${session.rpe}/10`],
    ["Training Load", `${session.load_final} AU`],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [["Parameter", "Nilai"]],
    body: sessionInfo,
    theme: "grid",
    headStyles: { fillColor: BRAND_RED },
    styles: { fontSize: 10 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Exercise Details
  if (session.exercises && session.exercises.length > 0) {
    // Strength Exercises
    const strengthExercises = session.exercises.filter(e => e.exercise_type === "strength");
    if (strengthExercises.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Latihan Strength", 14, yPos);
      yPos += 6;
      
      const strengthData = strengthExercises.map(e => [
        e.exercise_name,
        e.sets?.toString() || "-",
        e.reps?.toString() || "-",
        e.weight_kg ? `${e.weight_kg} kg` : "-",
        `${((e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0)).toLocaleString()} kg`
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Latihan", "Set", "Rep", "Beban", "Total Volume"]],
        body: strengthData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] }, // Blue
        styles: { fontSize: 9 },
      });
      
      const totalStrength = strengthExercises.reduce(
        (sum, e) => sum + ((e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0)), 0
      );
      
      yPos = (doc as any).lastAutoTable.finalY + 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Volume Strength: ${totalStrength.toLocaleString()} kg`, 14, yPos);
      yPos += 10;
    }
    
    // Cardio Exercises
    const cardioExercises = session.exercises.filter(e => e.exercise_type === "cardio");
    if (cardioExercises.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Latihan Cardio", 14, yPos);
      yPos += 6;
      
      const cardioData = cardioExercises.map(e => {
        const dist = e.distance_meters || 0;
        const distDisplay = dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist} m`;
        const durSec = e.duration_seconds || 0;
        const durDisplay = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, "0")}` : "-";
        return [e.exercise_name, distDisplay, durDisplay];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [["Latihan", "Jarak", "Waktu"]],
        body: cardioData,
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] }, // Green
        styles: { fontSize: 9 },
      });
      
      const totalDistance = cardioExercises.reduce((sum, e) => sum + (e.distance_meters || 0), 0);
      
      yPos = (doc as any).lastAutoTable.finalY + 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Jarak: ${(totalDistance / 1000).toFixed(2)} km`, 14, yPos);
      yPos += 10;
    }
    
    // Skill Exercises
    const skillExercises = session.exercises.filter(e => e.exercise_type === "skill");
    if (skillExercises.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Latihan Skill", 14, yPos);
      yPos += 6;
      
      const skillData = skillExercises.map(e => [
        e.exercise_name,
        e.repetitions?.toString() || "-"
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Latihan", "Repetisi"]],
        body: skillData,
        theme: "grid",
        headStyles: { fillColor: [249, 115, 22] }, // Orange
        styles: { fontSize: 9 },
      });
      
      const totalReps = skillExercises.reduce((sum, e) => sum + (e.repetitions || 0), 0);
      
      yPos = (doc as any).lastAutoTable.finalY + 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Repetisi: ${totalReps.toLocaleString()}`, 14, yPos);
      yPos += 10;
    }
  }
  
  // Notes
  if (session.notes) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Catatan", 14, yPos);
    yPos += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notesPageWidth = doc.internal.pageSize.width;
    const splitNotes = doc.splitTextToSize(session.notes, notesPageWidth - 28);
    doc.text(splitNotes, 14, yPos);
  }
  
  // Save
  const fileName = `detail-sesi-${session.session_name?.replace(/\s+/g, "-") || "latihan"}-${session.date}.pdf`;
  doc.save(fileName);
};

// Weekly volume data for charts
export interface WeeklyVolumeData {
  week: string;
  weekStart: string;
  strengthVolume: number;
  cardioVolume: number;
  skillVolume: number;
  sessionCount: number;
}

// Annual Plan Export
export interface AnnualPlanPhase {
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  percentage: number;
  plannedLoad?: number;
  actualLoad?: number;
}

export interface BiomotorConfig {
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
}

export interface WeeklyPlanData {
  week_number: number;
  week_start_date: string;
  planned_volume: number;
  planned_intensity: number;
}

export interface AnnualPlanExportData {
  athleteName: string;
  planName: string;
  startDate: string;
  competitionDate: string;
  periodizationType: string;
  phases: AnnualPlanPhase[];
  weeklyData?: WeeklyPlanData[];
  biomotorConfig?: BiomotorConfig;
  trainingFocus?: { week_number: number; focus_type: string; label?: string }[];
  weeklyTests?: { week_number: number; test_name: string }[];
  competitions?: { competition_name: string; competition_date: string }[];
}

// Helper to get phase for a week
function getPhaseForWeek(weekStart: Date, phases: AnnualPlanPhase[]): { name: string; color: [number, number, number] } | null {
  for (const phase of phases) {
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    if (weekStart >= phaseStart && weekStart <= phaseEnd) {
      let phaseName = 'UMUM';
      let color: [number, number, number] = [34, 211, 238]; // cyan
      
      if (phase.name.includes('GPP') || phase.name.includes('Umum') || phase.name.includes('Accumulation')) {
        phaseName = 'UMUM';
        color = [34, 211, 238]; // cyan
      } else if (phase.name.includes('SPP') || phase.name.includes('Khusus') || phase.name.includes('Transmutation')) {
        phaseName = 'KHUSUS';
        color = [34, 197, 94]; // green
      } else if (phase.name.includes('Pra') || phase.name.includes('Pre')) {
        phaseName = 'PRA-KOMP';
        color = [251, 146, 60]; // orange
      } else if (phase.name.includes('Kompetisi') || phase.name.includes('Realization') || phase.name.includes('Competition')) {
        phaseName = 'KOMPETISI';
        color = [168, 85, 247]; // purple
      }
      return { name: phaseName, color };
    }
  }
  return null;
}

export const exportAnnualPlanToPDF = (data: AnnualPlanExportData) => {
  // Use landscape orientation for better calendar visualization
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Calculate weeks
  const startD = new Date(data.startDate);
  const endD = new Date(data.competitionDate);
  const totalWeeks = data.weeklyData?.length || Math.ceil((endD.getTime() - startD.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  // Calculate cell width based on number of weeks
  const labelColWidth = 22;
  const availableWidth = pageWidth - 20 - labelColWidth; // margins
  const cellWidth = Math.min(12, availableWidth / totalWeeks);
  const tableWidth = labelColWidth + (cellWidth * totalWeeks);
  const startX = 10;
  
  // Header
  let yPos = addPDFHeader(doc, 'Kalender Periodisasi Annual Plan', `${data.athleteName} - ${data.planName}`);
  
  doc.setFontSize(9);
  doc.text(`Periode: ${data.startDate} s/d ${data.competitionDate} | Tipe: ${data.periodizationType}`, 14, yPos);
  yPos += 8;
  
  const rowHeight = 6;
  let currentY = yPos;
  
  // Row function helper
  const drawRow = (label: string, labelColor: [number, number, number], labelTextColor: [number, number, number], 
    cells: { text: string; bgColor?: [number, number, number]; textColor?: [number, number, number] }[]) => {
    // Label cell
    doc.setFillColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.rect(startX, currentY, labelColWidth, rowHeight, 'F');
    doc.setDrawColor(100, 100, 100);
    doc.rect(startX, currentY, labelColWidth, rowHeight, 'S');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(labelTextColor[0], labelTextColor[1], labelTextColor[2]);
    doc.text(label, startX + 1.5, currentY + rowHeight - 1.5);
    
    // Data cells
    let x = startX + labelColWidth;
    cells.forEach((cell) => {
      if (cell.bgColor) {
        doc.setFillColor(cell.bgColor[0], cell.bgColor[1], cell.bgColor[2]);
        doc.rect(x, currentY, cellWidth, rowHeight, 'F');
      }
      doc.setDrawColor(180, 180, 180);
      doc.rect(x, currentY, cellWidth, rowHeight, 'S');
      
      const tc = cell.textColor || [50, 50, 50];
      doc.setTextColor(tc[0], tc[1], tc[2]);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      
      // Center text
      const textWidth = doc.getTextWidth(cell.text);
      doc.text(cell.text, x + (cellWidth - textWidth) / 2, currentY + rowHeight - 1.5);
      x += cellWidth;
    });
    
    currentY += rowHeight;
  };
  
  // Prepare week data
  const weeksData: {
    weekNum: number;
    weekStart: Date;
    dateRange: string;
    phase: { name: string; color: [number, number, number] } | null;
    volume: number;
    intensity: number;
    hasCompetition: boolean;
    hasTest: boolean;
  }[] = [];
  
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(startD.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const weekData = data.weeklyData?.find(w => w.week_number === i + 1);
    
    // Check for competition
    let hasCompetition = false;
    const mainCompDate = new Date(data.competitionDate);
    if (mainCompDate >= weekStart && mainCompDate <= weekEnd) hasCompetition = true;
    data.competitions?.forEach(c => {
      const cd = new Date(c.competition_date);
      if (cd >= weekStart && cd <= weekEnd) hasCompetition = true;
    });
    
    // Check for test
    const hasTest = data.weeklyTests?.some(t => t.week_number === i + 1) || false;
    
    weeksData.push({
      weekNum: i + 1,
      weekStart,
      dateRange: `${weekStart.getDate()}-${weekEnd.getDate()}`,
      phase: getPhaseForWeek(weekStart, data.phases),
      volume: weekData?.planned_volume || 70,
      intensity: weekData?.planned_intensity || 50,
      hasCompetition,
      hasTest,
    });
  }
  
  // Group weeks by month
  const monthGroups: { name: string; weekIndexes: number[] }[] = [];
  let currentMonth = '';
  weeksData.forEach((w, idx) => {
    const monthName = w.weekStart.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
    if (monthName !== currentMonth) {
      monthGroups.push({ name: monthName, weekIndexes: [idx] });
      currentMonth = monthName;
    } else {
      monthGroups[monthGroups.length - 1].weekIndexes.push(idx);
    }
  });
  
  // ROW 1: BULAN (merged cells)
  doc.setFillColor(249, 115, 22);
  doc.rect(startX, currentY, labelColWidth, rowHeight, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(startX, currentY, labelColWidth, rowHeight, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BULAN', startX + 1.5, currentY + rowHeight - 1.5);
  
  let x = startX + labelColWidth;
  monthGroups.forEach(mg => {
    const colSpan = mg.weekIndexes.length;
    const width = colSpan * cellWidth;
    doc.setFillColor(249, 115, 22);
    doc.rect(x, currentY, width, rowHeight, 'F');
    doc.setDrawColor(200, 100, 50);
    doc.rect(x, currentY, width, rowHeight, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    const textWidth = doc.getTextWidth(mg.name);
    doc.text(mg.name, x + (width - textWidth) / 2, currentY + rowHeight - 1.5);
    x += width;
  });
  currentY += rowHeight;
  
  // ROW 2: MINGGU
  drawRow('MINGGU', [251, 146, 60], [255, 255, 255], 
    weeksData.map(w => ({ text: String(w.weekNum), bgColor: [251, 146, 60] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] })));
  
  // ROW 3: TANGGAL
  drawRow('TANGGAL', [253, 186, 116], [120, 60, 20], 
    weeksData.map(w => ({ text: w.dateRange, bgColor: [253, 186, 116] as [number, number, number], textColor: [120, 60, 20] as [number, number, number] })));
  
  // ROW 4: FASE (merged by phase)
  doc.setFillColor(254, 243, 199);
  doc.rect(startX, currentY, labelColWidth, rowHeight, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(startX, currentY, labelColWidth, rowHeight, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 60, 20);
  doc.text('FASE', startX + 1.5, currentY + rowHeight - 1.5);
  
  // Group by phase
  const phaseGroups: { phase: { name: string; color: [number, number, number] } | null; count: number }[] = [];
  weeksData.forEach(w => {
    const lastGroup = phaseGroups[phaseGroups.length - 1];
    if (lastGroup && lastGroup.phase?.name === w.phase?.name) {
      lastGroup.count++;
    } else {
      phaseGroups.push({ phase: w.phase, count: 1 });
    }
  });
  
  x = startX + labelColWidth;
  phaseGroups.forEach(pg => {
    const width = pg.count * cellWidth;
    if (pg.phase) {
      doc.setFillColor(pg.phase.color[0], pg.phase.color[1], pg.phase.color[2]);
    } else {
      doc.setFillColor(200, 200, 200);
    }
    doc.rect(x, currentY, width, rowHeight, 'F');
    doc.setDrawColor(100, 100, 100);
    doc.rect(x, currentY, width, rowHeight, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    const name = pg.phase?.name || '-';
    const textWidth = doc.getTextWidth(name);
    doc.text(name, x + (width - textWidth) / 2, currentY + rowHeight - 1.5);
    x += width;
  });
  currentY += rowHeight;
  
  // ROW 5: TES & KOMP
  drawRow('TES & KOMP', [226, 232, 240], [60, 60, 80],
    weeksData.map(w => {
      let symbol = '-';
      if (w.hasCompetition && w.hasTest) symbol = '🏆T';
      else if (w.hasCompetition) symbol = '🏆';
      else if (w.hasTest) symbol = 'T';
      return { text: symbol, bgColor: [248, 250, 252] as [number, number, number], textColor: [60, 60, 80] as [number, number, number] };
    }));
  
  // ROW 6: VOLUME %
  drawRow('VOLUME %', [191, 219, 254], [30, 64, 175],
    weeksData.map(w => ({ 
      text: `${w.volume}`, 
      bgColor: [219, 234, 254] as [number, number, number], 
      textColor: [30, 64, 175] as [number, number, number] 
    })));
  
  // ROW 7: INTENSITAS %
  drawRow('INTENSITAS %', [254, 202, 202], [153, 27, 27],
    weeksData.map(w => ({ 
      text: `${w.intensity}`, 
      bgColor: [254, 226, 226] as [number, number, number], 
      textColor: [153, 27, 27] as [number, number, number] 
    })));
  
  // ROW 8: Biomotor header
  if (data.biomotorConfig) {
    doc.setFillColor(13, 148, 136);
    doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
    doc.setDrawColor(100, 100, 100);
    doc.rect(startX, currentY, tableWidth, rowHeight, 'S');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TARGET BIOMOTOR PER MINGGU', startX + tableWidth / 2 - 25, currentY + rowHeight - 1.5);
    currentY += rowHeight;
    
    // Biomotor rows
    const biomotorRows = [
      { key: 'kekuatan', label: 'KEKUATAN', labelBg: [254, 202, 202] as [number, number, number], labelText: [153, 27, 27] as [number, number, number], cellBg: [254, 242, 242] as [number, number, number], cellText: [153, 27, 27] as [number, number, number] },
      { key: 'kecepatan', label: 'KECEPATAN', labelBg: [254, 249, 195] as [number, number, number], labelText: [133, 77, 14] as [number, number, number], cellBg: [254, 252, 232] as [number, number, number], cellText: [133, 77, 14] as [number, number, number] },
      { key: 'daya_tahan', label: 'D.TAHAN', labelBg: [191, 219, 254] as [number, number, number], labelText: [30, 64, 175] as [number, number, number], cellBg: [239, 246, 255] as [number, number, number], cellText: [30, 64, 175] as [number, number, number] },
      { key: 'teknik', label: 'TEKNIK', labelBg: [187, 247, 208] as [number, number, number], labelText: [22, 101, 52] as [number, number, number], cellBg: [240, 253, 244] as [number, number, number], cellText: [22, 101, 52] as [number, number, number] },
      { key: 'taktik', label: 'TAKTIK', labelBg: [233, 213, 255] as [number, number, number], labelText: [88, 28, 135] as [number, number, number], cellBg: [250, 245, 255] as [number, number, number], cellText: [88, 28, 135] as [number, number, number] },
    ];
    
    biomotorRows.forEach(row => {
      drawRow(row.label, row.labelBg, row.labelText,
        weeksData.map(w => {
          const baseValue = (data.biomotorConfig as any)[row.key] || 0;
          const value = Math.round((w.volume / 100) * baseValue);
          return { 
            text: value > 999 ? (value / 1000).toFixed(1) + 'k' : String(value), 
            bgColor: row.cellBg, 
            textColor: row.cellText 
          };
        }));
    });
  }
  
  // GRAPH ROW - Visual bar chart
  currentY += 2;
  const graphHeight = 25;
  const graphY = currentY;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(startX, graphY, tableWidth, graphHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(startX, graphY, tableWidth, graphHeight, 'S');
  
  // Label
  doc.setFillColor(226, 232, 240);
  doc.rect(startX, graphY, labelColWidth, graphHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(startX, graphY, labelColWidth, graphHeight, 'S');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 80);
  doc.text('GRAFIK', startX + 2, graphY + 8);
  
  // Legend
  doc.setFillColor(59, 130, 246);
  doc.rect(startX + 2, graphY + 11, 3, 3, 'F');
  doc.setFontSize(4);
  doc.setTextColor(60, 60, 80);
  doc.text('Vol', startX + 6, graphY + 13.5);
  
  doc.setFillColor(239, 68, 68);
  doc.rect(startX + 2, graphY + 15, 3, 3, 'F');
  doc.text('Int', startX + 6, graphY + 17.5);
  
  // Draw bars for each week
  x = startX + labelColWidth;
  const barMaxHeight = graphHeight - 4;
  weeksData.forEach(w => {
    const volHeight = (w.volume / 100) * barMaxHeight;
    const intHeight = (w.intensity / 100) * barMaxHeight;
    const barWidth = cellWidth * 0.35;
    const barGap = cellWidth * 0.1;
    
    // Volume bar (blue)
    doc.setFillColor(59, 130, 246);
    doc.rect(x + barGap, graphY + graphHeight - 2 - volHeight, barWidth, volHeight, 'F');
    
    // Intensity bar (red)
    doc.setFillColor(239, 68, 68);
    doc.rect(x + barGap + barWidth + 1, graphY + graphHeight - 2 - intHeight, barWidth, intHeight, 'F');
    
    x += cellWidth;
  });
  
  currentY = graphY + graphHeight + 5;
  
  // Add Phase Summary Table on new page
  doc.addPage('portrait');
  let yPos2 = addPDFHeader(doc, 'Ringkasan Fase Periodisasi', `${data.athleteName} - ${data.planName}`);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Periode: ${data.startDate} s/d ${data.competitionDate}`, 14, yPos2);
  doc.text(`Tipe Periodisasi: ${data.periodizationType}`, 14, yPos2 + 5);
  yPos2 += 15;
  
  // Phase table
  const phaseTableData = data.phases.map(p => [
    p.name,
    p.startDate,
    p.endDate,
    `${p.durationDays} hari`,
    `${p.percentage.toFixed(1)}%`,
    p.plannedLoad?.toFixed(0) || '-',
    p.actualLoad?.toFixed(0) || '-',
  ]);
  
  autoTable(doc, {
    startY: yPos2,
    head: [['Fase', 'Mulai', 'Selesai', 'Durasi', '%', 'Planned Load', 'Actual Load']],
    body: phaseTableData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
    styles: { fontSize: 9 },
  });
  
  yPos2 = (doc as any).lastAutoTable.finalY + 15;
  
  // Biomotor config summary
  if (data.biomotorConfig) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Konfigurasi Base Biomotor', 14, yPos2);
    yPos2 += 8;
    
    const configData = [
      ['Kekuatan', data.biomotorConfig.kekuatan.toLocaleString()],
      ['Kecepatan', data.biomotorConfig.kecepatan.toLocaleString()],
      ['Daya Tahan', data.biomotorConfig.daya_tahan.toLocaleString()],
      ['Teknik', data.biomotorConfig.teknik.toLocaleString()],
      ['Taktik', data.biomotorConfig.taktik.toLocaleString()],
    ];
    
    autoTable(doc, {
      startY: yPos2,
      head: [['Komponen', 'Base Value (100% Volume)']],
      body: configData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 60 } },
    });
  }
  
  doc.save(`annual-plan-${data.athleteName}-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Readiness Export
export interface ReadinessExportData {
  athleteName: string;
  logs: ReadinessLog[];
  baselineVj: number;
  baselineRhr: number;
}

export const exportReadinessToPDF = (data: ReadinessExportData) => {
  const doc = new jsPDF();
  
  let yPos = addPDFHeader(doc, 'Laporan Readiness Harian', data.athleteName);
  
  doc.setFontSize(10);
  doc.text(`Baseline VJ: ${data.baselineVj} cm | Baseline RHR: ${data.baselineRhr} bpm`, 14, yPos);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, yPos + 6);
  yPos += 16;
  
  if (data.logs.length > 0) {
    const latestLog = data.logs[0];
    const summaryData = [
      ['Readiness Terkini', `${latestLog.readiness_score} (${latestLog.readiness_zone})`],
      ['VJ Terkini', `${latestLog.vj} cm (Skor: ${latestLog.vj_score})`],
      ['RHR Terkini', `${latestLog.rhr} bpm (Skor: ${latestLog.rhr_score})`],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metrik', 'Nilai']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Riwayat Readiness (30 Hari)', 14, yPos);
  yPos += 8;
  
  const logData = data.logs.slice(0, 30).map(l => [
    l.date,
    l.vj.toString(),
    l.rhr.toString(),
    l.vj_score.toString(),
    l.rhr_score.toString(),
    l.readiness_score.toString(),
    l.readiness_zone,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Tanggal', 'VJ', 'RHR', 'Skor VJ', 'Skor RHR', 'Readiness', 'Zona']],
    body: logData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
    styles: { fontSize: 9 },
  });
  
  doc.save(`readiness-${data.athleteName}-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Physical Tests Export with comprehensive norms
export interface PhysicalTestExportData {
  athleteName: string;
  athleteAvatarUrl?: string;
  tests: PhysicalTest[];
  testScores?: { 
    testName: string; 
    score: number; 
    percentage?: number; // Optional percentage field
    value: number; 
    unit: string;
    category?: string;
  }[];
  athleteAge?: number;
  athleteGender?: 'male' | 'female';
  bodyWeight?: number;
  height?: number;
  bmi?: number;
  sport?: string;
}

// Category label mapping
const CATEGORY_LABELS: Record<string, string> = {
  daya_tahan: 'Daya Tahan',
  kecepatan: 'Kecepatan',
  kekuatan: 'Kekuatan',
  kelincahan: 'Kelincahan',
  fleksibilitas: 'Fleksibilitas',
  power: 'Power/Daya Ledak',
  koordinasi: 'Koordinasi',
  komposisi_tubuh: 'Komposisi Tubuh',
};

const getScoreCategoryLabel = (score: number): string => {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Baik';
  if (score >= 3) return 'Cukup';
  if (score >= 2) return 'Kurang';
  return 'Sangat Kurang';
};

const getPercentageCategoryLabel = (percentage: number): string => {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 60) return 'Baik';
  if (percentage >= 40) return 'Cukup';
  if (percentage >= 20) return 'Kurang';
  return 'Sangat Kurang';
};

const getAgeGroupLabel = (age: number): string => {
  if (age < 15) return '< 15 tahun (Youth)';
  if (age < 20) return '15-19 tahun (Junior)';
  if (age < 35) return '20-34 tahun (Senior)';
  return '≥ 35 tahun (Master)';
};

// Convert score (1-5) to percentage (0-100)
const scoreToPercentage = (score: number): number => {
  return ((score - 1) / 4) * 100;
};

// Helper function to draw mini speedometer
const drawMiniSpeedometer = (
  doc: jsPDF, 
  centerX: number, 
  centerY: number, 
  percentage: number, 
  label: string,
  radius: number = 12
) => {
  const arcWidth = 3;
  const startAngle = 135;
  const endAngle = 405;
  const sweepAngle = endAngle - startAngle;
  
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const polarToXY = (angle: number, r: number) => ({
    x: centerX + r * Math.cos(toRadians(angle)),
    y: centerY + r * Math.sin(toRadians(angle))
  });
  
  // Draw gradient arc segments
  const segments = [
    { start: 0, end: 20, color: [239, 68, 68] as [number, number, number] },
    { start: 20, end: 40, color: [249, 115, 22] as [number, number, number] },
    { start: 40, end: 60, color: [250, 204, 21] as [number, number, number] },
    { start: 60, end: 80, color: [59, 130, 246] as [number, number, number] },
    { start: 80, end: 100, color: [34, 197, 94] as [number, number, number] },
  ];
  
  doc.setLineWidth(arcWidth);
  segments.forEach(seg => {
    const segStartAngle = startAngle + (seg.start / 100) * sweepAngle;
    const segEndAngle = startAngle + (seg.end / 100) * sweepAngle;
    
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const a1 = segStartAngle + (i / steps) * (segEndAngle - segStartAngle);
      const a2 = segStartAngle + ((i + 1) / steps) * (segEndAngle - segStartAngle);
      const p1 = polarToXY(a1, radius);
      const p2 = polarToXY(a2, radius);
      
      doc.setDrawColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
  });
  
  // Draw needle
  const needleAngle = startAngle + (percentage / 100) * sweepAngle;
  const needleLength = radius * 0.55;
  const needleEnd = polarToXY(needleAngle, needleLength);
  
  let needleColor: [number, number, number];
  if (percentage >= 80) needleColor = [34, 197, 94];
  else if (percentage >= 60) needleColor = [59, 130, 246];
  else if (percentage >= 40) needleColor = [250, 204, 21];
  else if (percentage >= 20) needleColor = [249, 115, 22];
  else needleColor = [239, 68, 68];
  
  doc.setDrawColor(needleColor[0], needleColor[1], needleColor[2]);
  doc.setLineWidth(1);
  doc.line(centerX, centerY, needleEnd.x, needleEnd.y);
  
  // Center dot
  doc.setFillColor(60, 60, 60);
  doc.circle(centerX, centerY, 1.5, 'F');
  
  // Percentage text - positioned below arc
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(needleColor[0], needleColor[1], needleColor[2]);
  doc.text(`${percentage.toFixed(0)}%`, centerX, centerY + radius + 6, { align: 'center' });
  
  // Label - truncate if too long
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Truncate label to prevent overflow
  const maxLabelWidth = 34;
  let displayLabel = label;
  while (doc.getTextWidth(displayLabel) > maxLabelWidth && displayLabel.length > 3) {
    displayLabel = displayLabel.slice(0, -1);
  }
  if (displayLabel.length < label.length) {
    displayLabel = displayLabel.slice(0, -2) + '..';
  }
  
  doc.text(displayLabel, centerX, centerY + radius + 12, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to draw radar chart with improved label positioning
const drawRadarChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  categoryScores: { category: string; percentage: number }[],
  radius: number = 35
) => {
  const n = categoryScores.length;
  if (n < 3) return; // Need at least 3 points for radar
  
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const angleStep = 360 / n;
  
  // Start from top (-90 degrees)
  const getPoint = (index: number, value: number) => {
    const angle = -90 + index * angleStep;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(toRadians(angle)),
      y: centerY + r * Math.sin(toRadians(angle)),
      angle
    };
  };
  
  // Draw grid circles
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  [20, 40, 60, 80, 100].forEach(level => {
    const r = (level / 100) * radius;
    doc.circle(centerX, centerY, r);
  });
  
  // Draw grid lines from center to each axis
  doc.setDrawColor(180, 180, 180);
  for (let i = 0; i < n; i++) {
    const endPoint = getPoint(i, 100);
    doc.line(centerX, centerY, endPoint.x, endPoint.y);
  }
  
  // Draw axis labels with smart positioning to prevent overlap
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  
  categoryScores.forEach((cat, i) => {
    const labelPoint = getPoint(i, 130); // Increase distance for labels
    const label = CATEGORY_LABELS[cat.category] || cat.category;
    
    // Determine text alignment based on position
    let align: 'left' | 'center' | 'right' = 'center';
    let xOffset = 0;
    let yOffset = 0;
    
    const normalizedAngle = ((labelPoint.angle % 360) + 360) % 360;
    
    // Right side labels (roughly -60 to 60 degrees normalized)
    if (normalizedAngle > 300 || normalizedAngle < 60) {
      if (normalizedAngle > 330 || normalizedAngle < 30) {
        // Top area - center align
        align = 'center';
        yOffset = -2;
      } else if (normalizedAngle >= 30 && normalizedAngle < 60) {
        // Top-right - left align
        align = 'left';
        xOffset = 2;
      } else {
        // Bottom-right (300-330)
        align = 'left';
        xOffset = 2;
      }
    } 
    // Bottom labels (60 to 120)
    else if (normalizedAngle >= 60 && normalizedAngle <= 120) {
      align = 'center';
      yOffset = 3;
    }
    // Left side labels (120 to 240)
    else if (normalizedAngle > 120 && normalizedAngle < 240) {
      align = 'right';
      xOffset = -2;
    }
    // Top-left (240 to 300)
    else {
      align = 'right';
      xOffset = -2;
    }
    
    // Truncate label if too long
    let displayLabel = label;
    const maxWidth = 25;
    while (doc.getTextWidth(displayLabel) > maxWidth && displayLabel.length > 4) {
      displayLabel = displayLabel.slice(0, -1);
    }
    if (displayLabel.length < label.length) {
      displayLabel = displayLabel.trim() + '..';
    }
    
    doc.text(displayLabel, labelPoint.x + xOffset, labelPoint.y + yOffset, { align });
  });
  
  // Draw filled polygon for scores
  const points = categoryScores.map((cat, i) => getPoint(i, cat.percentage));
  
  // Draw polygon outline and fill
  doc.setFillColor(220, 38, 38);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  
  if (points.length > 0) {
    // Draw lines between points
    doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    // Draw border lines with full opacity
    doc.setLineWidth(0.8);
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
    
    // Draw points
    doc.setFillColor(220, 38, 38);
    points.forEach(p => {
      doc.circle(p.x, p.y, 1.5, 'F');
    });
  }
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to draw BMI speedometer
const drawBMISpeedometer = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  bmiValue: number,
  radius: number = 18
) => {
  const arcWidth = 3;
  const startAngle = 135;
  const endAngle = 405;
  const sweepAngle = endAngle - startAngle;
  
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const polarToXY = (angle: number, r: number) => ({
    x: centerX + r * Math.cos(toRadians(angle)),
    y: centerY + r * Math.sin(toRadians(angle))
  });
  
  // BMI percentage (18.5-30 range mapped to 0-100%)
  // < 18.5 = low, 18.5-24.9 = normal (optimal), 25-29.9 = overweight, >= 30 = obese
  let bmiPercentage: number;
  if (bmiValue < 18.5) {
    bmiPercentage = Math.max(5, (bmiValue / 18.5) * 30);
  } else if (bmiValue < 25) {
    bmiPercentage = 30 + ((bmiValue - 18.5) / 6.5) * 50; // 30-80%
  } else if (bmiValue < 30) {
    bmiPercentage = 80 - ((bmiValue - 25) / 5) * 30; // 80-50%
  } else {
    bmiPercentage = Math.max(10, 50 - ((bmiValue - 30) / 10) * 40); // 50-10%
  }
  
  // Draw gradient arc
  const segments = [
    { start: 0, end: 20, color: [239, 68, 68] as [number, number, number] },
    { start: 20, end: 40, color: [249, 115, 22] as [number, number, number] },
    { start: 40, end: 60, color: [250, 204, 21] as [number, number, number] },
    { start: 60, end: 80, color: [59, 130, 246] as [number, number, number] },
    { start: 80, end: 100, color: [34, 197, 94] as [number, number, number] },
  ];
  
  doc.setLineWidth(arcWidth);
  segments.forEach(seg => {
    const segStartAngle = startAngle + (seg.start / 100) * sweepAngle;
    const segEndAngle = startAngle + (seg.end / 100) * sweepAngle;
    
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const a1 = segStartAngle + (i / steps) * (segEndAngle - segStartAngle);
      const a2 = segStartAngle + ((i + 1) / steps) * (segEndAngle - segStartAngle);
      const p1 = polarToXY(a1, radius);
      const p2 = polarToXY(a2, radius);
      
      doc.setDrawColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
  });
  
  // Draw needle
  const needleAngle = startAngle + (bmiPercentage / 100) * sweepAngle;
  const needleLength = radius * 0.6;
  const needleEnd = polarToXY(needleAngle, needleLength);
  
  let needleColor: [number, number, number];
  if (bmiPercentage >= 70) needleColor = [34, 197, 94]; // Green (normal)
  else if (bmiPercentage >= 50) needleColor = [59, 130, 246]; // Blue
  else if (bmiPercentage >= 30) needleColor = [250, 204, 21]; // Yellow
  else if (bmiPercentage >= 15) needleColor = [249, 115, 22]; // Orange
  else needleColor = [239, 68, 68]; // Red
  
  doc.setDrawColor(needleColor[0], needleColor[1], needleColor[2]);
  doc.setLineWidth(1.2);
  doc.line(centerX, centerY, needleEnd.x, needleEnd.y);
  
  // Center dot
  doc.setFillColor(60, 60, 60);
  doc.circle(centerX, centerY, 1.5, 'F');
  
  // BMI value text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(needleColor[0], needleColor[1], needleColor[2]);
  doc.text(`${bmiValue.toFixed(1)}`, centerX, centerY + radius + 6, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Helper function to draw detailed radar chart with test names
const drawDetailedRadarChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  testScores: { testName: string; percentage: number; value: number; unit: string }[],
  radius: number = 45
) => {
  const n = testScores.length;
  if (n < 3) return;
  
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const angleStep = 360 / n;
  
  const getPoint = (index: number, value: number) => {
    const angle = -90 + index * angleStep;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(toRadians(angle)),
      y: centerY + r * Math.sin(toRadians(angle)),
      angle
    };
  };
  
  // Draw grid circles with percentage labels
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  [20, 40, 60, 80, 100].forEach(level => {
    const r = (level / 100) * radius;
    doc.circle(centerX, centerY, r);
  });
  
  // Draw grid lines from center to each axis
  doc.setDrawColor(180, 180, 180);
  for (let i = 0; i < n; i++) {
    const endPoint = getPoint(i, 100);
    doc.line(centerX, centerY, endPoint.x, endPoint.y);
  }
  
  // Draw axis labels with test names and values
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  
  testScores.forEach((test, i) => {
    const labelPoint = getPoint(i, 120);
    
    // Truncate label if too long
    let displayLabel = test.testName;
    const maxWidth = 22;
    while (doc.getTextWidth(displayLabel) > maxWidth && displayLabel.length > 6) {
      displayLabel = displayLabel.slice(0, -1);
    }
    if (displayLabel.length < test.testName.length) {
      displayLabel = displayLabel.trim() + '..';
    }
    
    // Determine text alignment based on position
    let align: 'left' | 'center' | 'right' = 'center';
    const normalizedAngle = ((labelPoint.angle % 360) + 360) % 360;
    
    if (normalizedAngle > 300 || normalizedAngle < 60) {
      align = normalizedAngle > 330 || normalizedAngle < 30 ? 'center' : 'left';
    } else if (normalizedAngle >= 60 && normalizedAngle <= 120) {
      align = 'center';
    } else {
      align = 'right';
    }
    
    doc.text(displayLabel, labelPoint.x, labelPoint.y, { align });
    
    // Add value below label
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text(`${test.value} ${test.unit}`, labelPoint.x, labelPoint.y + 3, { align });
    doc.setFontSize(5);
    doc.setTextColor(40, 40, 40);
  });
  
  // Draw filled polygon for scores
  const points = testScores.map((test, i) => getPoint(i, test.percentage));
  
  // Draw polygon with semi-transparent fill
  doc.setFillColor(220, 38, 38);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.8);
  
  if (points.length > 0) {
    // Draw lines with semi-transparency
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
    // Create polygon path
    const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
    
    // Draw filled area using lines
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    // Draw border with full opacity
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
    
    // Draw data points
    doc.setFillColor(220, 38, 38);
    points.forEach(p => {
      doc.circle(p.x, p.y, 1.2, 'F');
    });
  }
  
  doc.setTextColor(0, 0, 0);
};

export const exportPhysicalTestsToPDF = async (data: PhysicalTestExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const BOTTOM_MARGIN = 20; // reserve space for footer

  const ensureSpace = (needed: number) => {
    if (yPos + needed > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      yPos = 20;
    }
  };

  let yPos = addPDFHeader(doc, 'Laporan Tes Kondisi Fisik', data.athleteName);

  
  // Athlete profile section
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 38, 2, 2, 'F');
  
  // Try to load avatar image
  let avatarLoaded = false;
  if (data.athleteAvatarUrl) {
    try {
      const imageData = await loadImageAsBase64(data.athleteAvatarUrl);
      if (imageData) {
        // Draw circular mask effect by using a clip
        doc.addImage(imageData, 'JPEG', 20, yPos + 5, 28, 28);
        avatarLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load avatar:', e);
    }
  }
  
  // Fallback: Avatar placeholder circle with initials
  if (!avatarLoaded) {
    doc.setFillColor(220, 38, 38);
    doc.circle(34, yPos + 19, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const initials = data.athleteName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    doc.text(initials || data.athleteName.charAt(0).toUpperCase(), 34, yPos + 23, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
  
  // Athlete info next to avatar
  const infoX = avatarLoaded ? 52 : 54;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.athleteName, infoX, yPos + 14);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const genderLabel = data.athleteGender === 'male' ? 'Laki-laki' : data.athleteGender === 'female' ? 'Perempuan' : '-';
  const ageLabel = data.athleteAge ? `${data.athleteAge} tahun` : '-';
  const sportLabel = data.sport ? CATEGORY_LABELS[data.sport] || data.sport : '-';
  doc.text(`${genderLabel}  •  ${ageLabel}  •  ${sportLabel}`, infoX, yPos + 23);
  doc.setTextColor(0, 0, 0);
  
  // Body measurements on the right side if available
  if (data.bodyWeight || data.height) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const bodyInfo = [];
    if (data.bodyWeight) bodyInfo.push(`Berat: ${data.bodyWeight} kg`);
    if (data.height) bodyInfo.push(`Tinggi: ${data.height} cm`);
    doc.text(bodyInfo.join('  |  '), infoX, yPos + 32);
    doc.setTextColor(0, 0, 0);
  }
  
  // Report date on the far right
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`${new Date().toLocaleDateString('id-ID', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  })}`, pageWidth - 18, yPos + 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  
  yPos += 45;
  
  // BMI Section with Speedometer visualization
  if (data.bodyWeight && data.height) {
    const heightInMeters = data.height / 100;
    const calculatedBmi = data.bmi || (data.bodyWeight / Math.pow(heightInMeters, 2));
    
    // Determine BMI category and color
    let bmiCategory: string;
    let bmiColor: [number, number, number];
    if (calculatedBmi < 18.5) {
      bmiCategory = 'Kurus';
      bmiColor = [249, 115, 22]; // Orange
    } else if (calculatedBmi < 25) {
      bmiCategory = 'Normal';
      bmiColor = [34, 197, 94]; // Green
    } else if (calculatedBmi < 30) {
      bmiCategory = 'Gemuk';
      bmiColor = [249, 115, 22]; // Orange
    } else {
      bmiCategory = 'Obesitas';
      bmiColor = [239, 68, 68]; // Red
    }
    
    ensureSpace(52);
    // Draw BMI box with speedometer - increased height to fit legend
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yPos, pageWidth - 28, 48, 2, 2, 'F');

    
    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Data Antropometri & BMI/IMT', 18, yPos + 8);
    
    // Draw BMI Speedometer on the left
    drawBMISpeedometer(doc, 40, yPos + 27, calculatedBmi, 14);
    
    // Body measurements and BMI info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Berat Badan: ${data.bodyWeight} kg`, 65, yPos + 18);
    doc.text(`Tinggi Badan: ${data.height} cm`, 120, yPos + 18);
    
    // BMI calculation formula
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rumus: ${data.bodyWeight} ÷ (${heightInMeters.toFixed(2)}²) = ${calculatedBmi.toFixed(2)}`, 65, yPos + 27);
    
    // BMI result with color
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(bmiColor[0], bmiColor[1], bmiColor[2]);
    doc.text(`BMI/IMT: ${calculatedBmi.toFixed(1)} kg/m²`, 65, yPos + 36);
    
    // Category label
    doc.setFontSize(11);
    doc.text(`Kategori: ${bmiCategory}`, 125, yPos + 36);
    
    // BMI range reference
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Normal: 18.5 - 24.9  |  Kurus: < 18.5  |  Gemuk: 25 - 29.9  |  Obesitas: ≥ 30', 65, yPos + 42);
    
    doc.setTextColor(0, 0, 0);
    yPos += 48;
  } else {
    yPos += 4;
  }
  
  // Overall summary box with main speedometer and detailed radar chart
  if (data.testScores && data.testScores.length > 0) {
    const avgScore = data.testScores.reduce((sum, s) => sum + s.score, 0) / data.testScores.length;
    const avgPercentage = scoreToPercentage(avgScore);
    
    // Calculate scores by category
    const scoresByCategory = data.testScores.reduce((acc, s) => {
      const cat = s.category || 'Lainnya';
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      const pct = s.percentage !== undefined ? s.percentage : scoreToPercentage(s.score);
      acc[cat].total += pct;
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    const categoryScores = Object.entries(scoresByCategory).map(([cat, catData]) => ({
      category: cat,
      percentage: catData.total / catData.count
    }));
    
    // SECTION 1: Overall Score with Speedometer
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, yPos, pageWidth - 28, 60, 3, 3, 'F');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Skor Kondisi Fisik Keseluruhan', 20, yPos + 10);
    
    // Draw main speedometer (on left)
    const mainCenterX = 50;
    const mainCenterY = yPos + 30;
    const mainRadius = 16;
    
    // Arc setup
    const startAngle = 135;
    const endAngle = 405;
    const sweepAngle = endAngle - startAngle;
    const arcWidth = 4;
    
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const polarToXY = (angle: number, r: number) => ({
      x: mainCenterX + r * Math.cos(toRadians(angle)),
      y: mainCenterY + r * Math.sin(toRadians(angle))
    });
    
    // Draw gradient arc
    const segments = [
      { start: 0, end: 20, color: [239, 68, 68] as [number, number, number] },
      { start: 20, end: 40, color: [249, 115, 22] as [number, number, number] },
      { start: 40, end: 60, color: [250, 204, 21] as [number, number, number] },
      { start: 60, end: 80, color: [59, 130, 246] as [number, number, number] },
      { start: 80, end: 100, color: [34, 197, 94] as [number, number, number] },
    ];
    
    doc.setLineWidth(arcWidth);
    segments.forEach(seg => {
      const segStartAngle = startAngle + (seg.start / 100) * sweepAngle;
      const segEndAngle = startAngle + (seg.end / 100) * sweepAngle;
      
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const a1 = segStartAngle + (i / steps) * (segEndAngle - segStartAngle);
        const a2 = segStartAngle + ((i + 1) / steps) * (segEndAngle - segStartAngle);
        const p1 = polarToXY(a1, mainRadius);
        const p2 = polarToXY(a2, mainRadius);
        
        doc.setDrawColor(seg.color[0], seg.color[1], seg.color[2]);
        doc.line(p1.x, p1.y, p2.x, p2.y);
      }
    });
    
    // Draw needle
    const needleAngle = startAngle + (avgPercentage / 100) * sweepAngle;
    const needleLength = mainRadius * 0.65;
    const needleEnd = polarToXY(needleAngle, needleLength);
    
    let needleColor: [number, number, number];
    if (avgPercentage >= 80) needleColor = [34, 197, 94];
    else if (avgPercentage >= 60) needleColor = [59, 130, 246];
    else if (avgPercentage >= 40) needleColor = [250, 204, 21];
    else if (avgPercentage >= 20) needleColor = [249, 115, 22];
    else needleColor = [239, 68, 68];
    
    doc.setDrawColor(needleColor[0], needleColor[1], needleColor[2]);
    doc.setLineWidth(1.5);
    doc.line(mainCenterX, mainCenterY, needleEnd.x, needleEnd.y);
    
    // Center dot
    doc.setFillColor(60, 60, 60);
    doc.circle(mainCenterX, mainCenterY, 1.5, 'F');
    
    // Percentage text - positioned inside the speedometer arc
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(needleColor[0], needleColor[1], needleColor[2]);
    doc.text(`${avgPercentage.toFixed(0)}%`, mainCenterX, mainCenterY + mainRadius + 7, { align: 'center' });
    
    // Category label below
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(getPercentageCategoryLabel(avgPercentage), mainCenterX, mainCenterY + mainRadius + 13, { align: 'center' });
    
    // Mini speedometers for each category on the right
    const miniStartX = 85;
    const miniY = yPos + 32;
    const miniSpacing = 32;
    
    categoryScores.slice(0, 4).forEach((cat, index) => {
      const miniX = miniStartX + index * miniSpacing;
      drawMiniSpeedometer(doc, miniX, miniY, cat.percentage, CATEGORY_LABELS[cat.category] || cat.category, 8);
    });
    
    // Additional info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Berdasarkan ${data.testScores.length} item tes`, 50, yPos + 54, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos += 66;
    
    // SECTION 2: Detailed Radar Chart (Multi-Dimensional Performance Profile)
    if (data.testScores.length >= 3) {
      // Calculate box height based on content
      const radarBoxHeight = 95;
      
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(14, yPos, pageWidth - 28, radarBoxHeight, 3, 3, 'F');
      
      // Section title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('Profil Performa Multi-Dimensi', 20, yPos + 10);
      
      // Prepare test scores for detailed radar (limit to prevent overcrowding)
      const radarTestScores = data.testScores.slice(0, 12).map(s => ({
        testName: s.testName,
        percentage: s.percentage !== undefined ? s.percentage : scoreToPercentage(s.score),
        value: s.value,
        unit: s.unit
      }));
      
      // Draw detailed radar chart on left side
      drawDetailedRadarChart(doc, 60, yPos + 55, radarTestScores, 38);
      
      // Test results list on the right
      const listX = 115;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Hasil Tes:', listX, yPos + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Display test results in two columns
      const colWidth = 42;
      data.testScores.slice(0, 12).forEach((test, idx) => {
        const col = idx < 6 ? 0 : 1;
        const row = idx % 6;
        const x = listX + col * colWidth;
        const y = yPos + 28 + row * 11;
        
        // Test name (truncated)
        let testName = test.testName;
        while (doc.getTextWidth(testName) > 32 && testName.length > 5) {
          testName = testName.slice(0, -1);
        }
        if (testName.length < test.testName.length) testName += '..';
        
        doc.setTextColor(40, 40, 40);
        doc.text(testName, x, y);
        
        // Value and percentage
        const pct = test.percentage !== undefined ? test.percentage : scoreToPercentage(test.score);
        let valueColor: [number, number, number];
        if (pct >= 80) valueColor = [34, 197, 94];
        else if (pct >= 60) valueColor = [59, 130, 246];
        else if (pct >= 40) valueColor = [202, 138, 4];
        else valueColor = [220, 38, 38];
        
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        doc.text(`${test.value} ${test.unit} (${pct.toFixed(0)}%)`, x, y + 5);
      });
      
      yPos += radarBoxHeight + 10;
    }
    
    // SECTION 3: Category Speedometers (if more than 4 categories)
    if (categoryScores.length > 4) {
      const remainingCategories = categoryScores.slice(4);
      const speedoPerRow = Math.min(remainingCategories.length, 4);
      const numRows = Math.ceil(remainingCategories.length / speedoPerRow);
      const speedoBoxHeight = numRows * 40 + 20;
      
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(14, yPos, pageWidth - 28, speedoBoxHeight, 2, 2, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Skor Kategori Lainnya', 20, yPos + 12);
      
      const speedoWidth = (pageWidth - 40) / speedoPerRow;
      
      remainingCategories.forEach((cat, index) => {
        const row = Math.floor(index / speedoPerRow);
        const col = index % speedoPerRow;
        const speedoCenterX = 27 + col * speedoWidth + speedoWidth / 2;
        const speedoCenterY = yPos + 26 + row * 40;
        
        drawMiniSpeedometer(
          doc, 
          speedoCenterX, 
          speedoCenterY, 
          cat.percentage, 
          CATEGORY_LABELS[cat.category] || cat.category,
          8
        );
      });
      
      yPos += speedoBoxHeight + 10;
    }
  }
  
  // Check if we need a new page before the table
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Performance summary table with norms and percentage
  if (data.testScores && data.testScores.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Hasil Tes dengan Norma', 14, yPos);
    yPos += 10;
    
    // Group scores by category
    const scoresByCategory = data.testScores.reduce((acc, s) => {
      const cat = s.category || 'Lainnya';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {} as Record<string, typeof data.testScores>);
    
    // Create table data with category grouping
    const scoreData: (string | { content: string; styles?: any })[][] = [];
    
    Object.entries(scoresByCategory).forEach(([category, scores]) => {
      // Add category header row
      scoreData.push([{
        content: CATEGORY_LABELS[category] || category,
        styles: { 
          fontStyle: 'bold', 
          fillColor: [240, 240, 240] as [number, number, number],
          halign: 'left' as const
        }
      }, '', '', '', '', '']);
      
      // Add test rows
      scores.forEach(s => {
        const percentage = s.percentage !== undefined ? s.percentage : scoreToPercentage(s.score);
        
        scoreData.push([
          s.testName,
          `${s.value}`,
          s.unit,
          s.score.toFixed(1),
          `${percentage.toFixed(0)}%`,
          getPercentageCategoryLabel(percentage),
        ]);
      });
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Nama Tes', 'Nilai', 'Satuan', 'Skor', 'Persentase', 'Kategori']],
      body: scoreData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'center' as const, cellWidth: 20 },
        2: { halign: 'center' as const, cellWidth: 25 },
        3: { halign: 'center' as const, cellWidth: 15 },
        4: { halign: 'center' as const, cellWidth: 22 },
        5: { halign: 'center' as const, cellWidth: 30 },
      },
      didParseCell: function(hookData: { row: { index: number }; column: { index: number }; cell: { styles: any } }) {
        // Color code the percentage column
        if (hookData.row.index >= 0 && hookData.column.index === 5) {
          const cellText = String((hookData.cell as any).raw || '');
          if (cellText === 'Excellent' || cellText === 'Baik') {
            hookData.cell.styles.textColor = [22, 163, 74];
          } else if (cellText === 'Cukup') {
            hookData.cell.styles.textColor = [202, 138, 4];
          } else if (cellText === 'Kurang' || cellText === 'Sangat Kurang') {
            hookData.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }
  
  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  // Norms reference legend with percentage
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Keterangan Skala Penilaian (Persentase):', 14, yPos);
  yPos += 6;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const normLegend = [
    ['80-100% - Excellent', 'Performa sangat baik, di atas rata-rata populasi'],
    ['60-79% - Baik', 'Performa baik, sesuai standar atlet'],
    ['40-59% - Cukup', 'Performa rata-rata, perlu peningkatan'],
    ['20-39% - Kurang', 'Performa di bawah rata-rata, perlu latihan intensif'],
    ['0-19% - Sangat Kurang', 'Performa rendah, perlu evaluasi program latihan'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: normLegend,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 115 },
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Check if we need a new page for history
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // All tests history
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Riwayat Lengkap Tes Fisik', 14, yPos);
  yPos += 8;
  
  // Group tests by category for better organization
  const testsByCategory = data.tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, PhysicalTest[]>);
  
  Object.entries(testsByCategory).forEach(([category, categoryTests]) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_RED[0], BRAND_RED[1], BRAND_RED[2]);
    doc.text(CATEGORY_LABELS[category] || category, 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
    
    const testData = categoryTests.map(t => [
      t.test_date,
      t.test_name,
      `${t.value} ${t.unit}`,
      t.notes || '-',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Tanggal', 'Nama Tes', 'Hasil', 'Catatan']],
      body: testData,
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Halaman ${i} dari ${pageCount} - Dibuat oleh HIROCROSS_TRAIN`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`tes-fisik-lengkap-${data.athleteName}-${new Date().toISOString().split('T')[0]}.pdf`);
};
