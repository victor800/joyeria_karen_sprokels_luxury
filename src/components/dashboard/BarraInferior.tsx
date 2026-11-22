// 📁 RUTA: src/components/dashboard/BarraInferior.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ico = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const IcoInicio = () => (<svg {...ico}><path d="M3 11l9-7.5L21 11" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></svg>);
const IcoPrendas = () => (<svg {...ico}><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></svg>);
const IcoBoveda = () => (<svg {...ico}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="12" cy="12" r="3.4" /><path d="M12 8.6v1.4M12 14v1.4M8.6 12H10M14 12h1.4" /><path d="M6 20v1.5M18 20v1.5" /></svg>);
const IcoDomicilios = () => (<svg {...ico}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>);
const IcoMas = () => (<svg {...ico} width={28} height={28} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>);

type Item = { href: string; t: string; Ico: () => React.JSX.Element; exacto?: boolean };

const IZQ: Item[] = [
  { href: '/dashboard', t: 'Inicio', Ico: IcoInicio, exacto: true },
  { href: '/dashboard/prendas', t: 'Prendas', Ico: IcoPrendas },
];
const DER: Item[] = [
  { href: '/dashboard/boveda', t: 'Bóveda', Ico: IcoBoveda },
  { href: '/dashboard/domiciliarios', t: 'Domicilios', Ico: IcoDomicilios },
];
/** Botón central: crear pedido / venta */
const NUEVA = { href: '/dashboard/pedidos', t: 'Nueva venta' };

export default function BarraInferior() {
  const ruta = usePathname() || '';
  const activa = (i: { href: string; exacto?: boolean }) =>
    i.exacto ? ruta === i.href : ruta === i.href || ruta.startsWith(`${i.href}/`);

  const tab = (i: Item) => {
    const on = activa(i);
    return (
      <Link key={i.href} href={i.href} className={`bi-tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
        <span className="bi-ic"><i.Ico /></span>
        <span className="bi-t">{i.t}</span>
      </Link>
    );
  };

  const fabOn = activa(NUEVA);

  return (
    <nav className="bi-nav" aria-label="Navegación principal">
      <style>{CSS}</style>
      <div className="bi-fondo" aria-hidden />
      <div className="bi-fila">
        {IZQ.map(tab)}
        <div className="bi-centro">
          <Link href={NUEVA.href} className={`bi-fab ${fabOn ? 'on' : ''}`} aria-label="Crear pedido" aria-current={fabOn ? 'page' : undefined}>
            <IcoMas />
          </Link>
          <span className={`bi-t bi-t-fab ${fabOn ? 'on' : ''}`}>{NUEVA.t}</span>
        </div>
        {DER.map(tab)}
      </div>
    </nav>
  );
}

const CSS = `
:root { --bi-h: 66px; }
.bi-nav { display: none; }

@media (max-width: 900px) {
  body { padding-bottom: calc(var(--bi-h) + 22px + env(safe-area-inset-bottom, 0px)); }

  .bi-nav { display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 90; height: calc(var(--bi-h) + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
  .bi-nav > * { pointer-events: auto; }

  /* Fondo verde con muesca circular para el botón central */
  .bi-fondo { position: absolute; inset: 0; border-radius: 24px 24px 0 0;
    background: linear-gradient(180deg, #0f3a28 0%, #07211a 100%);
    box-shadow: 0 -10px 30px rgba(5,28,19,.28), inset 0 1px 0 rgba(216,185,95,.55);
    -webkit-mask-image: radial-gradient(circle at 50% 0, transparent 37px, #000 38.5px);
            mask-image: radial-gradient(circle at 50% 0, transparent 37px, #000 38.5px); }

  .bi-fila { position: relative; display: grid; grid-template-columns: 1fr 1fr 84px 1fr 1fr; align-items: stretch; height: var(--bi-h); padding: 0 6px; }

  .bi-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-decoration: none; color: rgba(243,234,210,.62);
    -webkit-tap-highlight-color: transparent; transition: color .2s; }
  .bi-ic { display: grid; place-items: center; width: 44px; height: 30px; border-radius: 99px; transition: background .25s, transform .25s, color .25s; }
  .bi-t { font-size: 10.5px; font-weight: 500; letter-spacing: .02em; line-height: 1; }
  .bi-tab:active .bi-ic { transform: scale(.9); }
  .bi-tab.on { color: #ecd07a; }
  .bi-tab.on .bi-ic { background: rgba(236,208,122,.16); box-shadow: inset 0 0 0 1px rgba(236,208,122,.35); }
  .bi-tab.on .bi-t { font-weight: 700; }
  .bi-tab:focus-visible, .bi-fab:focus-visible { outline: 2px solid #ecd07a; outline-offset: 2px; border-radius: 14px; }

  /* Botón central flotante */
  .bi-centro { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 8px; }
  .bi-fab { position: absolute; top: -26px; left: 50%; transform: translateX(-50%); width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; text-decoration: none;
    color: #1c1608; background: linear-gradient(135deg, #f6e3a0, #c9a548 55%, #b08d3c);
    box-shadow: 0 12px 24px rgba(176,141,60,.5), 0 0 0 5px rgba(7,33,26,.0), inset 0 2px 0 rgba(255,255,255,.55);
    -webkit-tap-highlight-color: transparent; transition: transform .2s, box-shadow .2s; }
  .bi-fab:active { transform: translateX(-50%) scale(.92); }
  .bi-fab.on { box-shadow: 0 12px 26px rgba(236,208,122,.7), inset 0 2px 0 rgba(255,255,255,.55); }
  .bi-t-fab { color: rgba(243,234,210,.62); }
  .bi-t-fab.on { color: #ecd07a; font-weight: 700; }
}

@media (min-width: 901px) { .bi-nav { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .bi-ic, .bi-fab, .bi-tab { transition: none; } }
`;