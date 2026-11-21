// 📁 RUTA: src/app/dashboard/tienda-web/page.tsx
const SECCIONES = [
  { t: 'Portada', d: 'Banner principal y frase de marca.', e: 'Publicado' },
  { t: 'Colecciones', d: 'Anillos, cadenas, aretes y esclavas.', e: 'Publicado' },
  { t: 'Campaña', d: 'Galería de lujo y lookbook.', e: 'Borrador' },
];

export default function TiendaWeb() {
  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>Mi tienda web</h1>
          <p>Administre lo que ven sus clientes en línea.</p>
        </div>
        <button type="button" className="d-btn">VER TIENDA ↗</button>
      </div>
      <div className="d-web">
        {SECCIONES.map((s) => (
          <section key={s.t} className="d-card">
            <div className="d-prev">{s.t}</div>
            <h3>{s.t}</h3>
            <p style={{ fontSize: 13, color: 'var(--tenue)', margin: '6px 0 14px' }}>{s.d}</p>
            <span className="chip" data-t={s.e === 'Publicado' ? 'ok' : 'warn'}>{s.e}</span>
          </section>
        ))}
      </div>
    </main>
  );
}