// 📁 RUTA: src/app/t/[slug]/TallerReparacionBloque.tsx   (ARCHIVO NUEVO)
'use client';

import { TallerReparacion } from './SeccionesTaller';

/** "Taller de reparación" que antes era la 3.ª pestaña del catálogo; ahora vive en la sección del taller, abajo */
export default function TallerReparacionBloque({ wa }: { wa: string }) {
  return (
    <div className="mw-gris">
      <section className="mw-sec mw-dark" id="reparacion" aria-label="Taller de reparación">
        <div className="mw-wrap">
          <TallerReparacion wa={wa} />
        </div>
      </section>
    </div>
  );
}