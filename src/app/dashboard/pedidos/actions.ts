// 📁 RUTA: src/app/dashboard/pedidos/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { joyeriaActual } from '@/lib/joyeria';
import { crearPedido, actualizarPedido, eliminarPedido, cambiarEstadoPedido, ESTADOS, PAGOS } from '@/lib/pedidos';
import { domiciliariosAsignables } from '@/lib/domiciliarios-lista';

type Resultado = { ok: boolean; error?: string };

const aNumero = (v: unknown) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const numeroValido = (numero: unknown) => /^[\w-]{1,20}$/.test(String(numero ?? '').trim());

/** Limpia y valida los datos del formulario (sirve para crear y para editar) */
async function prepararDatos(joyeriaId: string, d: Record<string, string>) {
  const cliente = (d.cliente ?? '').trim().slice(0, 120);
  const telefono = (d.telefono ?? '').replace(/[^\d+\s()-]/g, '').trim().slice(0, 25);
  const destino = (d.destino ?? '').trim().slice(0, 200);
  const prenda = (d.prenda ?? '').trim().slice(0, 200);
  const total = aNumero(d.total);
  const valorDomicilio = aNumero(d.valorDomicilio);
  const nota = (d.nota ?? '').trim().slice(0, 300);
  const entrega = /^\d{4}-\d{2}-\d{2}$/.test(d.entrega ?? '') ? d.entrega : '';
  const estado = (ESTADOS as readonly string[]).includes(d.estado) ? d.estado : 'Pendiente';
  const pago = (PAGOS as readonly string[]).includes(d.pago) ? d.pago : 'Pendiente';

  if (!cliente) return { error: 'Escribe el nombre del cliente.' } as const;
  if (!prenda) return { error: 'Indica los artículos.' } as const;
  if (!total) return { error: 'El valor del pedido debe ser mayor a 0.' } as const;

  let domiciliarioId = '';
  let domiciliarioNombre = '';
  if (d.domiciliarioId) {
    const dom = (await domiciliariosAsignables(joyeriaId)).find((x) => x.id === d.domiciliarioId);
    if (!dom) return { error: 'Ese domiciliario ya no está disponible. Elige otro.' } as const;
    domiciliarioId = dom.id;
    domiciliarioNombre = dom.nombre;
  }

  return {
    datos: { cliente, telefono, destino, prenda, total, entrega, estado, pago, nota, domiciliarioId, domiciliarioNombre, valorDomicilio },
  } as const;
}

export async function crearPedidoAction(d: Record<string, string>): Promise<Resultado> {
  try {
    const joyeriaId = await joyeriaActual();
    const r = await prepararDatos(joyeriaId, d);
    if ('error' in r) return { ok: false, error: r.error };
    await crearPedido(joyeriaId, r.datos);
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('crearPedidoAction', e);
    return { ok: false, error: 'No se pudo guardar en la hoja. Intenta de nuevo.' };
  }
}

export async function editarPedidoAction(numero: string, d: Record<string, string>): Promise<Resultado> {
  try {
    if (!numeroValido(numero)) return { ok: false, error: 'Pedido no válido.' };
    const joyeriaId = await joyeriaActual();
    const r = await prepararDatos(joyeriaId, d);
    if ('error' in r) return { ok: false, error: r.error };
    const ok = await actualizarPedido(joyeriaId, String(numero).trim(), r.datos);
    if (!ok) return { ok: false, error: 'No se encontró ese pedido. Actualiza la lista.' };
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('editarPedidoAction', e);
    return { ok: false, error: 'No se pudo guardar los cambios. Intenta de nuevo.' };
  }
}

export async function eliminarPedidoAction(numero: string): Promise<Resultado> {
  try {
    if (!numeroValido(numero)) return { ok: false, error: 'Pedido no válido.' };
    const joyeriaId = await joyeriaActual();
    const ok = await eliminarPedido(joyeriaId, String(numero).trim());
    if (!ok) return { ok: false, error: 'No se encontró ese pedido. Actualiza la lista.' };
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('eliminarPedidoAction', e);
    return { ok: false, error: 'No se pudo eliminar el pedido. Intenta de nuevo.' };
  }
}

export async function cambiarEstadoAction(numero: string, estado: string): Promise<Resultado> {
  try {
    if (!(ESTADOS as readonly string[]).includes(estado)) return { ok: false, error: 'Estado no válido.' };
    if (!numeroValido(numero)) return { ok: false, error: 'Pedido no válido.' };

    const joyeriaId = await joyeriaActual();
    const ok = await cambiarEstadoPedido(joyeriaId, String(numero).trim(), estado);
    if (!ok) return { ok: false, error: 'No se encontró ese pedido. Actualiza la lista.' };
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('cambiarEstadoAction', e);
    return { ok: false, error: 'No se pudo cambiar el estado. Intenta de nuevo.' };
  }
}