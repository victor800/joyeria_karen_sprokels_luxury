// 📁 RUTA: src/app/dashboard/inventario/page.tsx
import { leerConfig } from '@/lib/configuracion';
import { listarInventario } from '@/lib/inventario';
import InventarioPanel from './InventarioPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [items, cfg] = await Promise.all([listarInventario(), leerConfig()]);

  // Los precios salen de la hoja de Configuración (p24, p18, p14, margen)
  const precios = {
    p24: cfg.p24 ?? '',
    p18: cfg.p18 ?? '',
    p14: cfg.p14 ?? '',
    margen: cfg.margen ?? '',
  };

  return <InventarioPanel inicial={items} precios={precios} />;
}