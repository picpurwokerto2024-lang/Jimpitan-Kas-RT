import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share2, 
  Smartphone, 
  Copy, 
  Check, 
  X, 
  Send, 
  Sparkles,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';
import { RtLogo } from './RtLogo';

interface InstallShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  namaRt: string;
  namaRw: string;
  lingkungan?: string;
  deferredPrompt: any;
  onInstallPwa: () => void;
}

export const InstallShareModal: React.FC<InstallShareModalProps> = ({
  isOpen,
  onClose,
  namaRt,
  namaRw,
  lingkungan = 'Pliken Kembaran',
  deferredPrompt,
  onInstallPwa,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'share'>('download');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedWAGuide, setCopiedWAGuide] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jimpitan-rt.web.app';

  // Generate QR code data URL whenever modal opens
  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#2b0f4a',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating app QR:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;
  
  // Custom WhatsApp invitation text for sharing with warga
  const waShareText = `Assalamu'alaikum Wr. Wb. / Salam sejahtera Bapak/Ibu Warga ${namaRt} / ${namaRw} ${lingkungan ? `(${lingkungan})` : ''} 🏠✨

Kini aplikasi *Jimpitan RT Digital* sudah dapat diakses langsung oleh seluruh warga dan petugas.

🔗 *Link Akses Aplikasi:*
${currentUrl}

📱 *Cara Pasang / Install di HP (Bisa Dibuka Cepat & Ringan):*
1. Buka link di atas di browser Google Chrome / Safari HP Anda.
2. Klik menu titik tiga (⋮) atau tombol *Share* (kotak tanda panah atas di iPhone).
3. Pilih *"Tambahkan ke Layar Utama"* / *"Install Aplikasi"*.
4. Ikon *Jimpitan RT* akan langsung muncul di layar HP Anda seperti aplikasi native!

✨ *Fitur yang dapat diakses:*
• Transparansi rekap uang jimpitan harian & bulanan
• Pantau pencatatan & riwayat jimpitan rumah
• Laporan kas & transparansi penggunaan dana RT
• Scanner QR cepat bagi petugas ronda

Terima kasih atas kebersamaan dan kerukunan warga lingkungan kita! 🙏`;

  const encodedWaText = encodeURIComponent(waShareText);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyGuide = () => {
    navigator.clipboard.writeText(waShareText);
    setCopiedWAGuide(true);
    setTimeout(() => setCopiedWAGuide(false), 2000);
  };

  const handleOpenWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodedWaText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-purple-100 shadow-2xl max-w-xl w-full my-4 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-purple-900/40 flex items-center justify-between bg-gradient-to-r from-[#2b0f4a] via-[#4e157d] to-[#781e5d] text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Download & Bagikan Aplikasi
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {namaRt} / {namaRw} • Siap Pasang di Semua HP Warga
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            id="btn-close-install-share-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 MAIN TABS */}
        <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex space-x-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'download'
                ? 'bg-white text-purple-950 shadow-xs border border-purple-200'
                : 'text-stone-600 hover:bg-white/60'
            }`}
            id="tab-install-pwa"
          >
            <Download className="w-4 h-4 text-purple-700" />
            <span>Pasang di HP (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'share'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-stone-600 hover:bg-white/60'
            }`}
            id="tab-share-warga"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Bagikan Link ke Warga</span>
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: DOWNLOAD / INSTALL PWA */}
          {activeTab === 'download' && (
            <div className="space-y-4 animate-in fade-in-50">
              
              {/* Main Install Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-purple-50 via-indigo-50/40 to-amber-50/30 border border-purple-200 text-center space-y-3 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] mx-auto flex items-center justify-center shadow-md border border-amber-400/40 p-1.5">
                  <RtLogo className="w-12 h-12" />
                </div>
                
                <div>
                  <h4 className="font-extrabold text-stone-900 text-base sm:text-lg">
                    Install Jimpitan RT di Layar Utama HP
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                    Aplikasi ini menggunakan teknologi <strong>PWA (Progressive Web App)</strong> resmi dengan Splash Screen dan icon native. Cepat dibuka langsung dari layar HP.
                  </p>
                </div>

                {/* Instant 1-Click Install Button if supported */}
                {deferredPrompt ? (
                  <button
                    onClick={onInstallPwa}
                    className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer active:scale-98"
                    id="btn-trigger-pwa-install"
                  >
                    <Download className="w-4.5 h-4.5" />
                    <span>Pasang / Install Sekarang (1-Klik)</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-purple-100/70 border border-purple-300/80 text-purple-950 text-xs font-semibold flex items-center justify-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-700 flex-shrink-0" />
                    <span>Aplikasi siap dipasang langsung melalui browser HP Anda!</span>
                  </div>
                )}
              </div>

              {/* Step by Step Guide for Android & iOS */}
              <div className="space-y-3">
                <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm uppercase tracking-wide flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-purple-700" />
                  <span>Petunjuk Pemasangan Manual di HP:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Android Chrome */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                        🤖
                      </span>
                      <h6 className="font-extrabold text-stone-900 text-xs">Untuk HP Android (Chrome)</h6>
                    </div>
                    <ol className="text-[11px] text-stone-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Buka link aplikasi di <strong>Google Chrome</strong>.</li>
                      <li>Ketuk ikon titik tiga (<strong>⋮</strong>) di sudut kanan atas.</li>
                      <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                      <li>Konfirmasi <strong>"Install"</strong>. Ikon siap di layar HP!</li>
                    </ol>
                  </div>

                  {/* iPhone Safari */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">
                        🍏
                      </span>
                      <h6 className="font-extrabold text-stone-900 text-xs">Untuk iPhone (Safari)</h6>
                    </div>
                    <ol className="text-[11px] text-stone-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Buka link aplikasi di browser <strong>Safari</strong>.</li>
                      <li>Ketuk tombol <strong>Share</strong> (ikon kotak tanda panah atas di bawah layar).</li>
                      <li>Gulir ke bawah, pilih <strong>"Add to Home Screen"</strong> (Tambah ke Layar Utama).</li>
                      <li>Ketuk <strong>"Add"</strong> di pojok kanan atas. Selesai!</li>
                    </ol>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BAGIKAN KE WARGA */}
          {activeTab === 'share' && (
            <div className="space-y-4 animate-in fade-in-50">
              
              {/* QR Code Scan to Open on Phone */}
              <div className="p-4 rounded-3xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-2 rounded-2xl bg-white border border-purple-200 shadow-xs flex-shrink-0">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="QR Link Aplikasi" 
                      className="w-28 h-28 object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center bg-stone-100 rounded-xl text-xs text-stone-400">
                      Memuat QR...
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold">
                    SCAN QR UNTUK BUKA
                  </span>
                  <h4 className="font-extrabold text-stone-900 text-sm">
                    Scan QR di Atas Menggunakan Kamera HP
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Warga dapat langsung mengarahkan kamera HP ke QR code di atas untuk langsung membuka aplikasi di ponsel masing-masing.
                  </p>
                </div>
              </div>

              {/* URL Box & Copy */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Link Langsung Aplikasi RT:
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3.5 py-2.5 rounded-2xl bg-stone-100 border border-stone-300 text-xs font-mono text-stone-800 truncate select-all">
                    {currentUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-black text-white font-extrabold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0"
                    id="btn-copy-app-link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Share Button */}
              <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                      Kirim Pesan Ajakan & Panduan ke Grup WhatsApp RT
                    </h5>
                    <p className="text-[11px] text-emerald-700">
                      Teks undangan lengkap dengan link dan cara pasang aplikasi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={handleOpenWhatsAppShare}
                    className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
                    id="btn-share-invite-whatsapp"
                  >
                    <Send className="w-4 h-4" />
                    <span>Bagikan ke Grup WhatsApp RT</span>
                  </button>

                  <button
                    onClick={handleCopyGuide}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-emerald-300 text-emerald-900 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    id="btn-copy-wa-invite-text"
                  >
                    {copiedWAGuide ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedWAGuide ? 'Teks Tersalin!' : 'Salin Format Pesan WA'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-stone-50 border-t border-purple-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-stone-500">
            Aplikasi Jimpitan RT Digital • <strong>{namaRt} / {namaRw}</strong>
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
