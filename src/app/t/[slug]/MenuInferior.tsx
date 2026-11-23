// 📁 RUTA: src/app/t/[slug]/MenuInferior.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Tab = { id: string; label: string; icono: ReactNode; externo?: boolean };

const svg = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const ICONOS = {
  inicio: svg(<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  catalogo: svg(<><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>),
  personalizar: svg(<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />),
  tallas: svg(<><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2m1-5 2 2m1-5 2 2" /></>),
  wa: svg(<><path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2.2-1-.9.9c-1-.4-2-1.4-2.4-2.4l.9-.9-1-2.2z" /></>),
};

/** Menú fijo en la parte inferior (solo móvil/tablet). Resalta la sección que se está viendo. */
export default function MenuInferior({ wa }: { wa: string }) {
  const tabs: Tab[] = [
    { id: 'inicio', label: 'Inicio', icono: ICONOS.inicio },
    { id: 'catalogo', label: 'Catálogo', icono: ICONOS.catalogo },
    { id: 'personalizado', label: 'Personalizar', icono: ICONOS.personalizar },
    { id: 'tallas', label: 'Tallas', icono: ICONOS.tallas },
    ...(wa !== '#' ? [{ id: 'wa', label: 'WhatsApp', icono: ICONOS.wa, externo: true } as Tab] : []),
  ];

  const [activo, setActivo] = useState('inicio');
  const [oculto, setOculto] = useState(false);

  // Resalta la pestaña de la sección visible
  useEffect(() => {
    const els = tabs
      .filter((t) => !t.externo)
      .map((t) => document.getElementById(t.id))
      .filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) setActivo(e.target.id); },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se esconde mientras el cliente escribe (el teclado ya ocupa la pantalla)
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

  return (
    <>
      <style>{CSS}</style>
      <nav className="mi" aria-label="Menú principal" data-oculto={oculto}>
        {tabs.map((t) => t.externo ? (
          <a key={t.id} className="mi-t" href={wa} target="_blank" rel="noopener noreferrer">
            {t.icono}<span>{t.label}</span>
          </a>
        ) : (
          <a key={t.id} className="mi-t" href={`#${t.id}`} data-on={activo === t.id} aria-current={activo === t.id ? 'true' : undefined}
            onClick={() => setActivo(t.id)}>
            {t.icono}<span>{t.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}

const CSS = `
.mi { display: none; }
@media (max-width: 860px) {
  .mi { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); background: rgba(3,12,8,.96); backdrop-filter: blur(12px);
    border-top: 1px solid rgba(224,183,63,.3); box-shadow: 0 -10px 30px rgba(0,0,0,.35); transition: transform .25s ease; }
  .mi[data-oculto="true"] { transform: translateY(110%); }
  .mi-t { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 52px; border-radius: 12px;
    color: #9db0a4; text-decoration: none; font: 600 10.5px/1 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: .02em; -webkit-tap-highlight-color: transparent; }
  .mi-t svg { transition: transform .2s ease; }
  .mi-t[data-on="true"] { color: #f0d680; background: rgba(224,183,63,.1); }
  .mi-t[data-on="true"] svg { transform: translateY(-1px) scale(1.08); }
  .mi-t:active { background: rgba(224,183,63,.16); }
}
@media (prefers-reduced-motion: reduce) { .mi, .mi-t svg { transition: none; } }
`;