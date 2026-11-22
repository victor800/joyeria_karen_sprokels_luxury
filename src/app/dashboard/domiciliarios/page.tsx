import DomiciliariosVista from '@/components/dashboard/domiciliarios/DomiciliariosVista';
import { listar } from '@/lib/domiciliarios-store';
import { obtenerLocales } from '@/lib/locales';

export const dynamic = 'force-dynamic';

export default async function Domiciliarios() {
  const [filas, locales] = await Promise.all([listar(), obtenerLocales()]);
  return <DomiciliariosVista filas={filas} locales={locales} />;
}