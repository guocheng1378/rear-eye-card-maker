// ─── Export: ZIP packaging with correct file paths ─────────────────

import { CustomElement, UploadedFile } from './schema';

declare const JSZip: any;
declare const AndroidBridge: { saveZip(base64: string, fileName: string): void } | undefined;

export async function exportZip(
  maml: string,
  cardName: string,
  customElements: CustomElement[],
  uploadedFiles: Record<string, UploadedFile>,
  isCustom: boolean,
): Promise<void> {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip 未加载，请检查网络');
  }

  const zip = new JSZip();
  zip.file('manifest.xml', maml);

  if (!isCustom) {
    zip.file('var_config.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<WidgetConfig version="1">\n` +
      `  <OnOff name="isDisplayDefaultBg" displayTitle="显示默认背景" default="0"/>\n` +
      `</WidgetConfig>`
    );
  }

  // Pack media files into correct subdirectories
  const usedFiles = new Set<string>();
  for (const el of customElements) {
    if ((el.type === 'image' || el.type === 'video') && el.fileName && uploadedFiles[el.fileName]) {
      usedFiles.add(el.fileName);
    }
  }

  if (usedFiles.size > 0) {
    const imgFolder = zip.folder('images');
    const vidFolder = zip.folder('videos');
    for (const fname of usedFiles) {
      const info = uploadedFiles[fname];
      if (info.mimeType.startsWith('video/')) {
        vidFolder.file(fname, info.data);
      } else {
        imgFolder.file(fname, info.data);
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = (cardName || 'card') + '.zip';

  // Android bridge
  if (typeof AndroidBridge !== 'undefined') {
    const reader = new FileReader();
    reader.onload = function () {
      const base64 = (reader.result as string).split(',')[1];
      AndroidBridge!.saveZip(base64, fileName);
    };
    reader.readAsDataURL(blob);
    return;
  }

  // Browser download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
