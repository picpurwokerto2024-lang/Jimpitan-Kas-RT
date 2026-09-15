import React, { useState, useMemo } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  X, 
  BellRing, 
  Send, 
  Phone, 
  UserX, 
  UserCheck, 
  Search, 
  Sparkles,
  ExternalLink,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Warga, JimpitanRecord, AppSettings, KasMutation } from '../types';
import { 
  generateWhatsAppReport, 
  generateWhatsAppPersonalReminder,
  generateWhatsAppUnpaidBroadcast,
  cleanWhatsAppPhone,
  formatRupiah, 
  formatTanggalIndo 
} from '../utils/formatters';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  namaRt: string;
  namaRw: string;
  lingkungan?: string;
  selectedDate: string;
  reguNama: string;
  petugas: string;
  totalTerkumpul: number;
  totalTarget: number;
  jumlahRumahScanned: number;
  totalRumah: number;
  totalSaldoKas: number;
  allWarga: Warga[];
  allRecords: JimpitanRecord[];
  allMutations?: KasMutation[];
  onSaveWargaPhone?: (wargaId: string, nomorHp: string) => void;
  initialTab?: 'laporan' | 'pengingat';
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  namaRt,
  namaRw,
  lingkungan = 'Pliken Kembaran',
  selectedDate,
  reguNama,
  petugas,
  totalTerkumpul,
  totalTarget,
  jumlahRumahScanned,
  totalRumah,
  totalSaldoKas,
  allWarga = [],
  allRecords = [],
  allMutations = [],
  onSaveWargaPhone,
  initialTab = 'laporan',
}) => {
  const [activeTab, setActiveTab] = useState<'laporan' | 'pengingat'>(initialTab);
  
  // Tab 1 state
  const [catatanKhusus, setCatatanKhusus] = useState<string>('Lingkungan aman dan kondusif.');
  const [copiedLaporan, setCopiedLaporan] = useState<boolean>(false);

  // Filter mutations for selected date
  const todayPengeluaran = useMemo(() => {
    return allMutations.filter((m) => m.tanggal === selectedDate && m.jenis === 'keluar');
  }, [allMutations, selectedDate]);

  // Tab 2 state (Pengingat Belum Setor)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customReminderNote, setCustomReminderNote] = useState<string>('');
  const [copiedWargaId, setCopiedWargaId] = useState<string | null>(null);
  const [copiedBroadcast, setCopiedBroadcast] = useState<boolean>(false);
  const [editingPhoneWargaId, setEditingPhoneWargaId] = useState<string | null>(null);
  const [tempPhoneInput, setTempPhoneInput] = useState<string>('');
  const [sentWargaIds, setSentWargaIds] = useState<Set<string>>(new Set());

  // 1. Calculate paid vs unpaid warga for today's selectedDate
  const { paidWargaSet, unpaidWargaList } = useMemo(() => {
    // Records on selected date that have successful or deposited payment
    const todayRecords = allRecords.filter((r) => r.tanggal === selectedDate);
    const paidSet = new Set<string>();

    todayRecords.forEach((rec) => {
      if (rec.status === 'sukses' || rec.status === 'titip' || rec.nominal > 0) {
        paidSet.add(rec.wargaId);
        paidSet.add(rec.nomorRumah); // also match by nomorRumah for safety
      }
    });

    const activeWarga = allWarga.filter((w) => w.isActive !== false);
    const unpaid = activeWarga.filter((w) => !paidSet.has(w.id) && !paidSet.has(w.nomorRumah));

    return {
      paidWargaSet: paidSet,
      unpaidWargaList: unpaid,
    };
  }, [allWarga, allRecords, selectedDate]);

  // Filtered unpaid warga by search query
  const filteredUnpaidList = useMemo(() => {
    if (!searchQuery.trim()) return unpaidWargaList;
    const q = searchQuery.toLowerCase();
    return unpaidWargaList.filter(
      (w) =>
        w.nama.toLowerCase().includes(q) ||
        w.nomorRumah.toLowerCase().includes(q) ||
        (w.blok && w.blok.toLowerCase().includes(q)) ||
        (w.nomorHp && w.nomorHp.includes(q))
    );
  }, [unpaidWargaList, searchQuery]);

  if (!isOpen) return null;

  // Laporan text for group
  const encodedLaporan = generateWhatsAppReport(
    namaRt,
    namaRw,
    selectedDate,
    reguNama,
    petugas,
    totalTerkumpul,
    totalTarget,
    jumlahRumahScanned,
    totalRumah,
    totalSaldoKas,
    catatanKhusus,
    todayPengeluaran
  );
  const rawLaporanText = decodeURIComponent(encodedLaporan);

  // Broadcast text for unpaid list
  const encodedBroadcast = generateWhatsAppUnpaidBroadcast(
    unpaidWargaList,
    namaRt,
    namaRw,
    selectedDate,
    reguNama,
    petugas
  );
  const rawBroadcastText = decodeURIComponent(encodedBroadcast);

  const handleCopyLaporan = () => {
    navigator.clipboard.writeText(rawLaporanText);
    setCopiedLaporan(true);
    setTimeout(() => setCopiedLaporan(false), 2000);
  };

  const handleOpenGroupWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodedLaporan}`, '_blank');
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(rawBroadcastText);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 2000);
  };

  const handleOpenBroadcastWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodedBroadcast}`, '_blank');
  };

  // Send single personal reminder via WhatsApp
  const handleSendPersonalReminder = (warga: Warga) => {
    const encodedPersonalMsg = generateWhatsAppPersonalReminder(
      warga,
      namaRt,
      namaRw,
      lingkungan,
      selectedDate,
      reguNama,
      petugas,
      customReminderNote
    );

    const cleanPhone = cleanWhatsAppPhone(warga.nomorHp);
    
    // Mark as sent in current session
    setSentWargaIds((prev) => new Set(prev).add(warga.id));

    if (cleanPhone) {
      // Direct message to phone number
      window.open(`https://wa.me/${cleanPhone}?text=${encodedPersonalMsg}`, '_blank');
    } else {
      // Share to WhatsApp contact picker
      window.open(`https://wa.me/?text=${encodedPersonalMsg}`, '_blank');
    }
  };

  // Copy personal reminder text
  const handleCopyPersonalReminder = (warga: Warga) => {
    const encodedPersonalMsg = generateWhatsAppPersonalReminder(
      warga,
      namaRt,
      namaRw,
      lingkungan,
      selectedDate,
      reguNama,
      petugas,
      customReminderNote
    );
    navigator.clipboard.writeText(decodeURIComponent(encodedPersonalMsg));
    setCopiedWargaId(warga.id);
    setTimeout(() => setCopiedWargaId(null), 2000);
  };

  // Save phone number inline
  const handleSavePhone = (wargaId: string) => {
    if (onSaveWargaPhone) {
      onSaveWargaPhone(wargaId, tempPhoneInput.trim());
    }
    setEditingPhoneWargaId(null);
    setTempPhoneInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full my-4 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base sm:text-lg">
                Pusat Layanan WhatsApp RT
              </h3>
              <p className="text-xs text-stone-500">
                {namaRt} / {namaRw} {lingkungan} • {formatTanggalIndo(selectedDate)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            id="btn-close-wa-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 MAIN TABS */}
        <div className="p-3 bg-stone-100/70 border-b border-stone-200 flex space-x-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'laporan'
                ? 'bg-white text-emerald-800 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:bg-white/60'
            }`}
            id="tab-laporan-wa"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Laporan Rekap Jimpitan</span>
          </button>

          <button
            onClick={() => setActiveTab('pengingat')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer relative ${
              activeTab === 'pengingat'
                ? 'bg-white text-sky-900 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:bg-white/60'
            }`}
            id="tab-pengingat-wa"
          >
            <BellRing className="w-4 h-4 text-sky-600" />
            <span>Pengingat Belum Setor</span>
            {unpaidWargaList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {unpaidWargaList.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: LAPORAN REKAP GRUP WA */}
          {activeTab === 'laporan' && (
            <div className="space-y-4 animate-in fade-in-50">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Terkumpul</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-800">
                    {formatRupiah(totalTerkumpul)}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                  <span className="text-[10px] font-bold text-sky-700 uppercase block">Coverage</span>
                  <span className="text-xs sm:text-sm font-extrabold text-sky-800">
                    {jumlahRumahScanned}/{totalRumah} Rumah
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Petugas</span>
                  <span className="text-xs sm:text-sm font-extrabold text-stone-800 truncate block">
                    {petugas || 'Pengurus RT'}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Saldo Kas</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-800">
                    {formatRupiah(totalSaldoKas)}
                  </span>
                </div>
              </div>

              {/* Input Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Catatan Tambahan Petugas (Opsional):
                </label>
                <input
                  type="text"
                  value={catatanKhusus}
                  onChange={(e) => setCatatanKhusus(e.target.value)}
                  placeholder="Contoh: Seluruh kotak jimpitan telah diperiksa..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Preview Message Box */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Pratinjau Pesan Grup WhatsApp:</span>
                  <span className="text-[10px] text-stone-400 font-normal">Format Siap Kirim</span>
                </label>
                <div className="p-4 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                  {rawLaporanText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2.5 pt-2">
                <button
                  onClick={handleCopyLaporan}
                  className="flex-1 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  id="btn-copy-laporan-wa"
                >
                  {copiedLaporan ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-stone-600" />
                  )}
                  <span>{copiedLaporan ? 'Pesan Tersalin!' : 'Salin Teks Laporan'}</span>
                </button>

                <button
                  onClick={handleOpenGroupWhatsApp}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
                  id="btn-send-group-wa"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Kirim ke Grup WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PENGINGAT OTOMATIS WARGA BELUM JIMPITAN */}
          {activeTab === 'pengingat' && (
            <div className="space-y-4 animate-in fade-in-50">
              
              {/* STATUS BANNER */}
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black flex-shrink-0">
                    {unpaidWargaList.length}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sky-950 text-xs sm:text-sm">
                      {unpaidWargaList.length === 0
                        ? 'Alhamdulillah, Semua Warga Sudah Jimpitan!'
                        : `${unpaidWargaList.length} Rumah Belum Menyetorkan Jimpitan`}
                    </h4>
                    <p className="text-[11px] text-sky-700">
                      Berdasarkan data ronde jimpitan hari ini ({formatTanggalIndo(selectedDate)})
                    </p>
                  </div>
                </div>

                {unpaidWargaList.length > 0 && (
                  <button
                    onClick={handleOpenBroadcastWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                    title="Kirim daftar belum setor ke Grup WA"
                    id="btn-broadcast-unpaid"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Rekap Belum ke Grup WA</span>
                  </button>
                )}
              </div>

              {/* SEARCH & CUSTOM NOTE */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari warga belum setor (No. Rumah / Nama / No. HP)..."
                    className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 outline-none focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={customReminderNote}
                    onChange={(e) => setCustomReminderNote(e.target.value)}
                    placeholder="Pesan tambahan pengingat (Opsional, misal: Putaran ke-2 jam 23:30)"
                    className="w-full px-3.5 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* LIST OF UNPAID WARGA */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredUnpaidList.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h5 className="font-bold text-stone-800 text-xs sm:text-sm">
                      {searchQuery
                        ? 'Tidak ada warga belum setor yang cocok dengan pencarian'
                        : 'Seluruh rumah sudah berpartisipasi dalam jimpitan malam ini.'}
                    </h5>
                    <p className="text-[11px] text-stone-500">
                      Terima kasih atas kedisiplinan dan kebersamaan warga RT 08 RW 06!
                    </p>
                  </div>
                ) : (
                  filteredUnpaidList.map((warga) => {
                    const isSent = sentWargaIds.has(warga.id);
                    const cleanPhone = cleanWhatsAppPhone(warga.nomorHp);
                    const isEditingPhone = editingPhoneWargaId === warga.id;

                    return (
                      <div
                        key={warga.id}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isSent
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-white border-stone-200 hover:border-sky-300 shadow-2xs'
                        }`}
                      >
                        {/* Warga info */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-extrabold flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[8px] uppercase">No</span>
                            <span className="text-xs font-black">{warga.nomorRumah}</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                                {warga.nama}
                              </h5>
                              {isSent && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Terkirim</span>
                                </span>
                              )}
                            </div>

                            {/* Phone number & edit row */}
                            <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                              {isEditingPhone ? (
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="text"
                                    value={tempPhoneInput}
                                    onChange={(e) => setTempPhoneInput(e.target.value)}
                                    placeholder="08xxxxxxxxxx"
                                    className="px-2 py-0.5 rounded border border-sky-400 text-xs text-stone-900 w-28 bg-white outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePhone(warga.id)}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                    title="Simpan No HP"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPhoneWargaId(null)}
                                    className="p-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-medium text-stone-600">
                                    {warga.nomorHp ? `WA: ${warga.nomorHp}` : 'Belum ada No. WA'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPhoneWargaId(warga.id);
                                      setTempPhoneInput(warga.nomorHp || '');
                                    }}
                                    className="text-sky-600 hover:text-sky-800 p-0.5 rounded hover:bg-sky-50 transition-colors"
                                    title="Ubah / Tambah Nomor WhatsApp"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <span className="text-stone-300">•</span>
                              <span className="text-sky-700 font-semibold">
                                {formatRupiah(warga.nominalDefault || 1000)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions for this warga */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-auto flex-shrink-0">
                          {/* Copy personal message */}
                          <button
                            onClick={() => handleCopyPersonalReminder(warga)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Salin Pesan Pengingat Warga Ini"
                          >
                            {copiedWargaId === warga.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Send WhatsApp 1-Click */}
                          <button
                            onClick={() => handleSendPersonalReminder(warga)}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
                              isSent
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : cleanPhone
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-sky-500 hover:bg-sky-600 text-white'
                            }`}
                            id={`btn-wa-remind-${warga.nomorRumah}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{cleanPhone ? 'Kirim WA' : 'Kirim Pesan'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* BROADCAST SUMMARY FOOTER */}
              {unpaidWargaList.length > 0 && (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600">
                  <span>
                    Daftar di atas otomatis terhubung dengan API WhatsApp untuk mengingatkan warga secara sopan.
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyBroadcast}
                      className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedBroadcast ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBroadcast ? 'Tersalin!' : 'Salin Rekap Belum'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-stone-500">
            Sistem Jimpitan Digital • <strong>RT 08 RW 06 Pliken</strong>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
