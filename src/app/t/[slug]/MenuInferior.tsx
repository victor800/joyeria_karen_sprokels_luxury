// 📁 RUTA: src/app/t/[slug]/MenuInferior.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';

const svg = (d: ReactNode, s = 24) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const I = {
  inicio: svg(<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  catalogo: svg(<><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>),
  sparkle: svg(<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />, 28),
  sparkleS: svg(<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />),
  tallas: svg(<><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2m1-5 2 2m1-5 2 2" /></>),
  menu: svg(<><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>),
  promo: svg(<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>),
  capas: svg(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>),
  oro: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.2 9.6c0-1 1.2-1.6 2.8-1.6s2.8.7 2.8 1.8c0 2.3-5.6 1.2-5.6 3.6 0 1 1.2 1.7 2.8 1.7s2.8-.6 2.8-1.6" /></>),
  pin: svg(<><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  wa: svg(<><path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-.9.9c-1-.4-2-1.4-2.4-2.4l.9-.9-1-2.2z" /></>),
  ig: svg(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" /></>),
  x: svg(<path d="M6 6l12 12M18 6 6 18" />, 20),
};

type Item = { href: string; label: string; icono: ReactNode; abrir?: string; externo?: boolean };

/** Menú inferior (móvil/tablet): 4 accesos + botón central dorado + "Menú" con todas las secciones */
export default function MenuInferior({ wa, instagram, promos = false, colecciones = false }: {
  wa: string; instagram: string; promos?: boolean; colecciones?: boolean;
}) {
  const [activo, setActivo] = useState('inicio');
  const [oculto, setOculto] = useState(false);
  const [menu, setMenu] = useState(false);

  // Resalta la sección que se está viendo
  useEffect(() => {
    const ids = ['inicio', 'catalogo', 'personalizado', 'tallas-bloque'];
    const els = ids.map((i) => document.getElementById(i)).filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) setActivo(e.target.id); },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Se esconde mientras el cliente escribe
  useEffect(() => {
    const NO_TEXTO = ['range', 'checkbox', 'radio', 'button', 'submit'];
    const esCampo = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
      return el.tagName === 'INPUT' && !NO_TEXTO.includes((el as HTMLInputElement).type);
    };
    const on = (e: FocusEvent) => { if (esCampo(e.target)) setOculto(true); };
    const off = () => setOculto(false);
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', off);
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off); };
  }, []);

  // Menú abierto: bloquea el scroll y se cierra con Escape
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [menu]);

  const abrirChk = (id?: string) => {
    if (!id) return;
    const chk = document.getElementById(id) as HTMLInputElement | null;
    if (chk) chk.checked = true; // abre el bloque plegable antes de llegar a él
  };

  const todos: Item[] = ([
    { href: '#inicio', label: 'Inicio', icono: I.inicio },
    promos && { href: '#promociones', label: 'Promociones', icono: I.promo },
    colecciones && { href: '#categorias', label: 'Colecciones', icono: I.capas },
    { href: '#catalogo', label: 'Catálogo', icono: I.catalogo },
    { href: '#personalizado', label: 'Personalizados', icono: I.sparkleS },
    { href: '#tallas-bloque', label: 'Guía de tallas', icono: I.tallas, abrir: 'tallas-chk' },
    { href: '#oro', label: 'Precio del oro', icono: I.oro },
    { href: '#contacto', label: 'Contacto', icono: I.pin },
    wa !== '#' && { href: wa, label: 'WhatsApp', icono: I.wa, externo: true },
    { href: instagram, label: 'Instagram', icono: I.ig, externo: true },
  ] as (Item | false)[]).filter((x): x is Item => !!x);

  const tab = (id: string, label: string, icono: ReactNode, abrir?: string) => (
    <a className="mi-t" href={`#${id}`} data-on={activo === id} aria-current={activo === id ? 'true' : undefined}
      onClick={() => { setActivo(id); abrirChk(abrir); }}>
      {icono}<span>{label}</span>
    </a>
  );

  return (
    <>
      <style>{CSS}</style>

      <nav className="mi" aria-label="Menú principal" data-oculto={oculto}>
        {tab('inicio', 'Inicio', I.inicio)}
        {tab('catalogo', 'Catálogo', I.catalogo)}

        <a className="mi-t mi-c" href="#personalizado" data-on={activo === 'personalizado'} onClick={() => setActivo('personalizado')}>
          <span className="mi-orb">{I.sparkle}</span>
          <span>Personalizar</span>
        </a>

        {tab('tallas-bloque', 'Tallas', I.tallas, 'tallas-chk')}

        <button type="button" className="mi-t" data-on={menu} aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}>
          {I.menu}<span>Menú</span>
        </button>
      </nav>

      {menu && (
        <>
          <div className="ms-back" onClick={() => setMenu(false)} />
          <div className="ms" role="dialog" aria-modal="true" aria-label="Menú">
            <div className="ms-grip" aria-hidden />
            <div className="ms-h">
              <b>Menú</b>
              <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú">{I.x}</button>
            </div>
            <div className="ms-g">
              {todos.map((it) => (
                <a key={it.label} className="ms-i" href={it.href}
                  {...(it.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick={() => { abrirChk(it.abrir); setMenu(false); }}>
                  <span className="ic">{it.icono}</span>
                  <span>{it.label}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const CSS = `
.mi { display: none; }
@media (max-width: 860px) {
  .mi { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid; grid-template-columns: repeat(5, 1fr); align-items: end;
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom)); background: linear-gradient(180deg, #0d3324, #07211a);
    border-top: 1px solid rgba(240,214,128,.5); border-radius: 22px 22px 0 0; box-shadow: 0 -12px 34px rgba(0,0,0,.45); transition: transform .25s ease; }
  .mi[data-oculto="true"] { transform: translateY(125%); }
  .mi-t { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 54px; padding: 0; border: 0; background: none; cursor: pointer;
    color: #e4ece7; text-decoration: none; font: 600 11px/1 system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
  .mi-t svg { color: #f3e6b3; transition: transform .2s ease; }
  .mi-t[data-on="true"] { color: #ffe9a0; }
  .mi-t[data-on="true"] svg { color: #ffd966; transform: translateY(-1px) scale(1.08); filter: drop-shadow(0 0 6px rgba(240,214,128,.55)); }
  .mi-t:active svg { transform: scale(.92); }

  /* botón central dorado */
  .mi-c { margin-top: -30px; gap: 5px; }
  .mi-orb { width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center;
    background: linear-gradient(135deg, #f6dc8a, #e0b73f 55%, #b08d3c); border: 4px solid #07211a;
    box-shadow: 0 0 0 1.5px rgba(240,214,128,.75), 0 10px 22px rgba(0,0,0,.5); transition: transform .2s ease; }
  .mi-c .mi-orb svg { color: #1a1405; transform: none; filter: none; }
  .mi-c:active .mi-orb { transform: scale(.94); }
  .mi-c[data-on="true"] .mi-orb { box-shadow: 0 0 0 1.5px #ffe9a0, 0 0 22px rgba(240,214,128,.55), 0 10px 22px rgba(0,0,0,.5); }

 
  .ms-back { position: fixed; inset: 0; z-index: 59; background: rgba(0,0,0,.55); animation: ms-f .2s both; }
  .ms { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; max-height: 86dvh; overflow-y: auto; padding: 10px 16px calc(20px + env(safe-area-inset-bottom));
    border-radius: 24px 24px 0 0; background: linear-gradient(180deg, #0d3324, #06180f); border-top: 1px solid rgba(240,214,128,.5);
    box-shadow: 0 -20px 50px rgba(0,0,0,.5); animation: ms-up .28s cubic-bezier(.2,.8,.2,1) both; }
  .ms-grip { width: 42px; height: 4px; margin: 0 auto 12px; border-radius: 99px; background: rgba(255,255,255,.25); }
  .ms-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ms-h b { font-family: var(--serif, Georgia, serif); font-weight: 500; font-size: 22px; color: #f4efdc; }
  .ms-h button { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #f0d680; border: 1px solid rgba(224,183,63,.5); background: transparent; }
  .ms-g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ms-i { display: flex; align-items: center; gap: 12px; min-height: 62px; padding: 10px 14px 10px 10px; border-radius: 16px; text-decoration: none; color: #f4efdc;
    border: 1px solid rgba(224,183,63,.3); background: rgba(255,255,255,.04); font: 600 13.5px/1.2 system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
  .ms-i:active { background: rgba(224,183,63,.14); border-color: #e0b73f; }
  .ms-i .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; color: #f0d680; border: 1px solid rgba(224,183,63,.55); background: rgba(224,183,63,.08); }
  @keyframes ms-f { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ms-up { from { transform: translateY(100%); } to { transform: none; } }
}
@media (prefers-reduced-motion: reduce) { .mi, .mi-t svg, .mi-orb, .ms, .ms-back { transition: none; animation: none; } }
`;