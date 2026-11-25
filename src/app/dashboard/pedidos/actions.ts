'use server';
import { revalidatePath } from 'next/cache';
import { joyeriaActual } from '@/lib/joyeria';
import { crearPedido, ESTADOS } from '@/lib/pedidos';

export async function crearPedidoAction(d: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const cliente = (d.cliente ?? '').trim().slice(0, 120);
    const prenda = (d.prenda ?? '').trim().slice(0, 200);
    const total = Number(String(d.total ?? '').replace(/[^\d]/g, ''));
    const entrega = /^\d{4}-\d{2}-\d{2}$/.test(d.entrega ?? '') ? d.entrega : '';
    const estado = (ESTADOS as readonly string[]).includes(d.estado) ? d.estado : 'Pendiente';

    if (!cliente) return { ok: false, error: 'Escribe el nombre del cliente.' };
    if (!prenda) return { ok: false, error: 'Indica la prenda.' };
    if (!total) return { ok: false, error: 'El total debe ser mayor a 0.' };

    // El ID de la joyería sale del servidor, nunca del navegador
    await crearPedido(await joyeriaActual(), { cliente, prenda, total, entrega, estado });
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('crearPedidoAction', e);
    return { ok: false, error: 'No se pudo guardar en la hoja. Intenta de nuevo.' };
  }
}