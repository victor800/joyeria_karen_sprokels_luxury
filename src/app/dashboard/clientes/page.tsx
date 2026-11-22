// 📁 RUTA: src/app/dashboard/clientes/page.tsx
import ClientesVista from '@/components/dashboard/clientes/ClientesVista';
import { listar } from '@/lib/clientes-store';

export const dynamic = 'force-dynamic';

export default async function Clientes() {
  const filas = await listar();
  return <ClientesVista filas={filas} />;
}