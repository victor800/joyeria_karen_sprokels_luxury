// 📁 RUTA: src/app/dashboard/promociones/page.tsx
import PromocionesVista from '@/components/dashboard/promociones/PromocionesVista';
import { listar } from '@/lib/promociones-store';
import { hoyBogota } from '@/types/promocion';

export const dynamic = 'force-dynamic';

export default async function Promociones() {
  const filas = await listar();
  return <PromocionesVista filas={filas} hoy={hoyBogota()} />;
}