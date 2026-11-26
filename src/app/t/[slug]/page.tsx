// 📁 RUTA: src/app/t/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import { leerConfigPublica } from '@/lib/configuracion';
import { leerPrendasPublicas } from '@/lib/prendas';
import CatalogoPublico, { CarritoHeader, type PrendaP, type VarianteP } from './CatalogoPublico';
import HeroVideo from './HeroVideo';
import PromocionesPublicas, { type PromoP } from './PromocionesPublicas';
import CotizacionModal from './CotizacionModal';
import TallerSeccion from './TallerSeccion';
import GuiaTallas from './GuiaTallas';
import PersonalizacionTrabajos from './PersonalizacionTrabajos';
import MenuInferior from './MenuInferior';
import WhatsAppFlotante from './WhatsAppFlotante';
import HansSeccion from './HansSeccion';
import { leerHansPublico } from '@/lib/hans-publico';
import { estadoPromo, type Promocion } from '@/types/promocion';
import { rutaFoto } from '@/lib/foto-url';
import { listar as leerPromociones } from '@/lib/promociones-store';

const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

/* ═══════════════════════════════════════════════
   CONSTANTES DE LA MARCA
   ═══════════════════════════════════════════════ */
const MARCA = "Karen Sprockel's";
const VIDEO_HERO = '/sprokel.mp4';
const INSTAGRAM = 'https://www.instagram.com/joyeria_jks_luxury';
const FOTO_BANNER = '/pieza13.jpeg';
const LOGO_JKS = '/logo-jks.jpeg';

/* ═══════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════ */
const cop = (v?: string) => {
  const n = Number(String(v ?? '').replace(/[.,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('es-CO')}` : null;
};
const instagramUser = (v?: string) => {
  const s = (v || '').trim();
  if (!s) return '';
  const m = s.match(/instagram\.com\/([^/?#]+)/i);
  return '@' + (m ? m[1] : s.replace(/^@/, ''));
};
const instagramUrl = (v?: string) => {
  const u = instagramUser(v).replace(/^@/, '');
  return u ? `https://instagram.com/${u}` : '#';
};
const waLink = (tel?: string) => {
  const d = (tel || '').replace(/\D/g, '');
  return d ? `https://wa.me/${d.length <= 10 ? '57' + d : d}` : '#';
};
const slugCat = (k: string) =>
  k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ═══════════════════════════════════════════════
   PRENDAS DEL SHEET → TARJETAS (sin cambios)
   ═══════════════════════════════════════════════ */
const SEP = '|';
const parseFotos = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(String) : String(v ?? '').split(SEP)).map((x) => x.trim()).filter(Boolean);
const primerasFotos = (...vs: unknown[]): string[] => {
  for (const v of vs) { const f = parseFotos(v); if (f.length) return f; }
  return [];
};
const soloDigitos = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

type VarCruda = { t?: unknown; p?: unknown; s?: unknown; m?: unknown; f?: unknown };
function parseVariantes(tamano: unknown): VarCruda[] | null {
  const t = String(tamano ?? '').trim();
  if (!t.startsWith('[')) return null;
  try {
    const arr = JSON.parse(t);
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch {
    return null;
  }
}

function normalizarPrendas(crudas: unknown[], precios: Record<string, unknown>): PrendaP[] {
  const margen = Number(String(precios.margen ?? '0').replace(',', '.')) || 0;
  const calc = (quilate: string, peso: unknown, manual: unknown) => {
    const m = soloDigitos(manual);
    if (m > 0) return m;
    const gramo = soloDigitos(precios[`p${quilate}`]);
    const pe = Number(String(peso ?? '').replace(',', '.'));
    return pe > 0 && gramo > 0 ? Math.round(pe * gramo * (1 + margen / 100)) : 0;
  };

  const salida: PrendaP[] = [];
  for (const raw of crudas) {
    const r = raw as Record<string, unknown>;
    const nombre = String(r.nombre ?? '').trim();
    if (!nombre) continue;
    if (r.activo !== undefined && String(r.activo) !== 'true') continue;

    const quilate = String(r.quilate ?? '18');
    const fotosBase = primerasFotos(r.foto_url, r.foto, r.fotos, r.imagen_url, r.imagen);
    const crudasVar = parseVariantes(r.tamano);

    let variantes: VarianteP[];
    if (crudasVar) {
      const vs = crudasVar.map((x) => ({
        tamano: String(x.t ?? ''),
        peso: String(x.p ?? ''),
        stock: Number(x.s ?? 0) || 0,
        precio: calc(quilate, x.p, x.m),
        fotos: parseFotos(x.f),
      }));
      const respaldo = vs.find((x) => x.fotos.length)?.fotos ?? fotosBase;
      variantes = vs.map((x) => ({ ...x, fotos: x.fotos.length ? x.fotos : respaldo }));
    } else {
      const precio = Number(r.precio) > 0 ? Number(r.precio) : soloDigitos(r.precio) || calc(quilate, r.peso, r.precio_manual);
      variantes = [{
        tamano: String(r.tamano ?? ''),
        peso: String(r.peso ?? ''),
        stock: Number(r.stock ?? 1) || 0,
        precio,
        fotos: fotosBase,
      }];
    }

    salida.push({
      id: String(r.id ?? r.codigo ?? nombre),
      codigo: String(r.codigo ?? ''),
      nombre,
      categoria: String(r.categoria ?? ''),
      quilate,
      descripcion: String(r.descripcion ?? r.detalle ?? ''),
      variantes,
    });
  }
  return salida;
}

/* ═══════════════════════════════════════════════
   PROMOCIONES ACTIVAS
   ═══════════════════════════════════════════════ */
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

async function promosActivas(): Promise<PromoP[]> {
  const hoy = hoyBogota();
  const filas = (await leerPromociones().catch(() => [])) as Promocion[];
  return filas
    .filter((p) => estadoPromo(p, hoy) === 'activa')
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      tipo: p.tipo,
      valor: p.valor,
      hasta: p.hasta,
      dias: Math.max(0, Math.round((Date.parse(`${p.hasta}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000)),
      fotoUrl: p.fotoUrl ? rutaFoto(p.fotoUrl) : '',
      restantes: p.usosMax > 0 ? Math.max(0, p.usosMax - p.usos) : null,
    }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = await leerConfigPublica(slug).catch(() => null);
  if (!f) return { title: 'Tienda no encontrada' };
  return {
    title: MARCA,
    description: f.encabezado || `Joyería fina en oro certificado · ${MARCA}`,
  };
}

/* ═══════════════════════════════════════════════
   ICONOS
   ═══════════════════════════════════════════════ */
const P: Record<string, React.ReactNode> = {
  gem: <><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  truck: <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  ring: <><circle cx="12" cy="15" r="6" /><path d="M9 6h6l2-3H7z" /></>,
  necklace: <><path d="M4 5c0 9 4 12 8 12s8-3 8-12" /><path d="m12 17 2.5 3L12 23l-2.5-3z" /></>,
  earring: <><circle cx="8" cy="6" r="2" /><circle cx="16" cy="6" r="2" /><path d="M8 8v6m8-6v6" /><circle cx="8" cy="17" r="2.5" /><circle cx="16" cy="17" r="2.5" /></>,
  bracelet: <><ellipse cx="12" cy="12" rx="9" ry="5" /><ellipse cx="12" cy="12" rx="6" ry="2.5" /></>,
  pendant: <><path d="M12 3v6" /><path d="M8 9h8l2 4-6 8-6-8z" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>,
  pin: <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  ig: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" /></>,
  wa: <><path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-.9.9c-1-.4-2-1.4-2.4-2.4l.9-.9-1-2.2z" /></>,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5l4 4L8 20l-5 1 1-5z" /></>,
  spark: <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />,
};
function Ic({ n, s = 20 }: { n: keyof typeof P; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[n]}</svg>
  );
}

/* ═══════════════════════════════════════════════
   PEQUEÑOS COMPONENTES (solo CSS, sin JavaScript)
   ═══════════════════════════════════════════════ */
/** Bloque plegable del pie */
function Pl({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="pl">
      <input type="checkbox" id={`pl-${id}`} className="pl-chk" aria-label={titulo} />
      <label htmlFor={`pl-${id}`} className="pl-h">
        <span>{titulo}</span>
        <svg className="pl-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </label>
      <div className="pl-b"><div className="pl-in">{children}</div></div>
    </div>
  );
}
/** Sección tarjeta plegable en móvil */
function Colapsa({ id, sub, titulo, children }: { id: string; sub: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="gt" id={`${id}-bloque`}>
      <input type="checkbox" id={`${id}-chk`} className="gt-chk" aria-label={titulo} />
      <label htmlFor={`${id}-chk`} className="gt-h">
        <span><small>{sub}</small><b>{titulo}</b></span>
        <svg className="gt-chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </label>
      <div className="gt-b"><div className="gt-in">{children}</div></div>
    </div>
  );
}
/** Destellos dorados flotantes (decorativos) */
const CHISPAS = [
  { l: '8%', t: '22%', d: '0s', s: 10 }, { l: '18%', t: '70%', d: '1.2s', s: 7 }, { l: '32%', t: '12%', d: '2.1s', s: 8 },
  { l: '46%', t: '82%', d: '.6s', s: 9 }, { l: '58%', t: '30%', d: '1.8s', s: 6 }, { l: '71%', t: '64%', d: '2.7s', s: 10 },
  { l: '84%', t: '18%', d: '.9s', s: 8 }, { l: '92%', t: '76%', d: '1.5s', s: 7 },
];
function Chispas() {
  return (
    <div className="mw-spk" aria-hidden>
      {CHISPAS.map((c, i) => (
        <i key={i} style={{ left: c.l, top: c.t, animationDelay: c.d, width: c.s, height: c.s }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ESTILOS (organizados por secciones)
   ═══════════════════════════════════════════════ */
const css = (ff: string) => `
/* ───────── 0. BASE ───────── */
html { scroll-behavior: smooth; }
body { margin: 0; background: #030c08; }
.mw { --v:#0b4a2e; --v2:#0f5f3b; --vd:#030c08; --vc:#e7efe9; --vm:#cfe0d5; --o:#b08d3c; --o2:#e0b73f; --o3:#f0d680;
  --crema:#f6f4ee; --tx:#14201a; --serif: ${ff};
  min-height: 100vh; background: var(--crema); color: var(--tx); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.mw * { box-sizing: border-box; }
.mw h1,.mw h2,.mw h3,.mw .mw-marca span { font-family: ${ff}, Georgia, serif; font-weight: 500; margin: 0; }
.mw a { color: inherit; text-decoration: none; }
.mw svg { stroke-width: 2; }
.mw-wrap { max-width: 1180px; margin: 0 auto; padding: 0 28px; }
.mw-logo { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; background: var(--vd); border: 1.5px solid var(--o2); box-shadow: 0 0 0 3px rgba(224,183,63,.14), 0 4px 14px rgba(0,0,0,.4); flex-shrink: 0; }
.mw-pie .mw-logo { width: 64px; height: 64px; }
.mw .mc-precio b, .mw .mw-oro-bar b, .mw .mc-badge, .mw .mc-tot b, .mw .mc-it b { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif !important; font-weight: 700 !important; font-variant-numeric: lining-nums tabular-nums; }

/* Texto dorado con brillo que recorre (efecto joyería de lujo) */
.mw-oroTxt { background: linear-gradient(100deg, #b08d3c 0%, #f0d680 30%, #fff4c7 50%, #e0b73f 70%, #b08d3c 100%); background-size: 220% 100%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: mw-brillo 6s linear infinite; }
@keyframes mw-brillo { to { background-position: -220% 0; } }

/* Chispas */
.mw-spk { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.mw-spk i { position: absolute; background: var(--o3); clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  opacity: 0; filter: drop-shadow(0 0 6px rgba(240,214,128,.9)); animation: mw-chispa 4.5s ease-in-out infinite; }
@keyframes mw-chispa { 0%,100% { opacity: 0; transform: scale(.3) rotate(0); } 45%,55% { opacity: .95; transform: scale(1) rotate(45deg); } }

/* ───────── 1. CABECERA ───────── */
.mw-head { background: rgba(3,12,8,.92); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(224,183,63,.16); position: sticky; top: 0; z-index: 20; }
.mw-head::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: linear-gradient(90deg, transparent, var(--o2), transparent); opacity: .55; }
.mw-head .mw-wrap { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; height: 68px; }
.mw-marca { display: flex; align-items: center; gap: 12px; font-size: 15px; letter-spacing: .18em; text-transform: uppercase; color: #f4efdc; min-width: 0; }
.mw-marca span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mw-nav { display: flex; gap: 22px; font-size: 12px; letter-spacing: .1em; color: #c5d0c8; }
.mw-nav a { position: relative; padding: 6px 0; white-space: nowrap; transition: color .25s; }
.mw-nav a::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--o2); transform: scaleX(0); transform-origin: left; transition: transform .35s cubic-bezier(.2,.7,.2,1); }
.mw-nav a:hover { color: var(--o3); }
.mw-nav a:hover::after { transform: scaleX(1); }
.mw-iconos { display: flex; justify-content: flex-end; align-items: center; }
.mw-nombre { display: none; }
.mw .mc-hbtn { color: var(--o2); }
.mw-head .mc-hbtn, .mw-head svg { color: var(--o3); }

/* ───────── 2. HERO (video un poco más pequeño) ───────── */
.mw-hero { position: relative; display: flex; flex-direction: column; min-height: min(90vh, 820px); overflow: hidden; color: #f4efdc; scroll-margin-top: 68px;
  background: radial-gradient(ellipse 60% 70% at 20% 60%, rgba(15,95,59,.8), transparent 70%), linear-gradient(120deg, #030c08, #082a1b 60%, #0b4a2e); }
/* El video es vertical (9:16): se muestra COMPLETO (contain), sin recortar al ave ni al dije */
.mw .hv { position: absolute !important; top: 22px !important; bottom: auto !important; left: auto !important; right: clamp(24px, 8vw, 150px) !important;
  height: calc(100% - 150px) !important; width: auto !important; aspect-ratio: 478 / 850; object-fit: contain !important; object-position: center top; opacity: 0; transition: opacity 1.8s ease; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
  /* bordes difuminados por los 4 lados: no se ve el cuadro del video */
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 12%, #000 80%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 12%, #000 80%, transparent 100%);
  -webkit-mask-composite: source-in; mask-composite: intersect; }
.mw .hv.on { opacity: 1; }
.mw-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3,12,8,.9) 0%, rgba(3,12,8,.65) 35%, rgba(3,12,8,0) 65%), linear-gradient(0deg, rgba(3,12,8,.85) 0%, transparent 25%); }
.mw-hero-in { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; width: 100%; padding-top: 48px; padding-bottom: 40px; }
.mw .mw-hero-in { max-width: none; margin: 0; padding-left: clamp(24px, 6vw, 96px); padding-right: 24px; }
.mw-hero-txt { max-width: 560px; }
.mw-hero-txt > * { animation: mw-up 1s cubic-bezier(.2,.7,.2,1) both; }
.mw-hero-txt > :nth-child(2) { animation-delay: .1s; } .mw-hero-txt > :nth-child(3) { animation-delay: .2s; } .mw-hero-txt > :nth-child(4) { animation-delay: .3s; } .mw-hero-txt > :nth-child(5) { animation-delay: .4s; }
@keyframes mw-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.mw-tag { display: inline-flex; align-items: center; gap: 14px; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: var(--o2); }
.mw-tag::before { content: ""; width: 36px; height: 1px; background: var(--o2); }
.mw-hero h2 { font-size: clamp(34px, 4.4vw, 60px); line-height: 1.06; letter-spacing: .05em; text-transform: uppercase; margin: 20px 0 22px; color: #fbf6e6; text-shadow: 0 4px 30px rgba(0,0,0,.45); }
.mw-hero p { color: #d3ddd6; font-size: 14.5px; line-height: 1.65; max-width: 400px; margin: 0 0 28px; padding-left: 14px; border-left: 2px solid var(--o2); }
.mw-cta { display: flex; gap: 14px; flex-wrap: wrap; }
.mw-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(224,183,63,.7); color: #f4efdc !important; padding: 15px 30px; font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; transition: .25s; }
.mw-btn:hover { background: rgba(224,183,63,.14); border-color: var(--o2); }
.mw-btn.solid { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; border-color: transparent; }
.mw-btn.solid:hover { filter: brightness(1.08); }
/* destello que cruza el botón */
.mw-btn.solid::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.65), transparent); transform: skewX(-20deg); animation: mw-barrido 4.5s ease-in-out infinite; }
@keyframes mw-barrido { 0%, 55% { left: -60%; } 100% { left: 140%; } }

/* Logo flotante en el hero */
.mw-hero-logo { margin: 0 0 22px 7px; }
.mw-hero-logo img { display: block; width: clamp(88px, 8vw, 120px); aspect-ratio: 1; border-radius: 50%; object-fit: cover; background: var(--vd); border: 2px solid var(--o2);
  box-shadow: 0 0 0 6px rgba(224,183,63,.14), 0 0 0 7px rgba(224,183,63,.38), 0 14px 34px rgba(0,0,0,.5); animation: mw-flota 7s ease-in-out infinite; }
@keyframes mw-flota { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

/* Caja del precio del oro: tarjeta flotante de cristal */
.mw-oro-bar { position: relative; z-index: 1; width: 100%; max-width: none; padding: 0 28px 26px; background: transparent; scroll-margin-top: 68px; }
.mw-oro-in { max-width: 1180px; margin: 0 auto; padding: 16px 26px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  border: 1px solid rgba(224,183,63,.45); border-radius: 14px; background: linear-gradient(135deg, rgba(8,42,27,.78), rgba(3,12,8,.82)); backdrop-filter: blur(12px);
  box-shadow: 0 18px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07); }
.mw-oro-in > span { display: inline-flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--o2); }
.mw-oro-in > span::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 0 rgba(74,222,128,.6); animation: mw-vivo 2s ease-out infinite; }
@keyframes mw-vivo { to { box-shadow: 0 0 0 10px rgba(74,222,128,0); } }
.mw-oro-in div { display: flex; gap: 0; }
.mw-oro-in div p { padding: 0 28px; } .mw-oro-in div p + p { border-left: 1px solid rgba(224,183,63,.25); } .mw-oro-in div p:last-child { padding-right: 0; }
.mw-oro-in small { display: block; font-size: 10.5px; letter-spacing: .14em; color: #8fa397; margin-bottom: 2px; }
.mw-oro-in b { font-size: 19px; color: var(--o3); } .mw-oro-in em { font-style: normal; font-size: 11px; color: #8fa397; margin-left: 4px; }

/* ───────── 3. BENEFICIOS + FRANJA DE LUJO ───────── */
.mw-ben { background: linear-gradient(180deg, #f3ecdc, #ece3cf); border-bottom: 1px solid #ddd1b0; }
.mw-ben .mw-wrap { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; padding-top: 22px; padding-bottom: 22px; }
.mw-b { display: flex; gap: 14px; align-items: center; padding: 0 18px; transition: transform .3s; }
.mw-b:hover { transform: translateY(-3px); }
.mw-b + .mw-b { border-left: 1px solid rgba(176,141,60,.35); }
.mw-b > span { width: 42px; height: 42px; display: grid; place-items: center; color: var(--v); flex-shrink: 0; border: 1px solid var(--o); border-radius: 50%; background: rgba(255,255,255,.75); transition: .3s; }
.mw-b:hover > span { background: var(--v); color: var(--o3); box-shadow: 0 6px 16px rgba(11,74,46,.3); }
.mw-b b { display: block; font-size: 13px; } .mw-b small { color: #6b7a72; font-size: 12px; }

.mw-marq { overflow: hidden; background: #030c08; border-block: 1px solid rgba(224,183,63,.3); padding: 13px 0; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.mw-marq-t { display: flex; width: max-content; animation: mw-marq 32s linear infinite; }
.mw-marq-t span { display: inline-flex; align-items: center; gap: 22px; padding-right: 22px; font: 500 12px/1 ${ff}, Georgia, serif; letter-spacing: .32em; text-transform: uppercase; color: var(--o3); white-space: nowrap; }
.mw-marq-t svg { color: var(--o2); }
@keyframes mw-marq { to { transform: translateX(-50%); } }

/* ───────── 4. TÍTULOS DE SECCIÓN ───────── */
.mw-sec { padding: 64px 0 4px; scroll-margin-top: 68px; }
.mw-tit { margin-bottom: 26px; }
.mw-tit small { display: block; font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: var(--o); margin-bottom: 8px; }
.mw-tit h3 { font-size: clamp(28px, 3.4vw, 38px); color: var(--v); letter-spacing: .02em; }
.mw-tit i { display: block; width: 64px; height: 2px; background: linear-gradient(90deg, var(--o2), transparent); margin-top: 14px; }
.mw-tit.c { text-align: center; }
.mw-tit.c i { margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--o2), transparent); }

/* ───────── 5. CATÁLOGO: fondo marfil + tarjetas esmeralda (contraste) ───────── */
/* Fondo GRIS (combina con el negro y el verde) compartido por colecciones + catálogo */
.mw-gris { position: relative; color: var(--tx);
  background:
    radial-gradient(ellipse 50% 30% at 0% 0%, rgba(15,95,59,.18), transparent 70%),
    radial-gradient(ellipse 45% 30% at 100% 60%, rgba(255,255,255,.55), transparent 70%),
    radial-gradient(rgba(11,74,46,.09) 1px, transparent 1.3px) 0 0 / 22px 22px,
    linear-gradient(180deg, #dfe4e1, #ccd3cf 50%, #dfe4e1); }
.mw-gris::before, .mw-gris::after { content: ""; position: absolute; left: 0; right: 0; height: 3px; z-index: 1; background: linear-gradient(90deg, transparent, var(--o2), var(--o3), var(--o2), transparent); }
.mw-gris::before { top: 0; } .mw-gris::after { bottom: 0; }
.mw .mw-dark { position: relative; padding: 44px 0 70px; color: var(--tx); background: transparent; }
.mw-col { padding: 72px 0 8px; scroll-margin-top: 68px; }
.mw-col .mw-tit, .mw-dark .mw-tit { text-align: center; }
.mw-col .mw-tit i { margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--o2), transparent); }

/* Colecciones en mosaico (bento) */
.mw-bento { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 172px; grid-auto-flow: dense; gap: 14px; }
.mw-tile { position: relative; isolation: isolate; overflow: hidden; display: block; border-radius: 26px; border: 1px solid rgba(11,74,46,.3);
  background: linear-gradient(160deg, #0f5f3b, #06241a); box-shadow: 0 16px 34px rgba(3,12,8,.25);
  transition: transform .45s cubic-bezier(.2,.7,.2,1), box-shadow .45s, border-color .3s; }
.mw-tile:hover { transform: translateY(-6px); border-color: var(--o2); box-shadow: 0 28px 50px rgba(3,12,8,.38), 0 0 0 1px rgba(224,183,63,.55); }
.mw-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; transition: transform 1.1s cubic-bezier(.2,.7,.2,1); }
.mw-tile:hover img { transform: scale(1.08); }
.mw-tile::before { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(0deg, rgba(3,12,8,.82), rgba(3,12,8,0) 58%); }
.mw-tile-vacio { position: absolute; inset: 0; z-index: -2; display: grid; place-items: center; color: rgba(240,214,128,.3); }
.mw-tile-lbl { position: absolute; left: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 3px; padding: 10px 18px 10px 16px; border-radius: 16px; color: #f4efdc;
  background: rgba(3,12,8,.55); backdrop-filter: blur(10px); border: 1px solid rgba(224,183,63,.38); }
.mw-tile-lbl b { font: 500 clamp(16px, 1.6vw, 21px)/1.15 ${ff}, Georgia, serif; }
.mw-tile-lbl small { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--o3); }
.mw-tile-go { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: var(--o3);
  background: rgba(3,12,8,.55); backdrop-filter: blur(6px); border: 1px solid rgba(224,183,63,.5); opacity: 0; transform: translate(6px, -6px) scale(.8); transition: .35s; }
.mw-tile:hover .mw-tile-go, .mw-tile:focus-visible .mw-tile-go { opacity: 1; transform: none; }
.mw-tile:focus-visible { outline: 2px solid var(--o2); outline-offset: 3px; }
.t-a { grid-column: span 5; grid-row: span 2; } .t-b { grid-column: span 4; } .t-c { grid-column: span 3; grid-row: span 2; } .t-d { grid-column: span 4; }
.t-w12 { grid-column: span 12; } .t-w6 { grid-column: span 6; grid-row: span 2; } .t-w4 { grid-column: span 4; grid-row: span 2; }
@supports (animation-timeline: view()) {
  .mw-tile { animation: mw-rev linear backwards; animation-timeline: view(); animation-range: entry 0% entry 60%; }
}
.mw-dark .mw-tit i { margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--o2), transparent); }
.mw-dark .mw-tit h3 { color: var(--v); }
.mw-dark .mc-chip { background: #eef1ef; border-color: #aab5af; color: #1d2b24; transition: .25s; }
.mw-dark .mc-chip:hover { border-color: var(--v); box-shadow: 0 6px 16px rgba(11,74,46,.22); transform: translateY(-2px); }
.mw-dark .mc-chip.on { background: linear-gradient(135deg, var(--v2), var(--v)); border-color: var(--v); color: var(--o3); }

/* Título de cada categoría con línea dorada que se dibuja */
.mw-dark .mc-grupo-tit h4 { color: #0b2a1c; font-size: clamp(22px, 2.4vw, 28px); }
.mw-dark .mc-grupo-tit span, .mw-dark .mc-grupo-tit small { color: #8a6d1f; font-weight: 600; }
.mw-dark .mc-grupo-tit i { background: linear-gradient(90deg, var(--o2), rgba(224,183,63,0)); transform-origin: left; animation: mw-linea 1.2s cubic-bezier(.2,.7,.2,1) both; }
@keyframes mw-linea { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.mw-dark .mc-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 215px), 1fr)); gap: 18px; }
.mw-dark .mc-card { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid rgba(224,183,63,.45);
  background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806);
  box-shadow: 0 20px 40px rgba(3,12,8,.32), 0 0 0 5px rgba(255,255,255,.35);
  transition: transform .4s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .4s; }
.mw-dark .mc-card:hover { transform: translateY(-8px); border-color: var(--o3); box-shadow: 0 30px 56px rgba(3,12,8,.45), 0 0 0 5px rgba(255,255,255,.5), 0 0 36px rgba(224,183,63,.3); }
.mw-dark .mc-card img { transition: transform 1s cubic-bezier(.2,.7,.2,1); }
.mw-dark .mc-card:hover img { transform: scale(1.07); }
.mw-dark .mc-card::before { content: ""; position: absolute; left: 18%; right: 18%; top: 0; height: 2px; z-index: 3; background: linear-gradient(90deg, transparent, var(--o3), transparent); }
/* destello diagonal al pasar el cursor */
.mw-dark .mc-card::after { content: ""; position: absolute; top: -20%; bottom: -20%; width: 45%; left: -80%; pointer-events: none; z-index: 3;
  background: linear-gradient(100deg, transparent, rgba(255,244,199,.28), transparent); transform: skewX(-18deg); transition: left .9s ease; }
.mw-dark .mc-card:hover::after { left: 140%; }
/* aparición suave al hacer scroll (navegadores modernos) */
@supports (animation-timeline: view()) {
  .mw-dark .mc-card { animation: mw-rev linear backwards; animation-timeline: view(); animation-range: entry 0% entry 60%; }
}
@keyframes mw-rev { from { opacity: 0; transform: translateY(40px) scale(.95); } to { opacity: 1; transform: none; } }

.mw-dark .mc-pie-foto span { display: none; } .mw-dark .mc-pie-foto { justify-content: flex-end; }
.mw-dark .mc-card .mc-cuerpo { padding: 10px 12px 12px; gap: 6px; }
.mw-dark .mc-card .mc-nom { font-size: 16px !important; line-height: 1.2; min-height: 2.4em; }
.mw-dark .mc-card .mc-sku { font-size: 9.5px; } .mw-dark .mc-card .mc-est { font-size: 10px; padding: 3px 8px; }
.mw-dark .mc-card .mc-fila { padding-top: 10px; }
.mw-dark .mc-card .mc-precio b { font-size: 18px; }
.mw-dark .mc-bolsa { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 6px; cursor: pointer; border: 1px solid rgba(224,183,63,.55); background: rgba(4,23,15,.7); color: var(--o2); transition: .2s; }
.mw-dark .mc-bolsa:hover:not(:disabled) { background: var(--o2); color: #1a1405; transform: scale(1.08); } .mw-dark .mc-bolsa:disabled { opacity: .35; cursor: not-allowed; }
.mw-aviso { text-align: center; font-size: 13px; color: #55645c; }

.mw .mc-pedir, .mw .mc-sig { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; letter-spacing: .16em; text-transform: uppercase; font-size: 12.5px; border-radius: 6px; }

/* ───────── 6. HANS ───────── */
#hans { color: #f4efdc; scroll-margin-top: 68px; }
#hans .mw-tit h3 { color: #f4efdc; } #hans .mw-tit small { color: var(--o2); }
#hans p { color: #d3ddd6; } #hans h2 { color: #fbf6e6; }
#hans .mw-btn { color: #f4efdc !important; } #hans .mw-btn.solid { color: #1a1405 !important; }

/* ───────── 7. TALLER: fabricación + reparación en UN solo bloque ───────── */
.mw-atelier { position: relative; isolation: isolate; overflow: hidden; color: #f4efdc; scroll-margin-top: 68px; padding: 76px 0 40px;
  background:
    radial-gradient(ellipse 55% 40% at 15% 0%, rgba(15,95,59,.7), transparent 70%),
    radial-gradient(ellipse 45% 35% at 90% 40%, rgba(224,183,63,.13), transparent 70%),
    radial-gradient(ellipse 50% 40% at 10% 100%, rgba(15,95,59,.5), transparent 70%),
    linear-gradient(180deg, #030c08, #06241a 45%, #030c08); }
.mw-atelier::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--o2), transparent); }
.mw-atelier .mw-tit h3 { color: #fbf6e6; } .mw-atelier .mw-tit small { color: var(--o2); }
.mw-atelier .mw-tit p { margin: 16px auto 0; max-width: 560px; font-size: 14.5px; line-height: 1.7; color: #b9c8be; }
.mw-atelier > .mw-wrap, .mw-atelier > section, .mw-atelier > div { position: relative; z-index: 1; }

/* Pasos del proceso */
.mw-pasos { list-style: none; margin: 34px 0 10px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; counter-reset: paso; }
.mw-paso { position: relative; padding: 26px 18px 22px; text-align: center; border-radius: 14px; border: 1px solid rgba(224,183,63,.3);
  background: linear-gradient(170deg, rgba(15,95,59,.35), rgba(3,12,8,.7)); backdrop-filter: blur(6px); transition: transform .35s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .35s; }
.mw-paso:hover { transform: translateY(-6px); border-color: var(--o3); box-shadow: 0 20px 40px rgba(0,0,0,.45), 0 0 30px rgba(224,183,63,.18); }
.mw-paso::before { counter-increment: paso; content: "0" counter(paso); position: absolute; top: 10px; right: 14px; font: 500 26px/1 ${ff}, Georgia, serif; color: rgba(224,183,63,.22); }
.mw-paso > span { width: 54px; height: 54px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 50%; color: var(--o3); border: 1px solid var(--o2);
  background: radial-gradient(circle at 30% 25%, rgba(240,214,128,.25), rgba(3,12,8,.6)); box-shadow: 0 0 0 5px rgba(224,183,63,.08); transition: .35s; }
.mw-paso:hover > span { transform: rotate(-8deg) scale(1.08); background: var(--o2); color: #1a1405; }
.mw-paso b { display: block; font: 500 17px/1.2 ${ff}, Georgia, serif; color: #fbf6e6; margin-bottom: 6px; }
.mw-paso small { display: block; font-size: 12.5px; line-height: 1.55; color: #9fb1a5; }
.mw-paso + .mw-paso::after { content: ""; position: absolute; top: 52px; left: -17px; width: 18px; height: 1px; background: linear-gradient(90deg, transparent, var(--o2)); }

/* Contenedor del taller / separador entre fabricar y reparar */
.mw-atelier-sep { position: relative; z-index: 1; display: flex; align-items: center; gap: 18px; max-width: 1180px; margin: 36px auto 0; padding: 0 28px; color: var(--o2); font-size: 11px; letter-spacing: .3em; text-transform: uppercase; }
.mw-atelier-sep::before, .mw-atelier-sep::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(224,183,63,.55)); }
.mw-atelier-sep::after { background: linear-gradient(270deg, transparent, rgba(224,183,63,.55)); }
/* Taller de reparación (antes estaba dentro del catálogo) */
.mw button.mw-btn { cursor: pointer; font-family: inherit; background-color: transparent; }
.mw button.mw-btn.solid { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); }
.mw-rep { position: relative; z-index: 1; max-width: 1180px; margin: 28px auto 0; padding: 0 28px; display: grid; grid-template-columns: 1fr 1.15fr; gap: 20px; }
.mw-rep-info { padding: 32px 30px; border-radius: 24px; border: 1px solid rgba(224,183,63,.38); background: linear-gradient(160deg, #101c16, #070d0a); box-shadow: 0 24px 50px rgba(0,0,0,.45); }
.mw-rep-info h3 { font-size: clamp(26px, 3vw, 34px); color: #fbf6e6; }
.mw-rep-info > p { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: #aab6af; }
.mw-rep-pasos { list-style: none; margin: 24px 0; padding: 0; display: grid; gap: 18px; }
.mw-rep-pasos li { display: flex; gap: 14px; align-items: flex-start; }
.mw-rep-pasos li > b { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; font: 700 14px/1 system-ui, sans-serif; color: #1a1405; background: linear-gradient(135deg, var(--o3), var(--o2)); }
.mw-rep-pasos strong { display: block; font-size: 14.5px; color: #f4efdc; margin-bottom: 2px; }
.mw-rep-pasos span { font-size: 13px; line-height: 1.5; color: #9aa8a0; }
.mw-rep-tip { padding: 12px 14px; border-radius: 12px; border: 1px dashed rgba(224,183,63,.5); background: rgba(224,183,63,.06); font-size: 12.5px; line-height: 1.55; color: var(--o3); }
.mw-rep-srv { display: flex; flex-direction: column; padding: 32px 30px; border-radius: 24px; border: 1px solid rgba(190,200,194,.18); background: linear-gradient(160deg, rgba(15,95,59,.45), rgba(3,12,8,.8)); }
.mw-rep-srv h4 { font: 500 24px/1.2 ${ff}, Georgia, serif; color: #fbf6e6; margin: 0; }
.mw-rep-srv > p { margin: 8px 0 0; font-size: 13.5px; color: #aab6af; line-height: 1.55; }
.mw-rep-lista { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0 26px; }
.mw-rep-s { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; font-size: 13.5px; color: #dfe5e1; background: rgba(255,255,255,.045); border: 1px solid rgba(190,200,194,.22); transition: .3s; }
.mw-rep-s:hover { border-color: var(--o2); background: rgba(224,183,63,.09); transform: translateY(-3px); }
.mw-rep-s > span { flex: 0 0 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; color: var(--o3); border: 1px solid rgba(224,183,63,.55); background: rgba(3,12,8,.5); }
.mw-rep-meta { margin: 0 0 22px; padding: 0; list-style: none; display: grid; gap: 8px; font-size: 13px; color: #b9c4be; }
.mw-rep-meta li { display: flex; gap: 8px; align-items: center; } .mw-rep-meta svg { color: var(--o2); flex: 0 0 auto; }
.mw-rep-srv .mw-btn { margin-top: auto; width: 100%; min-height: 54px; }
#personalizado, #taller { color: #f4efdc; scroll-margin-top: 68px; }
#personalizado h2, #personalizado h3, #taller h2, #taller h3 { color: #fbf6e6; }
#personalizado small, #taller small { color: var(--o2); }
#personalizado p, #taller p { color: #d3ddd6; }
#personalizado .mw-btn, #taller .mw-btn { color: #f4efdc !important; } #personalizado .mw-btn.solid, #taller .mw-btn.solid { color: #1a1405 !important; }
#taller input, #taller select, #taller textarea { transition: border-color .25s, box-shadow .25s; }
#taller input:focus, #taller select:focus, #taller textarea:focus { outline: none; border-color: var(--o2); box-shadow: 0 0 0 3px rgba(224,183,63,.22); }

/* ───────── 8. BANNER VITRINA: la caja completa girando como en exhibición ───────── */
.mw-ban { position: relative; isolation: isolate; overflow: hidden; color: #f4efdc;
  background: radial-gradient(ellipse 50% 70% at 75% 50%, rgba(15,95,59,.75), transparent 70%), linear-gradient(120deg, #030c08, #06241a 60%, #030c08); }
.mw-ban::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--o2), transparent); }
.mw-ban-in { max-width: 1180px; margin: 0 auto; padding: 84px 28px; display: grid; grid-template-columns: 1fr 1.1fr; gap: 48px; align-items: center; }
.mw-ban-txt { max-width: 480px; }
.mw-ban h3 { font-size: clamp(28px, 4vw, 46px); line-height: 1.1; letter-spacing: .04em; text-transform: uppercase; margin: 16px 0 14px; color: #fbf6e6; text-shadow: 0 4px 30px rgba(0,0,0,.5); }
.mw-ban p { margin: 0 0 26px; font-size: 14.5px; line-height: 1.65; color: #d3ddd6; }
.mw-ban-cta { display: flex; gap: 12px; flex-wrap: wrap; }
.mw-btn-ig { gap: 9px; }

.mw-vitrina { position: relative; display: grid; place-items: center; perspective: 1300px; padding: 20px 0 34px; }
.mw-vit-halo { position: absolute; width: 78%; aspect-ratio: 1; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, rgba(240,214,128,.34), rgba(224,183,63,.08) 45%, transparent 70%); filter: blur(18px); animation: mw-halo 5s ease-in-out infinite; }
@keyframes mw-halo { 0%,100% { opacity: .7; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.05); } }
.mw-vit-anillo { position: absolute; width: 86%; aspect-ratio: 1; border-radius: 50%; z-index: 0; border: 1px dashed rgba(224,183,63,.3); animation: mw-gira 40s linear infinite; }
@keyframes mw-gira { to { transform: rotate(360deg); } }
.mw-vit-stage { position: relative; z-index: 1; display: inline-block; max-width: min(100%, 560px); line-height: 0; transform-style: preserve-3d; animation: mw-giro 14s ease-in-out infinite; }
@keyframes mw-giro { 0% { transform: rotateY(-16deg) rotateX(3deg); } 50% { transform: rotateY(16deg) rotateX(-1deg); } 100% { transform: rotateY(-16deg) rotateX(3deg); } }
.mw-vit-stage img { display: block; width: auto; max-width: 100%; height: auto; max-height: 480px; border-radius: 16px; border: 1px solid rgba(224,183,63,.65);
  box-shadow: 0 30px 60px rgba(0,0,0,.6), 0 0 0 6px rgba(224,183,63,.08), 0 0 50px rgba(224,183,63,.2); background: transparent; }
.mw-vit-stage::after { content: ""; position: absolute; inset: 0; border-radius: 16px; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,244,199,.22) 50%, transparent 65%); background-size: 250% 100%; animation: mw-reflejo 6s ease-in-out infinite; }
@keyframes mw-reflejo { 0% { background-position: 130% 0; } 60%, 100% { background-position: -80% 0; } }
.mw-vit-piso { position: absolute; bottom: 4px; width: 66%; height: 26px; border-radius: 50%; z-index: 0; background: radial-gradient(ellipse, rgba(0,0,0,.65), transparent 70%); filter: blur(4px); animation: mw-sombra 14s ease-in-out infinite; }
@keyframes mw-sombra { 0%,100% { transform: scaleX(.9); } 50% { transform: scaleX(1.05); } }

/* ───────── 9. PIE ───────── */
.mw-pie { background: var(--vd); color: #f4efdc; border-top: 1px solid rgba(224,183,63,.25); scroll-margin-top: 68px; }
.mw-pie .mw-wrap { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 30px; padding-top: 48px; padding-bottom: 28px; }
.mw-pie ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; color: #a9b8ae; }
.mw-pie ul a { transition: color .2s; } .mw-pie ul a:hover { color: var(--o3); }
.mw-pie p { font-size: 13px; color: #a9b8ae; line-height: 1.6; margin: 14px 0 0; max-width: 260px; }
.mw-wa { display: inline-flex; border: 1px solid var(--o2); color: #f4efdc !important; padding: 10px 18px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; margin-top: 14px; transition: .25s; }
.mw-wa:hover { background: var(--o2); color: #1a1405 !important; }
.mw-copy { border-top: 1px solid rgba(255,255,255,.08); padding: 16px 28px; text-align: center; font-size: 12px; color: #6f8277; }
.pl-fijo h5 { margin: 0 0 14px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); }
.mw-ig { display: inline-flex; align-items: center; gap: 10px; margin-top: 16px; min-height: 44px; padding: 0 16px 0 12px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #f0d680 !important;
  border: 1px solid rgba(224,183,63,.55); background: rgba(224,183,63,.06); transition: .2s; -webkit-tap-highlight-color: transparent; }
.mw-ig:hover { background: var(--o2); color: #1a1405 !important; }
.pl { position: relative; }
.pl-chk { position: absolute; opacity: 0; pointer-events: none; }
.pl-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 0 14px; cursor: default;
  font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); }
.pl-chev { display: none; }

/* Guía de tallas plegable (móvil) */
.gt-chk { position: absolute; opacity: 0; pointer-events: none; }
.gt-h { display: none; }

/* ───────── 10. RESPONSIVE ───────── */
@media (max-width: 1060px) {
  .mw-nav { display: none; }
  .mw-head .mw-wrap { grid-template-columns: 1fr auto 1fr; gap: 10px; }
  .mw-head .mw-marca { grid-column: 1; justify-self: start; }
  .mw-head .mw-marca span { display: none; }
  .mw-head .mw-logo { width: 40px; height: 40px; }
  .mw-head .mw-nombre { display: block; grid-column: 2; justify-self: center; text-align: center; max-width: 58vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-family: ${ff}, Georgia, serif; font-weight: 500; font-size: 18px; letter-spacing: .12em; text-transform: uppercase;
    color: #f0d680 !important; text-shadow: 0 0 18px rgba(224,183,63,.35), 0 1px 2px rgba(0,0,0,.6); }
  .mw-head .mw-iconos { grid-column: 3; }
}
@media (max-width: 960px) {
  .mw-ben .mw-wrap { grid-template-columns: repeat(2, 1fr); gap: 18px 0; }
  .mw-b:nth-child(3) { border-left: 0; }
  .mw-pie .mw-wrap { grid-template-columns: 1fr 1fr; }
  .mw-ban-in { grid-template-columns: 1fr; gap: 28px; padding: 64px 28px; }
  .mw-ban-txt { max-width: 560px; }
  .mw-pasos { grid-template-columns: repeat(2, 1fr); }
  .mw-paso + .mw-paso::after { display: none; }
  .mw-rep { grid-template-columns: 1fr; }
}
@media (max-width: 860px) {
  .mw-copy { padding-bottom: calc(16px + 78px + env(safe-area-inset-bottom)); }
  .gt { position: relative; padding: 20px 16px 6px; scroll-margin-top: 68px; }
  .gt-h { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 70px; padding: 14px 18px; border-radius: 16px; cursor: pointer; color: #f4efdc;
    background: linear-gradient(135deg, #0b4a2e, #06241a); border: 1px solid rgba(224,183,63,.4); box-shadow: 0 8px 22px rgba(3,12,8,.18); -webkit-tap-highlight-color: transparent; }
  .gt-h small { display: block; font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); margin-bottom: 6px; }
  .gt-h b { display: block; font-family: ${ff}, Georgia, serif; font-weight: 500; font-size: 19px; line-height: 1.2; }
  .gt-chev { flex: 0 0 auto; color: var(--o2); transition: transform .25s ease; }
  .gt-chk:checked ~ .gt-h .gt-chev { transform: rotate(180deg); }
  .gt-chk:focus-visible ~ .gt-h { outline: 2px solid var(--o2); outline-offset: 2px; }
  .gt-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s ease; }
  .gt-chk:checked ~ .gt-b { grid-template-rows: 1fr; }
  .gt-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .3s; }
  .gt-chk:checked ~ .gt-b .gt-in { visibility: visible; transition-delay: 0s; }
}
@media (max-width: 600px) {
  .mw-wrap { padding: 0 16px; } .mw-head .mw-wrap { height: 58px; }
  .mw-head .mw-nombre { font-size: 16px; letter-spacing: .08em; max-width: 52vw; }
  .mw-head .mw-logo { width: 36px; height: 36px; }
  .mw-hero { min-height: max(72svh, 640px); }
  .mw .mw-hero-in { padding-top: 32px; padding-bottom: 28px; }
  .mw-hero-logo { display: none; }
  .mw-hero p { font-size: 13.5px; margin-bottom: 22px; }
  .mw .hv { position: absolute !important; inset: auto !important; top: 30px !important; right: 0 !important; width: 64% !important; height: auto !important; aspect-ratio: 478 / 850; object-fit: contain !important; opacity: 0; transition: opacity 1.8s ease; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 32%, #000 100%), linear-gradient(180deg, transparent 0%, #000 14%, #000 78%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0%, #000 32%, #000 100%), linear-gradient(180deg, transparent 0%, #000 14%, #000 78%, transparent 100%);
    -webkit-mask-composite: source-in; mask-composite: intersect; }
  .mw .hv.on { opacity: 1; }
  .mw-btn { flex: 1; padding: 15px 16px; }
  .mw-oro-bar { padding: 0 16px 18px; }
  .mw-oro-in { padding: 12px 14px; } .mw-oro-in > span { width: 100%; }
  .mw-oro-in div { width: 100%; justify-content: space-between; } .mw-oro-in div p { padding: 0 10px; } .mw-oro-in div p:first-child { padding-left: 0; } .mw-oro-in b { font-size: 15px; }

  .mw-ben .mw-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 16px; padding-bottom: 16px; }
  .mw-b, .mw-b + .mw-b, .mw-b:nth-child(3) { flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; gap: 8px; padding: 14px 10px 12px; border: 1px solid rgba(176,141,60,.4); border-radius: 14px; background: rgba(255,255,255,.55); }
  .mw-b > span { width: 40px; height: 40px; }
  .mw-b b { font-size: 12.5px; line-height: 1.25; }
  .mw-b small { display: block; margin-top: 3px; font-size: 11px; line-height: 1.35; }

  .mw-sec { padding-top: 44px; } .mw .mw-dark { padding: 48px 0 44px; }
  .mw-dark .mc-card .mc-nom { font-size: 17px !important; } .mw-dark .mc-card .mc-precio b { font-size: 18px; }

  .mw-atelier { padding: 54px 0 24px; }
  .mw-pasos { gap: 10px; margin-top: 26px; }
  .mw-paso { padding: 22px 10px 16px; } .mw-paso > span { width: 46px; height: 46px; } .mw-paso b { font-size: 15px; } .mw-paso small { font-size: 11.5px; }
  .mw-atelier-sep { padding: 0 16px; letter-spacing: .2em; }
  #personalizado, #taller { scroll-margin-top: 58px; }
  #personalizado .mw-btn, #taller .mw-btn { min-height: 48px; }

  .mw-ban-in { padding: 48px 16px 40px; }
  .mw-ban-cta .mw-btn { flex: 1 1 100%; }
  .mw-vit-stage img { max-height: 340px; }

  .mw-rep { padding: 0 16px; gap: 14px; }
  .mw-rep-info, .mw-rep-srv { padding: 24px 20px; border-radius: 20px; }
  .mw-rep-lista { grid-template-columns: 1fr 1fr; gap: 10px; }
  .mw-rep-s { flex-direction: column; text-align: center; gap: 8px; padding: 14px 8px; font-size: 12.5px; }

  .mw-col { padding-top: 48px; }
  .mw-bento { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 150px; gap: 10px; }
  .mw-tile { border-radius: 20px; }
  .mw-tile-lbl { left: 10px; bottom: 10px; padding: 8px 12px; border-radius: 13px; }
  .mw-tile-go { opacity: 1; transform: none; width: 34px; height: 34px; top: 10px; right: 10px; }
  .t-a { grid-column: span 2; grid-row: span 2; } .t-b, .t-d { grid-column: span 1; grid-row: span 1; } .t-c { grid-column: span 1; grid-row: span 2; }
  .t-w12 { grid-column: span 2; } .t-w6, .t-w4 { grid-column: span 1; grid-row: span 2; }

  .mw-pie .mw-wrap { grid-template-columns: 1fr; gap: 0; padding-top: 32px; }
  .mw-pie-marca { padding-bottom: 22px; }
  .pl-fijo { border-top: 1px solid rgba(255,255,255,.1); padding: 18px 0 20px; }
  .pl-fijo h5 { margin-bottom: 12px; }
  .pl-fijo ul { display: flex; flex-wrap: wrap; gap: 8px; }
  .pl-fijo ul a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); color: #d6e0d9; font-size: 13px; }
  .mw-ig { width: 100%; justify-content: center; }
  .pl { border-top: 1px solid rgba(255,255,255,.1); }
  .pl:last-child { border-bottom: 1px solid rgba(255,255,255,.1); }
  .pl-h { padding: 0; min-height: 52px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .pl-chk:focus-visible ~ .pl-h { outline: 2px solid var(--o2); outline-offset: 2px; }
  .pl-chev { display: block; transition: transform .25s ease; }
  .pl-chk:checked ~ .pl-h .pl-chev { transform: rotate(180deg); }
  .pl-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .28s ease; }
  .pl-chk:checked ~ .pl-b { grid-template-rows: 1fr; }
  .pl-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .28s; }
  .pl-chk:checked ~ .pl-b .pl-in { visibility: visible; transition-delay: 0s; padding-bottom: 16px; }
}

/* ───────── 11. MOVIMIENTO REDUCIDO ───────── */
@media (prefers-reduced-motion: reduce) {
  .gt-b, .gt-chev, .gt-in, .pl-b, .pl-chev, .pl-in { transition: none; }
  .mw-hero-txt > *, .mw-hero-logo img, .mw-oroTxt, .mw-spk i, .mw-btn.solid::after, .mw-marq-t,
  .mw-vit-stage, .mw-vit-stage::after, .mw-vit-halo, .mw-vit-anillo, .mw-vit-piso, .mw-oro-in > span::before,
  .mw-dark .mc-card, .mw-tile, .mw-dark .mc-grupo-tit i { animation: none !important; }
}
`;

/* ═══════════════════════════════════════════════
   PÁGINA
   ═══════════════════════════════════════════════ */
/** Clase del mosaico según la posición (llena las filas sin dejar huecos) */
function claseTile(i: number, n: number) {
  const completos = n - (n % 4);
  if (i < completos) return `t-${'abcd'[i % 4]}`;
  const r = n % 4;
  return r === 1 ? 't-w12' : r === 2 ? 't-w6' : 't-w4';
}

function ColeccionesBento({ cats }: { cats: { n: string; c: number; foto: string }[] }) {
  return (
    <section className="mw-col" id="categorias">
      <div className="mw-wrap">
        <div className="mw-tit c"><small>Explora por categoría</small><h3>Nuestras colecciones</h3><i /></div>
        <div className="mw-bento">
          {cats.map((c, i) => (
            <a key={c.n} className={`mw-tile ${claseTile(i, cats.length)}`} href={`#cat-${slugCat(c.n)}`} aria-label={`${c.n}, ${c.c} piezas`}>
              {c.foto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.foto} alt="" loading="lazy" />
                : <span className="mw-tile-vacio"><Ic n="gem" s={56} /></span>}
              <span className="mw-tile-go"><Ic n="arrow" s={16} /></span>
              <span className="mw-tile-lbl"><b>{c.n}</b><small>{c.c} {c.c === 1 ? 'pieza' : 'piezas'}</small></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const FRANJA = ['Oro certificado', 'Garantía de por vida', 'Diseño a medida', 'Reparación y restauración', 'Grabados personalizados', 'Envíos asegurados'];
const PASOS: { i: keyof typeof P; t: string; d: string }[] = [
  { i: 'pencil', t: 'Diseño', d: 'Cuéntanos tu idea o envía una foto de referencia.' },
  { i: 'gem', t: 'Fabricación', d: 'Elaboramos tu joya en oro certificado, pieza por pieza.' },
  { i: 'tool', t: 'Reparación', d: 'Soldaduras, ajustes de talla, engastes y restauración.' },
  { i: 'truck', t: 'Entrega', d: 'Recíbela en tu puerta, con seguro y garantía.' },
];

export default async function TiendaPublica({ params }: Params) {
  const { slug } = await params;
  const f = await leerConfigPublica(slug).catch(() => null);
  if (!f) notFound();
  const crudas = (await leerPrendasPublicas().catch(() => [])) as unknown[];
  const PRENDAS = normalizarPrendas(crudas, f as unknown as Record<string, unknown>);
  const PROMOS = await promosActivas();
  const HANS = await leerHansPublico().catch(() => []);

  const nombre = MARCA;
  const lema = f.encabezado || 'Joyas en oro certificado, creadas para celebrar tus momentos más preciosos.';
  const ig = instagramUser(f.instagram);
  const dom = cop(f.domicilio);
  const wa = waLink(f.telefono);
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO_JKS} alt={nombre} className="mw-logo" />
  );

  const videoUrl = String((f as unknown as Record<string, unknown>).video_url ?? '').trim() || VIDEO_HERO;

  /* Categorías reales con la foto de su primera pieza */
  const cm = new Map<string, { n: string; c: number; foto: string }>();
  for (const p of PRENDAS) {
    const k = p.categoria.trim() || 'Otras piezas';
    const e = cm.get(k) ?? { n: k, c: 0, foto: '' };
    e.c++;
    if (!e.foto) {
      const ff = p.variantes.find((v) => v.fotos.length)?.fotos[0];
      if (ff) { try { e.foto = rutaFoto(ff) || ff; } catch { e.foto = ff; } }
    }
    cm.set(k, e);
  }
  const cats = Array.from(cm.values());

  return (
    <div className="mw">
      <style>{css(serif.style.fontFamily)}</style>

      {/* ───── Cabecera ───── */}
      <header className="mw-head">
        <div className="mw-wrap">
          <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
          <a className="mw-nombre" href="#inicio">{nombre}</a>
          <nav className="mw-nav">
            <a href="#inicio">Inicio</a>
            {PROMOS.length > 0 && <a href="#promociones">Promociones</a>}
            {cats.length > 0 && <a href="#categorias">Colecciones</a>}
            <a href="#catalogo">Catálogo</a>
            <a href="#hans">Hans</a>
            <a href="#atelier">Fabricación</a>
            <a href="#taller">Reparación</a>
            <a href="#tallas-bloque">Tallas</a>
            <a href="#oro">Precio del oro</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="mw-iconos"><CarritoHeader /></div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="mw-hero" id="inicio">
        <HeroVideo src={videoUrl} />
        <div className="mw-shade" />
        <Chispas />
        <div className="mw-wrap mw-hero-in">
          <div className="mw-hero-txt">
            <div className="mw-hero-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_JKS} alt={nombre} />
            </div>
            <span className="mw-tag">Oro certificado</span>
            <h2>Hechas para<br /><span className="mw-oroTxt">brillar siempre</span></h2>
            <p>{lema}</p>
            <div className="mw-cta">
              <a className="mw-btn solid" href="#catalogo">Ver catálogo</a>
              <a className="mw-btn" href="#atelier">Diseña tu joya</a>
            </div>
          </div>
        </div>
        <div className="mw-oro-bar" id="oro">
          <div className="mw-oro-in">
            <span>Precio del oro hoy</span>
            <div>
              <p style={{ margin: 0 }}><small>Oro 24K</small><b>{cop(f.p24) ?? '—'}</b><em>/ g</em></p>
              <p style={{ margin: 0 }}><small>Oro 18K</small><b>{cop(f.p18) ?? '—'}</b><em>/ g</em></p>
              <p style={{ margin: 0 }}><small>Oro 14K</small><b>{cop(f.p14) ?? '—'}</b><em>/ g</em></p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Beneficios + franja de lujo ───── */}
      <section className="mw-ben">
        <div className="mw-wrap">
          <div className="mw-b"><span><Ic n="gem" s={22} /></span><div><b>Oro certificado</b><small>Piezas auténticas</small></div></div>
          <div className="mw-b"><span><Ic n="shield" s={22} /></span><div><b>Garantía de por vida</b><small>Respaldo en cada joya</small></div></div>
          <div className="mw-b"><span><Ic n="truck" s={22} /></span><div><b>Domicilio {dom ? `desde ${dom}` : 'a tu puerta'}</b><small>{f.cobertura || f.horario || 'Consulta tu zona'}</small></div></div>
          <div className="mw-b"><span><Ic n="headset" s={22} /></span><div><b>Atención directa</b><small>Te respondemos por WhatsApp</small></div></div>
        </div>
      </section>
      <div className="mw-marq" aria-hidden>
        <div className="mw-marq-t">
          {[0, 1].map((k) => (
            <span key={k}>
              {FRANJA.map((t) => (<span key={t} style={{ paddingRight: 0 }}>{t}<Ic n="spark" s={11} /></span>))}
            </span>
          ))}
        </div>
      </div>

      {/* ───── Promociones ───── */}
      {PROMOS.length > 0 && (
        <section className="mw-sec" id="promociones" style={{ paddingBottom: 56 }}>
          <div className="mw-wrap">
            <PromocionesPublicas promos={PROMOS} wa={wa} logo={LOGO_JKS} />
          </div>
        </section>
      )}

      {/* ───── Colecciones (mosaico) + Catálogo, sobre fondo gris ───── */}
      <div className="mw-gris">
      {cats.length > 0 && <ColeccionesBento cats={cats} />}

      <section className="mw-sec mw-dark" id="catalogo">
        <div className="mw-wrap">
          <div className="mw-tit"><small>Los favoritos</small><h3>Nuestras piezas más amadas</h3><i /></div>
          {PRENDAS.length
            ? <CatalogoPublico prendas={PRENDAS} wa={wa} logo={LOGO_JKS} tienda={nombre} />
            : <p className="mw-aviso">Muy pronto: nuestro catálogo en línea.</p>}
        </div>
      </section>
      </div>

      {/* ───── Hans (mayor y menudeo) ───── */}
      <HansSeccion items={HANS} wa={wa} />

      {/* ───── Guía de tallas ───── */}
      <Colapsa id="tallas" sub="Guía de tallas" titulo="Encuentra tu medida ideal">
        <GuiaTallas wa={wa} nombre={nombre} />
      </Colapsa>

      {/* ───── TALLER: fabricación + reparación (todo junto) ───── */}
      <section className="mw-atelier" id="atelier">
        <Chispas />
        <div className="mw-wrap">
          <div className="mw-tit c">
            <small>Taller de joyería</small>
            <h3>Fabricación y reparación <span className="mw-oroTxt">a tu medida</span></h3>
            <i />
            <p>Creamos tu joya desde cero o devolvemos la vida a esa pieza que tanto quieres. Todo en un mismo taller, con acabado de alta joyería.</p>
          </div>
          <ol className="mw-pasos">
            {PASOS.map((p) => (
              <li className="mw-paso" key={p.t}>
                <span><Ic n={p.i} s={24} /></span>
                <b>{p.t}</b>
                <small>{p.d}</small>
              </li>
            ))}
          </ol>
          <div className="mw-cta" style={{ justifyContent: 'center', marginTop: 26 }}>
            <button type="button" className="mw-btn solid" data-cotizar="personalizado">Cotizar joya a medida</button>
            <button type="button" className="mw-btn" data-cotizar="reparacion">Cotizar reparación</button>
          </div>
        </div>

        <div className="mw-atelier-sep"><span>Fabricación personalizada</span></div>
        <PersonalizacionTrabajos wa={wa} nombre={nombre} />

      </section>

      {/* Taller de reparación: vuelve a su sección original (con su video hero y su formulario) */}
      <TallerSeccion wa={wa} marca={nombre} direccion={f.direccion} horario={f.horario} />

      {/* ───── Banner vitrina: caja completa con giro de exhibición ───── */}
      <section className="mw-ban" aria-label="Joyas que cuentan tu historia">
        <Chispas />
        <div className="mw-ban-in">
          <div className="mw-ban-txt">
            <span className="mw-tag">Cada joya, una historia</span>
            <h3>Joyas que cuentan <span className="mw-oroTxt">tu historia</span></h3>
            <p>Oro certificado, elaborado con dedicación. Escríbenos y te asesoramos sin compromiso.</p>
            <div className="mw-ban-cta">
              {wa !== '#' && <a className="mw-btn solid" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
              <a className="mw-btn mw-btn-ig" href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><Ic n="ig" s={16} /> Instagram</a>
            </div>
          </div>
          <div className="mw-vitrina">
            <div className="mw-vit-halo" />
            <div className="mw-vit-anillo" />
            <div className="mw-vit-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FOTO_BANNER} alt={`Joya de ${nombre}`} loading="lazy" />
            </div>
            <div className="mw-vit-piso" />
          </div>
        </div>
      </section>

      {/* ───── Pie ───── */}
      <footer className="mw-pie" id="contacto">
        <div className="mw-wrap">
          <div className="mw-pie-marca">
            <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
            <p>{lema}</p>
          </div>
          <div className="pl-fijo">
            <h5>Tienda</h5>
            <ul>{cats.length ? cats.map((c) => <li key={c.n}><a href={`#cat-${slugCat(c.n)}`}>{c.n}</a></li>) : <li>Próximamente</li>}</ul>
            <a className="mw-ig" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram de la tienda">
              <Ic n="ig" s={18} /><span>Síguenos en Instagram</span>
            </a>
          </div>
          <Pl id="entregas" titulo="Entregas">
            <ul>
              <li>Domicilio: {dom ?? 'por definir'}</li>
              <li>{f.horario || 'Horario por definir'}</li>
              <li>{f.cobertura || 'Cobertura por definir'}</li>
              {f.seguro && <li>Seguro por envío: {f.seguro}%</li>}
            </ul>
          </Pl>
          <Pl id="contacto" titulo="Contacto">
            <ul>
              {f.telefono && <li>WhatsApp {f.telefono}</li>}
              {ig && <li><a href={instagramUrl(f.instagram)} target="_blank" rel="noopener noreferrer">{ig}</a></li>}
              {f.direccion && <li><Ic n="pin" s={13} /> {f.direccion}</li>}
            </ul>
            <a className="mw-wa" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
          </Pl>
        </div>
        <div className="mw-copy">© {nombre}. Todos los derechos reservados.</div>
      </footer>

      <CotizacionModal marca={nombre} wa={wa} />

      <WhatsAppFlotante wa={wa} tienda={nombre} />

      <MenuInferior
        wa={wa}
        instagram={INSTAGRAM}
        promos={PROMOS.length > 0}
        colecciones={cats.length > 0}
      />
    </div>
  );
}