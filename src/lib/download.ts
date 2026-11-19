/** Saves text content as a file via a temporary object URL. */
export function triggerDownload(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** `setupops-devices-2026-11-19.csv` */
export const datedFilename = (stem: string, ext = 'csv', now: Date = new Date()) =>
  `setupops-${stem}-${now.toISOString().slice(0, 10)}.${ext}`;
