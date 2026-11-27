// 📁 RUTA: src/app/dashboard/web-domiciliarios/page.tsx   (REEMPLAZA TODO EL ARCHIVO)
// Vista del admin: enlace + QR de los domiciliarios y vista previa de su web.
import DomiEnlace from '@/lib/DomiEnlace';
import { SLUG_DOMICILIARIOS } from '@/lib/domi-config';

export default function WebDomiciliarios() {
  const ruta = `/domi/${SLUG_DOMICILIARIOS}`;
  const enlace = `https://joyeria-karen-sprokels-luxury-five.vercel.app${ruta}`;

  return (
    <main className="d-cont simple">
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
        className="d-card"
        style={{ maxWidth: 430, width: '100%', padding: 0, overflow: 'hidden', background: '#06180f', borderRadius: 22 }}
      >
        <iframe
          src={ruta}
          title="Vista previa de la web de domiciliarios"
          style={{ display: 'block', width: '100%', height: 780, border: 0, background: '#06180f' }}
        />
      </div>
    </main>
  );
}