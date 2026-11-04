export interface DownloadSuccessDetail {
  status: 'success';
  filename: string;
  blobUrl: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  timestamp: number;
}

export interface DownloadErrorDetail {
  status: 'error';
  message: string;
  detail?: string;
  timestamp: number;
}

export type DownloadEventDetail = DownloadSuccessDetail | DownloadErrorDetail;

export const DOWNLOAD_EVENT_NAME = 'jimpitan:download-event';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv;charset=utf-8;',
  json: 'application/json;charset=utf-8;',
};

// Keep blob URLs alive for 5 minutes so slow mobile DownloadManagers,
// cross-origin iframes, and manual "Unduh Ulang / Bagikan" taps never fail.
const BLOB_REVOKE_DELAY_MS = 5 * 60 * 1000;

/**
 * Sanitizes filenames so slashes (/), colons (:), parentheses, or control
 * characters in RT/RW names or date labels never break Android/Windows downloads.
 */
export const sanitizeDownloadFilename = (rawFilename: string, fallbackExt = 'pdf'): string => {
  const trimmed = String(rawFilename || '').trim();
  const extMatch = trimmed.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = (extMatch ? extMatch[1] : fallbackExt).toLowerCase();
  const rawBase = extMatch ? trimmed.slice(0, -extMatch[0].length) : trimmed;

  const cleanBase = rawBase
    .replace(/[/\\:*?"<>|(),;[\]{}@#!$%^&+=~`']/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');

  const finalBase = cleanBase || `Laporan_Jimpitan_${new Date().toISOString().slice(0, 10)}`;
  return `${finalBase}.${ext}`;
};

/**
 * Formats byte count into readable KB / MB string.
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const emitDownloadEvent = (detail: DownloadEventDetail) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent<DownloadEventDetail>(DOWNLOAD_EVENT_NAME, { detail }));
  } catch (err) {
    console.warn('Could not dispatch download event:', err);
  }
};

/**
 * Reliably downloads a Blob across desktop browsers, sandboxed iframes,
 * and Android PWA / mobile browsers:
 * - Ensures explicit MIME type
 * - Attaches `<a download>` to `document.body` before clicking
 * - Defers `URL.revokeObjectURL` by 5 minutes (never synchronously!)
 * - Emits global status event so user gets direct manual download & Web Share options
 */
export const triggerFileDownload = (blob: Blob, rawFilename: string): DownloadSuccessDetail => {
  const filename = sanitizeDownloadFilename(rawFilename);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const expectedMime = MIME_BY_EXT[ext] || blob.type || 'application/octet-stream';

  const typedBlob =
    blob.type && blob.type === expectedMime
      ? blob
      : new Blob([blob], { type: expectedMime });

  const urlApi = window.URL || window.webkitURL;
  const blobUrl = urlApi.createObjectURL(typedBlob);

  if (typeof document !== 'undefined' && document.body) {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.position = 'fixed';
    anchor.style.left = '-9999px';
    anchor.style.top = '-9999px';
    anchor.style.opacity = '0';

    document.body.appendChild(anchor);

    try {
      anchor.click();
    } catch {
      const clickEvt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      anchor.dispatchEvent(clickEvt);
    }

    window.setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1500);
  }

  window.setTimeout(() => {
    try {
      urlApi.revokeObjectURL(blobUrl);
    } catch {
      // ignore revoke errors
    }
  }, BLOB_REVOKE_DELAY_MS);

  const detail: DownloadSuccessDetail = {
    status: 'success',
    filename,
    blobUrl,
    blob: typedBlob,
    mimeType: expectedMime,
    sizeBytes: typedBlob.size,
    timestamp: Date.now(),
  };

  emitDownloadEvent(detail);
  return detail;
};

/**
 * Helper to trigger a UTF-8 BOM CSV file download safely (compatible with Excel & WPS Office).
 */
export const triggerCsvDownload = (csvLines: string[], rawFilename: string): DownloadSuccessDetail => {
  const bom = '\uFEFF';
  const csvBody = csvLines.join('\r\n');
  const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
  const nameWithExt = rawFilename.toLowerCase().endsWith('.csv') ? rawFilename : `${rawFilename}.csv`;
  return triggerFileDownload(blob, nameWithExt);
};

/**
 * Shares a generated file via native mobile Web Share API (e.g. Android Share / Save to Device / WhatsApp).
 */
export const canShareBlobFile = (blob: Blob, filename: string, mimeType?: string): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  try {
    const cleanMime = (mimeType || blob.type || 'application/octet-stream').split(';')[0].trim();
    const file = new File([blob], filename, { type: cleanMime });
    if (typeof navigator.canShare === 'function') {
      return navigator.canShare({ files: [file] });
    }
    return true;
  } catch {
    return false;
  }
};

export const shareBlobFileNative = async (
  blob: Blob,
  filename: string,
  mimeType?: string
): Promise<boolean> => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  const cleanMime = (mimeType || blob.type || 'application/octet-stream').split(';')[0].trim();
  const file = new File([blob], filename, { type: cleanMime });
  await navigator.share({
    files: [file],
    title: filename,
    text: `Dokumen Laporan Resmi: ${filename}`,
  });
  return true;
};

/**
 * Emits a visible in-app error notification when report generation fails (replaces blocked window.alert).
 */
export const notifyDownloadError = (message: string, error?: unknown) => {
  console.error(message, error);
  const detailText =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  emitDownloadEvent({
    status: 'error',
    message,
    detail: detailText,
    timestamp: Date.now(),
  });
};
