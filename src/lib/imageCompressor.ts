export interface CompressedReceipt {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Mengompres foto kamera HP (biasanya 4-10 MB) menjadi JPEG tajam (~120-250 KB)
 * agar cepat diunggah ke Google Drive pribadi melalui Google Apps Script.
 */
export async function compressReceiptImage(
  file: File,
  maxSide = 1280,
  quality = 0.78
): Promise<CompressedReceipt> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File bukti harus berupa gambar (JPG, PNG, atau WebP).');
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(bitmapUrl);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Peramban tidak mendukung pemrosesan kanvas gambar.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64Part = dataUrl.split(',')[1] || '';
    const sizeBytes = Math.round((base64Part.length * 3) / 4);
    const cleanStem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

    return {
      dataUrl,
      fileName: `${cleanStem || 'struk'}_${Date.now()}.jpg`,
      width,
      height,
      sizeBytes
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca file gambar struk.'));
    img.src = src;
  });
}
