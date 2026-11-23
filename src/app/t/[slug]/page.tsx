// 📁 RUTA: src/app/t/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import { leerConfigPublica } from '@/lib/configuracion';
import { leerPrendasPublicas } from '@/lib/prendas';
import CatalogoPublico, { CarritoHeader, type PrendaP, type VarianteP } from './CatalogoPublico';
import HeroVideo from './HeroVideo';
import PromocionesPublicas, { type PromoP } from './PromocionesPublicas';
import CarruselColecciones from './CarruselColecciones';
import GuiaTallas from './GuiaTallas';
import PersonalizacionTrabajos from './PersonalizacionTrabajos';
import MenuInferior from './MenuInferior';
import WhatsAppFlotante from './WhatsAppFlotante';
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

/** Nombre de la marca (se usa en el encabezado, el pie y los mensajes de WhatsApp) */
const MARCA = "Karen Sploker's";

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
/** Enlace de WhatsApp a partir del teléfono guardado en Configuración de la tienda */
const waLink = (tel?: string) => {
  const d = (tel || '').replace(/\D/g, '');
  return d ? `https://wa.me/${d.length <= 10 ? '57' + d : d}` : '#';
};

/* ---------- Prendas del Sheet → datos para las tarjetas (SIN CAMBIOS) ---------- */
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

/* ---------- Promociones activas ---------- */
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

/* ---------- Iconos ---------- */
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
};
function Ic({ n, s = 20 }: { n: keyof typeof P; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[n]}</svg>
  );
}

/** Pega aquí el enlace de Google Drive (o la URL .mp4) del video del hero. También puedes poner la columna video_url en Configuración. */
const VIDEO_HERO = '/sprokel.mp4';
/** Instagram de la tienda */
const INSTAGRAM = 'https://www.instagram.com/joyeria_jks_luxury';
/** Foto del banner antes del pie (archivo en /public) */
const FOTO_BANNER = '/pieza13.jpeg';
/** Logo de la marca (archivo en /public) */
const LOGO_JKS = '/logo-jks.jpeg';
/** Bloque plegable del pie (solo CSS, sin JavaScript): en móvil se abre/cierra, en escritorio siempre se ve abierto */
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
/** Sección que en móvil se muestra como una tarjeta plegable (solo CSS). En escritorio se ve normal, siempre abierta. */
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
const slugCat = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function TiendaPublica({ params }: Params) {
  const { slug } = await params;
  const f = await leerConfigPublica(slug).catch(() => null);
  if (!f) notFound();
  const crudas = (await leerPrendasPublicas().catch(() => [])) as unknown[];
  const PRENDAS = normalizarPrendas(crudas, f as unknown as Record<string, unknown>);
  const PROMOS = await promosActivas();

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
      <style>{`
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #030c08; }
        .mw { --v:#0b4a2e; --v2:#0f5f3b; --vd:#030c08; --vc:#e7efe9; --vm:#cfe0d5; --o:#b08d3c; --o2:#e0b73f; --o3:#f0d680;
          --crema:#f6f4ee; --tx:#14201a; --serif: ${serif.style.fontFamily};
          min-height: 100vh; background: var(--crema); color: var(--tx); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .mw * { box-sizing: border-box; }
        .mw h1,.mw h2,.mw h3,.mw .mw-marca span { font-family: ${serif.style.fontFamily}, Georgia, serif; font-weight: 500; margin: 0; }
        .mw a { color: inherit; text-decoration: none; }
        .mw-wrap { max-width: 1180px; margin: 0 auto; padding: 0 28px; }
        .mw-logo { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; background: var(--vd); border: 1.5px solid var(--o2); box-shadow: 0 0 0 3px rgba(224,183,63,.14), 0 4px 14px rgba(0,0,0,.4); flex-shrink: 0; }
        .mw-pie .mw-logo { width: 64px; height: 64px; }
        .mw .mc-precio b, .mw .mw-oro-bar b, .mw .mc-badge, .mw .mc-tot b, .mw .mc-it b { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif !important; font-weight: 700 !important; font-variant-numeric: lining-nums tabular-nums; }

        /* Cabecera */
        .mw-head { background: rgba(3,12,8,.92); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(224,183,63,.16); position: sticky; top: 0; z-index: 20; }
        .mw-head .mw-wrap { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; height: 68px; }
        .mw-marca { display: flex; align-items: center; gap: 12px; font-size: 15px; letter-spacing: .18em; text-transform: uppercase; color: #f4efdc; min-width: 0; }
        .mw-marca span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mw-nav { display: flex; gap: 26px; font-size: 12px; letter-spacing: .1em; color: #c5d0c8; }
        .mw-nav a { padding: 6px 0; border-bottom: 1px solid transparent; transition: .2s; white-space: nowrap; }
        .mw-nav a:hover { color: var(--o2); border-color: var(--o2); }
        .mw-iconos { display: flex; justify-content: flex-end; align-items: center; }
        .mw-nombre { display: none; }
        .mw .mc-hbtn { color: var(--o2); }

        /* Hero con video */
        .mw-hero { position: relative; display: flex; flex-direction: column; min-height: min(92vh, 820px); overflow: hidden; color: #f4efdc; scroll-margin-top: 68px;
          background: radial-gradient(ellipse 60% 70% at 20% 60%, rgba(15,95,59,.8), transparent 70%), linear-gradient(120deg, #030c08, #082a1b 60%, #0b4a2e); }
        .mw .hv { position: absolute; top: 0; right: 0; height: 100%; width: 58%; object-fit: cover; object-position: 50% 55%; opacity: 0; transition: opacity 1.8s ease;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 28%); mask-image: linear-gradient(90deg, transparent 0%, #000 28%); }
        .mw .hv.on { opacity: 1; }
        .mw-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3,12,8,.9) 0%, rgba(3,12,8,.65) 35%, rgba(3,12,8,0) 65%), linear-gradient(0deg, rgba(3,12,8,.85) 0%, transparent 25%); }
        .mw-hero-in { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; width: 100%; padding-top: 64px; padding-bottom: 64px; }
        .mw .mw-hero-in { max-width: none; margin: 0; padding-left: clamp(24px, 6vw, 96px); padding-right: 24px; }
        .mw-hero-txt { max-width: 560px; }
        .mw-hero-txt > * { animation: mw-up 1s cubic-bezier(.2,.7,.2,1) both; }
        .mw-hero-txt > :nth-child(2) { animation-delay: .1s; } .mw-hero-txt > :nth-child(3) { animation-delay: .2s; } .mw-hero-txt > :nth-child(4) { animation-delay: .3s; } .mw-hero-txt > :nth-child(5) { animation-delay: .4s; }
        @keyframes mw-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .mw-tag { display: inline-flex; align-items: center; gap: 14px; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: var(--o2); }
        .mw-tag::before { content: ""; width: 36px; height: 1px; background: var(--o2); }
        .mw-hero h2 { font-size: clamp(34px, 4.6vw, 64px); line-height: 1.06; letter-spacing: .05em; text-transform: uppercase; margin: 22px 0 24px; color: #fbf6e6; text-shadow: 0 4px 30px rgba(0,0,0,.45); }
        .mw-hero p { color: #d3ddd6; font-size: 14.5px; line-height: 1.65; max-width: 400px; margin: 0 0 28px; padding-left: 14px; border-left: 2px solid var(--o2); }
        .mw-cta { display: flex; gap: 14px; flex-wrap: wrap; }
        .mw-btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(224,183,63,.7); color: #f4efdc !important; padding: 15px 30px; font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; transition: .25s; }
        .mw-btn:hover { background: rgba(224,183,63,.14); border-color: var(--o2); }
        .mw-btn.solid { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; border-color: transparent; }
        .mw-btn.solid:hover { filter: brightness(1.08); }
        .mw-oro-bar { position: relative; z-index: 1; width: 100%; max-width: none; padding: 0; background: rgba(3,12,8,.6); backdrop-filter: blur(10px); border-top: 1px solid rgba(224,183,63,.3); scroll-margin-top: 68px; }
        .mw-oro-in { max-width: 1180px; margin: 0 auto; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .mw-oro-in > span { font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--o2); }
        .mw-oro-in div { display: flex; gap: 36px; }
        .mw-oro-in small { display: block; font-size: 10.5px; letter-spacing: .14em; color: #8fa397; margin-bottom: 2px; }
        .mw-oro-in b { font-size: 19px; color: var(--o3); } .mw-oro-in em { font-style: normal; font-size: 11px; color: #8fa397; margin-left: 4px; }

        /* Beneficios: franja beige con divisores */
        .mw-ben { background: linear-gradient(180deg, #f3ecdc, #ece3cf); border-bottom: 1px solid #ddd1b0; }
        .mw-ben .mw-wrap { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; padding-top: 22px; padding-bottom: 22px; }
        .mw-b { display: flex; gap: 14px; align-items: center; padding: 0 18px; }
        .mw-b + .mw-b { border-left: 1px solid rgba(176,141,60,.35); }
        .mw-b > span { width: 42px; height: 42px; display: grid; place-items: center; color: var(--v); flex-shrink: 0; border: 1px solid rgba(176,141,60,.5); border-radius: 50%; background: rgba(255,255,255,.4); }
        .mw-b b { display: block; font-size: 13px; } .mw-b small { color: #6b7a72; font-size: 12px; }

        /* Logo en el hero */
        .mw-hero-logo { margin: 0 0 24px 7px; }
        .mw-hero-logo img { display: block; width: clamp(96px, 9vw, 132px); aspect-ratio: 1; border-radius: 50%; object-fit: cover; background: var(--vd); border: 2px solid var(--o2);
          box-shadow: 0 0 0 6px rgba(224,183,63,.14), 0 0 0 7px rgba(224,183,63,.38), 0 14px 34px rgba(0,0,0,.5); animation: mw-flota 7s ease-in-out infinite; }
        @keyframes mw-flota { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

        .mw-sec { padding: 64px 0 4px; scroll-margin-top: 68px; }
        .mw-tit { margin-bottom: 26px; }
        .mw-tit small { display: block; font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: var(--o); margin-bottom: 8px; }
        .mw-tit h3 { font-size: clamp(28px, 3.4vw, 38px); color: var(--v); letter-spacing: .02em; }
        .mw-tit i { display: block; width: 64px; height: 2px; background: linear-gradient(90deg, var(--o2), transparent); margin-top: 14px; }
        .mw-tit.c { text-align: center; }
        .mw-tit.c i { margin: 14px auto 0; background: linear-gradient(90deg, transparent, var(--o2), transparent); }

        /* Catálogo oscuro */
        .mw .mw-dark { padding: 64px 0 56px; color: #f4efdc; margin-top: 0;
          background: radial-gradient(ellipse 50% 40% at 0% 0%, rgba(15,95,59,.55), transparent 70%), radial-gradient(ellipse 45% 35% at 100% 55%, rgba(224,183,63,.12), transparent 70%), linear-gradient(180deg, #030c08, #06241a 50%, #030c08); }
        .mw-dark .mw-tit h3 { color: #f4efdc; }
        .mw-dark .mc-chip { background: transparent; border-color: rgba(224,183,63,.4); color: #e8e1c8; }
        .mw-dark .mc-chip.on { background: var(--o2); border-color: var(--o2); color: #1a1405; }
        .mw-dark .mc-grupo-tit h4 { color: #f4efdc; }
        .mw-dark .mc-grupo-tit i { background: linear-gradient(90deg, rgba(224,183,63,.5), transparent); }
        .mw-dark .mc-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 215px), 1fr)); gap: 14px; }
        .mw-dark .mc-card { border-radius: 8px; border: 1px solid rgba(224,183,63,.3); background: linear-gradient(175deg, #0c3322, #07140e 55%, #030806); box-shadow: 0 14px 34px rgba(0,0,0,.45); transition: transform .25s, border-color .25s; }
        .mw-dark .mc-card:hover { transform: translateY(-4px); border-color: var(--o2); }
        .mw-dark .mc-pie-foto span { display: none; } .mw-dark .mc-pie-foto { justify-content: flex-end; }
        .mw-dark .mc-card .mc-cuerpo { padding: 10px 12px 12px; gap: 6px; }
        .mw-dark .mc-card .mc-nom { font-size: 16px !important; line-height: 1.2; min-height: 2.4em; }
        .mw-dark .mc-card .mc-sku { font-size: 9.5px; } .mw-dark .mc-card .mc-est { font-size: 10px; padding: 3px 8px; }
        .mw-dark .mc-card .mc-fila { padding-top: 10px; }
        .mw-dark .mc-card .mc-precio b { font-size: 18px; }
        .mw-dark .mc-bolsa { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 6px; cursor: pointer; border: 1px solid rgba(224,183,63,.55); background: rgba(4,23,15,.7); color: var(--o2); transition: .2s; }
        .mw-dark .mc-bolsa:hover:not(:disabled) { background: var(--o2); color: #1a1405; } .mw-dark .mc-bolsa:disabled { opacity: .35; cursor: not-allowed; }
        .mw-aviso { text-align: center; font-size: 13px; color: #8fa397; }

        /* Botón Pedir del carrito */
        .mw .mc-pedir, .mw .mc-sig { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); color: #1a1405 !important; letter-spacing: .16em; text-transform: uppercase; font-size: 12.5px; border-radius: 6px; }

        /* Pie */
        .mw-pie { background: var(--vd); color: #f4efdc; border-top: 1px solid rgba(224,183,63,.25); scroll-margin-top: 68px; }
        .mw-pie .mw-wrap { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 30px; padding-top: 48px; padding-bottom: 28px; }
        .mw-pie ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; color: #a9b8ae; }
        .mw-pie p { font-size: 13px; color: #a9b8ae; line-height: 1.6; margin: 14px 0 0; max-width: 260px; }
        .mw-wa { display: inline-flex; border: 1px solid var(--o2); color: #f4efdc !important; padding: 10px 18px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; margin-top: 14px; }
        .mw-wa:hover { background: var(--o2); color: #1a1405 !important; }
        .mw-copy { border-top: 1px solid rgba(255,255,255,.08); padding: 16px 28px; text-align: center; font-size: 12px; color: #6f8277; }
        .mw-wafab { position: fixed; right: 18px; bottom: 18px; z-index: 30; width: 52px; height: 52px; border-radius: 50%; background: #1faa59; color: #fff !important; display: grid; place-items: center; box-shadow: 0 8px 22px rgba(31,170,89,.4); }

        /* Tablet y móvil: el nombre va centrado arriba, logo a la izquierda y carrito a la derecha */
        @media (max-width: 1060px) {
          .mw-nav { display: none; }
          .mw-head .mw-wrap { grid-template-columns: 1fr auto 1fr; gap: 10px; }
          .mw-head .mw-marca { grid-column: 1; justify-self: start; }
          .mw-head .mw-marca span { display: none; }
          .mw-head .mw-logo { width: 40px; height: 40px; }
          .mw-head .mw-nombre { display: block; grid-column: 2; justify-self: center; text-align: center; max-width: 58vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            font-family: ${serif.style.fontFamily}, Georgia, serif; font-weight: 500; font-size: 18px; letter-spacing: .12em; text-transform: uppercase;
            color: #f0d680 !important; text-shadow: 0 0 18px rgba(224,183,63,.35), 0 1px 2px rgba(0,0,0,.6); }
          .mw-head .mw-iconos { grid-column: 3; }
        }
        @media (max-width: 960px) {
          .mw-ben .mw-wrap { grid-template-columns: repeat(2, 1fr); gap: 18px 0; }
          .mw-b:nth-child(3) { border-left: 0; }
          .mw-pie .mw-wrap { grid-template-columns: 1fr 1fr; }
        }
        /* Menú inferior: espacio para que no tape el pie y el WhatsApp ya va en el menú */
        @media (max-width: 860px) {
          .mw-wafab { display: none; }
          .mw-copy { padding-bottom: calc(16px + 78px + env(safe-area-inset-bottom)); }
        }
        @media (max-width: 600px) {
          .mw-wrap { padding: 0 16px; } .mw-head .mw-wrap { height: 58px; }
          .mw-head .mw-nombre { font-size: 16px; letter-spacing: .08em; max-width: 52vw; }
          .mw-head .mw-logo { width: 36px; height: 36px; }

          /* Hero más compacto: el logo ya está arriba */
          .mw-hero { min-height: 74svh; }
          .mw .mw-hero-in { padding-top: 36px; padding-bottom: 36px; }
          .mw-hero-logo { display: none; }
          .mw-hero p { font-size: 13.5px; margin-bottom: 22px; }
         .mw .hv { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 70% 50%; opacity: 0; transition: opacity 1.8s ease;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 22%, #000 55%), linear-gradient(0deg, transparent 0%, #000 18%);
  mask-image: linear-gradient(90deg, transparent 0%, transparent 22%, #000 55%), linear-gradient(0deg, transparent 0%, #000 18%);
  -webkit-mask-composite: source-in; mask-composite: intersect; }
          .mw-btn { flex: 1; padding: 15px 16px; }
          .mw-oro-in { padding: 12px 16px; } .mw-oro-in > span { width: 100%; } .mw-oro-in div { gap: 18px; width: 100%; justify-content: space-between; } .mw-oro-in b { font-size: 15px; }

          /* Beneficios: en móvil, 2 columnas con tarjetas compactas */
          .mw-ben .mw-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 16px; padding-bottom: 16px; }
          .mw-b, .mw-b + .mw-b, .mw-b:nth-child(3) { flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; gap: 8px; padding: 14px 10px 12px; border: 1px solid rgba(176,141,60,.4); border-radius: 14px; background: rgba(255,255,255,.55); }
          .mw-b > span { width: 40px; height: 40px; }
          .mw-b b { font-size: 12.5px; line-height: 1.25; }
          .mw-b small { display: block; margin-top: 3px; font-size: 11px; line-height: 1.35; }

          .mw-sec { padding-top: 44px; } .mw .mw-dark { padding: 44px 0 40px; }
          /* Las tarjetas ahora van en carrusel y ocupan ~80 % del ancho: pueden tener texto más grande */
          .mw-dark .mc-card .mc-nom { font-size: 17px !important; } .mw-dark .mc-card .mc-precio b { font-size: 18px; }

          /* Pie: marca arriba y el resto en bloques plegables */
          .mw-pie .mw-wrap { grid-template-columns: 1fr; gap: 0; padding-top: 32px; }
          .mw-pie-marca { padding-bottom: 22px; }
        }
        /* Guía de tallas plegable en móvil (CSS puro) */
        .gt-chk { position: absolute; opacity: 0; pointer-events: none; }
        .gt-h { display: none; }
        @media (max-width: 860px) {
          .gt { position: relative; padding: 20px 16px 6px; scroll-margin-top: 68px; }
          .gt-h { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 70px; padding: 14px 18px; border-radius: 16px; cursor: pointer; color: #f4efdc;
            background: linear-gradient(135deg, #0b4a2e, #06241a); border: 1px solid rgba(224,183,63,.4); box-shadow: 0 8px 22px rgba(3,12,8,.18); -webkit-tap-highlight-color: transparent; }
          .gt-h small { display: block; font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); margin-bottom: 6px; }
          .gt-h b { display: block; font-family: ${serif.style.fontFamily}, Georgia, serif; font-weight: 500; font-size: 19px; line-height: 1.2; }
          .gt-chev { flex: 0 0 auto; color: var(--o2); transition: transform .25s ease; }
          .gt-chk:checked ~ .gt-h .gt-chev { transform: rotate(180deg); }
          .gt-chk:focus-visible ~ .gt-h { outline: 2px solid var(--o2); outline-offset: 2px; }
          .gt-b { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s ease; }
          .gt-chk:checked ~ .gt-b { grid-template-rows: 1fr; }
          .gt-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .3s; }
          .gt-chk:checked ~ .gt-b .gt-in { visibility: visible; transition-delay: 0s; }
        }
        @media (prefers-reduced-motion: reduce) { .gt-b, .gt-chev, .gt-in { transition: none; } }

        /* Banner con foto */
        .mw-ban { position: relative; isolation: isolate; overflow: hidden; background: #030c08; color: #f4efdc; }
        .mw-ban > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; z-index: -2; }
        .mw-ban::before { content: ""; position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(90deg, rgba(3,12,8,.9) 0%, rgba(3,12,8,.58) 45%, rgba(3,12,8,.08) 100%), linear-gradient(0deg, rgba(3,12,8,.7), transparent 40%); }
        .mw-ban-in { max-width: 1180px; margin: 0 auto; padding: 110px 28px; min-height: 520px; display: flex; align-items: center; }
        .mw-ban-txt { max-width: 480px; }
        .mw-ban h3 { font-size: clamp(28px, 4vw, 48px); line-height: 1.1; letter-spacing: .04em; text-transform: uppercase; margin: 16px 0 14px; color: #fbf6e6; text-shadow: 0 4px 30px rgba(0,0,0,.5); }
        .mw-ban p { margin: 0 0 26px; font-size: 14.5px; line-height: 1.65; color: #d3ddd6; }
        .mw-ban-cta { display: flex; gap: 12px; flex-wrap: wrap; }
        .mw-btn-ig { gap: 9px; }

        /* Tienda (fija) + Instagram */
        .pl-fijo h5 { margin: 0 0 14px; font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); }
        .mw-ig { display: inline-flex; align-items: center; gap: 10px; margin-top: 16px; min-height: 44px; padding: 0 16px 0 12px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #f0d680 !important;
          border: 1px solid rgba(224,183,63,.55); background: rgba(224,183,63,.06); transition: .2s; -webkit-tap-highlight-color: transparent; }
        .mw-ig:hover { background: var(--o2); color: #1a1405 !important; }
        @media (max-width: 600px) {
          .mw-ban-in { min-height: min(78svh, 560px); align-items: flex-end; padding: 0 16px 34px; }
          .mw-ban::before { background: linear-gradient(0deg, rgba(3,12,8,.95) 0%, rgba(3,12,8,.72) 38%, rgba(3,12,8,.05) 78%); }
          .mw-ban p { font-size: 13.5px; margin-bottom: 20px; }
          .mw-ban-cta .mw-btn { flex: 1 1 100%; }
          .pl-fijo { border-top: 1px solid rgba(255,255,255,.1); padding: 18px 0 20px; }
          .pl-fijo h5 { margin-bottom: 12px; }
          .pl-fijo ul { display: flex; flex-wrap: wrap; gap: 8px; }
          .pl-fijo ul a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); color: #d6e0d9; font-size: 13px; }
          .mw-ig { width: 100%; justify-content: center; }
        }

        /* Bloques plegables del pie (CSS puro) */
        .pl { position: relative; }
        .pl-chk { position: absolute; opacity: 0; pointer-events: none; }
        .pl-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 0 14px; cursor: default;
          font: 600 11px/1 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--o2); }
        .pl-chev { display: none; }
        @media (max-width: 600px) {
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
        @media (prefers-reduced-motion: reduce) { .pl-b, .pl-chev, .pl-in { transition: none; } }
        @media (prefers-reduced-motion: reduce) { .mw-hero-txt > *, .mw-hero-logo img { animation: none; } }
      `}</style>

      <header className="mw-head">
        <div className="mw-wrap">
          <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
          <a className="mw-nombre" href="#inicio">{nombre}</a>
          <nav className="mw-nav">
            <a href="#inicio">Inicio</a>
            {PROMOS.length > 0 && <a href="#promociones">Promociones</a>}
            {cats.length > 0 && <a href="#categorias">Colecciones</a>}
            <a href="#catalogo">Catálogo</a>
            <a href="#personalizado">Personalizados</a>
            <a href="#tallas-bloque">Tallas</a>
            <a href="#oro">Precio del oro</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="mw-iconos"><CarritoHeader /></div>
        </div>
      </header>

      <section className="mw-hero" id="inicio">
        <HeroVideo src={videoUrl} />
        <div className="mw-shade" />
        <div className="mw-wrap mw-hero-in">
          <div className="mw-hero-txt">
            <div className="mw-hero-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_JKS} alt={nombre} />
            </div>
            <span className="mw-tag">Oro certificado</span>
            <h2>Hechas para<br />brillar siempre</h2>
            <p>{lema}</p>
            <div className="mw-cta">
              <a className="mw-btn solid" href="#catalogo">Ver catálogo</a>
              <a className="mw-btn" href="#personalizado">Diseña tu joya</a>
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

      <section className="mw-ben">
        <div className="mw-wrap">
          <div className="mw-b"><span><Ic n="gem" s={22} /></span><div><b>Oro certificado</b><small>Piezas auténticas</small></div></div>
          <div className="mw-b"><span><Ic n="shield" s={22} /></span><div><b>Garantía de por vida</b><small>Respaldo en cada joya</small></div></div>
          <div className="mw-b"><span><Ic n="truck" s={22} /></span><div><b>Domicilio {dom ? `desde ${dom}` : 'a tu puerta'}</b><small>{f.cobertura || f.horario || 'Consulta tu zona'}</small></div></div>
          <div className="mw-b"><span><Ic n="headset" s={22} /></span><div><b>Atención directa</b><small>Te respondemos por WhatsApp</small></div></div>
        </div>
      </section>

      {PROMOS.length > 0 && (
        <section className="mw-sec" id="promociones" style={{ paddingBottom: 56 }}>
          <div className="mw-wrap">
            <PromocionesPublicas promos={PROMOS} wa={wa} logo={LOGO_JKS} />
          </div>
        </section>
      )}

      {cats.length > 0 && (
        <div id="categorias" style={{ scrollMarginTop: 68 }}>
          <CarruselColecciones cats={cats.map((c) => ({ ...c, href: `#cat-${slugCat(c.n)}` }))} />
        </div>
      )}

      <section className="mw-sec mw-dark" id="catalogo">
        <div className="mw-wrap">
          <div className="mw-tit"><small>Los favoritos</small><h3>Nuestras piezas más amadas</h3><i /></div>
          {PRENDAS.length
            ? <CatalogoPublico prendas={PRENDAS} wa={wa} logo={LOGO_JKS} tienda={nombre} />
            : <p className="mw-aviso">Muy pronto: nuestro catálogo en línea.</p>}
        </div>
      </section>

      <Colapsa id="tallas" sub="Guía de tallas" titulo="Encuentra tu medida ideal">
        <GuiaTallas wa={wa} nombre={nombre} />
      </Colapsa>

      <PersonalizacionTrabajos wa={wa} nombre={nombre} />

      {/* Banner con foto: cierre visual antes del pie */}
      <section className="mw-ban" aria-label="Joyas que cuentan tu historia">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FOTO_BANNER} alt={`Joya de ${nombre}`} loading="lazy" />
        <div className="mw-ban-in">
          <div className="mw-ban-txt">
            <span className="mw-tag">Cada joya, una historia</span>
            <h3>Joyas que cuentan tu historia</h3>
            <p>Oro certificado, elaborado con dedicación. Escríbenos y te asesoramos sin compromiso.</p>
            <div className="mw-ban-cta">
              {wa !== '#' && <a className="mw-btn solid" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
              <a className="mw-btn mw-btn-ig" href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><Ic n="ig" s={16} /> Instagram</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="mw-pie" id="contacto">
        <div className="mw-wrap">
          <div className="mw-pie-marca">
            <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
            <p>{lema}</p>
          </div>
          {/* Tienda: siempre visible (no se pliega) */}
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

      <WhatsAppFlotante wa={wa} tienda={nombre} />

      <MenuInferior />
    </div>
  );
}