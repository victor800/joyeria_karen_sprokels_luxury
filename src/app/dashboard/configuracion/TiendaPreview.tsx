// 📁 RUTA: src/app/dashboard/configuracion/TiendaPreview.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type Producto = {
  nombre: string;
  precio?: string;
  foto?: string;
  categoria?: string;
};

type Props = { f: Record<string, string>; url: string; productos?: Producto[] };

const ORO = '#b08d3c';
const VERDE = '#0b4a2e';
const CATEGORIAS = ['Anillos', 'Collares', 'Aretes', 'Pulseras'];

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

/* ---------- Iconos ---------- */
type IcName = 'home' | 'search' | 'bag' | 'heart' | 'user' | 'bell' | 'gem' | 'pin' | 'clock' | 'truck';
const PATHS: Record<IcName, React.ReactNode> = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  gem: <><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>,
  pin: <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  truck: <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
};
function Ic({ n, s = 20 }: { n: IcName; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[n]}
    </svg>
  );
}

/* ---------- Piezas reutilizables ---------- */
function Logo({ f, size }: { f: Props['f']; size: number }) {
  return f.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={f.logo_url} alt="" className="tp-logo" style={{ width: size, height: size }} />
  ) : (
    <div className="tp-logo tp-ini" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {(f.nombre || 'J').trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Rejilla({ productos, cols }: { productos: Producto[]; cols: number }) {
  const lista = productos.length
    ? productos
    : Array.from({ length: cols * 2 }, () => null as Producto | null);
  return (
    <div className="tp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {lista.map((p, i) =>
        p ? (
          <div key={i} className="tp-card">
            <div className="tp-foto">
              {p.foto && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.foto} alt={p.nombre} />}
            </div>
            <b>{p.nombre}</b>
            <span>{p.precio ?? ''}</span>
          </div>
        ) : (
          <div key={i} className="tp-card vacio">
            <div className="tp-foto"><Ic n="gem" s={26} /></div>
            <i className="ln" />
            <i className="ln corta" />
          </div>
        )
      )}
    </div>
  );
}

function Chips({ productos }: { productos: Producto[] }) {
  const cats = productos.length
    ? Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))) as string[]
    : CATEGORIAS;
  return (
    <div className="tp-chips">
      <span className="on">Todo</span>
      {cats.map((c) => <span key={c}>{c}</span>)}
    </div>
  );
}

/* ---------- MÓVIL ---------- */
function Movil({ f, productos }: { f: Props['f']; productos: Producto[] }) {
  const [pant, setPant] = useState<'inicio' | 'carrito'>('inicio');
  const p18 = cop(f.p18);
  const dom = cop(f.domicilio);

  return (
    <div className="ip-marco">
      <div className="ip-pantalla">
        <div className="ip-isla" />
        <div className="ip-estado">
          <b>9:41</b>
          <span className="ip-iconos">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.7" y="5" width="3" height="6" rx="1" /><rect x="9.4" y="2.5" width="3" height="8.5" rx="1" /><rect x="14" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="18" height="8" rx="2.2" fill="currentColor" /><rect x="23" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".5" /></svg>
          </span>
        </div>

        <div className="ip-scroll">
          {pant === 'inicio' ? (
            <div className="tp tp-m">
              <div className="tp-top">
                <Logo f={f} size={40} />
                <div className="tp-saludo">
                  <small>Bienvenida a</small>
                  <b>{f.nombre || 'Tu joyería'}</b>
                </div>
                <span className="tp-ib"><Ic n="search" s={17} /></span>
                <span className="tp-ib"><Ic n="bell" s={17} /><em /></span>
              </div>

              <div className="tp-banner">
                <small>Oro 18K hoy</small>
                <strong>{p18 ?? '—'}<sub> / gramo</sub></strong>
                <p>{f.encabezado || 'Joyería fina en oro certificado'}</p>
                <div className="tp-mini">
                  <span>24K {cop(f.p24) ?? '—'}</span>
                  <span>14K {cop(f.p14) ?? '—'}</span>
                </div>
                <div className="tp-aro" />
              </div>

              <Chips productos={productos} />

              <div className="tp-tit"><b>Catálogo</b><span>Ver todo</span></div>
              <Rejilla productos={productos} cols={2} />
              {!productos.length && <p className="tp-aviso">Tus piezas aparecerán aquí cuando las crees en Catálogo.</p>}

              <div className="tp-tit"><b>Entregas</b></div>
              <ul className="tp-lista">
                <li><span><Ic n="truck" s={15} /> Domicilio</span><b>{dom ?? <em>Pendiente</em>}</b></li>
                <li><span><Ic n="clock" s={15} /> Horario</span><b>{f.horario || <em>Pendiente</em>}</b></li>
                <li><span><Ic n="pin" s={15} /> Cobertura</span><b>{f.cobertura || <em>Pendiente</em>}</b></li>
                {f.seguro && <li><span>Seguro por envío</span><b>{f.seguro}%</b></li>}
              </ul>

              <div className="tp-botones">
                <a className="tp-btn fill" href={waLink(f.telefono)} onClick={(e) => e.preventDefault()}>
                  WhatsApp {f.telefono || ''}
                </a>
                {instagramUser(f.instagram) && (
                  <a className="tp-btn" href="#" onClick={(e) => e.preventDefault()}>{instagramUser(f.instagram)}</a>
                )}
              </div>
              {f.direccion && <p className="tp-dir"><Ic n="pin" s={13} /> {f.direccion}</p>}
            </div>
          ) : (
            <div className="tp tp-m">
              <div className="tp-tit" style={{ marginTop: 6 }}><b style={{ fontSize: 22 }}>Mi carrito</b></div>
              <div className="tp-vacio">
                <span><Ic n="bag" s={34} /></span>
                <b>Tu carrito está vacío</b>
                <small>Cuando agregues piezas del catálogo las verás aquí.</small>
                <button type="button" onClick={() => setPant('inicio')}>Explorar catálogo</button>
              </div>
              <ul className="tp-lista">
                <li><span>Subtotal</span><b>$0</b></li>
                <li><span>Domicilio</span><b>{dom ?? <em>Pendiente</em>}</b></li>
                <li><span>Total</span><b>$0</b></li>
              </ul>
              <div className="tp-botones">
                <span className="tp-btn fill off">Hacer pedido</span>
              </div>
            </div>
          )}
        </div>

        <nav className="ip-nav">
          <button type="button" className={pant === 'inicio' ? 'on' : ''} onClick={() => setPant('inicio')} aria-label="Inicio"><Ic n="home" /></button>
          <button type="button" aria-label="Buscar"><Ic n="search" /></button>
          <button type="button" className={pant === 'carrito' ? 'on' : ''} onClick={() => setPant('carrito')} aria-label="Carrito"><Ic n="bag" /></button>
          <button type="button" aria-label="Favoritos"><Ic n="heart" /></button>
          <button type="button" aria-label="Cuenta"><Ic n="user" /></button>
        </nav>
        <div className="ip-home" />
      </div>
    </div>
  );
}

/* ---------- WEB ---------- */
function Web({ f, productos }: { f: Props['f']; productos: Producto[] }) {
  const dom = cop(f.domicilio);
  return (
    <div className="tp tp-w">
      <header className="tw-head">
        <div className="tw-marca"><Logo f={f} size={38} /><b>{f.nombre || 'Tu joyería'}</b></div>
        <nav><span>Inicio</span><span>Catálogo</span><span>Entregas</span><span>Contacto</span></nav>
        <span className="tw-cart"><Ic n="bag" s={18} /> Carrito</span>
      </header>

      <section className="tw-hero">
        <div>
          <small>JOYERÍA</small>
          <h1>{f.nombre || 'Nombre de la joyería'}</h1>
          <p>{f.encabezado || 'Joyería fina en oro certificado'}</p>
          <div className="tw-cta">
            <span className="tp-btn fill">Ver catálogo</span>
            <span className="tp-btn">WhatsApp</span>
          </div>
        </div>
        <div className="tw-oro">
          <small>Precio del gramo de oro</small>
          <ul>
            <li><span>Oro 24K</span><b>{cop(f.p24) ?? '—'}</b></li>
            <li><span>Oro 18K</span><b>{cop(f.p18) ?? '—'}</b></li>
            <li><span>Oro 14K</span><b>{cop(f.p14) ?? '—'}</b></li>
          </ul>
        </div>
      </section>

      <section className="tw-sec">
        <div className="tp-tit"><b>Catálogo</b></div>
        <Chips productos={productos} />
        <Rejilla productos={productos} cols={4} />
      </section>

      <section className="tw-sec tw-dos">
        <div>
          <div className="tp-tit"><b>Entregas</b></div>
          <ul className="tp-lista">
            <li><span>Domicilio</span><b>{dom ?? <em>Pendiente</em>}</b></li>
            <li><span>Horario</span><b>{f.horario || <em>Pendiente</em>}</b></li>
            <li><span>Cobertura</span><b>{f.cobertura || <em>Pendiente</em>}</b></li>
          </ul>
        </div>
        <div>
          <div className="tp-tit"><b>Contacto</b></div>
          <ul className="tp-lista">
            <li><span>WhatsApp</span><b>{f.telefono || <em>Pendiente</em>}</b></li>
            <li><span>Instagram</span><b>{instagramUser(f.instagram) || <em>Pendiente</em>}</b></li>
            <li><span>Dirección</span><b>{f.direccion || <em>Pendiente</em>}</b></li>
          </ul>
        </div>
      </section>

      <footer className="tw-pie">© {new Date().getFullYear()} {f.nombre}</footer>
    </div>
  );
}

/* ---------- Contenedor ---------- */
export default function TiendaPreview({ f, url, productos = [] }: Props) {
  const [modo, setModo] = useState<'movil' | 'web'>('movil');
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    if (!caja.current) return;
    const ro = new ResizeObserver(([e]) => setEscala(Math.min(1, e.contentRect.width / 1100)));
    ro.observe(caja.current);
    return () => ro.disconnect();
  }, [modo]);

  return (
    <div>
      <style>{`
        .vp-switch { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; margin-bottom: 18px; }
        .vp-switch button { font: inherit; font-size: 13px; padding: 8px 18px; border: 0; cursor: pointer; background: transparent; color: inherit; }
        .vp-switch button[aria-pressed="true"] { background: #1c1c1c; color: #fff; }

        /* iPhone 17 */
        .ip-fuera { width: 310px; height: 650px; margin: 0 auto; }
        .ip-marco { zoom: .72; width: 430px; height: 902px; border-radius: 66px; padding: 14px; background: linear-gradient(145deg,#3a3a3c,#111 40%,#2a2a2c); box-shadow: 0 0 0 2px #555 inset, 0 24px 60px rgba(0,0,0,.35); position: relative; }
        .ip-pantalla { width: 402px; height: 874px; border-radius: 52px; overflow: hidden; background: #f6f4ee; position: relative; color: #1c1c1c; }
        .ip-isla { position: absolute; top: 11px; left: 50%; transform: translateX(-50%); width: 124px; height: 36px; border-radius: 99px; background: #000; z-index: 6; }
        .ip-estado { position: absolute; top: 0; left: 0; right: 0; height: 54px; padding: 18px 34px 0 40px; display: flex; justify-content: space-between; font-size: 16px; z-index: 5; background: #f6f4ee; }
        .ip-iconos { display: flex; gap: 6px; align-items: center; }
        .ip-scroll { position: absolute; top: 54px; bottom: 0; left: 0; right: 0; overflow-y: auto; padding-bottom: 100px; scrollbar-width: none; }
        .ip-scroll::-webkit-scrollbar { display: none; }
        .ip-nav { position: absolute; left: 16px; right: 16px; bottom: 26px; height: 62px; border-radius: 99px; background: #fff; box-shadow: 0 6px 24px rgba(0,0,0,.14); display: flex; justify-content: space-around; align-items: center; z-index: 5; }
        .ip-nav button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent; color: #8a8a8a; display: grid; place-items: center; cursor: pointer; }
        .ip-nav button.on { background: ${VERDE}; color: #fff; }
        .ip-home { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 140px; height: 5px; border-radius: 99px; background: #1c1c1c; z-index: 6; }

        /* Web */
        .vw-marco { border-radius: 12px; overflow: hidden; border: 1px solid rgba(128,128,128,.35); box-shadow: 0 8px 30px rgba(0,0,0,.2); background: #fff; }
        .vw-barra { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #e9e6df; }
        .vw-puntos { display: flex; gap: 6px; } .vw-puntos i { width: 10px; height: 10px; border-radius: 50%; background: #b9b5ab; display: block; }
        .vw-url { flex: 1; font-size: 12px; color: #555; background: #fff; border-radius: 6px; padding: 5px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vw-vista { height: 540px; overflow-y: auto; background: #f6f4ee; }
        .vw-lienzo { width: 1100px; zoom: var(--z); }

        /* Tienda compartido */
        .tp { color: #1c1c1c; font-family: system-ui, -apple-system, sans-serif; }
        .tp-logo { border-radius: 14px; object-fit: cover; display: block; border: 1px solid ${ORO}66; background: #fff; flex-shrink: 0; }
        .tp-ini { display: grid; place-items: center; background: ${VERDE}; color: ${ORO}; font-weight: 600; }
        .tp-top { display: flex; align-items: center; gap: 10px; }
        .tp-saludo { flex: 1; min-width: 0; } .tp-saludo small { display: block; font-size: 12px; color: #777; } .tp-saludo b { font-size: 17px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tp-ib { width: 38px; height: 38px; border-radius: 50%; background: #fff; display: grid; place-items: center; position: relative; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .tp-ib em { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: #e0453a; }
        .tp-banner { position: relative; overflow: hidden; background: ${VERDE}; color: #fff; border-radius: 22px; padding: 20px; margin: 18px 0 16px; }
        .tp-banner small { color: ${ORO}; letter-spacing: .08em; text-transform: uppercase; font-size: 11px; }
        .tp-banner strong { display: block; font-size: 30px; margin: 4px 0; } .tp-banner sub { font-size: 13px; font-weight: 400; opacity: .7; }
        .tp-banner p { margin: 0 0 12px; font-size: 13px; opacity: .85; max-width: 70%; }
        .tp-mini { display: flex; gap: 8px; } .tp-mini span { font-size: 11px; background: rgba(255,255,255,.12); padding: 5px 10px; border-radius: 99px; }
        .tp-aro { position: absolute; right: -30px; top: -30px; width: 130px; height: 130px; border-radius: 50%; border: 18px solid ${ORO}55; }
        .tp-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .tp-chips::-webkit-scrollbar { display: none; }
        .tp-chips span { flex-shrink: 0; font-size: 13px; padding: 8px 16px; border-radius: 99px; background: #fff; border: 1px solid #e3dfd3; }
        .tp-chips span.on { background: ${VERDE}; color: #fff; border-color: ${VERDE}; }
        .tp-tit { display: flex; justify-content: space-between; align-items: baseline; margin: 20px 0 10px; } .tp-tit b { font-size: 17px; } .tp-tit span { font-size: 12px; color: ${ORO}; }
        .tp-grid { display: grid; gap: 12px; }
        .tp-card { background: #fff; border-radius: 18px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .tp-foto { aspect-ratio: 1; border-radius: 12px; background: #efece3; display: grid; place-items: center; color: #c9c3b0; overflow: hidden; margin-bottom: 10px; }
        .tp-foto img { width: 100%; height: 100%; object-fit: cover; }
        .tp-card b { display: block; font-size: 13px; } .tp-card span { font-size: 12px; color: ${ORO}; }
        .tp-card.vacio .ln { display: block; height: 9px; border-radius: 6px; background: #ece8dd; margin-bottom: 7px; } .tp-card.vacio .ln.corta { width: 55%; }
        .tp-aviso { font-size: 11px; color: #999; text-align: center; margin: 10px 0 0; }
        .tp-lista { list-style: none; margin: 0; padding: 0; background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .tp-lista li { display: flex; justify-content: space-between; gap: 14px; padding: 13px 14px; font-size: 13px; border-bottom: 1px solid #f0ede4; }
        .tp-lista li:last-child { border-bottom: 0; } .tp-lista span { color: #777; display: inline-flex; align-items: center; gap: 6px; } .tp-lista b { text-align: right; font-weight: 500; } .tp-lista em { color: #bbb; font-weight: 400; }
        .tp-botones { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
        .tp-btn { text-align: center; text-decoration: none; font-size: 14px; padding: 14px; border-radius: 99px; border: 1px solid ${VERDE}; color: ${VERDE}; display: block; }
        .tp-btn.fill { background: ${VERDE}; color: #fff; } .tp-btn.off { opacity: .45; }
        .tp-dir { font-size: 12px; color: #777; text-align: center; margin: 14px 0 0; display: flex; gap: 4px; justify-content: center; align-items: center; }
        .tp-vacio { text-align: center; padding: 34px 20px; } .tp-vacio span { width: 74px; height: 74px; border-radius: 50%; background: #fff; display: grid; place-items: center; margin: 0 auto 14px; color: ${ORO}; }
        .tp-vacio b { display: block; font-size: 16px; } .tp-vacio small { display: block; color: #888; margin: 6px 0 16px; font-size: 12px; }
        .tp-vacio button { font: inherit; font-size: 13px; border: 0; background: ${VERDE}; color: #fff; padding: 11px 22px; border-radius: 99px; cursor: pointer; }
        .tp-m { padding: 8px 20px 20px; }

        .tp-w { padding: 0 48px 24px; }
        .tw-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #e6e2d6; }
        .tw-marca { display: flex; align-items: center; gap: 12px; } .tw-marca b { font-size: 18px; }
        .tw-head nav { display: flex; gap: 28px; font-size: 14px; color: #555; }
        .tw-cart { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; background: ${VERDE}; color: #fff; padding: 10px 18px; border-radius: 99px; }
        .tw-hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: center; padding: 56px 0; }
        .tw-hero small { color: ${ORO}; letter-spacing: .2em; font-size: 12px; } .tw-hero h1 { font-size: 46px; margin: 10px 0; line-height: 1.1; color: ${VERDE}; } .tw-hero p { color: #666; font-size: 16px; margin: 0 0 24px; }
        .tw-cta { display: flex; gap: 12px; } .tw-cta .tp-btn { padding: 13px 28px; }
        .tw-oro { background: ${VERDE}; color: #fff; border-radius: 24px; padding: 28px; } .tw-oro small { color: ${ORO}; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
        .tw-oro ul { list-style: none; margin: 14px 0 0; padding: 0; } .tw-oro li { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.14); font-size: 15px; } .tw-oro li:last-child { border: 0; } .tw-oro b { font-size: 18px; }
        .tw-sec { padding: 8px 0 32px; } .tw-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .tw-pie { border-top: 1px solid #e6e2d6; padding-top: 18px; font-size: 12px; color: #999; text-align: center; }
      `}</style>

      <div style={{ textAlign: 'center' }}>
        <div className="vp-switch" role="group" aria-label="Tipo de vista">
          <button type="button" aria-pressed={modo === 'movil'} onClick={() => setModo('movil')}>📱 Móvil</button>
          <button type="button" aria-pressed={modo === 'web'} onClick={() => setModo('web')}>🖥️ Web</button>
        </div>
      </div>

      {modo === 'movil' ? (
        <div className="ip-fuera"><Movil f={f} productos={productos} /></div>
      ) : (
        <div className="vw-marco" ref={caja}>
          <div className="vw-barra">
            <div className="vw-puntos"><i /><i /><i /></div>
            <div className="vw-url">{url || 'tu-tienda.com'}</div>
          </div>
          <div className="vw-vista">
            <div className="vw-lienzo" style={{ ['--z' as string]: escala }}>
              <Web f={f} productos={productos} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}