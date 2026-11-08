import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Download,
  Share2,
  Eye,
  X,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import {
  DOWNLOAD_EVENT_NAME,
  DownloadEventDetail,
  DownloadSuccessDetail,
  formatFileSize,
  canShareBlobFile,
  shareBlobFileNative,
  isMobileDevice,
} from '../utils/fileDownloader';

export const DownloadStatusToast: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<DownloadEventDetail | null>(null);
  const [previewPdfDetail, setPreviewPdfDetail] = useState<DownloadSuccessDetail | null>(null);
  const [shareError, setShareError] = useState<string>('');

  useEffect(() => {
    let dismissTimer: number | undefined;

    const handleDownloadEvent = (evt: Event) => {
      const customEvt = evt as CustomEvent<DownloadEventDetail>;
      if (!customEvt.detail) return;
      setShareError('');
      setActiveEvent(customEvt.detail);

      if (dismissTimer) {
        window.clearTimeout(dismissTimer);
      }
      // Keep on screen for 35s so users on mobile phones have ample time to read & tap options
      dismissTimer = window.setTimeout(() => {
        setActiveEvent(null);
      }, 35000);
    };

    window.addEventListener(DOWNLOAD_EVENT_NAME, handleDownloadEvent);
    return () => {
      window.removeEventListener(DOWNLOAD_EVENT_NAME, handleDownloadEvent);
      if (dismissTimer) {
        window.clearTimeout(dismissTimer);
      }
    };
  }, []);

  if (typeof document === 'undefined') return null;
  if (!activeEvent && !previewPdfDetail) return null;

  const successDetail = activeEvent?.status === 'success' ? activeEvent : null;
  const isPdf = Boolean(successDetail && successDetail.filename.toLowerCase().endsWith('.pdf'));
  const isExcelOrCsv = Boolean(
    successDetail &&
      (successDetail.filename.toLowerCase().endsWith('.xlsx') ||
        successDetail.filename.toLowerCase().endsWith('.csv'))
  );
  const supportsShare = Boolean(
    successDetail &&
      canShareBlobFile(successDetail.blob, successDetail.filename, successDetail.mimeType)
  );

  const handleNativeShare = async (detailToShare?: DownloadSuccessDetail) => {
    const target = detailToShare || successDetail;
    if (!target) return;
    setShareError('');
    try {
      await shareBlobFileNative(
        target.blob,
        target.filename,
        target.mimeType
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setShareError('Gunakan tombol Unduh Manual untuk menyimpan langsung lewat peramban.');
      }
    }
  };

  const handleOpenInNewTab = (blobUrl: string) => {
    if (typeof window !== 'undefined') {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isMobile = isMobileDevice();

  return createPortal(
    <>
      {activeEvent && (
        <div
          className="fixed bottom-20 left-3 right-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[440px] z-[10001] print:hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="status"
          aria-live="polite"
        >
          {activeEvent.status === 'success' ? (
            <div className="bg-slate-900 text-white rounded-2xl border-2 border-emerald-500/50 shadow-2xl p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start space-x-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    {isExcelOrCsv ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                    ) : isPdf ? (
                      <FileText className="w-5 h-5 text-sky-300" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-xs font-black text-emerald-300">
                        File Laporan Siap!
                      </span>
                      {isMobile && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-[9px] font-bold text-sky-200 border border-sky-400/30">
                          <Smartphone className="w-2.5 h-2.5" />
                          <span>Mode HP / PWA</span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                        {formatFileSize(activeEvent.sizeBytes)}
                      </span>
                    </div>
                    <p
                      className="text-xs font-bold text-slate-100 truncate mt-0.5"
                      title={activeEvent.filename}
                    >
                      {activeEvent.filename}
                    </p>
                    <p className="text-[10px] text-slate-300 leading-snug mt-1">
                      Di HP / Android, ketuk <strong className="text-sky-300">Simpan ke HP / WA</strong> untuk menyimpan ke perangkat atau kirim ke WhatsApp:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveEvent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {shareError && (
                <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1">
                  {shareError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {supportsShare && (
                  <button
                    type="button"
                    onClick={() => handleNativeShare()}
                    className="flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer active:scale-98"
                  >
                    <Share2 className="w-4 h-4 text-sky-200" />
                    <span>Simpan ke HP / WA</span>
                  </button>
                )}

                {isPdf && (
                  <button
                    type="button"
                    onClick={() => setPreviewPdfDetail(activeEvent)}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-300" />
                    <span>Buka PDF</span>
                  </button>
                )}

                <a
                  href={activeEvent.blobUrl}
                  download={activeEvent.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors shadow-xs cursor-pointer ${
                    supportsShare
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Manual</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-rose-950 text-white rounded-2xl border border-rose-500/40 shadow-2xl p-3.5 flex items-start justify-between gap-2.5">
              <div className="flex items-start space-x-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-rose-200">{activeEvent.message}</p>
                  {activeEvent.detail && (
                    <p className="text-[11px] text-rose-300/90 mt-0.5 break-words">
                      Detail: {activeEvent.detail}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveEvent(null)}
                className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Built-in Fullscreen PDF Viewer Fallback Modal */}
      {previewPdfDetail && (
        <div className="fixed inset-0 z-[10002] bg-black/85 backdrop-blur-xs flex flex-col p-2 sm:p-4 print:hidden">
          <div className="bg-slate-900 text-white rounded-t-2xl px-3 sm:px-4 py-3 flex items-center justify-between border-b border-slate-700 flex-wrap gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold truncate max-w-[220px] sm:max-w-md">
                {previewPdfDetail.filename}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Button: Buka di Tab Baru / App PDF Bawaan HP */}
              <button
                type="button"
                onClick={() => handleOpenInNewTab(previewPdfDetail.blobUrl)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Buka di Tab Baru / Aplikasi PDF Bawaan HP"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">Buka di Tab Baru</span>
                <span className="inline sm:hidden">Tab Baru</span>
              </button>

              {/* Button: Simpan / Kirim WA */}
              {canShareBlobFile(previewPdfDetail.blob, previewPdfDetail.filename, previewPdfDetail.mimeType) && (
                <button
                  type="button"
                  onClick={() => handleNativeShare(previewPdfDetail)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA / Simpan</span>
                </button>
              )}

              {/* Button: Unduh Browser */}
              <a
                href={previewPdfDetail.blobUrl}
                download={previewPdfDetail.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simpan PDF</span>
                <span className="inline sm:hidden">Simpan</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewPdfDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Notice Bar */}
          <div className="bg-sky-950/90 text-sky-200 px-3 py-1.5 text-[10px] sm:text-xs flex items-center justify-between border-b border-sky-800/40">
            <span>
              💡 <strong>Tips HP:</strong> Jika tampilan di bawah tampak kosong di HP Anda, ketuk tombol <strong>Buka di Tab Baru</strong> atau <strong>Kirim WA / Simpan</strong> di bilah atas.
            </span>
          </div>

          <div className="flex-1 bg-stone-200 rounded-b-2xl overflow-hidden relative">
            <iframe
              src={previewPdfDetail.blobUrl}
              title={previewPdfDetail.filename}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
