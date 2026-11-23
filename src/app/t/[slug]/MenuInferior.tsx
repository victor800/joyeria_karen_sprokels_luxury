// 📁 RUTA: src/app/t/[slug]/MenuInferior.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Tab = {
  id: string;          // id del elemento que se observa para resaltar la pestaña
  label: string;
  icono: ReactNode;
  abrir?: string;      // id de un checkbox que se marca al tocar (abre un bloque plegable)
};

const svg = (d: ReactNode) => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const ICONOS = {
  inicio: svg(<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  catalogo: svg(<><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></>),
  personalizar: svg(<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />),
  tallas: svg(<><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2m1-5 2 2m1-5 2 2" /></>),
  contacto: svg(<><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
};

const TABS: Tab[] = [
  { id: 'inicio', label: 'Inicio', icono: ICONOS.inicio },
  { id: 'catalogo', label: 'Catálogo', icono: ICONOS.catalogo },
  { id: 'personalizado', label: 'Personalizar', icono: ICONOS.personalizar },
  { id: 'tallas-bloque', label: 'Tallas', icono: ICONOS.tallas, abrir: 'tallas-chk' },
  { id: 'contacto', label: 'Contacto', icono: ICONOS.contacto },
];

/** Menú fijo en la parte inferior (solo móvil/tablet). Resalta la sección que se está viendo. */
export default function MenuInferior() {
  const [activo, setActivo] = useState('inicio');
  const [oculto, setOculto] = useState(false);

  // Resalta la pestaña de la sección visible
  useEffect(() => {
    const els = TABS.map((t) => document.getElementById(t.id)).filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) setActivo(e.target.id); },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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

  const tocar = (t: Tab) => {
    setActivo(t.id);
    if (t.abrir) {
      const chk = document.getElementById(t.abrir) as HTMLInputElement | null;
      if (chk) chk.checked = true; // abre el bloque plegable antes de llegar a él
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <nav className="mi" aria-label="Menú principal" data-oculto={oculto}>
        {TABS.map((t) => (
          <a key={t.id} className="mi-t" href={`#${t.id}`} data-on={activo === t.id}
            aria-current={activo === t.id ? 'true' : undefined} onClick={() => tocar(t)}>
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
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); background: rgba(6,24,16,.97); backdrop-filter: blur(12px);
    border-top: 1px solid rgba(240,214,128,.4); box-shadow: 0 -10px 30px rgba(0,0,0,.35); transition: transform .25s ease; }
  .mi[data-oculto="true"] { transform: translateY(110%); }
  .mi-t { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 54px; border-radius: 12px;
    color: #e4ece7; text-decoration: none; font: 600 11px/1 system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing: .01em; -webkit-tap-highlight-color: transparent; }
  .mi-t svg { color: #f3e6b3; transition: transform .2s ease; }
  .mi-t[data-on="true"] { color: #ffe9a0; background: rgba(240,214,128,.16); }
  .mi-t[data-on="true"] svg { color: #ffd966; transform: translateY(-1px) scale(1.1); }
  .mi-t:active { background: rgba(240,214,128,.22); }
}
@media (prefers-reduced-motion: reduce) { .mi, .mi-t svg { transition: none; } }
`;