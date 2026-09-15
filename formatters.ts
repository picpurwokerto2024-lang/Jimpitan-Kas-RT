// Formatting helpers for Jimpitan RT

export const formatRupiah = (nominal: number): string => {
  return 'Rp ' + (nominal || 0).toLocaleString('id-ID');
};

export const formatTanggalIndo = (tanggalIso: string): string => {
  try {
    const [year, month, day] = tanggalIso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return tanggalIso;
  }
};

export const getHariDanPasaranJawa = (tanggalIso: string): { hari: string; pasaran: string; full: string } => {
  try {
    const [year, month, day] = tanggalIso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hari = hariNames[date.getDay()] || 'Hari';

    // Javanese 5-day pasaran cycle: Legi, Pahing, Pon, Wage, Kliwon
    const pasarans = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
    const utcMs = Date.UTC(year, month - 1, day);
    const anchorUtc = Date.UTC(1970, 0, 1);
    const diffDays = Math.floor((utcMs - anchorUtc) / 86400000);
    // 2026-09-03 was Kamis Pon
    const pasaranIndex = ((diffDays + 3) % 5 + 5) % 5;
    const pasaran = pasarans[pasaranIndex];

    return {
      hari,
      pasaran,
      full: `${hari} ${pasaran}`,
    };
  } catch {
    return { hari: 'Hari', pasaran: 'Pon', full: 'Kamis Pon' };
  }
};

export const formatTanggalHijriah = (tanggalIso: string): string => {
  try {
    const [year, month, day] = tanggalIso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Attempt standard Intl islamic calendar
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const formatted = formatter.format(date);
      if (formatted && formatted.length > 3) {
        return formatted.includes('H') ? formatted : `${formatted} H`;
      }
    }
  } catch {
    // fallback below
  }
  return '21 Rabi\'ul Awal 1448 H';
};

export const formatCompactNominal = (nominal: number): string => {
  if (!nominal || nominal <= 0) return '-';
  if (nominal >= 1000000) {
    const val = nominal / 1000000;
    return val % 1 === 0 ? `${val}jt` : `${val.toFixed(1)}jt`;
  }
  if (nominal >= 1000) {
    const val = nominal / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
  }
  return String(nominal);
};

export const formatMatrixNominalFull = (nominal: number): string => {
  if (!nominal || nominal <= 0) return '-';
  return nominal.toLocaleString('id-ID');
};

export const formatTanggalSingkat = (tanggalIso: string): string => {
  try {
    const [year, month, day] = tanggalIso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return tanggalIso;
  }
};

export const getTodayDateIso = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getShiftedDateIso = (baseIso: string, offsetDays: number): string => {
  try {
    const [year, month, day] = baseIso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + offsetDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return baseIso;
  }
};

export const isDatePast = (dateIso: string): boolean => {
  const liveToday = getTodayDateIso();
  return dateIso < liveToday;
};

export const cleanWhatsAppPhone = (phone?: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

export const generateWhatsAppPersonalReminder = (
  warga: { nama: string; nomorRumah: string; nominalDefault?: number },
  rt: string,
  rw: string,
  lingkungan: string,
  tanggal: string,
  reguNama: string,
  petugas: string,
  customNote?: string
): string => {
  const tglFormatted = formatTanggalIndo(tanggal);
  const nominal = formatRupiah(warga.nominalDefault || 1000);

  const text = `🌙 *PENGINGAT JIMPITAN MALAM INI*
Kepada Yth. *Bpk/Ibu ${warga.nama}* (Rumah No. ${warga.nomorRumah})
Lingkungan *${rt} / ${rw} ${lingkungan ? `- ${lingkungan}` : ''}*

Assalamu'alaikum Wr. Wb. / Selamat malam,
Izin menginfokan dari Petugas jimpitan malam ini (*${tglFormatted}*):

Uang jimpitan di wadah/kotak jimpitan kediaman Bpk/Ibu terpantau *belum terisi / belum terambil* (${nominal}).

${customNote ? `📝 *Pesan Petugas:* ${customNote}\n\n` : ''}Bagi Bpk/Ibu yang belum sempat mengisi, jimpitan dapat ditaruh di wadah jimpitan depan rumah atau diserahkan saat petugas berkeliling malam ini.

🙏 _Terima kasih banyak atas partisipasi, keikhlasan, dan kerjasamanya demi keamanan & kerukunan warga RT kita bersama._

Salam hormat,
👮‍♂️ *Petugas:* ${petugas || 'Pengurus RT'}
_Sistem Jimpitan Digital RT 08 RW 06 Pliken_`;

  return encodeURIComponent(text);
};

export const generateWhatsAppReport = (
  rt: string,
  rw: string,
  tanggal: string,
  reguNama: string,
  petugas: string,
  totalTerkumpul: number,
  totalTarget: number,
  jumlahRumahScanned: number,
  totalRumah: number,
  totalSaldoKas: number,
  catatan?: string,
  pengeluaranList?: Array<{ kategori: string; nominal: number; keterangan: string }>
): string => {
  const tglFormatted = formatTanggalIndo(tanggal);
  const coveragePct = totalRumah > 0 ? Math.round((jumlahRumahScanned / totalRumah) * 100) : 0;

  // Generate category breakdown for expenditures if available
  let expenseSection = '';
  if (pengeluaranList && pengeluaranList.length > 0) {
    const totalPengeluaran = pengeluaranList.reduce((sum, item) => sum + item.nominal, 0);
    
    // Group by category
    const catMap: Record<string, number> = {};
    pengeluaranList.forEach((item) => {
      const cat = item.kategori || 'Pengeluaran Kas';
      catMap[cat] = (catMap[cat] || 0) + item.nominal;
    });

    const catLines = Object.entries(catMap)
      .map(([cat, nom]) => `  • ${cat}: ${formatRupiah(nom)}`)
      .join('\n');

    expenseSection = `\n📉 *Rincian Pengeluaran Kas:* *${formatRupiah(totalPengeluaran)}*\n${catLines}\n━━━━━━━━━━━━━━━━━━━`;
  }

  const text = `📋 *LAPORAN PENARIKAN JIMPITAN RT*
🏘 *${rt} / ${rw}*
🗓 *Tanggal:* ${tglFormatted}
👥 *Petugas:* ${petugas || 'Pengurus RT'}

━━━━━━━━━━━━━━━━━━━
💰 *Terkumpul Malam Ini:* *${formatRupiah(totalTerkumpul)}*
🏠 *Progres Penarikan:* ${jumlahRumahScanned} / ${totalRumah} Rumah (${coveragePct}%)
🏦 *Total Saldo Kas RT:* ${formatRupiah(totalSaldoKas)}
━━━━━━━━━━━━━━━━━━━${expenseSection}
${catatan ? `📝 *Catatan Khusus:*\n${catatan}\n━━━━━━━━━━━━━━━━━━━\n` : ''}
🙏 _Terima kasih atas partisipasi dan keikhlasan seluruh warga demi keamanan dan kerukunan lingkungan kita bersama._

_Laporan otomatis oleh Aplikasi Jimpitan RT Digital_`;

  return encodeURIComponent(text);
};

export const generateWhatsAppUnpaidBroadcast = (
  unpaidList: Array<{ nomorRumah: string; nama: string }>,
  rt: string,
  rw: string,
  tanggal: string,
  reguNama: string,
  petugas: string
): string => {
  const tglFormatted = formatTanggalIndo(tanggal);
  const daftar = unpaidList
    .map((w, idx) => `${idx + 1}. No. ${w.nomorRumah} - ${w.nama}`)
    .join('\n');

  const text = `📢 *PENGINGAT JIMPITAN MALAM INI*
🏘 *${rt} / ${rw}*
🗓 *Hari/Tanggal:* ${tglFormatted}
👮‍♂️ *Petugas:* ${petugas || 'Pengurus RT'}

Berikut daftar kediaman warga yang kotak jimpitannya terpantau *belum terambil / belum terisi* pada penarikan malam ini:
${daftar}

━━━━━━━━━━━━━━━━━━━
🙏 _Bagi Bpk/Ibu warga yang tertera di atas, jimpitan dapat dititipkan pada kotak depan rumah atau disampaikan ke petugas / pengurus RT._

_Terima kasih atas kebersamaan dan kepedulian kita menjaga lingkungan!_`;

  return encodeURIComponent(text);
};

export const generateWhatsAppWargaMonthlyRecap = (
  warga: { nama: string; nomorRumah: string; alamat?: string; blok?: string },
  bulanTahunLabel: string,
  totalNominal: number,
  jumlahHari: number,
  totalHariBulan: number,
  rt: string,
  rw: string,
  lingkungan: string
): string => {
  const nominalStr = formatRupiah(totalNominal);
  const persentase = totalHariBulan > 0 ? Math.round((jumlahHari / totalHariBulan) * 100) : 0;

  const text = `🧾 *REKAPITULASI JIMPITAN WARGA*
Lingkungan *${rt} / ${rw}* ${lingkungan ? `(${lingkungan})` : ''}
🗓 *Periode:* ${bulanTahunLabel}

Kepada Yth. *Bpk/Ibu ${warga.nama}*
🏠 *No. Rumah:* ${warga.nomorRumah} ${warga.blok ? `(${warga.blok})` : ''}

━━━━━━━━━━━━━━━━━━━
💰 *Total Jimpitan Terkumpul:* *${nominalStr}*
📊 *Kehadiran / Penarikan:* ${jumlahHari} dari ${totalHariBulan} Hari (${persentase}%)
━━━━━━━━━━━━━━━━━━━

🙏 _Terima kasih yang sebesar-besarnya atas keikhlasan dan partisipasi rutin Bpk/Ibu dalam mendukung kas kegiatan sosial dan kemasyarakatan lingkungan kita bersama._

Salam hangat,
_Pengurus & Petugas RT_`;

  return encodeURIComponent(text);
};

export const getMonthNameIndo = (dateIso?: string): string => {
  try {
    const d = dateIso ? new Date(dateIso) : new Date();
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } catch {
    return 'Bulan Ini';
  }
};

export const generateWhatsAppMonthlyAdvanceReceipt = (
  warga: { nama: string; nomorRumah: string; alamat?: string },
  nominal: number,
  tanggalBayar: string,
  bulanLabel: string,
  petugas: string,
  rt: string,
  rw: string,
  lingkungan: string
): string => {
  const nominalStr = formatRupiah(nominal);
  const tglFormatted = formatTanggalIndo(tanggalBayar);

  const text = `🧾 *BUKTI PEMBAYARAN JIMPITAN LUNAS 1 BULAN*
Lingkungan *${rt} / ${rw}* ${lingkungan ? `(${lingkungan})` : ''}

Kepada Yth. *Bpk/Ibu ${warga.nama}*
🏠 *No. Rumah:* ${warga.nomorRumah}

━━━━━━━━━━━━━━━━━━━
💰 *Status:* *LUNAS 1 BULAN (${bulanLabel})*
💵 *Jumlah Diterima:* *${nominalStr}*
🗓 *Tanggal Bayar:* ${tglFormatted}
👮‍♂️ *Penerima / Petugas:* ${petugas || 'Pengurus RT'}
━━━━━━━━━━━━━━━━━━━

Catatan: Kotak jimpitan Bpk/Ibu otomatis ditandai *SUDAH LUNAS BULANAN* oleh sistem saat petugas berkeliling malam hari.

🙏 _Terima kasih banyak atas keikhlasan dan dukungan penuh Bpk/Ibu demi kelancaran kegiatan serta kerukunan lingkungan RT kita bersama._

_Sistem Jimpitan Digital RT 08 RW 06 Pliken_`;

  return encodeURIComponent(text);
};

