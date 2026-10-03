import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  QrCode, 
  Printer, 
  Download, 
  X, 
  Sliders, 
  CheckSquare, 
  Square, 
  Search, 
  FileText, 
  Sparkles, 
  Layers, 
  Eye, 
  Scissors, 
  ShieldCheck,
  Palette,
  Maximize2,
  Minimize2,
  RefreshCw,
  Building,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Warga, AppSettings } from '../types';

interface CetakQrBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wargaList: Warga[];
  settings: AppSettings;
}

type SizePreset = 'small' | 'medium' | 'large' | 'extralarge' | 'custom';
type ThemeColor = 'sky' | 'emerald' | 'slate' | 'bw';

export const CetakQrBarcodeModal: React.FC<CetakQrBarcodeModalProps> = ({
  isOpen,
  onClose,
  wargaList = [],
  settings,
}) => {
  // Size and layout controls
  const [sizePreset, setSizePreset] = useState<SizePreset>('medium');
  const [qrPixelSize, setQrPixelSize] = useState<number>(110); // QR image size inside card (px)
  const [cardColumns, setCardColumns] = useState<number>(3); // 2, 3, 4, 5
  const [cardTheme, setCardTheme] = useState<ThemeColor>('sky');
  
  // Content toggles
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showNamaWarga, setShowNamaWarga] = useState<boolean>(true);
  const [showAlamat, setShowAlamat] = useState<boolean>(true);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [showInstruction, setShowInstruction] = useState<boolean>(true);
  const [customSubtitle, setCustomSubtitle] = useState<string>('KARTU JIMPITAN DIGITAL');

  // Search and selection
  const [search, setSearch] = useState<string>('');
  const [selectedWargaIds, setSelectedWargaIds] = useState<string[]>([]);
  const [qrDataMap, setQrDataMap] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Initialize selected residents to all
  useEffect(() => {
    if (wargaList.length > 0) {
      setSelectedWargaIds(wargaList.map((w) => w.id));
    }
  }, [wargaList]);

  // Adjust sliders when preset changes
  const applyPreset = (preset: SizePreset) => {
    setSizePreset(preset);
    if (preset === 'small') {
      setQrPixelSize(80);
      setCardColumns(4);
    } else if (preset === 'medium') {
      setQrPixelSize(110);
      setCardColumns(3);
    } else if (preset === 'large') {
      setQrPixelSize(140);
      setCardColumns(2);
    } else if (preset === 'extralarge') {
      setQrPixelSize(190);
      setCardColumns(1);
    }
  };

  // Generate QR Code data URLs on mount or when wargaList changes
  useEffect(() => {
    let isMounted = true;
    const generateAllQrs = async () => {
      const mapping: Record<string, string> = {};
      for (const w of wargaList) {
        try {
          const payload = w.qrCodeData || `JIMPITAN_${settings.namaRt.replace(/\s+/g, '')}_${w.nomorRumah}`;
          const url = await QRCode.toDataURL(payload, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'M',
          });
          mapping[w.id] = url;
        } catch (e) {
          console.error('Error generating QR for', w.nomorRumah, e);
        }
      }
      if (isMounted) {
        setQrDataMap(mapping);
      }
    };

    if (isOpen) {
      generateAllQrs();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, wargaList, settings.namaRt]);

  // Filtered residents based on search
  const filteredWarga = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return wargaList;
    return wargaList.filter(
      (w) =>
        w.nama.toLowerCase().includes(q) ||
        w.nomorRumah.toLowerCase().includes(q) ||
        (w.alamat && w.alamat.toLowerCase().includes(q)) ||
        (w.blok && w.blok.toLowerCase().includes(q))
    );
  }, [wargaList, search]);

  const targetWargaList = useMemo(() => {
    return wargaList.filter((w) => selectedWargaIds.includes(w.id));
  }, [wargaList, selectedWargaIds]);

  const handleSelectAll = () => {
    setSelectedWargaIds(wargaList.map((w) => w.id));
  };

  const handleDeselectAll = () => {
    setSelectedWargaIds([]);
  };

  const toggleSelectWarga = (id: string) => {
    setSelectedWargaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Handle high-resolution PDF download using jsPDF
  const handleDownloadPdf = async () => {
    if (targetWargaList.length === 0) {
      alert('Pilih setidaknya 1 warga untuk dicetak.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Create A4 document (210 x 297 mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      // Determine cols and rows based on column count
      const cols = cardColumns === 1 ? 1 : cardColumns === 2 ? 2 : cardColumns === 3 ? 3 : 4;
      const cardWidth = (availableWidth - (cols - 1) * 4) / cols;
      
      // Calculate proportional card height
      const cardHeight = cols === 1 ? 120 : cols === 2 ? 80 : cols === 3 ? 62 : 48;
      const rows = Math.floor(availableHeight / (cardHeight + 4));
      const cardsPerPage = cols * rows;

      let currentPage = 1;
      let cardIndexOnPage = 0;

      for (let i = 0; i < targetWargaList.length; i++) {
        const warga = targetWargaList[i];
        const qrUrl = qrDataMap[warga.id];

        if (cardIndexOnPage >= cardsPerPage) {
          doc.addPage();
          currentPage++;
          cardIndexOnPage = 0;
        }

        const colIndex = cardIndexOnPage % cols;
        const rowIndex = Math.floor(cardIndexOnPage / cols);

        const x = margin + colIndex * (cardWidth + 4);
        const y = margin + rowIndex * (cardHeight + 4);

        // 1. Draw Card Background & Border
        doc.setFillColor(255, 255, 255);
        if (cardTheme === 'sky') {
          doc.setDrawColor(2, 132, 199); // Sky 600
        } else if (cardTheme === 'emerald') {
          doc.setDrawColor(5, 150, 105); // Emerald 600
        } else if (cardTheme === 'slate') {
          doc.setDrawColor(51, 65, 85); // Slate 700
        } else {
          doc.setDrawColor(0, 0, 0); // B&W
        }
        doc.setLineWidth(0.6);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2.5, 2.5, 'FD');

        // Optional cut lines (outer dashed guide)
        if (showCutLines) {
          doc.setDrawColor(203, 213, 225); // slate-300
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.rect(x - 1, y - 1, cardWidth + 2, cardHeight + 2, 'S');
          doc.setLineDashPattern([], 0); // reset dash
        }

        // 2. Card Header
        let currentY = y + 4.5;
        if (showKop) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(cols === 1 ? 11 : cols === 2 ? 9 : cols === 3 ? 7.5 : 6);
          if (cardTheme === 'sky') doc.setTextColor(2, 132, 199);
          else if (cardTheme === 'emerald') doc.setTextColor(5, 150, 105);
          else doc.setTextColor(30, 41, 59);

          doc.text(
            `JIMPITAN ${settings.namaRt.toUpperCase()} / ${settings.namaRw.toUpperCase()}`,
            x + cardWidth / 2,
            currentY,
            { align: 'center' }
          );
          currentY += cols === 1 ? 4.5 : cols === 2 ? 3.5 : 3;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(cols === 1 ? 8 : cols === 2 ? 6.5 : cols === 3 ? 5.5 : 4.5);
          doc.setTextColor(100, 116, 139);
          doc.text(customSubtitle || 'DESA PLIKEN, KEMBARAN', x + cardWidth / 2, currentY, {
            align: 'center',
          });
          currentY += cols === 1 ? 3.5 : 2.5;

          // Header separator
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(x + 2, currentY, x + cardWidth - 2, currentY);
          currentY += cols === 1 ? 3.5 : 2;
        }

        // 3. QR Code Image
        const qrSizeMm = cols === 1 ? 42 : cols === 2 ? 32 : cols === 3 ? 24 : 18;
        const qrX = x + (cardWidth - qrSizeMm) / 2;
        if (qrUrl) {
          doc.addImage(qrUrl, 'PNG', qrX, currentY, qrSizeMm, qrSizeMm);
        }
        currentY += qrSizeMm + (cols === 1 ? 3 : 2);

        // 4. House Number (Big & Bold)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(cols === 1 ? 16 : cols === 2 ? 13 : cols === 3 ? 10 : 8);
        doc.setTextColor(15, 23, 42); // slate 900
        doc.text(`NO. ${warga.nomorRumah}`, x + cardWidth / 2, currentY, { align: 'center' });
        currentY += cols === 1 ? 4.5 : cols === 2 ? 3.5 : 2.8;

        // 5. Resident Name
        if (showNamaWarga) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(cols === 1 ? 10 : cols === 2 ? 8 : cols === 3 ? 6.5 : 5.5);
          doc.setTextColor(51, 65, 85);
          const maxNameWidth = cardWidth - 4;
          const trimmedName = doc.splitTextToSize(warga.nama, maxNameWidth)[0] || warga.nama;
          doc.text(trimmedName, x + cardWidth / 2, currentY, { align: 'center' });
          currentY += cols === 1 ? 4 : cols === 2 ? 3 : 2.3;
        }

        // 6. Address / Block
        if (showAlamat && (warga.alamat || warga.blok)) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(cols === 1 ? 7.5 : cols === 2 ? 6 : cols === 3 ? 5 : 4.2);
          doc.setTextColor(100, 116, 139);
          const addr = warga.alamat || warga.blok || '';
          const trimmedAddr = doc.splitTextToSize(addr, cardWidth - 4)[0] || addr;
          doc.text(trimmedAddr, x + cardWidth / 2, currentY, { align: 'center' });
          currentY += cols === 1 ? 3.5 : 2.2;
        }

        // 7. Instructions / Footer note
        if (showInstruction && cols <= 3) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(cols === 1 ? 6.5 : cols === 2 ? 5 : 4);
          doc.setTextColor(148, 163, 184);
          doc.text('Tempelkan di kotak jimpitan depan rumah', x + cardWidth / 2, y + cardHeight - 2, {
            align: 'center',
          });
        }

        cardIndexOnPage++;
      }

      // Download triggered
      doc.save(`Lembar_QR_Barcode_${settings.namaRt.replace(/\s+/g, '_')}_A4.pdf`);
    } catch (err) {
      console.error('Error creating PDF:', err);
      alert('Terjadi kesalahan saat menyusun file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const themeBorderClasses: Record<ThemeColor, string> = {
    sky: 'border-sky-500 bg-sky-50/20 text-sky-900',
    emerald: 'border-emerald-500 bg-emerald-50/20 text-emerald-900',
    slate: 'border-slate-700 bg-slate-50 text-slate-900',
    bw: 'border-black bg-white text-black',
  };

  const themeBadgeClasses: Record<ThemeColor, string> = {
    sky: 'text-sky-700 border-sky-200 bg-sky-50',
    emerald: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    slate: 'text-slate-800 border-slate-300 bg-slate-100',
    bw: 'text-black border-black/30 bg-stone-100',
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-5xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* HEADER BAR (Non-printable) */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  Cetak Lembar QR Barcode Warga
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-black">
                  Mode Admin
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Siap cetak di kertas A4 & bisa atur ukuran barcode sesuai kebutuhan kotak jimpitan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (CONTROLS ON LEFT, PREVIEW ON RIGHT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-stone-100/60 print:block print:p-0 print:bg-white">
          
          {/* LEFT COLUMN: CUSTOMIZATION CONTROLS (Hidden when printing) */}
          <div className="lg:col-span-4 space-y-4 print:hidden">
            
            {/* 1. PRESET UKURAN BARCODE */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-sky-600" />
                  <span>Ukuran Kartu & Barcode</span>
                </span>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  {cardColumns} Kolom / A4
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('small')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    sizePreset === 'small'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-2 ring-sky-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-700 font-bold hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs">Kecil (Stiker)</div>
                  <div className="text-[9px] text-stone-500">4 Kolom • 5x5 cm</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('medium')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    sizePreset === 'medium'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-2 ring-sky-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-700 font-bold hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs">Sedang (Standar)</div>
                  <div className="text-[9px] text-stone-500">3 Kolom • 7x8 cm</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('large')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    sizePreset === 'large'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-2 ring-sky-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-700 font-bold hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs">Besar (Jelas)</div>
                  <div className="text-[9px] text-stone-500">2 Kolom • 10x12 cm</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('extralarge')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    sizePreset === 'extralarge'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-black ring-2 ring-sky-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-700 font-bold hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs">Ekstra Besar</div>
                  <div className="text-[9px] text-stone-500">1 Kolom • Display</div>
                </button>
              </div>

              {/* Slider for Fine-Tuning QR Size */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">Skala Ukuran QR Barcode:</span>
                  <span className="font-extrabold text-sky-600">{qrPixelSize} px</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={200}
                  step={5}
                  value={qrPixelSize}
                  onChange={(e) => {
                    setQrPixelSize(Number(e.target.value));
                    setSizePreset('custom');
                  }}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {/* Number of columns selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">Jumlah Kolom Baris:</span>
                  <span className="font-extrabold text-sky-600">{cardColumns} Kolom</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setCardColumns(col);
                        setSizePreset('custom');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        cardColumns === col
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {col} Kolom
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TEMA WARNA BORDER KARTU */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center space-x-1.5">
                <Palette className="w-4 h-4 text-sky-600" />
                <span>Warna Garis Border Kartu</span>
              </span>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCardTheme('sky')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    cardTheme === 'sky' ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-400/30 font-extrabold text-sky-950' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-sky-500 mx-auto mb-1" />
                  <span className="text-[10px] block">Biru RT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardTheme('emerald')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    cardTheme === 'emerald' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/30 font-extrabold text-emerald-950' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500 mx-auto mb-1" />
                  <span className="text-[10px] block">Hijau</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardTheme('slate')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    cardTheme === 'slate' ? 'border-slate-700 bg-slate-50 ring-2 ring-slate-400/30 font-extrabold text-slate-950' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-700 mx-auto mb-1" />
                  <span className="text-[10px] block">Gelap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardTheme('bw')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    cardTheme === 'bw' ? 'border-black bg-stone-100 ring-2 ring-black/20 font-extrabold text-black' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-black mx-auto mb-1" />
                  <span className="text-[10px] block">Hitam Putih</span>
                </button>
              </div>
            </div>

            {/* 3. ELEMEN INFORMASI KARTU */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Opsi Tampilan Informasi</span>
              </span>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer border border-transparent hover:border-stone-200">
                  <span className="text-xs font-bold text-stone-700">Tampilkan Kop RT & Judul</span>
                  <input
                    type="checkbox"
                    checked={showKop}
                    onChange={(e) => setShowKop(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer border border-transparent hover:border-stone-200">
                  <span className="text-xs font-bold text-stone-700">Tampilkan Nama Kepala Keluarga</span>
                  <input
                    type="checkbox"
                    checked={showNamaWarga}
                    onChange={(e) => setShowNamaWarga(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer border border-transparent hover:border-stone-200">
                  <span className="text-xs font-bold text-stone-700">Tampilkan Alamat / Blok Rumah</span>
                  <input
                    type="checkbox"
                    checked={showAlamat}
                    onChange={(e) => setShowAlamat(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer border border-transparent hover:border-stone-200">
                  <span className="text-xs font-bold text-stone-700 flex items-center space-x-1.5">
                    <Scissors className="w-3.5 h-3.5 text-stone-500" />
                    <span>Garis Panduan Gunting / Potong</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 cursor-pointer border border-transparent hover:border-stone-200">
                  <span className="text-xs font-bold text-stone-700">Petunjuk Penempelan Kotak</span>
                  <input
                    type="checkbox"
                    checked={showInstruction}
                    onChange={(e) => setShowInstruction(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 4. PILIH WARGA TERTENTU (FILTER CHECKBOX) */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                  Pilih Rumah ({targetWargaList.length} dari {wargaList.length})
                </span>
                <div className="flex items-center space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sky-600 hover:text-sky-800 font-extrabold cursor-pointer"
                  >
                    Semua
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-stone-500 hover:text-stone-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nomor rumah / nama..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Checkbox list */}
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-stone-100 rounded-xl p-1.5 bg-stone-50/50">
                {filteredWarga.map((w) => {
                  const isChecked = selectedWargaIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleSelectWarga(w.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isChecked ? 'bg-sky-100/60 text-sky-950 font-bold' : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      <span className="truncate">
                        No. {w.nomorRumah} - {w.nama}
                      </span>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 ml-1" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE PRINTABLE A4 PREVIEW */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between print:hidden">
              <span className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-sky-600" />
                <span>Pratinjau Lembar Siap Cetak (A4)</span>
              </span>
              <span className="text-[11px] text-stone-500">
                Total {targetWargaList.length} kartu siap cetak
              </span>
            </div>

            {/* A4 CANVAS WRAPPER */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-200 shadow-sm print:p-0 print:border-none print:shadow-none min-h-[500px]">
              
              {targetWargaList.length === 0 ? (
                <div className="py-20 text-center space-y-2 text-stone-400">
                  <QrCode className="w-12 h-12 mx-auto text-stone-300" />
                  <p className="font-bold text-sm">Tidak ada warga yang dipilih.</p>
                  <p className="text-xs">Silakan pilih warga pada menu di sebelah kiri.</p>
                </div>
              ) : (
                <div
                  className={`grid gap-3 ${
                    cardColumns === 1
                      ? 'grid-cols-1 max-w-md mx-auto'
                      : cardColumns === 2
                      ? 'grid-cols-2'
                      : cardColumns === 3
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {targetWargaList.map((w) => (
                    <div
                      key={w.id}
                      className={`relative bg-white rounded-2xl border-2 text-center p-3 sm:p-3.5 space-y-2 shadow-2xs transition-all flex flex-col justify-between ${
                        themeBorderClasses[cardTheme]
                      } ${showCutLines ? 'border-dashed' : 'border-solid'}`}
                    >
                      {/* Optional Cut Line Indicator */}
                      {showCutLines && (
                        <div className="absolute -top-2.5 right-2 bg-white px-1.5 text-[8px] text-stone-400 flex items-center space-x-0.5 print:hidden">
                          <Scissors className="w-2.5 h-2.5" />
                          <span>Garis Potong</span>
                        </div>
                      )}

                      {/* Header Kop */}
                      {showKop && (
                        <div className="border-b border-stone-200 pb-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider block leading-tight ${
                            cardTheme === 'sky' ? 'text-sky-800' : cardTheme === 'emerald' ? 'text-emerald-800' : 'text-stone-900'
                          }`}>
                            JIMPITAN {settings.namaRt} / {settings.namaRw}
                          </span>
                          <span className="text-[7.5px] font-bold text-stone-400 uppercase block leading-none mt-0.5">
                            {customSubtitle || 'DESA PLIKEN, KEMBARAN'}
                          </span>
                        </div>
                      )}

                      {/* QR Barcode Image */}
                      <div className="my-auto py-1 flex items-center justify-center">
                        <div
                          className="bg-white p-1.5 rounded-xl border border-stone-200 shadow-2xs mx-auto flex items-center justify-center"
                          style={{ width: qrPixelSize + 12, height: qrPixelSize + 12 }}
                        >
                          {qrDataMap[w.id] ? (
                            <img
                              src={qrDataMap[w.id]}
                              alt={`QR No. ${w.nomorRumah}`}
                              className="w-full h-full object-contain"
                              style={{ width: qrPixelSize, height: qrPixelSize }}
                            />
                          ) : (
                            <div
                              className="bg-stone-100 animate-pulse rounded-lg"
                              style={{ width: qrPixelSize, height: qrPixelSize }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Resident Info */}
                      <div className="space-y-0.5 pt-1">
                        <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight leading-none">
                          NO. {w.nomorRumah}
                        </div>
                        {showNamaWarga && (
                          <p className="text-xs font-bold text-stone-800 truncate leading-tight">
                            {w.nama}
                          </p>
                        )}
                        {showAlamat && (w.alamat || w.blok) && (
                          <p className="text-[9.5px] text-stone-500 truncate leading-tight">
                            {w.alamat || w.blok}
                          </p>
                        )}
                      </div>

                      {/* Footer Note */}
                      {showInstruction && (
                        <div className="text-[7.5px] text-stone-400 pt-1 border-t border-stone-100 italic leading-none">
                          Tempelkan di kotak jimpitan depan rumah
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* FOOTER ACTION BAR (Non-printable) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between print:hidden flex-shrink-0">
          <p className="text-xs text-stone-500 hidden sm:block">
            Format Dokumen: <strong>Kertas A4 Potrait</strong> • {targetWargaList.length} Kartu Terpilih
          </p>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || targetWargaList.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Unduh File PDF Format A4 Siap Cetak"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Menyusun PDF...' : 'Unduh PDF Siap Cetak'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={targetWargaList.length === 0}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Cetak Langsung ke Printer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang (Print)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
