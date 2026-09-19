export type AppMode = 'warga' | 'penginput' | 'petugas';

export interface Warga {
  id: string;
  nomorRumah: string;
  nama: string;
  blok?: string;
  rt: string;
  rw: string;
  alamat?: string;
  nomorHp?: string;
  nominalDefault: number;
  isActive: boolean;
  qrCodeData: string; // e.g. "JIMPITAN-RT01-RW01-NO05"
}

export interface JimpitanRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  wargaId: string;
  nomorRumah: string;
  namaWarga: string;
  nominal: number;
  status: 'sukses' | 'kosong' | 'titip' | 'lewat';
  petugas: string;
  reguId: string;
  reguNama: string;
  catatan?: string;
  createdAt: number;
}

export interface ReguRonda {
  id: string;
  nama: string; // e.g. "Regu 2 (Selasa)"
  hari: string; // "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"
  koordinator: string;
  anggota: string[];
}

export interface KasMutation {
  id: string;
  tanggal: string;
  jenis: 'masuk' | 'keluar';
  nominal: number;
  kategori: string; // e.g. "Jimpitan Harian", "Konsumsi Ronda", "Penerangan Jalan", "Dana Sosial", "Lain-lain"
  keterangan: string;
  petugas?: string;
  createdAt: number;
}

export interface AppSettings {
  namaRt: string; // e.g. "RT 01"
  namaRw: string; // e.g. "RW 01"
  lingkungan: string; // e.g. "Kelurahan Purwokerto"
  defaultNominal: number; // e.g. 1000
  saldoAwalKas?: number; // Saldo awal kas RT (Rp)
  pinAdmin: string; // e.g. "1234"
  pinPenginput?: string; // e.g. "1234"
  soundEnabled: boolean;
  speechEnabled: boolean;
  currencySymbol: string;
}

export interface MoneyDenomination {
  koin100: number;
  koin200: number;
  koin500: number;
  koin1000: number;
  kertas1000: number;
  kertas2000: number;
  kertas5000: number;
  kertas10000: number;
  kertas20000: number;
  kertas50000: number;
  kertas100000: number;
}

export interface RondaSession {
  tanggal: string; // YYYY-MM-DD
  status: 'active' | 'finished';
  finishedAt?: number;
  reguId?: string;
  reguNama?: string;
  petugas?: string;
  totalTerkumpul?: number;
  jumlahRumahScanned?: number;
  catatan?: string;
}

export interface UserPresence {
  id: string;
  mode: AppMode;
  label?: string;
  device?: string;
  lastSeen: number;
  joinedAt?: number;
}

