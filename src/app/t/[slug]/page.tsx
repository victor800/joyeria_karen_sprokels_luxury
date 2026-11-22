// 📁 RUTA: src/app/t/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import { leerConfigPublica } from '@/lib/configuracion';
import { leerPrendasPublicas } from '@/lib/prendas';
import CatalogoPublico, { type PrendaP, type VarianteP } from './CatalogoPublico';

const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

/** Se refresca cada minuto: los cambios de Configuración y de Prendas se ven casi al instante sin saturar Google Sheets */
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

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

/* ---------- Prendas del Sheet → datos para las tarjetas ---------- */
const SEP = '|';
const parseFotos = (v: unknown) => String(v ?? '').split(SEP).map((x) => x.trim()).filter(Boolean);
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
    if (r.activo !== undefined && String(r.activo) !== 'true') continue; // solo publicadas

    const quilate = String(r.quilate ?? '18');
    const fotosBase = parseFotos(r.foto_url ?? r.foto);
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = await leerConfigPublica(slug).catch(() => null);
  if (!f) return { title: 'Tienda no encontrada' };
  return {
    title: f.nombre,
    description: f.encabezado || `Joyería fina en oro certificado · ${f.nombre}`,
  };
}

/* ---------- Iconos ---------- */
const P: Record<string, React.ReactNode> = {
  gem: <><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  truck: <><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></>,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
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
};
function Ic({ n, s = 20 }: { n: keyof typeof P; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[n]}</svg>
  );
}

const CATEGORIAS: { n: keyof typeof P; t: string }[] = [
  { n: 'necklace', t: 'Collares' },
  { n: 'ring', t: 'Anillos' },
  { n: 'earring', t: 'Aretes' },
  { n: 'bracelet', t: 'Pulseras' },
  { n: 'pendant', t: 'Dijes' },
];

export default async function TiendaPublica({ params }: Params) {
  const { slug } = await params;
  const f = await leerConfigPublica(slug).catch(() => null);
  if (!f) notFound();
  const crudas = (await leerPrendasPublicas().catch(() => [])) as unknown[];
  const PRENDAS = normalizarPrendas(crudas, f as unknown as Record<string, unknown>);

  const nombre = f.nombre || 'Joyería';
  const lema = f.encabezado || 'Joyas en oro certificado, creadas para celebrar tus momentos más preciosos.';
  const ig = instagramUser(f.instagram);
  const dom = cop(f.domicilio);
  const logo = f.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={f.logo_url} alt={nombre} className="mw-logo" />
  ) : (
    <span className="mw-logo mw-ini">{nombre.trim().charAt(0).toUpperCase()}</span>
  );

  return (
    <div className="mw">
      <style>{`
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        .mw { --v:#0b4a2e; --v2:#0f5f3b; --vc:#e7efe9; --vm:#cfe0d5; --o:#b08d3c; --crema:#f6f4ee; --tx:#14201a; --serif: ${serif.style.fontFamily};
          min-height: 100vh; background: var(--crema); color: var(--tx);
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .mw * { box-sizing: border-box; }
        .mw h1,.mw h2,.mw h3,.mw .mw-marca span { font-family: ${serif.style.fontFamily}, Georgia, serif; font-weight: 500; margin: 0; }
        .mw a { color: inherit; text-decoration: none; }
        .mw-wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }

        .mw-logo { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; background: #fff; border: 1px solid var(--o); flex-shrink: 0; }
        .mw-ini { display: grid; place-items: center; background: var(--v); color: var(--o); font-weight: 600; font-size: 20px; }

        .mw-head { background: #fff; border-bottom: 1px solid #e6e2d6; position: sticky; top: 0; z-index: 20; }
        .mw-head .mw-wrap { display: flex; align-items: center; justify-content: space-between; gap: 20px; height: 74px; }
        .mw-marca { display: flex; align-items: center; gap: 12px; font-size: 19px; color: var(--v); }
        .mw-nav { display: flex; gap: 30px; font-size: 14px; color: #44514a; }
        .mw-nav a:hover { color: var(--v); }
        .mw-iconos { display: flex; gap: 16px; color: var(--v); }

        .mw-hero { background: linear-gradient(120deg, #f6f4ee 0%, var(--vc) 55%, var(--vm) 100%); position: relative; overflow: hidden; scroll-margin-top: 74px; }
        .mw-hero .mw-wrap { display: grid; grid-template-columns: 1.05fr 1fr; gap: 40px; align-items: center; padding-top: 64px; padding-bottom: 64px; }
        .mw-tag { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--o); }
        .mw-hero h2 { font-size: 58px; line-height: 1.05; margin: 14px 0 18px; }
        .mw-hero h2 em { font-style: italic; color: var(--v); }
        .mw-hero p { color: #4b5a52; font-size: 16px; line-height: 1.6; max-width: 440px; margin: 0 0 28px; }
        .mw-cta { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .mw-btn { display: inline-flex; align-items: center; gap: 10px; background: var(--v); color: #fff !important; padding: 15px 28px; border-radius: 6px; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
        .mw-btn:hover { background: var(--v2); }
        .mw-link { font-size: 14px; display: inline-flex; align-items: center; gap: 10px; }
        .mw-link i { width: 28px; height: 28px; border: 1px solid var(--v); border-radius: 50%; display: grid; place-items: center; font-style: normal; }
        .mw-visual { position: relative; height: 380px; display: grid; place-items: center; }
        .mw-arco { width: 300px; height: 360px; border-radius: 150px 150px 24px 24px; background: linear-gradient(160deg, var(--v2), var(--v)); display: grid; place-items: center; box-shadow: 0 24px 60px rgba(11,74,46,.35); position: relative; overflow: hidden; }
        .mw-arco::before { content: ""; position: absolute; width: 360px; height: 360px; border-radius: 50%; border: 26px solid rgba(176,141,60,.35); top: -150px; right: -150px; }
        .mw-arco::after { content: ""; position: absolute; width: 220px; height: 220px; border-radius: 50%; border: 14px solid rgba(255,255,255,.08); bottom: -90px; left: -90px; }
        .mw-arco .mw-logo { width: 170px; height: 170px; border-radius: 28px; border-width: 2px; position: relative; z-index: 1; font-size: 74px; }
        .mw-flota { position: absolute; left: 0; bottom: 20px; background: #fff; border-radius: 14px; padding: 14px 18px; box-shadow: 0 10px 30px rgba(0,0,0,.14); }
        .mw-flota small { display: block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--o); }
        .mw-flota b { font-size: 22px; color: var(--v); }
        .mw-flota span { font-size: 12px; color: #777; }

        .mw-ben { background: #fff; border-bottom: 1px solid #e6e2d6; }
        .mw-ben .mw-wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding-top: 22px; padding-bottom: 22px; }
        .mw-b { display: flex; gap: 14px; align-items: center; }
        .mw-b > span { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--vm); display: grid; place-items: center; color: var(--v); flex-shrink: 0; }
        .mw-b b { display: block; font-size: 13px; } .mw-b small { color: #6b7a72; font-size: 12px; }

        .mw-sec { padding: 56px 0 8px; scroll-margin-top: 74px; }
        .mw-sup { text-align: center; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: #6b7a72; margin-bottom: 22px; }
        .mw-cats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .mw-cat { background: var(--vc); border-radius: 14px; padding: 18px 12px 16px; text-align: center; transition: .2s; }
        .mw-cat:hover { background: var(--vm); transform: translateY(-2px); }
        .mw-cat .ci { height: 96px; display: grid; place-items: center; color: var(--v); }
        .mw-cat b { display: block; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; margin-top: 8px; }
        .mw-cat small { font-size: 12px; color: #5a6b62; display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; }

        .mw-tit { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 22px; }
        .mw-tit small { display: block; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--o); margin-bottom: 6px; }
        .mw-tit h3 { font-size: 32px; } .mw-tit a { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--v); }
        .mw-prods { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .mw-p { background: #fff; border-radius: 14px; padding: 12px; box-shadow: 0 1px 6px rgba(0,0,0,.05); position: relative; }
        .mw-pf { aspect-ratio: 1; border-radius: 10px; background: var(--vc); display: grid; place-items: center; color: #9db8a8; overflow: hidden; }
        .mw-p .co { position: absolute; top: 20px; right: 20px; color: #7d8f84; }
        .mw-p .ln { display: block; height: 10px; border-radius: 6px; background: #ece8dd; margin-top: 12px; } .mw-p .ln + .ln { width: 50%; margin-top: 8px; }
        .mw-aviso { text-align: center; font-size: 12px; color: #8a978f; margin: 16px 0 0; }

        .mw-banner { background: linear-gradient(110deg, #06301e, var(--v) 60%, var(--v2)); border-radius: 20px; color: #fff; padding: 44px 48px; display: grid; grid-template-columns: 1fr 1.1fr; gap: 32px; align-items: center; position: relative; overflow: hidden; margin-top: 56px; scroll-margin-top: 90px; }
        .mw-banner::after { content: ""; position: absolute; right: -80px; top: -80px; width: 280px; height: 280px; border-radius: 50%; border: 28px solid rgba(176,141,60,.25); pointer-events: none; }
        .mw-banner small { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: #d4b25f; }
        .mw-banner h3 { font-size: 36px; line-height: 1.15; margin: 10px 0 12px; }
        .mw-banner p { font-size: 14px; opacity: .8; margin: 0 0 22px; max-width: 340px; }
        .mw-banner .mw-btn { background: #fff; color: var(--v) !important; }
        .mw-oro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; position: relative; z-index: 1; }
        .mw-oro div { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 18px 10px; text-align: center; }
        .mw-oro small { color: #d4b25f; } .mw-oro b { display: block; font-size: 19px; margin-top: 6px; }
        .mw-oro span { font-size: 11px; opacity: .65; }

        .mw-gar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding: 40px 0; }

        .mw-pie { background: #eef2ee; border-top: 1px solid #e0e6e0; scroll-margin-top: 74px; }
        .mw-pie .mw-wrap { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr; gap: 36px; padding-top: 44px; padding-bottom: 28px; }
        .mw-pie h4 { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; margin: 0 0 14px; }
        .mw-pie ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; color: #55645b; }
        .mw-pie p { font-size: 13px; color: #55645b; line-height: 1.6; margin: 12px 0 0; max-width: 260px; }
        .mw-wa { display: inline-flex; background: var(--v); color: #fff !important; padding: 11px 20px; border-radius: 6px; font-size: 13px; margin-top: 12px; }
        .mw-copy { border-top: 1px solid #dfe5df; padding: 16px 32px; text-align: center; font-size: 12px; color: #8a978f; }

        @media (max-width: 960px) {
          .mw-nav { display: none; }
          .mw-hero .mw-wrap, .mw-banner { grid-template-columns: 1fr; }
          .mw-hero h2 { font-size: 42px; }
          .mw-visual { height: 340px; }
          .mw-cats { grid-template-columns: repeat(3, 1fr); }
          .mw-prods, .mw-gar { grid-template-columns: repeat(2, 1fr); }
          .mw-pie .mw-wrap { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .mw-wrap { padding: 0 18px; }
          .mw-ben .mw-wrap { grid-template-columns: 1fr; }
          .mw-cats { grid-template-columns: repeat(2, 1fr); }
          .mw-banner { padding: 30px 22px; }
          .mw-hero h2 { font-size: 36px; }
          .mw-arco { width: 250px; height: 310px; }
          .mw-pie .mw-wrap { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ---------- Cabecera ---------- */}
      <header className="mw-head">
        <div className="mw-wrap">
          <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
          <nav className="mw-nav">
            <a href="#inicio">Inicio</a>
            <a href="#categorias">Categorías</a>
            <a href="#catalogo">Catálogo</a>
            <a href="#oro">Precio del oro</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="mw-iconos"><Ic n="search" /><Ic n="user" /><Ic n="bag" /></div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="mw-hero" id="inicio">
        <div className="mw-wrap">
          <div>
            <span className="mw-tag">Elegancia atemporal</span>
            <h2>Hechas para<br />brillar <em>siempre</em></h2>
            <p>{lema}</p>
            <div className="mw-cta">
              <a className="mw-btn" href="#catalogo">Ver catálogo</a>
              <a className="mw-link" href="#contacto">Conoce más <i><Ic n="arrow" s={14} /></i></a>
            </div>
          </div>
          <div className="mw-visual">
            <div className="mw-arco">{logo}</div>
            <div className="mw-flota">
              <small>Oro 18K hoy</small>
              <b>{cop(f.p18) ?? '—'}</b> <span>/ gramo</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mw-ben">
        <div className="mw-wrap">
          <div className="mw-b"><span><Ic n="gem" /></span><div><b>Oro certificado</b><small>Piezas auténticas con garantía</small></div></div>
          <div className="mw-b"><span><Ic n="shield" /></span><div><b>Garantía de por vida</b><small>Respaldo en cada joya</small></div></div>
          <div className="mw-b"><span><Ic n="truck" /></span><div><b>Domicilio {dom ? `desde ${dom}` : 'a tu puerta'}</b><small>{f.cobertura || 'Consulta tu zona'}</small></div></div>
        </div>
      </section>

      {/* ---------- Categorías ---------- */}
      <section className="mw-sec" id="categorias">
        <div className="mw-wrap">
          <div className="mw-sup">Compra por categoría</div>
          <div className="mw-cats">
            {CATEGORIAS.map((c) => (
              <a key={c.t} className="mw-cat" href="#catalogo">
                <div className="ci"><Ic n={c.n} s={52} /></div>
                <b>{c.t}</b>
                <small>Explorar <Ic n="arrow" s={12} /></small>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Catálogo ---------- */}
      <section className="mw-sec" id="catalogo">
        <div className="mw-wrap">
          <div className="mw-tit">
            <div><small>Los favoritos</small><h3>Nuestras piezas más amadas</h3></div>
            <a href="#catalogo">Ver todo →</a>
          </div>

          {PRENDAS.length ? (
            <CatalogoPublico prendas={PRENDAS} wa={waLink(f.telefono)} logo={f.logo_url || undefined} />
          ) : (
            <>
              <div className="mw-prods">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="mw-p">
                    <div className="mw-pf"><Ic n="gem" s={40} /></div>
                    <span className="co"><Ic n="heart" s={18} /></span>
                    <i className="ln" /><i className="ln" />
                  </div>
                ))}
              </div>
              <p className="mw-aviso">Muy pronto: nuestro catálogo en línea.</p>
            </>
          )}

          {/* Banner de precios del oro */}
          <div className="mw-banner" id="oro">
            <div>
              <small>Precio del día</small>
              <h3>Oro certificado<br />al mejor valor</h3>
              <p>Consulta el precio actual del gramo y reserva tu pieza hoy.</p>
              <a className="mw-btn" href={waLink(f.telefono)} target="_blank" rel="noopener noreferrer">Escríbenos</a>
            </div>
            <div className="mw-oro">
              <div><small>Oro 24K</small><b>{cop(f.p24) ?? '—'}</b><span>por gramo</span></div>
              <div><small>Oro 18K</small><b>{cop(f.p18) ?? '—'}</b><span>por gramo</span></div>
              <div><small>Oro 14K</small><b>{cop(f.p14) ?? '—'}</b><span>por gramo</span></div>
            </div>
          </div>

          {/* Garantías */}
          <div className="mw-gar">
            <div className="mw-b"><span><Ic n="truck" /></span><div><b>Domicilios</b><small>{f.horario || 'Consulta el horario'}</small></div></div>
            <div className="mw-b"><span><Ic n="lock" /></span><div><b>Pago seguro</b><small>Compra con confianza</small></div></div>
            <div className="mw-b"><span><Ic n="gem" /></span><div><b>Calidad excepcional</b><small>Oro certificado</small></div></div>
            <div className="mw-b"><span><Ic n="headset" /></span><div><b>Atención directa</b><small>Te respondemos por WhatsApp</small></div></div>
          </div>
        </div>
      </section>

      {/* ---------- Pie ---------- */}
      <footer className="mw-pie" id="contacto">
        <div className="mw-wrap">
          <div>
            <a className="mw-marca" href="#inicio">{logo}<span>{nombre}</span></a>
            <p>{lema}</p>
          </div>
          <div>
            <h4>Tienda</h4>
            <ul><li>Collares</li><li>Anillos</li><li>Aretes</li><li>Pulseras</li><li>Dijes</li></ul>
          </div>
          <div>
            <h4>Entregas</h4>
            <ul>
              <li>Domicilio: {dom ?? 'por definir'}</li>
              <li>{f.horario || 'Horario por definir'}</li>
              <li>{f.cobertura || 'Cobertura por definir'}</li>
              {f.seguro && <li>Seguro por envío: {f.seguro}%</li>}
            </ul>
          </div>
          <div>
            <h4>Contacto</h4>
            <ul>
              {f.telefono && <li>WhatsApp {f.telefono}</li>}
              {ig && <li><a href={instagramUrl(f.instagram)} target="_blank" rel="noopener noreferrer">{ig}</a></li>}
              {f.direccion && <li><Ic n="pin" s={13} /> {f.direccion}</li>}
            </ul>
            <a className="mw-wa" href={waLink(f.telefono)} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
          </div>
        </div>
        <div className="mw-copy">© {nombre}. Todos los derechos reservados.</div>
      </footer>
    </div>
  );
}