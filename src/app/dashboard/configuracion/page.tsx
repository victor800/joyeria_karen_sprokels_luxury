// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
import { redirect } from 'next/navigation';
import { leerConfig, urlTienda, origenSitio } from '@/lib/configuracion';
import { autorizada } from '@/lib/admin';
import ConfiguracionForm from './ConfiguracionForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await autorizada())) redirect('/login');

  const cfg = await leerConfig();
  const inicial = { ...cfg, url_tienda: urlTienda(origenSitio(), cfg.slug) };

  return <ConfiguracionForm inicial={inicial} />;
}