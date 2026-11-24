const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
const TARGET_MAX_BYTES = 800 * 1024; // 800 KB

/**
 * Valida tipo MIME y tamaño (<= 10 MB) y comprime la imagen en Canvas
 * a formato WebP < 800 KB (README 14.1).
 */
export async function compressImageToWebP(
  file: File,
): Promise<{ file: File; previewUrl: string; sizeLabel: string }> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      'Formato no compatible. Selecciona únicamente JPG, PNG o WebP.',
    );
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen supera el límite permitido de 10 MB.');
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error('No se pudo procesar la fotografía seleccionada.'));
      element.src = bitmapUrl;
    });

    const maxDim = 1440;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Error al inicializar el compresor de imagen.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.84;
    let blob: Blob | null = null;

    while (quality >= 0.45) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality),
      );
      if (blob && blob.size <= TARGET_MAX_BYTES) break;
      quality -= 0.1;
    }

    if (!blob) {
      return {
        file,
        previewUrl: bitmapUrl,
        sizeLabel: `${(file.size / 1024).toFixed(0)} KB`,
      };
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'evidencia';
    const webpFile = new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
    });
    const previewUrl = URL.createObjectURL(webpFile);
    const sizeLabel =
      webpFile.size >= 1024 * 1024
        ? `${(webpFile.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(webpFile.size / 1024))} KB`;

    return { file: webpFile, previewUrl, sizeLabel };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export async function dataUrlToWebpFile(
  dataUrl: string,
  filename = 'captura_camara.webp',
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const rawFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  const compressed = await compressImageToWebP(rawFile);
  URL.revokeObjectURL(compressed.previewUrl);
  return compressed.file;
}
