import PaginaTabla, { type Campo } from '@/components/dashboard/PaginaTabla';
import type { Cel } from '@/lib/datos-dashboard';
import { joyeriaActual } from '@/lib/joyeria';
import { ESTADOS, leerPedidos } from '@/lib/pedidos';
import { crearPedidoAction } from './actions';

export const dynamic = 'force-dynamic';

const campos: Campo[] = [
  { name: 'cliente', label: 'Cliente', tipo: 'text', requerido: true, placeholder: 'Nombre del cliente' },
  { name: 'prenda', label: 'Prenda', tipo: 'text', requerido: true, placeholder: 'Ej. Anillo oro 18K' },
  { name: 'total', label: 'Total (COP)', tipo: 'number', requerido: true, placeholder: '0' },
  { name: 'entrega', label: 'Entrega', tipo: 'date' },
  { name: 'estado', label: 'Estado', tipo: 'select', opciones: [...ESTADOS] },
];

export default async function Pedidos() {
  let filas: Cel[][] = [];
  let aviso: string | undefined;
  try {
    filas = await leerPedidos(await joyeriaActual());
  } catch (e) {
    console.error('leerPedidos', e);
    aviso = 'No se pudo leer la hoja de pedidos. Revisa las variables de Google Sheets y JOYERIA_ID.';
  }

  return (
    <PaginaTabla
      titulo="Pedidos"
      sub="Ventas en tienda y domicilios, del pedido a la entrega."
      accion="Nuevo pedido"
      cols={['N°', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado']}
      filas={filas}
      campos={campos}
      onCrear={crearPedidoAction}
      aviso={aviso}
      movil={{ titulo: 1, subtitulo: 0, estado: 5 }}
    />
  );
}