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
} from 'lucide-react';
import {
  DOWNLOAD_EVENT_NAME,
  DownloadEventDetail,
  DownloadSuccessDetail,
  formatFileSize,
  canShareBlobFile,
  shareBlobFileNative,
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
      dismissTimer = window.setTimeout(() => {
        setActiveEvent(null);
      }, 16000);
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

  const handleNativeShare = async () => {
    if (!successDetail) return;
    setShareError('');
    try {
      await shareBlobFileNative(
        successDetail.blob,
        successDetail.filename,
        successDetail.mimeType
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setShareError('Gunakan tombol Klik Unduh untuk menyimpan langsung ke perangkat.');
      }
    }
  };

  return createPortal(
    <>
      {activeEvent && (
        <div
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[430px] z-[9999] print:hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="status"
          aria-live="polite"
        >
          {activeEvent.status === 'success' ? (
            <div className="bg-slate-900 text-white rounded-2xl border border-emerald-500/40 shadow-2xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start space-x-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    {isExcelOrCsv ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : isPdf ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-extrabold text-emerald-300">
                        File Laporan Siap Diunduh
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                        {formatFileSize(activeEvent.sizeBytes)}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-semibold text-slate-200 truncate mt-0.5"
                      title={activeEvent.filename}
                    >
                      {activeEvent.filename}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                      Jika unduhan belum masuk otomatis, tekan tombol di bawah untuk simpan manual atau kirim ke HP/WA:
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

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <a
                  href={activeEvent.blobUrl}
                  download={activeEvent.filename}
                  rel="noopener"
                  className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Klik Unduh</span>
                </a>

                {supportsShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Simpan / Kirim WA</span>
                  </button>
                )}

                {isPdf && (
                  <button
                    type="button"
                    onClick={() => setPreviewPdfDetail(activeEvent)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Buka PDF</span>
                  </button>
                )}
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
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-xs flex flex-col p-2 sm:p-4 print:hidden">
          <div className="bg-slate-900 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold truncate">
                {previewPdfDetail.filename}
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={previewPdfDetail.blobUrl}
                download={previewPdfDetail.filename}
                rel="noopener"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan PDF</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewPdfDetail(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-stone-200 rounded-b-2xl overflow-hidden">
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
