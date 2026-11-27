// 📁 RUTA: src/app/dashboard/pedidos/page.tsx   (REEMPLAZA TODO EL ARCHIVO — si tu página de pedidos está en otra carpeta, pégalo ahí)
import PedidosTabla from '@/components/dashboard/PedidosTabla';
import PedidosEnVivo from '@/components/dashboard/PedidosEnVivo';   // ⟵ CAMBIO: pedidos en vivo con sonido
import type { Campo } from '@/lib/campos';
import type { Cel } from '@/lib/datos-dashboard';
import { joyeriaActual } from '@/lib/joyeria';
import { ESTADOS, PAGOS, leerPedidos } from '@/lib/pedidos';
import { domiciliariosAsignables, type OpcionDomiciliario } from '@/lib/domiciliarios-lista';
import { crearPedidoAction, editarPedidoAction, eliminarPedidoAction } from './actions';

export const dynamic = 'force-dynamic';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default async function Pedidos() {
  let filas: Cel[][] = [];
  let domiciliarios: OpcionDomiciliario[] = [];
  let aviso: string | undefined;
  let leido = false;   // ⟵ CAMBIO: solo se compara la cantidad si la hoja se leyó bien (evita falsas alarmas)
  try {
    const id = await joyeriaActual();
    [filas, domiciliarios] = await Promise.all([leerPedidos(id), domiciliariosAsignables(id)]);
    leido = true;
  } catch (e) {
    console.error('Pedidos', e);
    aviso = 'No se pudo leer la hoja de pedidos. Revisa las variables de Google Sheets y JOYERIA_ID.';
  }

  // Teléfono de cada domiciliario (nombre normalizado → teléfono) para el mensaje de WhatsApp.
  // Requiere que OpcionDomiciliario incluya `telefono`; si no existe, el mensaje sale sin teléfono.
  const telefonosDomi: Record<string, string> = {};
  for (const d of domiciliarios) {
    const tel = (d as OpcionDomiciliario & { telefono?: string }).telefono;
    if (tel) telefonosDomi[norm(d.nombre)] = tel;
  }

  // Nombre de la joyería para el saludo. Cámbialo por el dato real de tu joyería si ya lo tienes en otra función.
  const nombreJoyeria = process.env.NOMBRE_JOYERIA || 'nuestra joyería';

  const campos: Campo[] = [
    { name: 'cliente', label: 'Cliente', tipo: 'text', requerido: true, placeholder: 'Nombre del cliente', completo: true },
    { name: 'telefono', label: 'Teléfono / WhatsApp', tipo: 'text', placeholder: '300 123 4567' },
    { name: 'destino', label: 'Dirección de entrega', tipo: 'text', placeholder: 'Barrio, calle, referencia' },
    { name: 'prenda', label: 'Artículos', tipo: 'text', requerido: true, placeholder: 'Ej. Anillo oro 18K, collar plata', completo: true },
    { name: 'total', label: 'Valor del pedido (COP)', tipo: 'number', requerido: true, placeholder: '0' },
    { name: 'valorDomicilio', label: 'Valor domicilio (COP)', tipo: 'number', placeholder: '0' },
    { name: 'entrega', label: 'Entrega', tipo: 'date' },
    { name: 'estado', label: 'Estado del pedido', tipo: 'select', opciones: [...ESTADOS] },
    { name: 'pago', label: 'Pago', tipo: 'select', opciones: [...PAGOS] },
    {
      name: 'domiciliarioId',
      label: 'Domiciliario',
      tipo: 'select',
      opciones: [{ value: '', label: 'Sin asignar' }, ...domiciliarios.map((d) => ({ value: d.id, label: d.nombre }))],
    },
    { name: 'nota', label: 'Nota', tipo: 'textarea', placeholder: 'Indicaciones, detalles…', completo: true },
  ];

  return (
    <>
      <PedidosTabla
        filas={filas}
        campos={campos}
        onCrear={crearPedidoAction}
        onEditar={editarPedidoAction}
        onEliminar={eliminarPedidoAction}
        nombreJoyeria={nombreJoyeria}
        telefonosDomi={telefonosDomi}
        aviso={aviso}
      />
      {/* ⟵ CAMBIO: revisa cada 8 s, suena y avisa cuando llega un pedido nuevo de la tienda */}
      {leido && <PedidosEnVivo cantidad={filas.length} cadaSegundos={8} />}
    </>
  );
}