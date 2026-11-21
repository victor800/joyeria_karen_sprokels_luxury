// 📁 RUTA: src/app/dashboard/configuracion/TiendaPreview.tsx
'use client';

import { useState } from 'react';

type Props = { f: Record<string, string>; url: string };

const ORO = '#b08d3c';

const cop = (v: string) => {
  const n = Number(String(v).replace(/[.,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('es-CO')}` : null;
};

function instagramUser(v: string) {
  const s = (v || '').trim();
  if (!s) return '';
  const m = s.match(/instagram\.com\/([^/?#]+)/i);
  return '@' + (m ? m[1] : s.replace(/^@/, ''));
}

function waLink(tel: string) {
  const d = (tel || '').replace(/\D/g, '');
  if (!d) return '#';
  return `https://wa.me/${d.length <= 10 ? '57' + d : d}`;
}

function Tienda({ f, ancho }: { f: Props['f']; ancho: 'movil' | 'web' }) {
  const precios = [
    { k: '24K', v: cop(f.p24) },
    { k: '18K', v: cop(f.p18) },
    { k: '14K', v: cop(f.p14) },
  ];
  const ig = instagramUser(f.instagram);
  const pend = <span className="tp-pend">Pendiente</span>;

  return (
    <div className={`tp ${ancho}`}>
      <header className="tp-hero">
        {f.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.logo_url} alt="" className="tp-logo" />
        ) : (
          <div className="tp-logo tp-ini">{(f.nombre || 'J').trim().charAt(0).toUpperCase()}</div>
        )}
        <h2>{f.nombre || 'Nombre de la joyería'}</h2>
        {f.encabezado && <p className="tp-lema">{f.encabezado}</p>}
      </header>

      <section>
        <h4>Precio del gramo de oro</h4>
        <div className="tp-precios">
          {precios.map((p) => (
            <div key={p.k} className="tp-precio">
              <small>Oro {p.k}</small>
              <b>{p.v ?? '—'}</b>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4>Entregas y domicilios</h4>
        <ul className="tp-lista">
          <li><span>Domicilio</span><b>{cop(f.domicilio) ?? pend}</b></li>
          <li><span>Horario</span><b>{f.horario || pend}</b></li>
          <li><span>Cobertura</span><b>{f.cobertura || pend}</b></li>
          {f.seguro && <li><span>Seguro por envío</span><b>{f.seguro}%</b></li>}
        </ul>
      </section>

      <section>
        <h4>Contacto</h4>
        <div className="tp-botones">
          <a href={waLink(f.telefono)} onClick={(e) => e.preventDefault()} className="tp-btn fill">
            WhatsApp {f.telefono || ''}
          </a>
          {ig && (
            <a href="#" onClick={(e) => e.preventDefault()} className="tp-btn">
              {ig}
            </a>
          )}
        </div>
        {f.direccion && <p className="tp-dir">📍 {f.direccion}</p>}
      </section>
    </div>
  );
}

export default function TiendaPreview({ f, url }: Props) {
  const [modo, setModo] = useState<'movil' | 'web'>('movil');

  return (
    <div>
      <style>{`
        .vp-switch { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; margin-bottom: 16px; }
        .vp-switch button { font: inherit; font-size: 13px; padding: 8px 18px; border: 0; cursor: pointer; background: transparent; color: inherit; }
        .vp-switch button[aria-pressed="true"] { background: #1c1c1c; color: #fff; }

        .vp-movil { width: 300px; height: 600px; margin: 0 auto; border-radius: 38px; padding: 10px; background: #0a0a0a; box-shadow: 0 12px 40px rgba(0,0,0,.35); position: relative; }
        .vp-movil::before { content: ""; position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 80px; height: 18px; background: #0a0a0a; border-radius: 99px; z-index: 2; }
        .vp-pantalla { width: 100%; height: 100%; border-radius: 30px; overflow-y: auto; background: #121212; }

        .vp-web { width: 100%; max-width: 860px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid rgba(128,128,128,.35); box-shadow: 0 8px 30px rgba(0,0,0,.2); }
        .vp-barra { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #2a2a2a; }
        .vp-puntos { display: flex; gap: 6px; }
        .vp-puntos i { width: 10px; height: 10px; border-radius: 50%; background: #666; display: block; }
        .vp-url { flex: 1; font-size: 12px; color: #ccc; background: #1a1a1a; border-radius: 6px; padding: 5px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vp-web-pantalla { height: 520px; overflow-y: auto; background: #121212; }

        .tp { color: #f2efe8; font-family: system-ui, sans-serif; padding: 28px 18px 32px; max-width: 100%; }
        .tp.web { max-width: 640px; margin: 0 auto; padding: 40px 24px; }
        .tp-hero { text-align: center; margin-bottom: 24px; }
        .tp-logo { width: 84px; height: 84px; border-radius: 22px; object-fit: cover; display: block; margin: 0 auto 12px; border: 1px solid ${ORO}88; }
        .tp-ini { display: grid; place-items: center; background: #1d1a12; color: ${ORO}; font-size: 34px; font-weight: 600; }
        .tp h2 { margin: 0; font-size: 20px; color: ${ORO}; letter-spacing: .02em; }
        .tp-lema { margin: 6px 0 0; font-size: 13px; opacity: .75; }
        .tp section { margin-bottom: 22px; }
        .tp h4 { margin: 0 0 10px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: ${ORO}; }
        .tp-precios { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .tp-precio { background: #1b1b1b; border: 1px solid #2c2c2c; border-radius: 12px; padding: 10px 6px; text-align: center; }
        .tp-precio small { display: block; font-size: 10px; opacity: .6; margin-bottom: 4px; }
        .tp-precio b { font-size: 12px; }
        .tp-lista { list-style: none; margin: 0; padding: 0; background: #1b1b1b; border: 1px solid #2c2c2c; border-radius: 12px; }
        .tp-lista li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #262626; }
        .tp-lista li:last-child { border-bottom: 0; }
        .tp-lista span { opacity: .65; }
        .tp-lista b { text-align: right; font-weight: 500; }
        .tp-pend { opacity: .35; font-style: italic; font-weight: 400; }
        .tp-botones { display: flex; flex-direction: column; gap: 8px; }
        .tp.web .tp-botones { flex-direction: row; }
        .tp-btn { flex: 1; text-align: center; text-decoration: none; font-size: 13px; padding: 11px; border-radius: 10px; border: 1px solid ${ORO}; color: ${ORO}; }
        .tp-btn.fill { background: ${ORO}; color: #111; font-weight: 600; }
        .tp-dir { font-size: 12px; opacity: .75; margin: 12px 0 0; text-align: center; }
        .tp.web .tp-precio b { font-size: 15px; }
        .tp.web .tp-lista li { font-size: 14px; }
      `}</style>

      <div style={{ textAlign: 'center' }}>
        <div className="vp-switch" role="group" aria-label="Tipo de vista">
          <button type="button" aria-pressed={modo === 'movil'} onClick={() => setModo('movil')}>📱 Móvil</button>
          <button type="button" aria-pressed={modo === 'web'} onClick={() => setModo('web')}>🖥️ Web</button>
        </div>
      </div>

      {modo === 'movil' ? (
        <div className="vp-movil">
          <div className="vp-pantalla">
            <Tienda f={f} ancho="movil" />
          </div>
        </div>
      ) : (
        <div className="vp-web">
          <div className="vp-barra">
            <div className="vp-puntos"><i /><i /><i /></div>
            <div className="vp-url">{url || 'tu-tienda.com'}</div>
          </div>
          <div className="vp-web-pantalla">
            <Tienda f={f} ancho="web" />
          </div>
        </div>
      )}
    </div>
  );
}