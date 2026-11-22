/** Reduce la imagen en el navegador para que quepa en una celda de Google Sheets. */
export async function comprimirImagen(file: File, maxLado = 420, maxChars = 42000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con JPG o PNG.');
  }

  let lado = maxLado;
  for (let intento = 0; intento < 6; intento++) {
    const esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * esc));
    const h = Math.max(1, Math.round(bmp.height * esc));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Tu navegador no puede procesar la imagen.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);

    for (const calidad of [0.8, 0.65, 0.5]) {
      const data = canvas.toDataURL('image/jpeg', calidad);
      if (data.length <= maxChars) return data;
    }
    lado = Math.round(lado * 0.75);
  }
  throw new Error('No se pudo reducir la imagen lo suficiente. Prueba con otra foto.');
}