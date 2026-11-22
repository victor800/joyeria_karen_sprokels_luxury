// 📁 RUTA: src/components/dashboard/BarraInferior.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ico = { width: 25, height: 25, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const IcoInicio = () => (<svg {...ico}><path d="M3 11l9-7.5L21 11" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></svg>);
const IcoPrendas = () => (<svg {...ico}><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></svg>);
const IcoBoveda = () => (<svg {...ico}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="12" cy="12" r="3.4" /><path d="M12 8.6v1.4M12 14v1.4M8.6 12H10M14 12h1.4" /><path d="M6 20v1.5M18 20v1.5" /></svg>);
const IcoDomicilios = () => (<svg {...ico}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>);
const IcoInventario = () => (<svg {...ico}><path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></svg>);
const IcoPedidos = () => (<svg {...ico}><path d="M6 3h12l1 4H5z" /><path d="M5 7l1 13h12l1-13" /><path d="M9 11a3 3 0 0 0 6 0" /></svg>);
const IcoAjustes = () => (<svg {...ico}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></svg>);
const IcoMenu = () => (<svg {...ico}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>);
const IcoMas = () => (<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>);

type Item = { href: string; t: string; Ico: () => React.JSX.Element; exacto?: boolean };

const IZQ: Item[] = [
  { href: '/dashboard', t: 'Inicio', Ico: IcoInicio, exacto: true },
  { href: '/dashboard/prendas', t: 'Prendas', Ico: IcoPrendas },
];
const BOVEDA: Item = { href: '/dashboard/boveda', t: 'Bóveda', Ico: IcoBoveda };

/** Todas las vistas, para la hoja del botón "Menú". Agrega o quita las que necesites. */
const TODAS: Item[] = [
  { href: '/dashboard', t: 'Inicio', Ico: IcoInicio, exacto: true },
  { href: '/dashboard/prendas', t: 'Prendas', Ico: IcoPrendas },
  { href: '/dashboard/inventario', t: 'Inventario', Ico: IcoInventario },
  { href: '/dashboard/boveda', t: 'Bóveda', Ico: IcoBoveda },
  { href: '/dashboard/pedidos', t: 'Pedidos', Ico: IcoPedidos },
  { href: '/dashboard/domiciliarios', t: 'Domicilios', Ico: IcoDomicilios },
  { href: '/dashboard/configuracion', t: 'Ajustes', Ico: IcoAjustes },
];

const RUTA_PRENDAS = '/dashboard/prendas';
/** Evento que escucha PrendasPanel para abrir "Nueva prenda" */
export const EVENTO_NUEVA_PRENDA = 'jks:nueva-prenda';

const coincide = (ruta: string, i: { href: string; exacto?: boolean }) =>
  i.exacto ? ruta === i.href : ruta === i.href || ruta.startsWith(`${i.href}/`);

/** ¿Está abierto el menú lateral en móvil? Se detecta mirando la página (no hace falta tocar el menú). */
const SEL = 'aside, [class*="sidebar"], [class*="side-"], [class*="-side"], [class*="lateral"], [data-menu-lateral]';
function lateralAbierto(): boolean {
  const b = document.body;
  const h = document.documentElement;
  if (/(menu|nav|side|lateral)[-_]?(abierto|open|visible|activo)|(abierto|open)[-_]?(menu|nav|side|lateral)/i.test(`${b.className} ${h.className}`)) return true;
  if (b.dataset.menu === 'abierto' || b.dataset.menu === 'open') return true;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SEL))) {
    if (el.closest('.bi-nav') || el.closest('.bi-hoja')) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute' && cs.position !== 'sticky') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.height < window.innerHeight * 0.6 || r.width < 120) continue;
    if (r.right > 40 && r.left < window.innerWidth - 40) return true;
  }
  return false;
}

export default function BarraInferior() {
  const ruta = usePathname() || '';
  const [menu, setMenu] = useState(false);
  const [oculta, setOculta] = useState(false);

  // Se oculta cuando el menú lateral está abierto y reaparece al cerrarse
  useEffect(() => {
    let raf = 0;
    const revisar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const abierto = window.innerWidth <= 900 && lateralAbierto();
        setOculta((o) => (o === abierto ? o : abierto));
        if (abierto) setMenu(false);
      });
    };
    revisar();
    const mo = new MutationObserver(revisar);
    mo.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['class', 'style', 'data-menu', 'aria-expanded', 'hidden'] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-menu'] });
    window.addEventListener('resize', revisar);
    document.addEventListener('transitionend', revisar, true);
    document.addEventListener('click', revisar, true);
    const t = setInterval(revisar, 600);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener('resize', revisar);
      document.removeEventListener('transitionend', revisar, true);
      document.removeEventListener('click', revisar, true);
      clearInterval(t);
    };
  }, []);

  // Cierra la hoja al cambiar de vista y con Escape
  useEffect(() => { setMenu(false); }, [ruta]);
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [menu]);

  const enTab = [...IZQ, BOVEDA].some((i) => coincide(ruta, i));
  const menuActivo = menu || !enTab;

  const tab = (i: Item) => {
    const on = !menu && coincide(ruta, i);
    return (
      <Link key={i.href} href={i.href} className={`bi-tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
        <i.Ico />
        <span className="bi-t">{i.t}</span>
      </Link>
    );
  };

  const nuevo = (e: React.MouseEvent) => {
    setMenu(false);
    if (ruta === RUTA_PRENDAS) {
      e.preventDefault();
      window.dispatchEvent(new Event(EVENTO_NUEVA_PRENDA));
    }
  };

  return (
    <>
      <style>{CSS}</style>

      {menu && !oculta && (
        <div className="bi-vel" onClick={() => setMenu(false)}>
          <div className="bi-hoja" role="dialog" aria-label="Todas las vistas" onClick={(e) => e.stopPropagation()}>
            <span className="bi-asa" aria-hidden />
            <div className="bi-grid">
              {TODAS.map((i) => (
                <Link key={i.href} href={i.href} className={coincide(ruta, i) ? 'on' : ''} onClick={() => setMenu(false)}>
                  <i.Ico />
                  <span>{i.t}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className={`bi-nav ${oculta ? 'oculta' : ''}`} aria-label="Navegación principal" aria-hidden={oculta}>
        <div className="bi-fila">
          {IZQ.map(tab)}

          <div className="bi-centro">
            <Link
              href={`${RUTA_PRENDAS}?nueva=1`}
              className="bi-fab"
              aria-label="Crear artículo nuevo"
              onClick={nuevo}
              tabIndex={oculta ? -1 : 0}
            >
              <IcoMas />
            </Link>
            <span className="bi-t bi-t-fab">Nuevo artículo</span>
          </div>

          {tab(BOVEDA)}

          <button type="button" className={`bi-tab ${menuActivo ? 'on' : ''}`} onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Abrir todas las vistas">
            <IcoMenu />
            <span className="bi-t">Menú</span>
          </button>
        </div>
      </nav>
    </>
  );
}

const CSS = `
:root { --bi-h: 68px; }
.bi-nav, .bi-vel { display: none; }

@media (max-width: 900px) {
  body { padding-bottom: calc(var(--bi-h) + 24px + env(safe-area-inset-bottom, 0px)); }

  .bi-nav { display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 90; height: calc(var(--bi-h) + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, #0f3a28 0%, #07211a 100%); border-radius: 22px 22px 0 0;
    box-shadow: 0 -10px 30px rgba(5,28,19,.3), inset 0 1px 0 rgba(216,185,95,.5);
    transition: transform .35s cubic-bezier(.4,0,.2,1), opacity .25s; }
  .bi-nav.oculta { transform: translateY(125%); opacity: 0; pointer-events: none; }

  .bi-fila { display: grid; grid-template-columns: 1fr 1fr 92px 1fr 1fr; align-items: stretch; height: var(--bi-h); padding: 0 4px; }

  .bi-tab { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0; border: 0; background: none; font: inherit; text-decoration: none;
    color: #9fd8bd; -webkit-tap-highlight-color: transparent; cursor: pointer; transition: color .2s, transform .15s; }
  .bi-tab svg { transition: transform .25s, filter .25s; }
  .bi-tab:active svg { transform: scale(.88); }
  .bi-t { font-size: 10.5px; font-weight: 500; letter-spacing: .02em; line-height: 1; }

  /* Activo: ícono dorado con resplandor y rayita arriba (sin círculo) */
  .bi-tab.on { color: #f6dd8a; }
  .bi-tab.on svg { transform: translateY(-1px) scale(1.08); filter: drop-shadow(0 0 7px rgba(246,221,138,.65)); }
  .bi-tab.on .bi-t { font-weight: 700; }
  .bi-tab.on::before { content: ""; position: absolute; top: 0; left: 50%; width: 26px; height: 3px; margin-left: -13px; border-radius: 0 0 4px 4px;
    background: linear-gradient(90deg, #c9a548, #f6e3a0, #c9a548); box-shadow: 0 2px 10px rgba(246,221,138,.7); }
  .bi-tab:focus-visible, .bi-fab:focus-visible { outline: 2px solid #f6dd8a; outline-offset: 2px; border-radius: 12px; }

  /* Botón central: círculo dorado con aro del color de la barra y brillo */
  .bi-centro { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 9px; }
  .bi-fab { position: absolute; top: -30px; left: 50%; width: 62px; height: 62px; margin-left: -31px; border-radius: 50%; display: grid; place-items: center; text-decoration: none;
    color: #14240c; background: radial-gradient(circle at 32% 26%, #fff1b8 0%, #ecc65c 38%, #b88a2c 100%);
    box-shadow: 0 0 0 6px #0b2d1f, 0 0 0 7.5px rgba(216,185,95,.55), 0 14px 26px rgba(0,0,0,.45), 0 0 24px rgba(236,198,92,.4), inset 0 2px 1px rgba(255,255,255,.7), inset 0 -4px 8px rgba(120,80,10,.35);
    -webkit-tap-highlight-color: transparent; transition: transform .18s, box-shadow .2s; }
  .bi-fab:active { transform: scale(.92); }
  .bi-t-fab { color: #f6dd8a; font-weight: 600; font-size: 10px; }

  /* Hoja con todas las vistas */
  .bi-vel { display: block; position: fixed; inset: 0; z-index: 85; background: rgba(3,12,8,.5); backdrop-filter: blur(3px); animation: bifade .2s both; }
  .bi-hoja { position: absolute; left: 0; right: 0; bottom: calc(var(--bi-h) + env(safe-area-inset-bottom, 0px)); padding: 12px 16px 22px; border-radius: 24px 24px 0 0;
    background: linear-gradient(180deg, #0f3a28, #07211a); border: 1px solid rgba(216,185,95,.3); border-bottom: 0; box-shadow: 0 -16px 40px rgba(0,0,0,.4);
    animation: bisube .3s cubic-bezier(.2,.8,.2,1) both; }
  .bi-asa { display: block; width: 40px; height: 4px; margin: 0 auto 14px; border-radius: 4px; background: rgba(216,185,95,.4); }
  .bi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .bi-grid a { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 6px; border-radius: 16px; text-decoration: none; font-size: 12px; font-weight: 500;
    color: #9fd8bd; background: rgba(255,255,255,.04); border: 1px solid rgba(216,185,95,.14); -webkit-tap-highlight-color: transparent; transition: .2s; }
  .bi-grid a:active { transform: scale(.95); }
  .bi-grid a.on { color: #f6dd8a; border-color: rgba(246,221,138,.5); background: rgba(246,221,138,.09); }
  .bi-grid a.on svg { filter: drop-shadow(0 0 6px rgba(246,221,138,.6)); }
  @keyframes bifade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bisube { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
}

@media (min-width: 901px) { .bi-nav, .bi-vel { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .bi-nav, .bi-tab, .bi-tab svg, .bi-fab, .bi-hoja, .bi-vel { transition: none; animation: none; } }
`;