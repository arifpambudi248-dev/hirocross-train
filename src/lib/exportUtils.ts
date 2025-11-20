import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { TrainingSession, ReadinessLog, PhysicalTest } from '@/types/database';

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
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(20);
  doc.text('Laporan Latihan Atlet', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(data.athleteName, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 32, { align: 'center' });
  
  let yPos = 40;
  
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
    headStyles: { fillColor: [13, 148, 136] },
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
      headStyles: { fillColor: [13, 148, 136] },
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
      headStyles: { fillColor: [13, 148, 136] },
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
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(20);
  doc.text('Perbandingan Performa Atlet', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 25, { align: 'center' });
  
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
    startY: 35,
    head: [['Atlet', 'Beban 7H', 'CTL', 'ATL', 'TSB', 'ACWR', 'Readiness', 'Zona']],
    body: comparisonData,
    theme: 'grid',
    headStyles: { fillColor: [13, 148, 136] },
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
