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
  tests: PhysicalTest[];
  testScores?: { 
    testName: string; 
    score: number; 
    value: number; 
    unit: string;
    category?: string;
  }[];
  athleteAge?: number;
  athleteGender?: 'male' | 'female';
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
};

const getScoreCategoryLabel = (score: number): string => {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Baik';
  if (score >= 3) return 'Cukup';
  if (score >= 2) return 'Kurang';
  return 'Sangat Kurang';
};

const getAgeGroupLabel = (age: number): string => {
  if (age < 15) return '< 15 tahun (Youth)';
  if (age < 20) return '15-19 tahun (Junior)';
  if (age < 35) return '20-34 tahun (Senior)';
  return '≥ 35 tahun (Master)';
};

export const exportPhysicalTestsToPDF = (data: PhysicalTestExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  let yPos = addPDFHeader(doc, 'Laporan Tes Kondisi Fisik', data.athleteName);
  
  // Info section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal Laporan: ${new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 14, yPos);
  yPos += 6;
  
  // Add athlete info if available
  if (data.athleteAge || data.athleteGender) {
    const genderLabel = data.athleteGender === 'male' ? 'Laki-laki' : data.athleteGender === 'female' ? 'Perempuan' : '-';
    const ageLabel = data.athleteAge ? `${data.athleteAge} tahun` : '-';
    const ageGroupLabel = data.athleteAge ? getAgeGroupLabel(data.athleteAge) : '-';
    
    doc.text(`Usia: ${ageLabel}  |  Jenis Kelamin: ${genderLabel}  |  Kelompok: ${ageGroupLabel}`, 14, yPos);
    yPos += 10;
  } else {
    yPos += 4;
  }
  
  // Overall summary box
  if (data.testScores && data.testScores.length > 0) {
    const avgScore = data.testScores.reduce((sum, s) => sum + s.score, 0) / data.testScores.length;
    
    // Summary box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Kondisi Fisik', 20, yPos + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Tes Dilakukan: ${data.testScores.length}`, 20, yPos + 16);
    doc.text(`Rata-rata Skor: ${avgScore.toFixed(2)}/5 (${getScoreCategoryLabel(avgScore)})`, 100, yPos + 16);
    
    yPos += 32;
  }
  
  // Performance summary table with norms
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
      }, '', '', '', '']);
      
      // Add test rows
      scores.forEach(s => {
        let scoreColor: [number, number, number];
        if (s.score >= 4) scoreColor = [34, 197, 94];  // green
        else if (s.score >= 3) scoreColor = [250, 204, 21]; // yellow
        else scoreColor = [239, 68, 68]; // red
        
        scoreData.push([
          s.testName,
          `${s.value}`,
          s.unit,
          s.score.toString(),
          getScoreCategoryLabel(s.score),
        ]);
      });
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Nama Tes', 'Nilai', 'Satuan', 'Skor', 'Kategori']],
      body: scoreData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { halign: 'center' as const, cellWidth: 25 },
        2: { halign: 'center' as const, cellWidth: 30 },
        3: { halign: 'center' as const, cellWidth: 20 },
        4: { halign: 'center' as const, cellWidth: 35 },
      },
      didParseCell: function(hookData: { row: { index: number }; column: { index: number }; cell: { styles: any } }) {
        // Color code the score column
        if (hookData.row.index >= 0 && hookData.column.index === 4) {
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
  
  // Norms reference legend
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Keterangan Skala Penilaian:', 14, yPos);
  yPos += 6;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const normLegend = [
    ['5 - Excellent', 'Performa sangat baik, di atas rata-rata populasi'],
    ['4 - Baik', 'Performa baik, sesuai standar atlet'],
    ['3 - Cukup', 'Performa rata-rata, perlu peningkatan'],
    ['2 - Kurang', 'Performa di bawah rata-rata, perlu latihan intensif'],
    ['1 - Sangat Kurang', 'Performa rendah, perlu evaluasi program latihan'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: normLegend,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 120 },
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
