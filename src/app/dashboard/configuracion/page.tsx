// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
import { leerConfig, urlTienda } from '@/lib/configuracion';
import { autorizada } from '@/lib/admin';
import ConfiguracionForm from './ConfiguracionForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await autorizada())) {
    return (
      <main className="d-cont simple">
        <h1>Configuración</h1>
        <p>No autorizado.</p>
      </main>
    );
  }

  const cfg = await leerConfig();
  const origen = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inicial = { ...cfg, url_tienda: urlTienda(origen, cfg.slug) };

  return <ConfiguracionForm inicial={inicial} />;
}