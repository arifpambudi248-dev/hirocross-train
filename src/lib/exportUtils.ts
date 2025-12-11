import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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

export const exportToExcel = (data: ExportData) => {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Laporan Latihan Atlet'],
    ['Nama Atlet', data.athleteName],
    ['Tanggal Laporan', new Date().toLocaleDateString('id-ID')],
    [],
    ['Metrik', 'Nilai'],
    ['Beban Latihan 7 Hari', data.weeklyLoad.toFixed(0)],
    ['Rata-rata Harian', data.avgDailyLoad.toFixed(0)],
    ['Fitness (CTL)', data.latestFitness.toFixed(0)],
    ['Fatigue (ATL)', data.latestFatigue.toFixed(0)],
    ['Form (TSB)', data.latestForm.toFixed(0)],
    ['ACWR', data.latestACWR.toFixed(2)],
    ['Readiness Score', data.latestReadiness.toFixed(0)],
    ['Readiness Zone', data.readinessZone],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
  
  // Training sessions sheet
  if (data.sessions.length > 0) {
    const sessionData = data.sessions.map(s => ({
      'Tanggal': s.date,
      'Nama Sesi': s.session_name || '-',
      'Durasi (min)': s.duration_min || 0,
      'RPE': s.rpe || 0,
      'Beban Auto': s.load_auto || 0,
      'Beban Manual': s.load_manual || 0,
      'Beban Final': s.load_final || 0,
      'Catatan': s.notes || '',
    }));
    
    const sessionsSheet = XLSX.utils.json_to_sheet(sessionData);
    XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sesi Latihan');
  }
  
  // Readiness logs sheet
  if (data.readinessLogs.length > 0) {
    const readinessData = data.readinessLogs.map(r => ({
      'Tanggal': r.date,
      'VJ': r.vj,
      'RHR': r.rhr,
      'VJ Score': r.vj_score,
      'RHR Score': r.rhr_score,
      'Readiness Score': r.readiness_score,
      'Zona': r.readiness_zone,
      'Catatan': r.notes || '',
    }));
    
    const readinessSheet = XLSX.utils.json_to_sheet(readinessData);
    XLSX.utils.book_append_sheet(workbook, readinessSheet, 'Readiness');
  }
  
  // Physical tests sheet
  if (data.physicalTests.length > 0) {
    const testsData = data.physicalTests.map(t => ({
      'Tanggal': t.test_date,
      'Kategori': t.category,
      'Nama Tes': t.test_name,
      'Nilai': t.value,
      'Satuan': t.unit,
      'Catatan': t.notes || '',
    }));
    
    const testsSheet = XLSX.utils.json_to_sheet(testsData);
    XLSX.utils.book_append_sheet(workbook, testsSheet, 'Tes Fisik');
  }
  
  // Save
  XLSX.writeFile(workbook, `laporan-latihan-${data.athleteName}-${new Date().toISOString().split('T')[0]}.xlsx`);
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

export const exportComparisonToExcel = (athletes: AthleteComparisonData[]) => {
  const workbook = XLSX.utils.book_new();
  
  const comparisonData = athletes.map(a => ({
    'Nama Atlet': a.athleteName,
    'Beban 7 Hari': a.weeklyLoad.toFixed(0),
    'Fitness (CTL)': a.fitness.toFixed(0),
    'Fatigue (ATL)': a.fatigue.toFixed(0),
    'Form (TSB)': a.form.toFixed(0),
    'ACWR': a.acwr.toFixed(2),
    'Readiness': a.readiness.toFixed(0),
    'Zona Readiness': a.readinessZone,
  }));
  
  const sheet = XLSX.utils.json_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Perbandingan');
  
  XLSX.writeFile(workbook, `perbandingan-atlet-${new Date().toISOString().split('T')[0]}.xlsx`);
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

// Physical Tests Export
export interface PhysicalTestExportData {
  athleteName: string;
  tests: PhysicalTest[];
  testScores?: { testName: string; score: number; value: number; unit: string }[];
}

export const exportPhysicalTestsToPDF = (data: PhysicalTestExportData) => {
  const doc = new jsPDF();
  
  let yPos = addPDFHeader(doc, 'Laporan Tes Kondisi Fisik', data.athleteName);
  
  doc.setFontSize(10);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, yPos);
  yPos += 10;
  
  // Group by category
  const testsByCategory = data.tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, PhysicalTest[]>);
  
  // Latest test per category summary
  if (data.testScores && data.testScores.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Performa', 14, yPos);
    yPos += 8;
    
    const scoreData = data.testScores.map(s => [
      s.testName,
      `${s.value} ${s.unit}`,
      s.score.toString(),
      s.score >= 4 ? 'Baik' : s.score >= 3 ? 'Cukup' : 'Kurang',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Tes', 'Nilai', 'Skor (1-5)', 'Kategori']],
      body: scoreData,
      theme: 'grid',
      headStyles: { fillColor: BRAND_RED },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // All tests history
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Riwayat Tes Fisik', 14, yPos);
  yPos += 8;
  
  const testData = data.tests.map(t => [
    t.test_date,
    t.category,
    t.test_name,
    `${t.value} ${t.unit}`,
    t.notes || '-',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Tanggal', 'Kategori', 'Tes', 'Hasil', 'Catatan']],
    body: testData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_RED },
    styles: { fontSize: 9 },
  });
  
  doc.save(`tes-fisik-${data.athleteName}-${new Date().toISOString().split('T')[0]}.pdf`);
};
