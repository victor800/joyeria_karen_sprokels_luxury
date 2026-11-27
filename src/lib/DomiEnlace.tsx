// 📁 RUTA: src/components/DomiEnlace.tsx   (ARCHIVO NUEVO)
// Botón + ventana con el enlace de los domiciliarios: copiar, QR para descargar y compartir por WhatsApp.
// Se usa igual en el panel de Karen y en el de Hans: <DomiEnlace />
// Requiere:  npm i qrcode  y  npm i -D @types/qrcode
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { SLUG_DOMICILIARIOS } from '@/lib/domi-config';

export default function DomiEnlace({
  etiqueta = 'Enlace domiciliarios',
  className,
}: {
  etiqueta?: string;
  className?: string; // para reutilizar el estilo de botón de cada panel
}) {
  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!abierto) return;
    const u = `${window.location.origin}/domi/${SLUG_DOMICILIARIOS}`;
    setUrl(u);
    setAviso('');
    let vivo = true;
    QRCode.toDataURL(u, { width: 360, margin: 2, errorCorrectionLevel: 'M' })
      .then((d) => vivo && setQr(d))
      .catch(() => vivo && setQr(''));
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      vivo = false;
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [abierto]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setAviso('Enlace copiado.');
    } catch {
      setAviso('No se pudo copiar automáticamente: selecciónalo y cópialo a mano.');
    }
  }

  const texto = `Tu enlace para ver y entregar tus pedidos: ${url}`;

  return (
    <>
      <button type="button" className={className} onClick={() => setAbierto(true)}>
        {etiqueta}
      </button>

      {montado && abierto &&
        createPortal(
          <div
            onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', padding: 16, color: '#1d2a23', colorScheme: 'light' }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Enlace para domiciliarios"
              style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 400, maxHeight: '92dvh', overflow: 'auto', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}
            >
              <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>Enlace para domiciliarios</h2>
              <p style={{ margin: '0 0 12px', fontSize: '.88rem', color: '#5b6b63' }}>
                Entran con su nombre y los últimos 4 dígitos de su teléfono. Ven los pedidos de Karen y de Hans que les asignes.
              </p>

              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Enlace"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d3dad6', borderRadius: 10, font: 'inherit', fontSize: '.85rem', marginBottom: 10, background: '#f7f9f8', color: '#1d2a23' }}
              />

              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="Código QR del enlace de domiciliarios" width={240} height={240} style={{ display: 'block', margin: '0 auto 12px', border: '1px solid #d3dad6', borderRadius: 10 }} />
              ) : (
                <p style={{ color: '#5b6b63', fontSize: '.88rem' }}>Generando QR…</p>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" onClick={copiar} style={btn(true)}>Copiar enlace</button>
                {qr && (
                  <a href={qr} download="qr-domiciliarios.png" style={btn(false)}>Descargar QR</a>
                )}
                <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" style={btn(false)}>
                  Enviar por WhatsApp
                </a>
              </div>

              <p role="status" style={{ minHeight: 20, margin: '10px 0 0', fontSize: '.85rem', color: '#1f8a4c' }}>{aviso}</p>
              <button type="button" onClick={() => setAbierto(false)} style={{ ...btn(false), marginTop: 6, width: '100%' }}>Cerrar</button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

const btn = (principal: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 42,
  padding: '0 14px',
  borderRadius: 10,
  border: '1.5px solid #1d2a23',
  background: principal ? '#1d2a23' : '#fff',
  color: principal ? '#fff' : '#1d2a23',
  font: '600 .9rem system-ui, sans-serif',
  textDecoration: 'none',
  cursor: 'pointer',
});