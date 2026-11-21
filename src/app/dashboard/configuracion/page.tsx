// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
import { redirect } from 'next/navigation';
import { leerConfig, urlTienda } from '@/lib/configuracion';
import { autorizada } from '@/lib/admin';
import ConfiguracionForm from './ConfiguracionForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!(await autorizada())) redirect('/login');

  const cfg = await leerConfig();
  const origen = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inicial = { ...cfg, url_tienda: urlTienda(origen, cfg.slug) };

  return <ConfiguracionForm inicial={inicial} />;
}