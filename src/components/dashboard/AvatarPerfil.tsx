// 📁 RUTA: src/components/dashboard/AvatarPerfil.tsx   (ARCHIVO NUEVO)
'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import './extras-dashboard.css';

const K_FOTO = 'jks:perfil:foto';

/* ─────────────────────────────────────────────────────────────
   CAPA DE ALMACENAMIENTO
   Hoy la foto se guarda en este navegador (localStorage).
   Para guardarla en "Configuración" (compartida entre dispositivos), solo hay que
   cambiar estas dos funciones para que llamen a su API de configuración.
   ───────────────────────────────────────────────────────────── */
async function leerFoto(): Promise<string | null> {
  try {
    return localStorage.getItem(K_FOTO);
  } catch {
    return null;
  }
}
async function guardarFoto(dataUrl: string | null): Promise<void> {
  if (dataUrl) localStorage.setItem(K_FOTO, dataUrl);
  else localStorage.removeItem(K_FOTO);
}

/** Recorta al centro en cuadrado y reduce a 256 px (JPEG ~20 KB): rápido de guardar y de cargar. */
async function reducir(file: File, lado = 256): Promise<string> {
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const s = Math.min(img.width, img.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
  img.close?.();
  return lienzo.toDataURL('image/jpeg', 0.82);
}

export default function AvatarPerfil({ iniciales = 'KS' }: { iniciales?: string }) {
  const [foto, setFoto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void leerFoto().then(setFoto);
    // Si cambia en otra pestaña, se actualiza aquí también
    const sync = (e: StorageEvent) => e.key === K_FOTO && setFoto(e.newValue);
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAbierto(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return setError('Elija un archivo de imagen (JPG o PNG).');
    if (archivo.size > 12 * 1024 * 1024) return setError('La imagen pesa demasiado. Use una de menos de 12 MB.');
    setOcupado(true);
    setError('');
    try {
      const url = await reducir(archivo);
      await guardarFoto(url);
      setFoto(url);
      setAbierto(false);
    } catch {
      setError('No se pudo leer esa imagen. Pruebe con otra.');
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async () => {
    await guardarFoto(null);
    setFoto(null);
    setAbierto(false);
  };

  return (
    <div className="av-wrap" ref={raiz}>
      <button
        type="button"
        className="d-avatar av-btn"
        aria-label="Foto de perfil: abrir opciones"
        aria-expanded={abierto}
        onClick={() => {
          setError('');
          setAbierto((v) => !v);
        }}
      >
        {foto ? <img src={foto} alt="" className="av-img" /> : iniciales}
      </button>

      {abierto && (
        <div className="av-menu" role="menu">
          <div className="av-prev">
            {foto ? <img src={foto} alt="Su foto de perfil" /> : <span>{iniciales}</span>}
          </div>
          <button type="button" role="menuitem" onClick={() => entrada.current?.click()} disabled={ocupado}>
            {ocupado ? 'Guardando…' : foto ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {foto && (
            <button type="button" role="menuitem" className="av-quitar" onClick={quitar}>
              Quitar foto
            </button>
          )}
          {error && <p className="av-error" role="alert">{error}</p>}
        </div>
      )}

      {/* Sin "capture": en el celular ofrece elegir entre cámara y galería */}
      <input ref={entrada} type="file" accept="image/*" hidden onChange={elegir} />
    </div>
  );
}