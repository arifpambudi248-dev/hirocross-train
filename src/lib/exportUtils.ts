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

export interface AnnualPlanExportData {
  athleteName: string;
  planName: string;
  startDate: string;
  competitionDate: string;
  periodizationType: string;
  phases: AnnualPlanPhase[];
}

export const exportAnnualPlanToPDF = (data: AnnualPlanExportData) => {
  const doc = new jsPDF();
  
  let yPos = addPDFHeader(doc, 'Annual Plan Periodization', `${data.athleteName} - ${data.planName}`);
  
  doc.setFontSize(10);
  doc.text(`Periode: ${data.startDate} s/d ${data.competitionDate}`, 14, yPos);
  doc.text(`Tipe Periodisasi: ${data.periodizationType}`, 14, yPos + 6);
  yPos += 16;
  
  const phaseData = data.phases.map(p => [
    p.name,
    p.startDate,
    p.endDate,
    `${p.durationDays} hari`,
    `${p.percentage.toFixed(1)}%`,
    p.plannedLoad?.toFixed(0) || '-',
    p.actualLoad?.toFixed(0) || '-',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Fase', 'Mulai', 'Selesai', 'Durasi', '%', 'Planned Load', 'Actual Load']],
    body: phaseData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
    styles: { fontSize: 9 },
  });
  
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
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(needleColor[0], needleColor[1], needleColor[2]);
  doc.text(`${percentage.toFixed(0)}%`, centerX, centerY + radius + 5, { align: 'center' });
  
  // Label - truncate if too long
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Truncate label to prevent overflow
  const maxLabelWidth = 32;
  let displayLabel = label;
  while (doc.getTextWidth(displayLabel) > maxLabelWidth && displayLabel.length > 3) {
    displayLabel = displayLabel.slice(0, -1);
  }
  if (displayLabel.length < label.length) {
    displayLabel = displayLabel.slice(0, -2) + '..';
  }
  
  doc.text(displayLabel, centerX, centerY + radius + 10, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to draw radar chart
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
      y: centerY + r * Math.sin(toRadians(angle))
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
  
  // Draw axis labels
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  categoryScores.forEach((cat, i) => {
    const labelPoint = getPoint(i, 120);
    const label = CATEGORY_LABELS[cat.category] || cat.category;
    doc.text(label, labelPoint.x, labelPoint.y, { align: 'center' });
  });
  
  // Draw filled polygon for scores
  const points = categoryScores.map((cat, i) => getPoint(i, cat.percentage));
  
  // Fill polygon
  doc.setFillColor(220, 38, 38, 0.2);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  
  if (points.length > 0) {
    // Create path for polygon fill
    const pathData = points.map((p, i) => 
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ') + ' Z';
    
    // Draw filled polygon manually
    doc.setFillColor(220, 38, 38);
    doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
    
    // Draw lines between points
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
    
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    // Draw points
    doc.setFillColor(220, 38, 38);
    points.forEach(p => {
      doc.circle(p.x, p.y, 1.5, 'F');
    });
  }
  
  doc.setTextColor(0, 0, 0);
};

export const exportPhysicalTestsToPDF = async (data: PhysicalTestExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  let yPos = addPDFHeader(doc, 'Laporan Tes Kondisi Fisik', data.athleteName);
  
  // Athlete profile section with avatar placeholder
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 2, 2, 'F');
  
  // Avatar placeholder circle
  doc.setFillColor(220, 38, 38);
  doc.circle(32, yPos + 17, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.athleteName.charAt(0).toUpperCase(), 32, yPos + 21, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Athlete info next to avatar
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.athleteName, 50, yPos + 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const genderLabel = data.athleteGender === 'male' ? 'Laki-laki' : data.athleteGender === 'female' ? 'Perempuan' : '-';
  const ageLabel = data.athleteAge ? `${data.athleteAge} tahun` : '-';
  const sportLabel = data.sport ? CATEGORY_LABELS[data.sport] || data.sport : '-';
  doc.text(`Usia: ${ageLabel}  |  Gender: ${genderLabel}  |  Olahraga: ${sportLabel}`, 50, yPos + 20);
  
  // Report date
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal Laporan: ${new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 50, yPos + 28);
  doc.setTextColor(0, 0, 0);
  
  yPos += 42;
  
  // BMI Section with complete calculation display
  if (data.bodyWeight && data.height) {
    const heightInMeters = data.height / 100;
    const calculatedBmi = data.bmi || (data.bodyWeight / Math.pow(heightInMeters, 2));
    
    // Determine BMI category and color
    let bmiCategory: string;
    let bmiColor: [number, number, number];
    if (calculatedBmi < 18.5) {
      bmiCategory = 'Kurus (Underweight)';
      bmiColor = [249, 115, 22]; // Orange
    } else if (calculatedBmi < 25) {
      bmiCategory = 'Normal';
      bmiColor = [34, 197, 94]; // Green
    } else if (calculatedBmi < 30) {
      bmiCategory = 'Gemuk (Overweight)';
      bmiColor = [249, 115, 22]; // Orange
    } else {
      bmiCategory = 'Obesitas';
      bmiColor = [239, 68, 68]; // Red
    }
    
    // Draw BMI box with proper height
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yPos, pageWidth - 28, 28, 2, 2, 'F');
    
    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('DATA ANTROPOMETRI & BMI/IMT', 18, yPos + 7);
    
    // Body measurements row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Berat Badan: ${data.bodyWeight} kg`, 18, yPos + 15);
    doc.text(`Tinggi Badan: ${data.height} cm`, 65, yPos + 15);
    
    // BMI calculation formula
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rumus: ${data.bodyWeight} ÷ (${heightInMeters.toFixed(2)}²) = ${calculatedBmi.toFixed(2)}`, 120, yPos + 15);
    
    // BMI result with color
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(bmiColor[0], bmiColor[1], bmiColor[2]);
    doc.text(`BMI/IMT: ${calculatedBmi.toFixed(1)} kg/m²`, 18, yPos + 23);
    
    // Category label
    doc.setFontSize(9);
    doc.text(`Kategori: ${bmiCategory}`, 75, yPos + 23);
    
    // BMI range reference
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Normal: 18.5-24.9 | Kurus: <18.5 | Gemuk: 25-29.9 | Obesitas: ≥30', 140, yPos + 23);
    
    doc.setTextColor(0, 0, 0);
    yPos += 34;
  } else {
    yPos += 4;
  }
  
  // Overall summary box with main speedometer
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
    
    const categoryScores = Object.entries(scoresByCategory).map(([cat, data]) => ({
      category: cat,
      percentage: data.total / data.count
    }));
    
    // Larger summary box
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, yPos, pageWidth - 28, 58, 3, 3, 'F');
    
    // Draw main speedometer (larger, on left side)
    const mainCenterX = 50;
    const mainCenterY = yPos + 30;
    const mainRadius = 20;
    
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
    
    // Draw tick marks
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    [0, 20, 40, 60, 80, 100].forEach(tick => {
      const tickAngle = startAngle + (tick / 100) * sweepAngle;
      const innerR = mainRadius - arcWidth / 2 - 1;
      const outerR = mainRadius - arcWidth / 2 - 4;
      const inner = polarToXY(tickAngle, innerR);
      const outer = polarToXY(tickAngle, outerR);
      doc.line(inner.x, inner.y, outer.x, outer.y);
    });
    
    // Draw needle
    const needleAngle = startAngle + (avgPercentage / 100) * sweepAngle;
    const needleLength = mainRadius * 0.6;
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
    doc.circle(mainCenterX, mainCenterY, 2, 'F');
    
    // Percentage text
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(needleColor[0], needleColor[1], needleColor[2]);
    doc.text(`${avgPercentage.toFixed(0)}%`, mainCenterX, mainCenterY + mainRadius + 8, { align: 'center' });
    
    // Category label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(getPercentageCategoryLabel(avgPercentage), mainCenterX, mainCenterY + mainRadius + 13, { align: 'center' });
    
    // Title for overall score
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('SKOR OVERALL', mainCenterX, yPos + 6, { align: 'center' });
    
    // Draw radar chart in middle
    if (categoryScores.length >= 3) {
      drawRadarChart(doc, 115, yPos + 32, categoryScores, 22);
      
      // Radar chart title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('RADAR PERFORMA', 115, yPos + 6, { align: 'center' });
    }
    
    // Info text on right
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Total: ${data.testScores.length} tes`, pageWidth - 35, yPos + 20);
    doc.text(`${categoryScores.length} kategori`, pageWidth - 35, yPos + 27);
    
    doc.setTextColor(0, 0, 0);
    yPos += 65;
    
    // Draw mini speedometers for each category
    if (categoryScores.length > 0) {
      // Calculate proper height based on number of rows with better spacing
      const speedoPerRow = Math.min(categoryScores.length, 4);
      const numRows = Math.ceil(categoryScores.length / speedoPerRow);
      const speedoBoxHeight = numRows * 45 + 18;
      
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(14, yPos, pageWidth - 28, speedoBoxHeight, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Skor Per Kategori', 20, yPos + 8);
      
      // Draw mini speedometers in a grid (max 4 per row)
      const speedoWidth = (pageWidth - 40) / speedoPerRow;
      
      categoryScores.forEach((cat, index) => {
        const row = Math.floor(index / speedoPerRow);
        const col = index % speedoPerRow;
        const speedoCenterX = 27 + col * speedoWidth + speedoWidth / 2;
        const speedoCenterY = yPos + 28 + row * 45;
        
        drawMiniSpeedometer(
          doc, 
          speedoCenterX, 
          speedoCenterY, 
          cat.percentage, 
          CATEGORY_LABELS[cat.category] || cat.category,
          10
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
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Hasil Tes dengan Norma', 14, yPos);
    yPos += 8;
    
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
