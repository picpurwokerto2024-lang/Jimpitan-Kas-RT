import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Warga, JimpitanRecord, KasMutation, AppSettings } from '../types';
import { formatRupiah, formatTanggalIndo, formatCompactNominal, formatMatrixNominalFull } from './formatters';

interface GeneratePdfOptions {
  records: JimpitanRecord[];
  mutations: KasMutation[];
  settings: AppSettings;
  periodText: string;
  selectedMonthYear?: string;
  totalSaldoKas: number;
}

export const generateKasReportPdf = ({
  records,
  mutations,
  settings,
  periodText,
  totalSaldoKas,
}: GeneratePdfOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. KOP SURAT RT 08 RW 06 PLIKEN KEMBARAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(2, 132, 199); // Sky 600
  doc.text('DESA PLIKEN, KECAMATAN KEMBARAN', pageWidth / 2, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182', pageWidth / 2, 28, { align: 'center' });
  doc.text('Email: rt08rw06pliken@gmail.com | Layanan Jimpitan Digital RT', pageWidth / 2, 32, { align: 'center' });

  // Double horizontal line for official Indonesian Kop Surat
  doc.setDrawColor(30, 41, 59); // Slate 800
  doc.setLineWidth(0.8);
  doc.line(margin, 35, pageWidth - margin, 35);
  doc.setLineWidth(0.2);
  doc.line(margin, 36, pageWidth - margin, 36);

  // 2. DOCUMENT TITLE & PERIOD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN KEUANGAN KAS & JIMPITAN WARGA', pageWidth / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Laporan: ${periodText}`, pageWidth / 2, 48, { align: 'center' });

  // 3. EXECUTIVE FINANCIAL SUMMARY BOX
  const totalJimpitan = records.reduce((sum, r) => sum + r.nominal, 0);
  const totalPemasukanLain = mutations
    .filter((m) => m.jenis === 'masuk')
    .reduce((sum, m) => sum + m.nominal, 0);
  const totalPengeluaran = mutations
    .filter((m) => m.jenis === 'keluar')
    .reduce((sum, m) => sum + m.nominal, 0);
  const totalPemasukanAll = totalJimpitan + totalPemasukanLain;

  // Box background
  doc.setFillColor(248, 250, 252); // slate 50
  doc.setDrawColor(226, 232, 240); // slate 200
  doc.roundedRect(margin, 52, pageWidth - margin * 2, 22, 2, 2, 'FD');

  // Summary columns
  const colWidth = (pageWidth - margin * 2) / 4;
  const topY = 57;

  // Col 1: Jimpitan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL JIMPITAN', margin + 4, topY);
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text(formatRupiah(totalJimpitan), margin + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${records.length} Transaksi`, margin + 4, topY + 10);

  // Col 2: Pemasukan Lain
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PEMASUKAN LAIN', margin + colWidth + 2, topY);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(formatRupiah(totalPemasukanLain), margin + colWidth + 2, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Iuran/Sumbangan', margin + colWidth + 2, topY + 10);

  // Col 3: Pengeluaran
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PENGELUARAN KAS', margin + colWidth * 2 + 2, topY);
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72);
  doc.text(`- ${formatRupiah(totalPengeluaran)}`, margin + colWidth * 2 + 2, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Operasional RT', margin + colWidth * 2 + 2, topY + 10);

  // Col 4: Saldo Kas Bersih
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SALDO KAS BERSIH', margin + colWidth * 3 + 2, topY);
  doc.setFontSize(10.5);
  doc.setTextColor(3, 105, 161);
  doc.text(formatRupiah(totalSaldoKas), margin + colWidth * 3 + 2, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text('Status: Kas Aktif', margin + colWidth * 3 + 2, topY + 10);

  let currentY = 78;

  // 4. TABEL 1: MUTASI PENGELUARAN / KAS RT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('I. Rincian Pengeluaran & Belanja Kas RT', margin, currentY);

  const mutationRows = mutations.length > 0 
    ? mutations.map((m, idx) => [
        String(idx + 1),
        m.tanggal,
        m.kategori,
        m.keterangan,
        m.petugas || '-',
        m.jenis === 'masuk' ? `+ ${formatRupiah(m.nominal)}` : `- ${formatRupiah(m.nominal)}`,
      ])
    : [['-', '-', 'Belum ada catatan mutasi kas pada periode ini', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['No', 'Tanggal', 'Kategori', 'Keterangan', 'Petugas/PJ', 'Nominal']],
    body: mutationRows,
    theme: 'striped',
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28 },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Get Y position after first table
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // If page space is low, start new page
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 5. TABEL 2: REKAP JIMPITAN WARGA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('II. Rincian Penarikan Jimpitan Warga', margin, currentY);

  const jimpitanRows = records.length > 0
    ? records.map((r, idx) => [
        String(idx + 1),
        `${r.tanggal} ${r.waktu || ''}`,
        `No. ${r.nomorRumah}`,
        r.namaWarga,
        r.status.toUpperCase(),
        r.petugas || r.reguNama || '-',
        formatRupiah(r.nominal),
      ])
    : [['-', '-', '-', 'Tidak ada data jimpitan pada periode ini', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['No', 'Waktu', 'Rumah', 'Nama Kepala Keluarga', 'Status', 'Petugas', 'Nominal']],
    body: jimpitanRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // 6. PENGESAHAN / TANDA TANGAN PENGURUS
  let signY = (doc as any).lastAutoTable.finalY + 12;

  // If sign block exceeds page, add page
  if (signY > 240) {
    doc.addPage();
    signY = 25;
  }

  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ditetapkan di Pliken, Kembaran pada tanggal ${todayStr}`, pageWidth - margin, signY, { align: 'right' });

  const signColWidth = (pageWidth - margin * 2) / 3;
  const signTop = signY + 6;

  // Sign 1: Ketua RT 08
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Ketua RT 08 RW 06', margin + signColWidth / 2, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Desa Pliken, Kembaran', margin + signColWidth / 2, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('( ....................................... )', margin + signColWidth / 2, signTop + 24, { align: 'center' });

  // Sign 2: Bendahara RT
  doc.text('Bendahara Kas RT', margin + signColWidth * 1.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Pengelola Kas Jimpitan', margin + signColWidth * 1.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('( ....................................... )', margin + signColWidth * 1.5, signTop + 24, { align: 'center' });

  // Sign 3: Koordinator Petugas
  doc.text('Koordinator Petugas', margin + signColWidth * 2.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Petugas Lapangan', margin + signColWidth * 2.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('( ....................................... )', margin + signColWidth * 2.5, signTop + 24, { align: 'center' });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Laporan Keuangan Jimpitan & Kas RT 08 RW 06 Pliken Kembaran - Dicetak otomatis melalui Sistem Jimpitan Digital RT | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Save PDF file
  const filename = `Laporan_Kas_RT08_RW06_Pliken_${periodText.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

export interface WargaMonthlyReportPdfItem {
  warga: Warga;
  targetBulan: number;
  totalTerbayar: number;
  countPaidDays: number;
  hariKurang: number;
  selisih: number;
  nominalKurang: number;
  nominalLebih: number;
  status: 'underpaid' | 'exact' | 'overpaid';
  dailyMap: Record<number, { isPaid: boolean; nominal: number; isAdvance: boolean }>;
}

export interface WargaMonthlyPdfSummaryKpis {
  totalTarget: number;
  totalTerkumpul: number;
  totalKurangBayar: number;
  totalLebihBayar: number;
  countUnderpaid: number;
  countExact: number;
  countOverpaid: number;
  countLunasAtauLebih: number;
  totalWarga: number;
  percentTerkumpul: number;
}

export interface GenerateWargaMonthlyPdfOptions {
  wargaData: WargaMonthlyReportPdfItem[];
  summaryKpis: WargaMonthlyPdfSummaryKpis;
  settings: AppSettings;
  activeMonthLabel: string;
  daysInMonth: number;
  activeYearMonth: string;
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
  includeMatrixTable?: boolean;
  matrixCellDisplay?: 'nominal_k' | 'nominal_raw' | 'symbol';
}

export const generateWargaMonthlyReportPdf = ({
  wargaData,
  summaryKpis,
  settings,
  activeMonthLabel,
  daysInMonth,
  activeYearMonth,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
  includeMatrixTable = true,
  matrixCellDisplay = 'nominal_k',
}: GenerateWargaMonthlyPdfOptions) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // 1. KOP SURAT RESMI RT 08 RW 06 DESA PLIKEN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06`, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(2, 132, 199); // Sky 600
  doc.text('DESA PLIKEN, KECAMATAN KEMBARAN - KABUPATEN BANYUMAS', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182 | Kode Pos: 53182', pageWidth / 2, 25, { align: 'center' });
  doc.text('Email: rt08rw06pliken@gmail.com | Sistem Manajemen Jimpitan & Kas Digital RT', pageWidth / 2, 29, { align: 'center' });

  // Double horizontal line for official Kop Surat
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.7);
  doc.line(margin, 32, pageWidth - margin, 32);
  doc.setLineWidth(0.2);
  doc.line(margin, 33, pageWidth - margin, 33);

  // 2. DOCUMENT TITLE & PERIOD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN REKAPITULASI JIMPITAN WARGA BULANAN PERTANGGAL', pageWidth / 2, 39, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: Bulan ${activeMonthLabel} (${daysInMonth} Hari Kalender) • Mode Khusus Pengurus RT`, pageWidth / 2, 43.5, { align: 'center' });

  // 3. EXECUTIVE FINANCIAL & KPI METRIC SUMMARY BOX (5 Columns)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 47, contentWidth, 18, 2, 2, 'FD');

  const colW = contentWidth / 5;
  const topY = 51.5;

  // Col 1: Target Kas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET KAS BULAN INI', margin + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupiah(summaryKpis.totalTarget), margin + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${summaryKpis.totalWarga} Rumah × ${daysInMonth} Hari`, margin + 3, topY + 8.5);

  // Col 2: Realisasi Terkumpul
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('REALISASI TERKUMPUL', margin + colW + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105); // emerald 600
  doc.text(formatRupiah(summaryKpis.totalTerkumpul), margin + colW + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`Capaian: ${summaryKpis.percentTerkumpul}%`, margin + colW + 3, topY + 8.5);

  // Col 3: Kurang Bayar (Tunggakan)
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('KURANG BAYAR (SISA)', margin + colW * 2 + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72); // rose 600
  doc.text(`-${formatRupiah(summaryKpis.totalKurangBayar)}`, margin + colW * 2 + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(225, 29, 72);
  doc.text(`${summaryKpis.countUnderpaid} Rumah Tertunggak`, margin + colW * 2 + 3, topY + 8.5);

  // Col 4: Lebih Bayar (Deposit)
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('LEBIH BAYAR / DEPOSIT', margin + colW * 3 + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6); // amber 600
  doc.text(`+${formatRupiah(summaryKpis.totalLebihBayar)}`, margin + colW * 3 + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(217, 119, 6);
  doc.text(`${summaryKpis.countOverpaid} Rumah Bayar di Muka`, margin + colW * 3 + 3, topY + 8.5);

  // Col 5: Status Kelunasan
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUS KELUNASAN RT', margin + colW * 4 + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`${summaryKpis.countLunasAtauLebih} / ${summaryKpis.totalWarga} Rumah`, margin + colW * 4 + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`${summaryKpis.countExact} Lunas Pas • ${summaryKpis.countOverpaid} Surplus`, margin + colW * 4 + 3, topY + 8.5);

  let currentY = 69;

  // 4. TABEL 1: REKAPITULASI PEMBAYARAN & STATUS KELUNASAN WARGA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('I. Rekapitulasi Pembayaran, Kehadiran, dan Status Kurang/Lebih Bayar Setiap Rumah', margin, currentY);

  const rekapRows = wargaData.map((item, idx) => {
    let statusLabel = 'Lunas Tepat';
    if (item.status === 'overpaid') statusLabel = 'Lebih Bayar';
    else if (item.status === 'underpaid') statusLabel = 'Kurang Bayar';

    const kurangText = item.nominalKurang > 0 ? `-${formatRupiah(item.nominalKurang)}` : '-';
    const lebihText = item.nominalLebih > 0 ? `+${formatRupiah(item.nominalLebih)}` : '-';

    return [
      String(idx + 1),
      `No. ${item.warga.nomorRumah}`,
      item.warga.blok || '-',
      item.warga.nama,
      formatRupiah(item.warga.nominalDefault || 1000),
      `${item.countPaidDays} / ${daysInMonth} hr`,
      formatRupiah(item.targetBulan),
      formatRupiah(item.totalTerbayar),
      statusLabel,
      kurangText,
      lebihText,
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    head: [[
      'No',
      'Rumah',
      'Blok',
      'Nama Kepala Keluarga',
      'Tarif/Hari',
      'Kehadiran',
      'Target Bulan',
      'Terkumpul',
      'Status',
      'Kurang (Sisa)',
      'Lebih (Deposit)',
    ]],
    body: rekapRows,
    theme: 'striped',
    headStyles: {
      fillColor: [2, 132, 199], // Sky 600
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 17, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 'auto', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 24, halign: 'center' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 24, halign: 'right' },
    },
    didParseCell: (data) => {
      // Color-code status column
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.raw);
        if (val === 'Kurang Bayar') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Lebih Bayar') {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Lunas Tepat') {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 9 && data.cell.raw !== '-') {
        data.cell.styles.textColor = [225, 29, 72];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 10 && data.cell.raw !== '-') {
        data.cell.styles.textColor = [217, 119, 6];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. TABEL 2: MATRIKS PRESENSI & SETORAN JIMPITAN TANGGAL 1 S/D 31 (Optional / Included)
  if (includeMatrixTable) {
    if (currentY > 150) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    
    const matrixTitle = matrixCellDisplay === 'symbol'
      ? `II. Matriks Presensi Jimpitan Warga Tanggal 1 s/d ${daysInMonth} ${activeMonthLabel}`
      : `II. Matriks Setoran Jimpitan Pertanggal (Nominal Uang Disetorkan) Tanggal 1 s/d ${daysInMonth} ${activeMonthLabel}`;
    doc.text(matrixTitle, margin, currentY);

    const matrixDaysHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const matrixHead = [['No', 'Rumah', 'Nama Warga', ...matrixDaysHeaders, 'Hadir', 'Total']];

    const matrixRows = wargaData.map((item, idx) => {
      const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const info = item.dailyMap[dayNum];
        if (!info || !info.isPaid) return '-';
        
        if (matrixCellDisplay === 'symbol') {
          return 'v';
        } else if (matrixCellDisplay === 'nominal_raw') {
          return formatMatrixNominalFull(info.nominal);
        } else {
          // Default: nominal_k (contoh: 1k, 2k, 5k, 10k)
          return formatCompactNominal(info.nominal);
        }
      });

      return [
        String(idx + 1),
        `No.${item.warga.nomorRumah}`,
        item.warga.nama,
        ...dayCells,
        `${item.countPaidDays} hr`,
        formatRupiah(item.totalTerbayar),
      ];
    });

    // Calculate dynamic column widths for matrix days
    const baseColStyles: Record<number, any> = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 38 },
    };

    const dayColWidth = Math.max(4.8, (contentWidth - 61 - 15 - 22) / daysInMonth);
    for (let d = 0; d < daysInMonth; d++) {
      baseColStyles[3 + d] = { cellWidth: dayColWidth, halign: 'center' };
    }

    const hadirColIndex = 3 + daysInMonth;
    const totalColIndex = 4 + daysInMonth;
    baseColStyles[hadirColIndex] = { cellWidth: 15, halign: 'center', fontStyle: 'bold' };
    baseColStyles[totalColIndex] = { cellWidth: 22, halign: 'right', fontStyle: 'bold' };

    const matrixFontSize = matrixCellDisplay === 'nominal_raw' ? 5 : 5.8;

    autoTable(doc, {
      startY: currentY + 2,
      head: matrixHead,
      body: matrixRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontSize: 6.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1,
      },
      bodyStyles: {
        fontSize: matrixFontSize,
        textColor: [30, 41, 59],
        cellPadding: 0.8,
      },
      columnStyles: baseColStyles,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index >= 3 && data.column.index < 3 + daysInMonth) {
          const rawVal = String(data.cell.raw || '').trim();
          if (rawVal !== '-' && rawVal !== '') {
            data.cell.styles.fontStyle = 'bold';
            // If greater than default (e.g. 2k, 3k, 5k, 10k or 2.000+)
            const isHighNominal = rawVal.includes('2k') || rawVal.includes('3k') || rawVal.includes('5k') || rawVal.includes('10k') || rawVal.includes('20k') || rawVal.includes('50k');
            if (isHighNominal) {
              data.cell.styles.textColor = [180, 83, 9]; // Amber 700
              data.cell.styles.fillColor = [254, 243, 199]; // Amber 100
            } else {
              data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
              data.cell.styles.fillColor = [236, 253, 245]; // Emerald 50
            }
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. LEMBAR PENGESAHAN & TANDA TANGAN (Petugas RT, Bendahara RT, Ketua RT)
  // Check if remaining space is sufficient for signature block (~40mm)
  if (currentY > 155) {
    doc.addPage();
    currentY = 20;
  }

  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ditetapkan di Pliken, Kembaran pada tanggal: ${todayStr}`, pageWidth - margin, currentY, { align: 'right' });

  const signColWidth = contentWidth / 3;
  const signTop = currentY + 5;

  // Signature 1: Petugas RT (Kiri)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Petugas / Penarik Jimpitan RT', margin + signColWidth / 2, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Koordinator Lapangan ${settings.namaRt} / ${settings.namaRw}`, margin + signColWidth / 2, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayPetugas = petugasName.trim() ? `( ${petugasName.trim()} )` : '( .................................................. )';
  doc.text(displayPetugas, margin + signColWidth / 2, signTop + 24, { align: 'center' });

  // Signature 2: Bendahara RT (Tengah)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bendahara Kas RT', margin + signColWidth * 1.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pengelola Kas Jimpitan Warga', margin + signColWidth * 1.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayBendahara = bendaharaName.trim() ? `( ${bendaharaName.trim()} )` : '( .................................................. )';
  doc.text(displayBendahara, margin + signColWidth * 1.5, signTop + 24, { align: 'center' });

  // Signature 3: Ketua RT (Kanan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ketua ${settings.namaRt} ${settings.namaRw}`, margin + signColWidth * 2.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Mengetahui & Menyetujui', margin + signColWidth * 2.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayKetua = ketuaRtName.trim() ? `( ${ketuaRtName.trim()} )` : '( .................................................. )';
  doc.text(displayKetua, margin + signColWidth * 2.5, signTop + 24, { align: 'center' });

  // 7. FOOTER PADA SETIAP HALAMAN
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Laporan Rekapitulasi Jimpitan Bulanan Pertanggal ${settings.namaRt}/${settings.namaRw} Desa Pliken Kembaran - Dicetak otomatis via Sistem Jimpitan Digital RT | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save PDF file
  const filename = `Laporan_Jimpitan_Bulanan_Pertanggal_${settings.namaRt.replace(/\s+/g, '_')}_${activeYearMonth}.pdf`;
  doc.save(filename);
};

export interface GenerateLaporanTunggakanPdfOptions {
  wargaTunggakanList: {
    warga: Warga;
    tunggakanBulanLalu: number;
    depositBulanLalu: number;
    pelunasanBulanIni: number;
    sisaTunggakanLalu: number;
    targetBulanIni: number;
    terbayarBulanIni: number;
    totalKewajibanBersih: number;
  }[];
  summary: {
    totalWarga: number;
    totalWargaTertunggakLalu: number;
    totalTunggakanBulanLalu: number;
    totalPelunasanBulanIni: number;
    totalSisaTunggakanLalu: number;
    totalDepositBulanLalu: number;
    persenPelunasan: number;
  };
  settings: AppSettings;
  activeMonthLabel: string;
  prevMonthLabel: string;
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
}

export const generateLaporanTunggakanPdf = ({
  wargaTunggakanList,
  summary,
  settings,
  activeMonthLabel,
  prevMonthLabel,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
}: GenerateLaporanTunggakanPdfOptions) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // 1. KOP SURAT RESMI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06', pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(2, 132, 199); // Sky 600
  doc.text('DESA PLIKEN, KECAMATAN KEMBARAN - KABUPATEN BANYUMAS', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182 | Kode Pos: 53182', pageWidth / 2, 25, { align: 'center' });
  doc.text('Email: rt08rw06pliken@gmail.com | Sistem Manajemen Jimpitan & Kas Digital RT', pageWidth / 2, 29, { align: 'center' });

  // Double horizontal line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.7);
  doc.line(margin, 32, pageWidth - margin, 32);
  doc.setLineWidth(0.2);
  doc.line(margin, 33, pageWidth - margin, 33);

  // 2. DOCUMENT TITLE & PERIOD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN REKAPITULASI TUNGGAKAN & PELUNASAN KAS JIMPITAN BULAN LALU', pageWidth / 2, 39, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Laporan Pelunasan: ${activeMonthLabel} • Berdasarkan Rekap Kewajiban Bulan: ${prevMonthLabel}`, pageWidth / 2, 43.5, { align: 'center' });

  // 3. EXECUTIVE KPI METRIC BOX (4 Columns)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 47, contentWidth, 18, 2, 2, 'FD');

  const colW = contentWidth / 4;
  const topY = 51.5;

  // Col 1: Total Tunggakan Bulan Lalu
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`TOTAL TUNGGAKAN (${prevMonthLabel.toUpperCase()})`, margin + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72); // rose 600
  doc.text(`-${formatRupiah(summary.totalTunggakanBulanLalu)}`, margin + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(225, 29, 72);
  doc.text(`${summary.totalWargaTertunggakLalu} dari ${summary.totalWarga} Rumah Tertunggak`, margin + 3, topY + 8.5);

  // Col 2: Pelunasan Diterima Bulan Berjalan
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`PELUNASAN DITERIMA (${activeMonthLabel.toUpperCase()})`, margin + colW + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105); // emerald 600
  doc.text(formatRupiah(summary.totalPelunasanBulanIni), margin + colW + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`Capaian Pelunasan: ${summary.persenPelunasan}%`, margin + colW + 3, topY + 8.5);

  // Col 3: Sisa Tunggakan Bulan Lalu
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SISA TUNGGAKAN BELUM LUNAS', margin + colW * 2 + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6); // amber 600
  doc.text(formatRupiah(summary.totalSisaTunggakanLalu), margin + colW * 2 + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(217, 119, 6);
  doc.text('Kewajiban masa lampau yang masih berjalan', margin + colW * 2 + 3, topY + 8.5);

  // Col 4: Total Deposit Saldo Dimuka
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SURPLUS / DEPOSIT BULAN LALU', margin + colW * 3 + 3, topY);
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`+${formatRupiah(summary.totalDepositBulanLalu)}`, margin + colW * 3 + 3, topY + 4.5);
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text('Akumulasi warga yang bayar di muka', margin + colW * 3 + 3, topY + 8.5);

  let currentY = 69;

  // 4. TABEL DATA TUNGGAKAN & PELUNASAN PER WARGA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rincian Status Tunggakan Periode ${prevMonthLabel} & Pelunasan pada Bulan ${activeMonthLabel}`, margin, currentY);

  const tableRows = wargaTunggakanList.map((item, idx) => {
    let statusText = '-';
    if (item.tunggakanBulanLalu > 0) {
      if (item.sisaTunggakanLalu === 0) {
        statusText = 'LUNAS (100%)';
      } else if (item.pelunasanBulanIni > 0) {
        statusText = 'DICICIL SEBAGIAN';
      } else {
        statusText = 'BELUM DILUNASI';
      }
    } else if (item.depositBulanLalu > 0) {
      statusText = 'SURPLUS / DEPOSIT';
    } else {
      statusText = 'LUNAS TEPAT';
    }

    return [
      String(idx + 1),
      `No. ${item.warga.nomorRumah}`,
      item.warga.blok || '-',
      item.warga.nama,
      item.tunggakanBulanLalu > 0 ? `-${formatRupiah(item.tunggakanBulanLalu)}` : (item.depositBulanLalu > 0 ? `+${formatRupiah(item.depositBulanLalu)}` : 'Rp 0'),
      item.pelunasanBulanIni > 0 ? formatRupiah(item.pelunasanBulanIni) : '-',
      statusText,
      item.sisaTunggakanLalu > 0 ? formatRupiah(item.sisaTunggakanLalu) : 'Rp 0',
      formatRupiah(item.targetBulanIni),
      formatRupiah(item.terbayarBulanIni),
      formatRupiah(item.totalKewajibanBersih),
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    head: [[
      'No',
      'Rumah',
      'Blok',
      'Nama Kepala Keluarga',
      `Tunggakan (${prevMonthLabel})`,
      `Pelunasan (${activeMonthLabel})`,
      'Status Pelunasan',
      'Sisa Tunggakan Lalu',
      `Tagihan (${activeMonthLabel})`,
      `Terbayar (${activeMonthLabel})`,
      'Total Kewajiban Bersih',
    ]],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 'auto', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 24, halign: 'right' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val.includes('LUNAS')) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('DICICIL')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('BELUM')) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 4 && String(data.cell.raw).startsWith('-')) {
        data.cell.styles.textColor = [225, 29, 72];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 5 && data.cell.raw !== '-') {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw !== 'Rp 0') {
        data.cell.styles.textColor = [225, 29, 72];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. LEMBAR PENGESAHAN & 3 TANDA TANGAN (Petugas, Bendahara, Ketua RT)
  if (currentY > 155) {
    doc.addPage();
    currentY = 20;
  }

  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ditetapkan di Pliken, Kembaran pada tanggal: ${todayStr}`, pageWidth - margin, currentY, { align: 'right' });

  const signColWidth = contentWidth / 3;
  const signTop = currentY + 5;

  // Signature 1: Petugas RT (Kiri)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Petugas / Penarik Jimpitan RT', margin + signColWidth / 2, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Koordinator Lapangan ${settings.namaRt} / ${settings.namaRw}`, margin + signColWidth / 2, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayPetugas = petugasName.trim() ? `( ${petugasName.trim()} )` : '( .................................................. )';
  doc.text(displayPetugas, margin + signColWidth / 2, signTop + 24, { align: 'center' });

  // Signature 2: Bendahara RT (Tengah)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bendahara Kas RT', margin + signColWidth * 1.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pengelola Kas Jimpitan Warga', margin + signColWidth * 1.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayBendahara = bendaharaName.trim() ? `( ${bendaharaName.trim()} )` : '( .................................................. )';
  doc.text(displayBendahara, margin + signColWidth * 1.5, signTop + 24, { align: 'center' });

  // Signature 3: Ketua RT (Kanan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ketua ${settings.namaRt} ${settings.namaRw}`, margin + signColWidth * 2.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Mengetahui & Menyetujui', margin + signColWidth * 2.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const displayKetua = ketuaRtName.trim() ? `( ${ketuaRtName.trim()} )` : '( .................................................. )';
  doc.text(displayKetua, margin + signColWidth * 2.5, signTop + 24, { align: 'center' });

  // 6. FOOTER PADA SETIAP HALAMAN
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Laporan Rekapitulasi Tunggakan & Pelunasan Jimpitan ${settings.namaRt}/${settings.namaRw} Desa Pliken Kembaran - Dicetak via Sistem Jimpitan Digital RT | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Save PDF file
  const filename = `Laporan_Tunggakan_Pelunasan_${settings.namaRt.replace(/\s+/g, '_')}_${activeMonthLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

export interface GenerateLaporanPemasukanPdfOptions {
  records: JimpitanRecord[];
  mutationsMasuk: KasMutation[];
  settings: AppSettings;
  periodText: string;
  totalJimpitan: number;
  totalPemasukanLain: number;
  totalPemasukanAll: number;
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
}

export const generateLaporanPemasukanPdf = ({
  records,
  mutationsMasuk,
  settings,
  periodText,
  totalJimpitan,
  totalPemasukanLain,
  totalPemasukanAll,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
}: GenerateLaporanPemasukanPdfOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(2, 132, 199);
  doc.text('DESA PLIKEN, KECAMATAN KEMBARAN', pageWidth / 2, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182', pageWidth / 2, 28, { align: 'center' });
  doc.text('Email: rt08rw06pliken@gmail.com | Layanan Jimpitan Digital RT', pageWidth / 2, 32, { align: 'center' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(margin, 35, pageWidth - margin, 35);
  doc.setLineWidth(0.2);
  doc.line(margin, 36, pageWidth - margin, 36);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN RINCIAN PEMASUKAN KAS & JIMPITAN RT', pageWidth / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Laporan: ${periodText}`, pageWidth / 2, 48, { align: 'center' });

  // 3. SUMMARY BOX (3 Col)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 52, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const colWidth = (pageWidth - margin * 2) / 3;
  const topY = 57;

  // Col 1: Jimpitan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PENERIMAAN JIMPITAN', margin + 4, topY);
  doc.setFontSize(10.5);
  doc.setTextColor(2, 132, 199);
  doc.text(formatRupiah(totalJimpitan), margin + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${records.length} Transaksi Jimpitan`, margin + 4, topY + 10);

  // Col 2: Pemasukan Lain (Donasi, Iuran)
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DONASI / IURAN / LAINNYA', margin + colWidth + 4, topY);
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129);
  doc.text(formatRupiah(totalPemasukanLain), margin + colWidth + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${mutationsMasuk.length} Transaksi Non-Jimpitan`, margin + colWidth + 4, topY + 10);

  // Col 3: Total Pemasukan
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PEMASUKAN BERSIH', margin + colWidth * 2 + 4, topY);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`+ ${formatRupiah(totalPemasukanAll)}`, margin + colWidth * 2 + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('Status: Kas Masuk Sah', margin + colWidth * 2 + 4, topY + 10);

  let currentY = 78;

  // TABEL 1: Non-Jimpitan Masuk
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('I. Pemasukan Kas Khusus (Donasi, Sumbangan, & Iuran Kas)', margin, currentY);

  const mutMasukRows = mutationsMasuk.length > 0
    ? mutationsMasuk.map((m, idx) => [
        String(idx + 1),
        m.tanggal,
        m.kategori,
        m.keterangan,
        m.petugas || '-',
        `+ ${formatRupiah(m.nominal)}`,
      ])
    : [['-', '-', 'Belum ada catatan pemasukan non-jimpitan', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['No', 'Tanggal', 'Kategori', 'Keterangan', 'Petugas/PJ', 'Nominal']],
    body: mutMasukRows,
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28 },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // TABEL 2: Jimpitan Warga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('II. Rincian Pemasukan Jimpitan Warga', margin, currentY);

  const jimpitanRows = records.length > 0
    ? records.map((r, idx) => [
        String(idx + 1),
        `${r.tanggal} ${r.waktu || ''}`,
        `No. ${r.nomorRumah}`,
        r.namaWarga,
        r.status.toUpperCase(),
        r.petugas || r.reguNama || '-',
        formatRupiah(r.nominal),
      ])
    : [['-', '-', '-', 'Tidak ada data jimpitan pada periode ini', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['No', 'Waktu', 'Rumah', 'Nama Kepala Keluarga', 'Status', 'Petugas', 'Nominal']],
    body: jimpitanRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Tanda Tangan
  let signY = (doc as any).lastAutoTable.finalY + 12;
  if (signY > 240) {
    doc.addPage();
    signY = 25;
  }

  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ditetapkan di Pliken, Kembaran pada tanggal ${todayStr}`, pageWidth - margin, signY, { align: 'right' });

  const signColWidth = (pageWidth - margin * 2) / 3;
  const signTop = signY + 6;

  // Sign 1: Petugas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Petugas / PJ Jimpitan', margin + signColWidth / 2, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Penerima Setoran Lapangan', margin + signColWidth / 2, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(petugasName.trim() ? `( ${petugasName.trim()} )` : '( ....................................... )', margin + signColWidth / 2, signTop + 24, { align: 'center' });

  // Sign 2: Bendahara
  doc.text('Bendahara Kas RT', margin + signColWidth * 1.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Pencatat Kas & Keuangan', margin + signColWidth * 1.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(bendaharaName.trim() ? `( ${bendaharaName.trim()} )` : '( ....................................... )', margin + signColWidth * 1.5, signTop + 24, { align: 'center' });

  // Sign 3: Ketua RT
  doc.text(`Ketua ${settings.namaRt} ${settings.namaRw}`, margin + signColWidth * 2.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Mengetahui & Menyetujui', margin + signColWidth * 2.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(ketuaRtName.trim() ? `( ${ketuaRtName.trim()} )` : '( ....................................... )', margin + signColWidth * 2.5, signTop + 24, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Laporan Penerimaan Pemasukan Kas ${settings.namaRt}/${settings.namaRw} Pliken Kembaran - Dicetak via Sistem Jimpitan Digital RT | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Laporan_Pemasukan_Kas_${settings.namaRt.replace(/\s+/g, '_')}_${periodText.replace(/\s+/g, '_')}.pdf`);
};

export interface GenerateLaporanPengeluaranPdfOptions {
  mutationsKeluar: KasMutation[];
  settings: AppSettings;
  periodText: string;
  totalPengeluaran: number;
  categoryBreakdown: { category: string; total: number; count: number; percentage: number }[];
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
}

export const generateLaporanPengeluaranPdf = ({
  mutationsKeluar,
  settings,
  periodText,
  totalPengeluaran,
  categoryBreakdown,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
}: GenerateLaporanPengeluaranPdfOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(2, 132, 199);
  doc.text('DESA PLIKEN, KECAMATAN KEMBARAN', pageWidth / 2, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182', pageWidth / 2, 28, { align: 'center' });
  doc.text('Email: rt08rw06pliken@gmail.com | Layanan Jimpitan Digital RT', pageWidth / 2, 32, { align: 'center' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(margin, 35, pageWidth - margin, 35);
  doc.setLineWidth(0.2);
  doc.line(margin, 36, pageWidth - margin, 36);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN RINCIAN PENGELUARAN & BELANJA OPERASIONAL RT', pageWidth / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Laporan: ${periodText}`, pageWidth / 2, 48, { align: 'center' });

  // 3. SUMMARY BOX (3 Col)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 52, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const colWidth = (pageWidth - margin * 2) / 3;
  const topY = 57;

  // Col 1: Total Pengeluaran
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PENGELUARAN KAS', margin + 4, topY);
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72);
  doc.text(`- ${formatRupiah(totalPengeluaran)}`, margin + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${mutationsKeluar.length} Transaksi Belanja`, margin + 4, topY + 10);

  // Col 2: Kategori Terbesar
  const topCat = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ALOKASI TERBESAR', margin + colWidth + 4, topY);
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6);
  doc.text(topCat ? topCat.category : '-', margin + colWidth + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(topCat ? `${formatRupiah(topCat.total)} (${topCat.percentage}%)` : 'Tidak ada belanja', margin + colWidth + 4, topY + 10);

  // Col 3: Status
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATUS DOKUMEN', margin + colWidth * 2 + 4, topY);
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('Pertanggungjawaban Sah', margin + colWidth * 2 + 4, topY + 5.5);
  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text('Telah Diperiksa Pengurus', margin + colWidth * 2 + 4, topY + 10);

  let currentY = 78;

  // TABEL 1: Breakdown per Kategori
  if (categoryBreakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('I. Rekapitulasi Alokasi Belanja per Kategori', margin, currentY);

    const catRows = categoryBreakdown.map((cat, idx) => [
      String(idx + 1),
      cat.category,
      `${cat.count} kali`,
      `${cat.percentage}%`,
      formatRupiah(cat.total),
    ]);

    autoTable(doc, {
      startY: currentY + 2,
      head: [['No', 'Kategori Pengeluaran', 'Frekuensi', 'Porsi', 'Total Biaya']],
      body: catRows,
      theme: 'striped',
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // TABEL 2: Rincian Transaksi Belanja
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('II. Rincian Nota & Transaksi Pengeluaran Kas RT', margin, currentY);

  const mutKeluarRows = mutationsKeluar.length > 0
    ? mutationsKeluar.map((m, idx) => [
        String(idx + 1),
        m.tanggal,
        m.kategori,
        m.keterangan,
        m.petugas || '-',
        `- ${formatRupiah(m.nominal)}`,
      ])
    : [['-', '-', 'Belum ada catatan pengeluaran kas pada periode ini', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['No', 'Tanggal', 'Kategori', 'Keterangan Belanja', 'Petugas / PJ', 'Nominal']],
    body: mutKeluarRows,
    theme: 'striped',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28 },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Tanda Tangan
  let signY = (doc as any).lastAutoTable.finalY + 12;
  if (signY > 240) {
    doc.addPage();
    signY = 25;
  }

  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ditetapkan di Pliken, Kembaran pada tanggal ${todayStr}`, pageWidth - margin, signY, { align: 'right' });

  const signColWidth = (pageWidth - margin * 2) / 3;
  const signTop = signY + 6;

  // Sign 1: Petugas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Petugas / Pemegang Kas', margin + signColWidth / 2, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Pelaksana Operasional', margin + signColWidth / 2, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(petugasName.trim() ? `( ${petugasName.trim()} )` : '( ....................................... )', margin + signColWidth / 2, signTop + 24, { align: 'center' });

  // Sign 2: Bendahara
  doc.text('Bendahara Kas RT', margin + signColWidth * 1.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Pencatat & Verifikator Nota', margin + signColWidth * 1.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(bendaharaName.trim() ? `( ${bendaharaName.trim()} )` : '( ....................................... )', margin + signColWidth * 1.5, signTop + 24, { align: 'center' });

  // Sign 3: Ketua RT
  doc.text(`Ketua ${settings.namaRt} ${settings.namaRw}`, margin + signColWidth * 2.5, signTop, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Menyetujui Pengeluaran', margin + signColWidth * 2.5, signTop + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(ketuaRtName.trim() ? `( ${ketuaRtName.trim()} )` : '( ....................................... )', margin + signColWidth * 2.5, signTop + 24, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Laporan Pengeluaran Kas RT ${settings.namaRt}/${settings.namaRw} Pliken Kembaran - Dicetak via Sistem Jimpitan Digital RT | Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Laporan_Pengeluaran_Kas_${settings.namaRt.replace(/\s+/g, '_')}_${periodText.replace(/\s+/g, '_')}.pdf`);
};


