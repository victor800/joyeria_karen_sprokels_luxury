// 📁 RUTA: src/app/dashboard/web-domiciliarios/page.tsx   (REEMPLAZA TODO EL ARCHIVO)
// Vista del admin: enlace + QR de los domiciliarios y vista previa de su web (ocupa todo el espacio).
import DomiEnlace from '@/lib/DomiEnlace';
import { SLUG_DOMICILIARIOS } from '@/lib/domi-config';

export default function WebDomiciliarios() {
  const ruta = `/domi/${SLUG_DOMICILIARIOS}`;
  const enlace = `https://joyeria-karen-sprokels-luxury-five.vercel.app${ruta}`;

  return (
    <main
      className="d-cont simple"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 'calc(100dvh - 24px)' }}
    >
      <div className="d-cab">
        <div>
          <h1>Web domiciliarios</h1>
          <p>Comparta este enlace con sus domiciliarios para que vean y entreguen sus pedidos.</p>
          <p style={{ overflowWrap: 'anywhere' }}>
            <a href={enlace} target="_blank" rel="noreferrer">{enlace}</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <DomiEnlace etiqueta="Enlace y QR" className="d-btn" />
          <a className="d-btn" href={ruta} target="_blank" rel="noreferrer">Abrir web</a>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          minHeight: 640,
          overflow: 'hidden',
          borderRadius: 22,
          background: '#06180f',
          border: '1px solid rgba(217,180,90,.28)',
        }}
      >
        <iframe
          src={ruta}
          title="Vista previa de la web de domiciliarios"
          style={{ display: 'block', width: '100%', height: '100%', minHeight: 640, border: 0, background: '#06180f' }}
        />
      </div>
    </main>
  );
}