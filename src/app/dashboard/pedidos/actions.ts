'use server';
import { revalidatePath } from 'next/cache';
import { joyeriaActual } from '@/lib/joyeria';
import { crearPedido, ESTADOS, PAGOS } from '@/lib/pedidos';
import { domiciliariosAsignables } from '@/lib/domiciliarios-lista';

const aNumero = (v: unknown) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;

export async function crearPedidoAction(d: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const joyeriaId = await joyeriaActual();
    const cliente = (d.cliente ?? '').trim().slice(0, 120);
    const prenda = (d.prenda ?? '').trim().slice(0, 200);
    const total = aNumero(d.total);
    const valorDomicilio = aNumero(d.valorDomicilio);
    const nota = (d.nota ?? '').trim().slice(0, 300);
    const entrega = /^\d{4}-\d{2}-\d{2}$/.test(d.entrega ?? '') ? d.entrega : '';
    const estado = (ESTADOS as readonly string[]).includes(d.estado) ? d.estado : 'Pendiente';
    const pago = (PAGOS as readonly string[]).includes(d.pago) ? d.pago : 'Pendiente';

    if (!cliente) return { ok: false, error: 'Escribe el nombre del cliente.' };
    if (!prenda) return { ok: false, error: 'Indica la prenda.' };
    if (!total) return { ok: false, error: 'El total debe ser mayor a 0.' };

    let domiciliarioId = '';
    let domiciliarioNombre = '';
    if (d.domiciliarioId) {
      const dom = (await domiciliariosAsignables(joyeriaId)).find((x) => x.id === d.domiciliarioId);
      if (!dom) return { ok: false, error: 'Ese domiciliario ya no está disponible. Elige otro.' };
      domiciliarioId = dom.id;
      domiciliarioNombre = dom.nombre;
    }

    await crearPedido(joyeriaId, {
      cliente, prenda, total, entrega, estado, pago, nota, domiciliarioId, domiciliarioNombre, valorDomicilio,
    });
    revalidatePath('/dashboard/pedidos');
    return { ok: true };
  } catch (e) {
    console.error('crearPedidoAction', e);
    return { ok: false, error: 'No se pudo guardar en la hoja. Intenta de nuevo.' };
  }
}