// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
import { leerConfig, urlTienda, origenSitio } from '@/lib/configuracion';
import ConfiguracionForm from './ConfiguracionForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cfg = await leerConfig();
  const inicial = { ...cfg, url_tienda: urlTienda(origenSitio(), cfg.slug) };
  return <ConfiguracionForm inicial={inicial} />;
}