import ExcelJS from 'exceljs';
import { JimpitanRecord, KasMutation, AppSettings, Warga, KasReportCustomOptions } from '../types';
import { formatTanggalIndo } from './formatters';

interface GenerateExcelOptions {
  records: JimpitanRecord[];
  mutations: KasMutation[];
  settings: AppSettings;
  periodText: string;
  totalSaldoKas: number;
  saldoAwalPeriode?: number;
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
  wargaList?: Warga[];
  customOptions?: KasReportCustomOptions;
}

export const generateKasReportExcel = async ({
  records,
  mutations,
  settings,
  periodText,
  totalSaldoKas,
  saldoAwalPeriode = 0,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
  wargaList = [],
  customOptions,
}: GenerateExcelOptions) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Jimpitan Digital RT 08 RW 06 Pliken';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Kas RT', {
    views: [{ showGridLines: true }],
  });

  // Setup column widths
  worksheet.columns = [
    { key: 'colA', width: 6 },   // No
    { key: 'colB', width: 15 },  // Tanggal
    { key: 'colC', width: 12 },  // Waktu / No Rumah
    { key: 'colD', width: 30 },  // Nama Warga / Keterangan
    { key: 'colE', width: 20 },  // Kategori / Status
    { key: 'colF', width: 22 },  // Petugas
    { key: 'colG', width: 18 },  // Nominal Masuk
    { key: 'colH', width: 18 },  // Nominal Keluar
  ];

  // Apply custom filters if specified
  let effectiveMutations = mutations;
  if (customOptions?.mutasiFilterJenis === 'keluar') {
    effectiveMutations = mutations.filter((m) => m.jenis === 'keluar');
  } else if (customOptions?.mutasiFilterJenis === 'masuk') {
    effectiveMutations = mutations.filter((m) => m.jenis === 'masuk');
  }

  let effectiveRecords = records;
  if (customOptions?.jimpitanFilterStatus === 'ada_setoran') {
    effectiveRecords = records.filter((r) => (r.nominal || 0) > 0 || r.status === 'sukses' || r.status === 'titip');
  } else if (customOptions?.jimpitanFilterStatus === 'sukses') {
    effectiveRecords = records.filter((r) => r.status === 'sukses');
  } else if (customOptions?.jimpitanFilterStatus === 'titip') {
    effectiveRecords = records.filter((r) => r.status === 'titip');
  } else if (customOptions?.jimpitanFilterStatus === 'kosong') {
    effectiveRecords = records.filter((r) => r.status === 'kosong');
  } else if (customOptions?.jimpitanFilterStatus === 'lewat') {
    effectiveRecords = records.filter((r) => r.status === 'lewat');
  }

  // Helper styles
  const primaryColor = 'FF0284C7'; // Sky 600
  const darkNavy = 'FF0F172A';     // Slate 900
  const softBg = 'FFF0F9FF';       // Sky 50
  const borderThin = {
    top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  };

  // 1. KOP SURAT RT 08 RW 06 PLIKEN
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'PENGURUS RUKUN TETANGGA 08 / RUKUN WARGA 06';
  worksheet.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF334155' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = `DESA PLIKEN, KECAMATAN KEMBARAN - ${settings.namaRt} / ${settings.namaRw}`;
  worksheet.getCell('A2').font = { name: 'Calibri', size: 15, bold: true, color: { argb: primaryColor } };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A3:H3');
  worksheet.getCell('A3').value = 'Sekretariat: Lingkungan RT 08 RW 06 Desa Pliken, Kec. Kembaran, Kab. Banyumas 53182 | Layanan Kas Jimpitan Digital';
  worksheet.getCell('A3').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Kop border separator
  for (let c = 1; c <= 8; c++) {
    worksheet.getCell(4, c).border = {
      bottom: { style: 'double', color: { argb: 'FF1E293B' } },
    };
  }

  // 2. DOCUMENT TITLE & PERIODE
  worksheet.mergeCells('A6:H6');
  worksheet.getCell('A6').value = 'LAPORAN RESMI KEUANGAN KAS & JIMPITAN WARGA RT';
  worksheet.getCell('A6').font = { name: 'Calibri', size: 13, bold: true, color: { argb: darkNavy } };
  worksheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A7:H7');
  worksheet.getCell('A7').value = `Periode Rekapitulasi: ${periodText} | Dicetak: ${formatTanggalIndo(new Date().toISOString().split('T')[0])}`;
  worksheet.getCell('A7').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. RINGKASAN SALDO KAS BOX
  const totalJimpitan = records.reduce((s, r) => s + (r.nominal || 0), 0);
  const totalPemasukanLain = mutations.filter((m) => m.jenis === 'masuk').reduce((s, m) => s + (m.nominal || 0), 0);
  const totalPemasukan = totalJimpitan + totalPemasukanLain;
  const totalPengeluaran = mutations.filter((m) => m.jenis === 'keluar').reduce((s, m) => s + (m.nominal || 0), 0);

  let curRow = 9;
  worksheet.mergeCells(`A${curRow}:D${curRow}`);
  worksheet.getCell(`A${curRow}`).value = 'RINGKASAN REKAPITULASI KEUANGAN KAS:';
  worksheet.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: darkNavy } };

  curRow++;
  worksheet.mergeCells(`A${curRow}:C${curRow}`);
  worksheet.getCell(`A${curRow}`).value = '1. Saldo Awal Periode';
  worksheet.getCell(`A${curRow}`).font = { bold: true };
  worksheet.getCell(`D${curRow}`).value = saldoAwalPeriode;
  worksheet.getCell(`D${curRow}`).numFmt = '"Rp "#,##0';
  worksheet.getCell(`D${curRow}`).font = { bold: true, color: { argb: 'FF059669' } };

  worksheet.mergeCells(`E${curRow}:G${curRow}`);
  worksheet.getCell(`E${curRow}`).value = '3. Total Pengeluaran Kas';
  worksheet.getCell(`E${curRow}`).font = { bold: true };
  worksheet.getCell(`H${curRow}`).value = totalPengeluaran;
  worksheet.getCell(`H${curRow}`).numFmt = '"Rp "#,##0';
  worksheet.getCell(`H${curRow}`).font = { bold: true, color: { argb: 'FFE11D48' } };

  curRow++;
  worksheet.mergeCells(`A${curRow}:C${curRow}`);
  worksheet.getCell(`A${curRow}`).value = '2. Total Pemasukan (Jimpitan & Lainnya)';
  worksheet.getCell(`A${curRow}`).font = { bold: true };
  worksheet.getCell(`D${curRow}`).value = totalPemasukan;
  worksheet.getCell(`D${curRow}`).numFmt = '"Rp "#,##0';
  worksheet.getCell(`D${curRow}`).font = { bold: true, color: { argb: 'FF0284C7' } };

  worksheet.mergeCells(`E${curRow}:G${curRow}`);
  worksheet.getCell(`E${curRow}`).value = '4. SALDO KAS BERSIH (DANA TERSEDIA)';
  worksheet.getCell(`E${curRow}`).font = { bold: true, color: { argb: 'FF065F46' } };
  worksheet.getCell(`H${curRow}`).value = totalSaldoKas;
  worksheet.getCell(`H${curRow}`).numFmt = '"Rp "#,##0';
  worksheet.getCell(`H${curRow}`).font = { bold: true, size: 11, color: { argb: 'FF047857' } };

  // Styling summary box border
  for (let r = 9; r <= curRow; r++) {
    for (let c = 1; c <= 8; c++) {
      worksheet.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: softBg },
      };
      worksheet.getCell(r, c).border = borderThin;
    }
  }

  curRow += 2;

  // 4. TABEL 1: MUTASI PENGELUARAN & KAS MASUK LAINNYA
  if (customOptions?.showMutasiTable !== false) {
    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    const mutasiTitle = customOptions?.mutasiFilterJenis === 'keluar'
      ? 'TABEL 1: BUKU CATATAN PENGELUARAN KAS RT'
      : customOptions?.mutasiFilterJenis === 'masuk'
      ? 'TABEL 1: BUKU CATATAN PEMASUKAN KAS RT (NON-JIMPITAN)'
      : 'TABEL 1: BUKU CATATAN MUTASI & PENGELUARAN KAS RT';
    worksheet.getCell(`A${curRow}`).value = mutasiTitle;
    worksheet.getCell(`A${curRow}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: darkNavy } };

    curRow++;
    const mutasiHeaderRow = curRow;
    const mutasiHeaders = ['No', 'Tanggal', 'Jenis', 'Kategori Pengeluaran / Masuk', 'Keterangan Rincian', 'Petugas / PJ', 'Pemasukan (Rp)', 'Pengeluaran (Rp)'];
    mutasiHeaders.forEach((h, idx) => {
      const cell = worksheet.getCell(mutasiHeaderRow, idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }, // Slate 700
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = borderThin;
    });

    if (effectiveMutations.length === 0) {
      curRow++;
      worksheet.mergeCells(`A${curRow}:H${curRow}`);
      worksheet.getCell(`A${curRow}`).value = 'Tidak ada transaksi mutasi kas tercatat pada kriteria ini.';
      worksheet.getCell(`A${curRow}`).font = { italic: true, color: { argb: 'FF94A3B8' } };
      worksheet.getCell(`A${curRow}`).alignment = { horizontal: 'center' };
      for (let c = 1; c <= 8; c++) worksheet.getCell(curRow, c).border = borderThin;
    } else {
      effectiveMutations.forEach((m, idx) => {
      curRow++;
      worksheet.getCell(curRow, 1).value = idx + 1;
      worksheet.getCell(curRow, 1).alignment = { horizontal: 'center' };

      worksheet.getCell(curRow, 2).value = m.tanggal ? formatTanggalIndo(m.tanggal) : '-';
      worksheet.getCell(curRow, 2).alignment = { horizontal: 'center' };

      worksheet.getCell(curRow, 3).value = m.jenis === 'masuk' ? 'PEMASUKAN' : 'PENGELUARAN';
      worksheet.getCell(curRow, 3).font = { bold: true, color: { argb: m.jenis === 'masuk' ? 'FF059669' : 'FFE11D48' } };
      worksheet.getCell(curRow, 3).alignment = { horizontal: 'center' };

      worksheet.getCell(curRow, 4).value = m.kategori || 'Kas Operasional';
      worksheet.getCell(curRow, 5).value = m.keterangan || '-';
      worksheet.getCell(curRow, 6).value = m.petugas || '-';

      worksheet.getCell(curRow, 7).value = m.jenis === 'masuk' ? m.nominal : 0;
      worksheet.getCell(curRow, 7).numFmt = '"Rp "#,##0';

      worksheet.getCell(curRow, 8).value = m.jenis === 'keluar' ? m.nominal : 0;
      worksheet.getCell(curRow, 8).numFmt = '"Rp "#,##0';

      for (let c = 1; c <= 8; c++) {
        worksheet.getCell(curRow, c).border = borderThin;
      }
    });
  }

  curRow += 2;
}

  // 5. TABEL 2: RINCIAN PENERIMAAN JIMPITAN WARGA
  if (customOptions?.showJimpitanTable !== false) {
    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    worksheet.getCell(`A${curRow}`).value = 'TABEL 2: RINCIAN PENERIMAAN JIMPITAN WARGA';
    worksheet.getCell(`A${curRow}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: darkNavy } };

  curRow++;
  const jimpitanHeaderRow = curRow;
  const jimpitanHeaders = ['No', 'Tanggal', 'Waktu', 'No. Rumah', 'Nama Kepala Keluarga', 'Status', 'Petugas Lapangan', 'Nominal (Rp)'];
  jimpitanHeaders.forEach((h, idx) => {
    const cell = worksheet.getCell(jimpitanHeaderRow, idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: primaryColor },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

    if (effectiveRecords.length === 0) {
      curRow++;
      worksheet.mergeCells(`A${curRow}:H${curRow}`);
      worksheet.getCell(`A${curRow}`).value = 'Belum ada data setoran jimpitan pada kriteria ini.';
      worksheet.getCell(`A${curRow}`).font = { italic: true, color: { argb: 'FF94A3B8' } };
      worksheet.getCell(`A${curRow}`).alignment = { horizontal: 'center' };
      for (let c = 1; c <= 8; c++) worksheet.getCell(curRow, c).border = borderThin;
    } else {
      const wargaMap = new Map<string, string>();
      if (Array.isArray(wargaList)) {
        wargaList.forEach((w) => {
          if (w.id) wargaMap.set(w.id, w.nama);
          if (w.nomorRumah) wargaMap.set(`no_${w.nomorRumah}`, w.nama);
        });
      }

      effectiveRecords.forEach((r, idx) => {
        curRow++;
        worksheet.getCell(curRow, 1).value = idx + 1;
        worksheet.getCell(curRow, 1).alignment = { horizontal: 'center' };

        worksheet.getCell(curRow, 2).value = r.tanggal ? formatTanggalIndo(r.tanggal) : '-';
        worksheet.getCell(curRow, 2).alignment = { horizontal: 'center' };

        worksheet.getCell(curRow, 3).value = r.waktu || '-';
        worksheet.getCell(curRow, 3).alignment = { horizontal: 'center' };

        worksheet.getCell(curRow, 4).value = r.nomorRumah ? `No. ${r.nomorRumah}` : '-';
        worksheet.getCell(curRow, 4).alignment = { horizontal: 'center' };

        const citizenName =
          (r.wargaId && wargaMap.get(r.wargaId)) ||
          (r.nomorRumah && wargaMap.get(`no_${r.nomorRumah}`)) ||
          r.namaWarga ||
          '-';

        worksheet.getCell(curRow, 5).value = citizenName;

        worksheet.getCell(curRow, 6).value = r.status.toUpperCase();
        worksheet.getCell(curRow, 6).alignment = { horizontal: 'center' };
        worksheet.getCell(curRow, 6).font = { bold: true, color: { argb: r.status === 'sukses' ? 'FF059669' : 'FFE11D48' } };

        worksheet.getCell(curRow, 7).value = r.petugas || '-';

        worksheet.getCell(curRow, 8).value = r.nominal || 0;
        worksheet.getCell(curRow, 8).numFmt = '"Rp "#,##0';

        for (let c = 1; c <= 8; c++) {
          worksheet.getCell(curRow, c).border = borderThin;
        }
      });

      // Subtotal Jimpitan
      curRow++;
      worksheet.mergeCells(`A${curRow}:G${curRow}`);
      worksheet.getCell(`A${curRow}`).value = 'TOTAL PENERIMAAN JIMPITAN WARGA';
      worksheet.getCell(`A${curRow}`).font = { bold: true, color: { argb: darkNavy } };
      worksheet.getCell(`A${curRow}`).alignment = { horizontal: 'right' };
      worksheet.getCell(`H${curRow}`).value = totalJimpitan;
      worksheet.getCell(`H${curRow}`).numFmt = '"Rp "#,##0';
      worksheet.getCell(`H${curRow}`).font = { bold: true, color: { argb: 'FF0284C7' } };
      for (let c = 1; c <= 8; c++) {
        worksheet.getCell(curRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softBg } };
        worksheet.getCell(curRow, c).border = borderThin;
      }
    }

    curRow += 3;
  }

  // 6. LEMBAR PENGESAHAN & 2 TANDA TANGAN RESMI (BENDAHARA & KETUA RT)
  const todayDateStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  worksheet.mergeCells(`E${curRow}:H${curRow}`);
  worksheet.getCell(`E${curRow}`).value = `Ditetapkan di Pliken, Kembaran pada: ${todayDateStr}`;
  worksheet.getCell(`E${curRow}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  worksheet.getCell(`E${curRow}`).alignment = { horizontal: 'right' };

  curRow += 2;
  const signHeaderRow = curRow;

  // Kolom 1 (Kiri): Bendahara Kas RT
  worksheet.mergeCells(`A${signHeaderRow}:D${signHeaderRow}`);
  worksheet.getCell(`A${signHeaderRow}`).value = 'Bendahara Kas RT';
  worksheet.getCell(`A${signHeaderRow}`).font = { bold: true, size: 10 };
  worksheet.getCell(`A${signHeaderRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`A${signHeaderRow + 1}:D${signHeaderRow + 1}`);
  worksheet.getCell(`A${signHeaderRow + 1}`).value = 'Pengelola Kas Jimpitan Warga';
  worksheet.getCell(`A${signHeaderRow + 1}`).font = { size: 8.5, color: { argb: 'FF64748B' } };
  worksheet.getCell(`A${signHeaderRow + 1}`).alignment = { horizontal: 'center' };

  // Kolom 2 (Kanan): Ketua RT
  worksheet.mergeCells(`E${signHeaderRow}:H${signHeaderRow}`);
  worksheet.getCell(`E${signHeaderRow}`).value = `Ketua ${settings.namaRt} ${settings.namaRw}`;
  worksheet.getCell(`E${signHeaderRow}`).font = { bold: true, size: 10 };
  worksheet.getCell(`E${signHeaderRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`E${signHeaderRow + 1}:H${signHeaderRow + 1}`);
  worksheet.getCell(`E${signHeaderRow + 1}`).value = 'Mengetahui & Menyetujui';
  worksheet.getCell(`E${signHeaderRow + 1}`).font = { size: 8.5, color: { argb: 'FF64748B' } };
  worksheet.getCell(`E${signHeaderRow + 1}`).alignment = { horizontal: 'center' };

  // Signature Names (After 4 empty rows for ink sign)
  const signNameRow = signHeaderRow + 5;

  const displayBendahara = (bendaharaName || settings.namaBendahara || '').trim() 
    ? `( ${(bendaharaName || settings.namaBendahara)!.trim()} )` 
    : '( .................................................. )';
  worksheet.mergeCells(`A${signNameRow}:D${signNameRow}`);
  worksheet.getCell(`A${signNameRow}`).value = displayBendahara;
  worksheet.getCell(`A${signNameRow}`).font = { bold: true, size: 9.5 };
  worksheet.getCell(`A${signNameRow}`).alignment = { horizontal: 'center' };

  const displayKetua = (ketuaRtName || settings.namaKetuaRt || '').trim() 
    ? `( ${(ketuaRtName || settings.namaKetuaRt)!.trim()} )` 
    : '( .................................................. )';
  worksheet.mergeCells(`E${signNameRow}:H${signNameRow}`);
  worksheet.getCell(`E${signNameRow}`).value = displayKetua;
  worksheet.getCell(`E${signNameRow}`).font = { bold: true, size: 9.5 };
  worksheet.getCell(`E${signNameRow}`).alignment = { horizontal: 'center' };

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const fileNameClean = `Laporan_Kas_${settings.namaRt.replace(/\s+/g, '_')}_${periodText.replace(/\s+/g, '_')}.xlsx`;
  anchor.download = fileNameClean;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// 2. EXCEL BULANAN MATRIKS (1-31) PER WARGA
export const generateWargaMonthlyReportExcel = async ({
  wargaData,
  settings,
  activeMonthLabel,
  daysInMonth,
  petugasName = '',
  bendaharaName = '',
  ketuaRtName = '',
}: {
  wargaData: Array<{
    warga: Warga;
    totalAmount?: number;
    totalTerbayar?: number;
    countDays?: number;
    countPaidDays?: number;
    dailyAmounts?: { [day: number]: number };
    dailyMap?: Record<number, { isPaid?: boolean; nominal?: number; isAdvance?: boolean } | number>;
    isTargetMet?: boolean;
    isOverTarget?: boolean;
    status?: 'exact' | 'underpaid' | 'overpaid';
    difference?: number;
    selisih?: number;
    nominalKurang?: number;
    nominalLebih?: number;
  }>;
  settings: AppSettings;
  activeMonthLabel: string;
  daysInMonth: number;
  petugasName?: string;
  bendaharaName?: string;
  ketuaRtName?: string;
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Jimpitan Digital RT 08 RW 06 Pliken';
  const worksheet = workbook.addWorksheet('Matriks Jimpitan Bulanan', {
    views: [{ showGridLines: true }],
  });

  const totalCols = 5 + daysInMonth;

  // Setup columns
  const cols: Array<{ key: string; width: number }> = [
    { key: 'no', width: 5 },
    { key: 'rumah', width: 10 },
    { key: 'nama', width: 24 },
    { key: 'status', width: 12 },
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    cols.push({ key: `d${d}`, width: 6 });
  }
  cols.push({ key: 'total', width: 15 });
  worksheet.columns = cols;

  // Kop Surat
  worksheet.mergeCells(1, 1, 1, totalCols);
  worksheet.getCell(1, 1).value = `PENGURUS ${settings.namaRt.toUpperCase()} / ${settings.namaRw.toUpperCase()} DESA PLIKEN, KEMBARAN`;
  worksheet.getCell(1, 1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF334155' } };
  worksheet.getCell(1, 1).alignment = { horizontal: 'center' };

  worksheet.mergeCells(2, 1, 2, totalCols);
  worksheet.getCell(2, 1).value = `REKAPITULASI MATRIKS JIMPITAN WARGA TANGGAL 1 - ${daysInMonth} (${activeMonthLabel.toUpperCase()})`;
  worksheet.getCell(2, 1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0284C7' } };
  worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

  // Table Headers
  const headerRow = 4;
  worksheet.getCell(headerRow, 1).value = 'No';
  worksheet.getCell(headerRow, 2).value = 'No. Rumah';
  worksheet.getCell(headerRow, 3).value = 'Nama Kepala Keluarga';
  worksheet.getCell(headerRow, 4).value = 'Status';

  for (let d = 1; d <= daysInMonth; d++) {
    worksheet.getCell(headerRow, 4 + d).value = d;
  }
  worksheet.getCell(headerRow, 5 + daysInMonth).value = 'Total (Rp)';

  for (let c = 1; c <= totalCols; c++) {
    const cell = worksheet.getCell(headerRow, c);
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  let curRow = headerRow;
  let grandTotal = 0;

  wargaData.forEach((item, idx) => {
    curRow++;
    worksheet.getCell(curRow, 1).value = idx + 1;
    worksheet.getCell(curRow, 1).alignment = { horizontal: 'center' };

    worksheet.getCell(curRow, 2).value = `No. ${item.warga.nomorRumah}`;
    worksheet.getCell(curRow, 2).alignment = { horizontal: 'center' };

    worksheet.getCell(curRow, 3).value = item.warga.nama;

    const isLunas = item.isTargetMet ?? (item.status === 'exact' || item.status === 'overpaid');
    worksheet.getCell(curRow, 4).value = isLunas ? 'LUNAS' : 'KURANG';
    worksheet.getCell(curRow, 4).font = { bold: true, color: { argb: isLunas ? 'FF059669' : 'FFE11D48' } };
    worksheet.getCell(curRow, 4).alignment = { horizontal: 'center' };

    const dailyObj = (item.dailyAmounts || item.dailyMap || {}) as Record<number, any>;
    for (let d = 1; d <= daysInMonth; d++) {
      const cellData = dailyObj[d];
      let val = 0;
      if (typeof cellData === 'number') {
        val = cellData;
      } else if (cellData && typeof cellData === 'object') {
        val = Number(cellData.nominal) || 0;
      }

      const dayCell = worksheet.getCell(curRow, 4 + d);
      dayCell.value = val > 0 ? val : '-';
      dayCell.alignment = { horizontal: 'center' };
      if (val > 0) {
        dayCell.numFmt = '#,##0';
        dayCell.font = { size: 8.5 };
      } else {
        dayCell.font = { size: 8, color: { argb: 'FFCBD5E1' } };
      }
    }

    const totalVal = item.totalAmount ?? item.totalTerbayar ?? 0;
    const totalCell = worksheet.getCell(curRow, 5 + daysInMonth);
    totalCell.value = totalVal;
    totalCell.numFmt = '"Rp "#,##0';
    totalCell.font = { bold: true };
    grandTotal += totalVal;

    for (let c = 1; c <= totalCols; c++) {
      worksheet.getCell(curRow, c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  });

  // Grand total row
  curRow++;
  worksheet.mergeCells(curRow, 1, curRow, 4 + daysInMonth);
  worksheet.getCell(curRow, 1).value = 'TOTAL KESELURUHAN PENERIMAAN JIMPITAN BULAN INI';
  worksheet.getCell(curRow, 1).font = { bold: true, color: { argb: 'FF0F172A' } };
  worksheet.getCell(curRow, 1).alignment = { horizontal: 'right' };

  const gtCell = worksheet.getCell(curRow, 5 + daysInMonth);
  gtCell.value = grandTotal;
  gtCell.numFmt = '"Rp "#,##0';
  gtCell.font = { bold: true, size: 11, color: { argb: 'FF0284C7' } };

  for (let c = 1; c <= totalCols; c++) {
    worksheet.getCell(curRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
  }

  // 3 Signatures
  curRow += 3;
  const todayStr = formatTanggalIndo(new Date().toISOString().split('T')[0]);
  worksheet.getCell(curRow, totalCols).value = `Ditetapkan di Pliken pada: ${todayStr}`;
  worksheet.getCell(curRow, totalCols).alignment = { horizontal: 'right' };
  worksheet.getCell(curRow, totalCols).font = { italic: true, size: 9 };

  curRow += 2;
  const sRow = curRow;

  // Bendahara (Left)
  worksheet.mergeCells(sRow, 1, sRow, 6);
  worksheet.getCell(sRow, 1).value = 'Bendahara Kas RT';
  worksheet.getCell(sRow, 1).font = { bold: true, size: 9.5 };
  worksheet.getCell(sRow, 1).alignment = { horizontal: 'center' };

  // Ketua RT (Right)
  worksheet.mergeCells(sRow, totalCols - 6, sRow, totalCols);
  worksheet.getCell(sRow, totalCols - 6).value = `Ketua ${settings.namaRt} ${settings.namaRw}`;
  worksheet.getCell(sRow, totalCols - 6).font = { bold: true, size: 9.5 };
  worksheet.getCell(sRow, totalCols - 6).alignment = { horizontal: 'center' };

  // Names after 4 rows
  const nameRow = sRow + 5;
  const dispBen = (bendaharaName || settings.namaBendahara || '').trim() ? `( ${(bendaharaName || settings.namaBendahara)!.trim()} )` : '( .................................................. )';
  worksheet.mergeCells(nameRow, 1, nameRow, 6);
  worksheet.getCell(nameRow, 1).value = dispBen;
  worksheet.getCell(nameRow, 1).font = { bold: true, size: 9 };
  worksheet.getCell(nameRow, 1).alignment = { horizontal: 'center' };

  const dispKet = (ketuaRtName || settings.namaKetuaRt || '').trim() ? `( ${(ketuaRtName || settings.namaKetuaRt)!.trim()} )` : '( .................................................. )';
  worksheet.mergeCells(nameRow, totalCols - 6, nameRow, totalCols);
  worksheet.getCell(nameRow, totalCols - 6).value = dispKet;
  worksheet.getCell(nameRow, totalCols - 6).font = { bold: true, size: 9 };
  worksheet.getCell(nameRow, totalCols - 6).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Matriks_Bulanan_${settings.namaRt.replace(/\s+/g, '_')}_${activeMonthLabel.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
