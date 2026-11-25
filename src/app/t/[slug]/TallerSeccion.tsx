// 📁 RUTA: src/app/t/[slug]/TallerSeccion.tsx   (ARCHIVO NUEVO)
import SeccionHero from './SeccionHero';

const LOGO = '/logo-jks.jpeg';
const VIDEO_HERO = '/taller.mp4';
const VIDEO_FUNDIDO = '/fundido.mp4';

/** Edita aquí los textos del taller */
const SERVICIOS = [
  { t: 'Reparación', d: 'Soldaduras, ajuste de tallas, cambio de broches y pulido para que tu joya quede como nueva.' },
  { t: 'Fabricación', d: 'Fabricamos la pieza a partir de tu idea o de una referencia, en el oro que elijas.' },
  { t: 'Elaboración de joya', d: 'Anillos, argollas, dijes y pulseras hechos a mano en nuestro taller, de principio a fin.' },
  { t: 'Rediseño', d: 'Convertimos una joya que ya no usas en una pieza nueva.' },
];

type Props = { wa: string; marca: string; direccion?: string; horario?: string };

export default function TallerSeccion({ wa, marca, direccion, horario }: Props) {
  const mapa = direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : '';
  const msg = (t: string) => (wa === '#' ? '#' : `${wa}?text=${encodeURIComponent(t)}`);

  return (
    <SeccionHero
      id="taller"
      logo={LOGO}
      alt={`Taller ${marca}`}
      tag="Taller de joyería"
      titulo={<>Reparación,<br />fabricación<br />y elaboración</>}
      texto="Trabajamos el oro en nuestro propio taller. Repara, crea o transforma tu joya con quien la hace."
      video={VIDEO_HERO}
      wa={wa}
      msgWa={`Hola ${marca}, quiero consultar por el taller.`}
    >
      <style>{`
        .tl-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 28px; align-items: start; }
        .tl-vid { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid rgba(224,183,63,.35); background: #000; box-shadow: 0 18px 40px rgba(0,0,0,.45); }
        .tl-vid video { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
        .tl-vid figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 38px 18px 16px; pointer-events: none;
          background: linear-gradient(0deg, rgba(3,12,8,.9), transparent); font-family: var(--serif), Georgia, serif; font-size: 20px; color: #fbf6e6; }
        .tl-serv { display: grid; gap: 12px; }
        .tl-s { padding: 16px 18px; border-radius: 14px; border: 1px solid rgba(224,183,63,.28); background: linear-gradient(175deg, #0c3322, #07140e 60%, #030806); }
        .tl-s h4 { margin: 0 0 6px; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 21px; color: #f0d680; }
        .tl-s p { margin: 0; font-size: 14px; line-height: 1.6; color: #c5d0c8; }
        .tl-fis { margin-top: 28px; display: flex; gap: 20px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 22px 24px; border-radius: 18px;
          border: 1px solid rgba(224,183,63,.45); background: rgba(224,183,63,.06); }
        .tl-fis h4 { margin: 0 0 6px; font-family: var(--serif), Georgia, serif; font-weight: 500; font-size: 24px; color: #fbf6e6; }
        .tl-fis p { margin: 2px 0; font-size: 14px; color: #c5d0c8; }
        .tl-fis .mw-cta { flex-shrink: 0; }
        @media (max-width: 860px) {
          .tl-grid { grid-template-columns: 1fr; }
          .tl-vid video { aspect-ratio: 4 / 3; }
          .tl-fis .mw-cta, .tl-fis .mw-btn { width: 100%; }
        }
      `}</style>

      <div className="mw-tit"><small>Nuestro taller</small><h3>Del fundido a la joya terminada</h3><i /></div>

      <div className="tl-grid">
        <figure className="tl-vid" style={{ margin: 0 }}>
          <video src={VIDEO_FUNDIDO} muted loop playsInline controls preload="metadata" aria-label="Proceso de fundición del oro" />
          <figcaption>El oro, fundido en el taller</figcaption>
        </figure>
        <div className="tl-serv">
          {SERVICIOS.map((s) => (
            <div className="tl-s" key={s.t}><h4>{s.t}</h4><p>{s.d}</p></div>
          ))}
        </div>
      </div>

      <div className="tl-fis">
        <div>
          <h4>Ventas físicas</h4>
          <p>Ven a ver las piezas en persona y te asesoramos en el momento.</p>
          {direccion && <p>{direccion}</p>}
          {horario && <p>{horario}</p>}
        </div>
        <div className="mw-cta">
          {wa !== '#' && <a className="mw-btn solid" href={msg(`Hola ${marca}, quiero una cotización para el taller.`)} target="_blank" rel="noopener noreferrer">Pedir cotización</a>}
          {mapa && <a className="mw-btn" href={mapa} target="_blank" rel="noopener noreferrer">Cómo llegar</a>}
        </div>
      </div>
    </SeccionHero>
  );
}