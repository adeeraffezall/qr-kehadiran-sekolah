import pptxgen from 'pptxgenjs';
import { ClassAttendancePerformance, Student, ClassItem, AttendanceRecord } from '../types';

export interface PowerPointExportData {
  schoolName: string;
  schoolCode: string;
  motto: string;
  monthName: string;
  year: number;
  periodLabel: string;
  isTrialMode: boolean;
  eligibleDays: number;
  totalEnrolment: number;
  uniqueStudentsRecorded: number;
  coveragePercentage: number;
  totalTransactions: number;
  totalHadir: number;
  totalLewat: number;
  overallPercentage: number;
  classPerformanceList: ClassAttendancePerformance[];
}

export async function exportAttendanceToPowerPoint(data: PowerPointExportData): Promise<void> {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Unit HEM SK Batandok Beaufort';
  pres.company = data.schoolName;
  pres.title = `Laporan Kehadiran Murid - ${data.monthName} ${data.year}`;

  const isTrial = data.isTrialMode;
  const modeLabel = isTrial ? 'MOD PERCUBAAN (TRIAL MODE)' : 'OPERASI RASMI SEBENAR';
  const nowStr = new Date().toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Skema Warna Rasmi
  const C_NAVY_DARK = '0B192C';
  const C_NAVY = '1E3A8A';
  const C_BLUE = '2563EB';
  const C_BLUE_LIGHT = 'EFF6FF';
  const C_EMERALD = '059669';
  const C_EMERALD_LIGHT = 'ECFDF5';
  const C_AMBER = 'D97706';
  const C_AMBER_LIGHT = 'FFFBEB';
  const C_SLATE_BG = 'F8FAFC';
  const C_SLATE_CARD = 'FFFFFF';
  const C_SLATE_TEXT = '0F172A';
  const C_SLATE_MUTED = '64748B';
  const C_SLATE_BORDER = 'E2E8F0';

  // =========================================================================
  // SLAID 1: SLAID TAJUK EKSEKUTIF (Title Slide)
  // =========================================================================
  const s1 = pres.addSlide();
  s1.background = { color: C_NAVY_DARK };

  // Bentuk Aksesori Garisan Moden
  s1.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.35,
    h: 5.625,
    fill: { color: C_BLUE }
  });

  // Kad Status Mod (Pill Badge)
  s1.addShape(pres.ShapeType.roundRect, {
    x: 1.0,
    y: 0.9,
    w: 2.8,
    h: 0.4,
    rectRadius: 0.2,
    fill: { color: isTrial ? 'F59E0B' : '10B981' },
    line: { color: 'FFFFFF', width: 1 }
  });
  s1.addText(modeLabel, {
    x: 1.0,
    y: 0.9,
    w: 2.8,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle'
  });

  // Tajuk Utama
  s1.addText('LAPORAN KEHADIRAN MURID', {
    x: 1.0,
    y: 1.5,
    w: 8.5,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial'
  });

  // Nama Sekolah & Kod
  s1.addText(`${data.schoolName}`, {
    x: 1.0,
    y: 2.3,
    w: 8.5,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: '93C5FD',
    fontFace: 'Arial'
  });

  s1.addText(`KOD SEKOLAH: ${data.schoolCode} • BEAUFORT, SABAH`, {
    x: 1.0,
    y: 2.8,
    w: 8.5,
    h: 0.35,
    fontSize: 12,
    color: 'CBD5E1',
    fontFace: 'Arial'
  });

  // Cogankata Sekolah
  s1.addText(`"${data.motto}"`, {
    x: 1.0,
    y: 3.2,
    w: 8.5,
    h: 0.35,
    fontSize: 12,
    italic: true,
    bold: true,
    color: 'FCD34D',
    fontFace: 'Arial'
  });

  // Garisan Pemisah Halus
  s1.addShape(pres.ShapeType.line, {
    x: 1.0,
    y: 3.7,
    w: 8.0,
    h: 0,
    line: { color: '334155', width: 1.5 }
  });

  // Maklumat Sesi & Pembentang (Bawah)
  s1.addText([
    { text: 'Tempoh Laporan: ', options: { color: '94A3B8', bold: true } },
    { text: `${data.monthName} ${data.year} (${data.periodLabel})\n`, options: { color: 'FFFFFF', bold: true } },
    { text: 'Disediakan Oleh: ', options: { color: '94A3B8', bold: true } },
    { text: 'Unit Hal Ehwal Murid (HEM) • Tarikh: ', options: { color: 'FFFFFF' } },
    { text: `${nowStr}`, options: { color: 'FFFFFF', bold: true } }
  ], {
    x: 1.0,
    y: 3.9,
    w: 8.5,
    h: 0.9,
    fontSize: 11,
    fontFace: 'Arial'
  });

  // =========================================================================
  // HELPER: Header Slaid Piawai (Slaid 2 hingga 6)
  // =========================================================================
  const addSlideHeader = (slide: any, title: string, subtitle: string, slideNumber: string) => {
    slide.background = { color: C_SLATE_BG };

    // Baris penunjuk atas
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.1,
      fill: { color: C_BLUE }
    });

    // Logo & Kategori Sekolah
    slide.addText(`${data.schoolName} (${data.schoolCode}) • LAPORAN KEHADIRAN ${data.monthName.toUpperCase()} ${data.year}`, {
      x: 0.6,
      y: 0.3,
      w: 7.5,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });

    // Tajuk Slaid
    slide.addText(title, {
      x: 0.6,
      y: 0.55,
      w: 7.5,
      h: 0.45,
      fontSize: 19,
      bold: true,
      color: C_SLATE_TEXT,
      fontFace: 'Arial'
    });

    // Sub-tajuk
    slide.addText(subtitle, {
      x: 0.6,
      y: 1.0,
      w: 7.5,
      h: 0.3,
      fontSize: 10,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });

    // Nombor Slaid & Lencana Mod (Kanan Atas)
    slide.addText(slideNumber, {
      x: 8.5,
      y: 0.4,
      w: 0.9,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_SLATE_MUTED,
      align: 'right'
    });

    // Garisan Pembahagi Header
    slide.addShape(pres.ShapeType.line, {
      x: 0.6,
      y: 1.35,
      w: 8.8,
      h: 0,
      line: { color: C_SLATE_BORDER, width: 1 }
    });
  };

  // =========================================================================
  // SLAID 2: RINGKASAN EKSEKUTIF & KAD KPI UTAMA
  // =========================================================================
  const s2 = pres.addSlide();
  addSlideHeader(
    s2, 
    'Ringkasan Eksekutif & KPI Kehadiran', 
    `Prestasi keseluruhan kehadiran murid sepanjang ${data.eligibleDays} hari persekolahan layak`, 
    '02 / 06'
  );

  // 4 Kad Metrik Utama
  const cardData = [
    {
      title: 'Hari Persekolahan Layak',
      val: `${data.eligibleDays} Hari`,
      sub: 'Isnin - Jumaat (Tolak Cuti)',
      color: C_BLUE,
      bg: C_BLUE_LIGHT,
      x: 0.6
    },
    {
      title: 'Jumlah Murid Layak',
      val: `${data.totalEnrolment} Murid`,
      sub: 'Enrolmen 7 Kelas SKB',
      color: '4F46E5',
      bg: 'EEF2FF',
      x: 2.85
    },
    {
      title: 'Liputan Rekod Imbasan',
      val: `${data.coveragePercentage}%`,
      sub: `${data.uniqueStudentsRecorded} / ${data.totalEnrolment} Murid Mula Imbas`,
      color: C_AMBER,
      bg: C_AMBER_LIGHT,
      x: 5.1
    },
    {
      title: 'Purata Kehadiran Rasmi',
      val: `${data.overallPercentage}%`,
      sub: 'Sasaran KPM: ≥ 95.0%',
      color: C_EMERALD,
      bg: C_EMERALD_LIGHT,
      x: 7.35
    }
  ];

  cardData.forEach(cd => {
    // Kotak Latar Belakang
    s2.addShape(pres.ShapeType.roundRect, {
      x: cd.x,
      y: 1.55,
      w: 2.05,
      h: 1.85,
      rectRadius: 0.15,
      fill: { color: C_SLATE_CARD },
      line: { color: C_SLATE_BORDER, width: 1 }
    });

    // Jalur Aksen Atas Kad
    s2.addShape(pres.ShapeType.rect, {
      x: cd.x,
      y: 1.55,
      w: 2.05,
      h: 0.08,
      fill: { color: cd.color }
    });

    // Tajuk Kad
    s2.addText(cd.title, {
      x: cd.x + 0.1,
      y: 1.7,
      w: 1.85,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });

    // Nilai Metrik Besar
    s2.addText(cd.val, {
      x: cd.x + 0.1,
      y: 2.05,
      w: 1.85,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: cd.color,
      fontFace: 'Arial'
    });

    // Catatan Kaki Kad
    s2.addText(cd.sub, {
      x: cd.x + 0.1,
      y: 2.8,
      w: 1.85,
      h: 0.45,
      fontSize: 8.5,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });
  });

  // Kotak Penjelasan Formula & Mod Percubaan (Bawah Kad)
  s2.addShape(pres.ShapeType.roundRect, {
    x: 0.6,
    y: 3.6,
    w: 8.8,
    h: 1.6,
    rectRadius: 0.15,
    fill: { color: isTrial ? 'FFFBEB' : 'F0FDF4' },
    line: { color: isTrial ? 'FDE68A' : 'BBF7D0', width: 1 }
  });

  s2.addText(isTrial ? 'PANDUAN INTERPRETASI METRIK (MOD PERCUBAAN AKTIF)' : 'FORMULA & PANDUAN PENGIRAAN RASMI KPM', {
    x: 0.85,
    y: 3.75,
    w: 8.3,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: isTrial ? '92400E' : '166534',
    fontFace: 'Arial'
  });

  const trialExplanation = [
    `• Formula Rasmi KPM: (Jumlah Hadir + Lewat) ÷ (Murid Layak × Hari Layak) × 100% = ${data.totalTransactions} ÷ (${data.totalEnrolment} × ${data.eligibleDays}) = ${data.overallPercentage}%.`,
    `• Metrik Liputan Murid: ${data.uniqueStudentsRecorded} daripada ${data.totalEnrolment} murid (${data.coveragePercentage}%) telah mempunyai rekod imbasan kad QR.`,
    `• Nota Audit: Dalam fasa percubaan awal, kadar kumulatif (0.1%) adalah tepat kerana membahagikan 1 imbasan dengan keseluruhan 18 hari persekolahan lalu. Gunakan metrik Liputan (${data.coveragePercentage}%) untuk mengukur kemajuan pelaksanaan imbasan kad.`
  ].join('\n');

  s2.addText(trialExplanation, {
    x: 0.85,
    y: 4.1,
    w: 8.3,
    h: 0.95,
    fontSize: 9,
    color: isTrial ? '78350F' : '14532D',
    fontFace: 'Arial'
  });

  // =========================================================================
  // SLAID 3: PRESTASI KEHADIRAN MENGIKUT KELAS (Native Bar/Column Chart)
  // =========================================================================
  const s3 = pres.addSlide();
  addSlideHeader(
    s3, 
    'Prestasi Kehadiran Mengikut Kelas', 
    'Perbandingan kadar peratusan kehadiran bagi setiap 7 kelas SK Batandok', 
    '03 / 06'
  );

  const classLabels = data.classPerformanceList.map(c => c.className.replace('BERUSAHA', '1B').replace('BERILMU', '2B').replace('BERJAYA', '3B').replace('BESTARI', '4B').replace('BIJAK', '5B').replace('BITARA', '6B').replace('PRASEKOLAH', 'PRA'));
  const classRates = data.classPerformanceList.map(c => c.attendanceRate);

  // Graf Palang PowerPoint Asli
  const chartData = [
    {
      name: 'Kadar Kehadiran (%)',
      labels: classLabels,
      values: classRates
    }
  ];

  s3.addChart(pres.ChartType.bar, chartData, {
    x: 0.6,
    y: 1.5,
    w: 5.6,
    h: 3.7,
    showValue: true,
    chartColors: ['2563EB'],
    valAxisMaxVal: 100,
    valAxisMinVal: 0,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
    dataLabelFontSize: 9,
    dataLabelColor: '0F172A',
    showTitle: false
  });

  // Kad Penunjuk Sasaran KPM (Sebelah Kanan Graf)
  s3.addShape(pres.ShapeType.roundRect, {
    x: 6.4,
    y: 1.5,
    w: 3.0,
    h: 3.7,
    rectRadius: 0.15,
    fill: { color: C_SLATE_CARD },
    line: { color: C_SLATE_BORDER, width: 1 }
  });

  s3.addText('Penanda Aras Prestasi (KPM)', {
    x: 6.6,
    y: 1.7,
    w: 2.6,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: C_SLATE_TEXT,
    fontFace: 'Arial'
  });

  const benchmarkItems = [
    {
      label: 'Cemerlang (Sasaran KPM)',
      range: '≥ 95.0%',
      desc: 'Memenuhi KPI kehadiran sekolah',
      color: C_EMERALD,
      bg: C_EMERALD_LIGHT
    },
    {
      label: 'Sederhana (Perhatian)',
      range: '85.0% - 94.9%',
      desc: 'Pemantauan berkala unit HEM',
      color: C_AMBER,
      bg: C_AMBER_LIGHT
    },
    {
      label: 'Kritikal (Perlu Semakan)',
      range: '< 85.0%',
      desc: 'Tindakan intervensi & kaunseling',
      color: 'DC2626',
      bg: 'FEF2F2'
    }
  ];

  benchmarkItems.forEach((b, bIdx) => {
    const by = 2.15 + (bIdx * 0.9);
    s3.addShape(pres.ShapeType.roundRect, {
      x: 6.6,
      y: by,
      w: 2.6,
      h: 0.78,
      rectRadius: 0.1,
      fill: { color: b.bg },
      line: { color: b.color, width: 1 }
    });

    s3.addText(b.label, {
      x: 6.75,
      y: by + 0.08,
      w: 2.3,
      h: 0.22,
      fontSize: 9,
      bold: true,
      color: b.color,
      fontFace: 'Arial'
    });

    s3.addText(`${b.range} • ${b.desc}`, {
      x: 6.75,
      y: by + 0.32,
      w: 2.3,
      h: 0.38,
      fontSize: 8,
      color: C_SLATE_TEXT,
      fontFace: 'Arial'
    });
  });

  // =========================================================================
  // SLAID 4: PECAHAN STATUS KEHADIRAN (Native Donut Chart)
  // =========================================================================
  const s4 = pres.addSlide();
  addSlideHeader(
    s4, 
    'Pecahan Status Kehadiran Murid', 
    'Analisis komposisi transaksi imbasan hadir tepat, hadir lewat, dan ketidakhadiran', 
    '04 / 06'
  );

  const totalPossible = data.totalEnrolment * data.eligibleDays;
  const unrecordedCount = Math.max(0, totalPossible - data.totalTransactions);

  // Carta Donat Asli
  const doughnutData = [
    {
      name: 'Status Imbasan',
      labels: ['Hadir Tepat', 'Hadir Lewat', 'Belum Ada Rekod Imbasan'],
      values: [
        Math.max(data.totalHadir, 1), 
        Math.max(data.totalLewat, 0), 
        Math.max(unrecordedCount, 1)
      ]
    }
  ];

  s4.addChart(pres.ChartType.doughnut, doughnutData, {
    x: 0.6,
    y: 1.5,
    w: 5.0,
    h: 3.7,
    showLegend: true,
    legendPos: 'b',
    chartColors: ['059669', 'D97706', 'CBD5E1'],
    dataLabelFontSize: 9,
    holeSize: 55
  });

  // Kad Perincian Sebelah Kanan
  s4.addShape(pres.ShapeType.roundRect, {
    x: 5.8,
    y: 1.5,
    w: 3.6,
    h: 3.7,
    rectRadius: 0.15,
    fill: { color: C_SLATE_CARD },
    line: { color: C_SLATE_BORDER, width: 1 }
  });

  s4.addText('Analisis Transaksi Imbasan', {
    x: 6.0,
    y: 1.7,
    w: 3.2,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: C_SLATE_TEXT,
    fontFace: 'Arial'
  });

  const breakdownRows = [
    { label: 'Jumlah Hadir Tepat:', val: `${data.totalHadir} Transaksi`, color: C_EMERALD },
    { label: 'Jumlah Hadir Lewat:', val: `${data.totalLewat} Transaksi`, color: C_AMBER },
    { label: 'Jumlah Transaksi Masuk:', val: `${data.totalTransactions} Transaksi`, color: C_BLUE },
    { label: 'Murid Unik Telah Imbas:', val: `${data.uniqueStudentsRecorded} Murid (${data.coveragePercentage}%)`, color: '4F46E5' },
    { label: 'Baki Belum Mula Imbas:', val: `${data.totalEnrolment - data.uniqueStudentsRecorded} Murid`, color: C_SLATE_MUTED }
  ];

  breakdownRows.forEach((row, rIdx) => {
    const ry = 2.15 + (rIdx * 0.55);
    s4.addText(row.label, {
      x: 6.0,
      y: ry,
      w: 2.0,
      h: 0.25,
      fontSize: 9,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });
    s4.addText(row.val, {
      x: 7.7,
      y: ry,
      w: 1.5,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: row.color,
      align: 'right',
      fontFace: 'Arial'
    });
  });

  // =========================================================================
  // SLAID 5: JADUAL RINGKASAN ANALISIS KELAS (Executive Table)
  // =========================================================================
  const s5 = pres.addSlide();
  addSlideHeader(
    s5, 
    'Jadual Analisis Prestasi Mengikut Kelas', 
    'Perincian enrolmen, murid imbas, dan kadar kehadiran 7 kelas SK Batandok', 
    '05 / 06'
  );

  const tableHeader = [
    { text: 'BIL', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'NAMA KELAS', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, fontSize: 9 } },
    { text: 'TAHUN', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'ENROLMEN', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'MURID IMBAS', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'TRANSAKSI', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'KADAR (%)', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } },
    { text: 'STATUS PRESTASI', options: { fill: C_NAVY, color: 'FFFFFF', bold: true, align: 'center', fontSize: 9 } }
  ];

  const tableRows: any[] = [tableHeader];

  data.classPerformanceList.forEach((c, cIdx) => {
    const isEven = cIdx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : 'F1F5F9';
    let statusLabel = 'Belum Ada Rekod';
    let statusTextColor = C_SLATE_MUTED;

    if (c.attendanceRate >= 95) {
      statusLabel = 'Cemerlang (≥95%)';
      statusTextColor = C_EMERALD;
    } else if (c.attendanceRate >= 85) {
      statusLabel = 'Sederhana (85-94%)';
      statusTextColor = C_AMBER;
    } else if (c.uniqueAttendedCount > 0) {
      statusLabel = 'Perlu Semakan';
      statusTextColor = 'DC2626';
    }

    tableRows.push([
      { text: `${cIdx + 1}`, options: { fill: bg, align: 'center', fontSize: 8.5 } },
      { text: c.className, options: { fill: bg, bold: true, fontSize: 8.5, color: C_SLATE_TEXT } },
      { text: c.yearLevel === 0 ? 'PRA' : `Tahun ${c.yearLevel}`, options: { fill: bg, align: 'center', fontSize: 8.5 } },
      { text: `${c.studentCount} Murid`, options: { fill: bg, align: 'center', fontSize: 8.5 } },
      { text: `${c.uniqueAttendedCount} Murid`, options: { fill: bg, align: 'center', fontSize: 8.5 } },
      { text: `${c.totalPresentSessions}`, options: { fill: bg, align: 'center', fontSize: 8.5 } },
      { text: `${c.attendanceRate}%`, options: { fill: bg, align: 'center', bold: true, fontSize: 8.5, color: c.attendanceRate >= 95 ? C_EMERALD : C_SLATE_TEXT } },
      { text: statusLabel, options: { fill: bg, align: 'center', bold: true, fontSize: 8, color: statusTextColor } }
    ]);
  });

  s5.addTable(tableRows, {
    x: 0.6,
    y: 1.5,
    w: 8.8,
    h: 3.6,
    border: { pt: 0.5, color: C_SLATE_BORDER }
  });

  // =========================================================================
  // SLAID 6: PELAN TINDAKAN HEM & PENGESAHAN (Action Plan & Signatures)
  // =========================================================================
  const s6 = pres.addSlide();
  addSlideHeader(
    s6, 
    'Pelan Tindakan Susulan & Pengesahan Pentadbir', 
    'Cadangan intervensi unit HEM bagi mengekalkan dan meningkatkan kehadiran murid', 
    '06 / 06'
  );

  // 3 Kad Pelan Tindakan
  const actions = [
    {
      num: '01',
      title: 'Pemantauan Pintu Pagar',
      desc: 'Memperkasa operasi imbasan kad QR setiap pagi (06:30 - 07:30 pagi) bersama Guru Bertugas Mingguan.',
      color: C_BLUE
    },
    {
      num: '02',
      title: 'Anugerah Kehadiran 100%',
      desc: 'Pengiktirafan sijil dan hadiah bulanan bagi murid dan kelas yang mencapai kadar kehadiran penuh.',
      color: C_EMERALD
    },
    {
      num: '03',
      title: 'Intervensi Bimbingan Kaunseling',
      desc: 'Tindakan awal dan sesi kaunseling bersama ibu bapa bagi murid yang menunjukkan corak ketidakhadiran berulang.',
      color: C_AMBER
    }
  ];

  actions.forEach((act, aIdx) => {
    const ax = 0.6 + (aIdx * 3.0);
    s6.addShape(pres.ShapeType.roundRect, {
      x: ax,
      y: 1.55,
      w: 2.8,
      h: 1.8,
      rectRadius: 0.15,
      fill: { color: C_SLATE_CARD },
      line: { color: C_SLATE_BORDER, width: 1 }
    });

    s6.addText(act.num, {
      x: ax + 0.15,
      y: 1.7,
      w: 0.8,
      h: 0.35,
      fontSize: 16,
      bold: true,
      color: act.color,
      fontFace: 'Arial'
    });

    s6.addText(act.title, {
      x: ax + 0.15,
      y: 2.05,
      w: 2.5,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_SLATE_TEXT,
      fontFace: 'Arial'
    });

    s6.addText(act.desc, {
      x: ax + 0.15,
      y: 2.4,
      w: 2.5,
      h: 0.8,
      fontSize: 8.5,
      color: C_SLATE_MUTED,
      fontFace: 'Arial'
    });
  });

  // Ruang Tandatangan Pentadbir (Bawah)
  const signBoxes = [
    { title: 'Disediakan Oleh:', role: 'GURU BERTUGAS MINGGUAN', x: 0.6 },
    { title: 'Disahkan Oleh:', role: 'PK HEM (SK BATANDOK)', x: 5.2 }
  ];

  signBoxes.forEach(sb => {
    s6.addShape(pres.ShapeType.roundRect, {
      x: sb.x,
      y: 3.55,
      w: 4.2,
      h: 1.65,
      rectRadius: 0.15,
      fill: { color: C_SLATE_CARD },
      line: { color: C_SLATE_BORDER, width: 1 }
    });

    s6.addText(sb.title, {
      x: sb.x + 0.2,
      y: 3.7,
      w: 3.8,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: C_SLATE_MUTED
    });

    s6.addText('Tandatangan: ..............................................................', {
      x: sb.x + 0.2,
      y: 4.5,
      w: 3.8,
      h: 0.25,
      fontSize: 8.5,
      color: C_SLATE_MUTED
    });

    s6.addText(sb.role, {
      x: sb.x + 0.2,
      y: 4.8,
      w: 3.8,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: C_SLATE_TEXT
    });
  });

  // Jana dan Muat Turun Fail PowerPoint
  const filename = `Laporan_Kehadiran_${data.schoolName.replace(/\s+/g, '_')}_${data.monthName}_${data.year}.pptx`;
  await pres.writeFile({ fileName: filename });
}
