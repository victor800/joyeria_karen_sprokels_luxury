// 📁 RUTA: src/lib/subir-foto-cliente.ts
// Redimensiona y comprime la foto en el navegador (las fotos del celular pesan 3–12 MB
// y a veces son HEIC), y la envía a /api/fotos como JPEG liviano.

const LADOS = [1280, 1024, 800, 640]; // px del lado mayor, de mejor a peor calidad
const CALIDADES = [0.82, 0.72, 0.6, 0.5];
const OBJETIVO_CHARS = 400_000; // tamaño objetivo del data URL (~300 KB de imagen)

async function cargar(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  // imageOrientation 'from-image' respeta la rotación EXIF (fotos verticales del celular)
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      /* cae al método <img> */
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise<HTMLImageElement>((ok, fallo) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => fallo(new Error('No se pudo leer la imagen. Prueba con una foto JPG o PNG.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function aJpeg(img: ImageBitmap | HTMLImageElement, lado: number, calidad: number): string {
  const w0 = 'width' in img ? img.width : 0;
  const h0 = 'height' in img ? img.height : 0;
  const escala = Math.min(1, lado / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * escala));
  const h = Math.max(1, Math.round(h0 * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.');
  ctx.fillStyle = '#fff'; // PNG con transparencia -> fondo blanco
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', calidad);
}

export async function subirFoto(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(archivo.name)) {
    throw new Error('El archivo no es una imagen.');
  }

  const img = await cargar(archivo);

  let imagen = '';
  for (let i = 0; i < LADOS.length; i++) {
    imagen = aJpeg(img, LADOS[i], CALIDADES[i]);
    if (imagen.length <= OBJETIVO_CHARS) break;
  }
  if ('close' in img) img.close();

  const res = await fetch('/api/fotos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagen }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'No se pudo subir la foto.');
  return data.url as string;
}