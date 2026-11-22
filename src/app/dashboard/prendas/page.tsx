// 📁 RUTA: src/app/dashboard/prendas/page.tsx
import { redirect } from 'next/navigation';
import { autorizada } from '@/lib/admin';
import { leerConfig } from '@/lib/configuracion';
import { listarPrendas } from '@/lib/prendas';
import PrendasPanel from './PrendasPanel';

export const dynamic = 'force-dynamic';

export default async function Prendas() {
  if (!(await autorizada())) redirect('/login');

  const [prendas, cfg] = await Promise.all([listarPrendas(), leerConfig()]);
  const precios = { p24: cfg.p24 ?? '', p18: cfg.p18 ?? '', p14: cfg.p14 ?? '', margen: cfg.margen ?? '' };

  return <PrendasPanel inicial={prendas} precios={precios} />;
}