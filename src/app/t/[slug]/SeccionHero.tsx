// 📁 RUTA: src/app/t/[slug]/SeccionHero.tsx   (ARCHIVO NUEVO)
'use client';

import { useState, type ReactNode } from 'react';
import HeroVideo from './HeroVideo';

type Props = {
  id: string;
  logo: string;
  alt: string;
  tag: string;
  titulo: ReactNode;
  texto: string;
  video: string;
  wa: string;
  msgWa: string;
  children: ReactNode;
};

/** Hero con video (mismo look del inicio) + botón "Ver más" que despliega el contenido debajo. */
export default function SeccionHero({ id, logo, alt, tag, titulo, texto, video, wa, msgWa, children }: Props) {
  const [abierto, setAbierto] = useState(false);

  const alternar = () => {
    if (abierto) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else setTimeout(() => document.getElementById(`${id}-mas`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    setAbierto(!abierto);
  };

  return (
    <>
      <style>{`
        .hs-hero { min-height: min(86vh, 760px); }
        .hs-logo { margin: 0 0 22px 7px; }
        .hs-logo img { display: block; width: clamp(88px, 9vw, 124px); aspect-ratio: 1; border-radius: 50%; object-fit: cover; background: var(--vd); border: 2px solid var(--o2);
          box-shadow: 0 0 0 6px rgba(224,183,63,.14), 0 0 0 7px rgba(224,183,63,.38), 0 14px 34px rgba(0,0,0,.5); }
        .hs-hero button.mw-btn { background: transparent; cursor: pointer; font-family: inherit; }
        .hs-hero button.mw-btn.solid { background: linear-gradient(135deg, var(--o3), var(--o2) 55%, var(--o)); }
        .hs-hero button.mw-btn:focus-visible, .hs-hero a.mw-btn:focus-visible { outline: 2px solid var(--o3); outline-offset: 3px; }

        /* Panel que se despliega */
        .hs-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .5s ease; scroll-margin-top: 68px; color: #f4efdc;
          background: radial-gradient(ellipse 50% 40% at 0% 0%, rgba(15,95,59,.5), transparent 70%), radial-gradient(ellipse 45% 35% at 100% 60%, rgba(224,183,63,.1), transparent 70%), linear-gradient(180deg, #030c08, #06241a 50%, #030c08); }
        .hs-panel.on { grid-template-rows: 1fr; }
        .hs-in { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear .5s; }
        .hs-panel.on .hs-in { visibility: visible; transition-delay: 0s; }
        .hs-body { padding-top: 56px; padding-bottom: 64px; }
        .hs-panel .mw-tit h3 { color: #f4efdc; }
        @media (max-width: 600px) {
          .hs-hero { min-height: 74svh; }
          .hs-logo { margin-bottom: 18px; }
          .hs-logo img { width: 84px; }
          .hs-body { padding-top: 40px; padding-bottom: 48px; }
        }
        @media (prefers-reduced-motion: reduce) { .hs-panel, .hs-in { transition: none; } }
      `}</style>

      <section className="mw-hero hs-hero" id={id}>
        <HeroVideo src={video} />
        <div className="mw-shade" />
        <div className="mw-wrap mw-hero-in">
          <div className="mw-hero-txt">
            <div className="hs-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={alt} />
            </div>
            <span className="mw-tag">{tag}</span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
            <div className="mw-cta">
              <button type="button" className="mw-btn solid" aria-expanded={abierto} aria-controls={`${id}-mas`} onClick={alternar}>
                {abierto ? 'Ocultar' : 'Ver más'}
              </button>
              {wa !== '#' && (
                <a className="mw-btn" href={`${wa}?text=${encodeURIComponent(msgWa)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div id={`${id}-mas`} className={`hs-panel${abierto ? ' on' : ''}`} role="region" aria-label={alt}>
        <div className="hs-in">
          <div className="mw-wrap hs-body">{children}</div>
        </div>
      </div>
    </>
  );
}