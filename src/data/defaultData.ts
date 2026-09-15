import { Warga, ReguRonda, AppSettings, KasMutation } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  namaRt: 'RT 08',
  namaRw: 'RW 06',
  lingkungan: 'Pliken Kembaran',
  defaultNominal: 1000,
  saldoAwalKas: 0,
  pinAdmin: '1234',
  soundEnabled: true,
  speechEnabled: true,
  currencySymbol: 'Rp',
};

export const DEFAULT_REGU: ReguRonda[] = [
  {
    id: 'regu-1',
    nama: 'Regu 1 (Senin)',
    hari: 'Senin',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-2',
    nama: 'Regu 2 (Selasa)',
    hari: 'Selasa',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-3',
    nama: 'Regu 3 (Rabu)',
    hari: 'Rabu',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-4',
    nama: 'Regu 4 (Kamis)',
    hari: 'Kamis',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-5',
    nama: 'Regu 5 (Jumat)',
    hari: 'Jumat',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-6',
    nama: 'Regu 6 (Sabtu)',
    hari: 'Sabtu',
    koordinator: '-',
    anggota: [],
  },
  {
    id: 'regu-7',
    nama: 'Regu 7 (Minggu)',
    hari: 'Minggu',
    koordinator: '-',
    anggota: [],
  },
];

// Clean empty arrays by default (No dummy / demo data)
export const DEFAULT_WARGA: Warga[] = [];
export const DEFAULT_MUTATIONS: KasMutation[] = [];
export const SAMPLE_WARGA: Warga[] = [];
export const SAMPLE_MUTATIONS: KasMutation[] = [];

