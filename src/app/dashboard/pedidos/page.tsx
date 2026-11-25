import PaginaTabla, { type Campo } from '@/components/dashboard/PaginaTabla';
import type { Cel } from '@/lib/datos-dashboard';
import { joyeriaActual } from '@/lib/joyeria';
import { ESTADOS, PAGOS, leerPedidos } from '@/lib/pedidos';
import { domiciliariosAsignables, type OpcionDomiciliario } from '@/lib/domiciliarios-lista';
import { crearPedidoAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function Pedidos() {
  let filas: Cel[][] = [];
  let domiciliarios: OpcionDomiciliario[] = [];
  let aviso: string | undefined;
  try {
    const id = await joyeriaActual();
    [filas, domiciliarios] = await Promise.all([leerPedidos(id), domiciliariosAsignables(id)]);
  } catch (e) {
    console.error('Pedidos', e);
    aviso = 'No se pudo leer la hoja de pedidos. Revisa las variables de Google Sheets y JOYERIA_ID.';
  }

  const campos: Campo[] = [
    { name: 'cliente', label: 'Cliente', tipo: 'text', requerido: true, placeholder: 'Nombre del cliente', completo: true },
    { name: 'prenda', label: 'Prenda', tipo: 'text', requerido: true, placeholder: 'Ej. Anillo oro 18K', completo: true },
    { name: 'total', label: 'Total (COP)', tipo: 'number', requerido: true, placeholder: '0' },
    { name: 'entrega', label: 'Entrega', tipo: 'date' },
    { name: 'estado', label: 'Estado del pedido', tipo: 'select', opciones: [...ESTADOS] },
    { name: 'pago', label: 'Pago', tipo: 'select', opciones: [...PAGOS] },
    {
      name: 'domiciliarioId',
      label: 'Domiciliario',
      tipo: 'select',
      opciones: [{ value: '', label: 'Sin asignar' }, ...domiciliarios.map((d) => ({ value: d.id, label: d.nombre }))],
    },
    { name: 'valorDomicilio', label: 'Valor domicilio (COP)', tipo: 'number', placeholder: '0' },
    { name: 'nota', label: 'Nota', tipo: 'textarea', placeholder: 'Indicaciones, dirección, detalles…', completo: true },
  ];

  return (
    <PaginaTabla
      titulo="Pedidos"
      sub="Ventas en tienda y domicilios, del pedido a la entrega."
      accion="Nuevo pedido"
      cols={['N°', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado', 'Pago', 'Domiciliario', 'Domicilio', 'Nota']}
      filas={filas}
      campos={campos}
      onCrear={crearPedidoAction}
      aviso={aviso}
      movil={{ titulo: 1, subtitulo: 0, estado: 5 }}
    />
  );
}