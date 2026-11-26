// 📁 RUTA: src/app/api/hans/pedido-web/route.ts   (ARCHIVO NUEVO)
// Recibe el pedido del carrito público de Hans y lo guarda en el panel de Hans.
// Los precios se recalculan AQUÍ con el catálogo real: lo que mande el navegador no se toma como válido.
import { NextResponse } from 'next/server';
import { crearPedidoHans } from '@/lib/hans';
import { leerHansPublico } from '@/lib/hans-publico';

export const dynamic = 'force-dynamic';

const PAGOS = ['Efectivo', 'Transferencia', 'Contra entrega', 'Tarjeta / PSE'];
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

type ItemIn = { codigo?: unknown; modo?: unknown; cant?: unknown };

export async function POST(req: Request) {
  try {
    const b = await req.json();

    // Campo trampa anti-spam: si viene lleno, se ignora en silencio
    if (txt(b.hp, 50)) return NextResponse.json({ codigo: 'OK', total: 0 }, { status: 201 });

    const cliente = txt(b.cliente, 120);
    const telefono = txt(b.telefono, 30);
    const direccion = txt(b.direccion, 220);
    if (!cliente) throw new Error('Escribe tu nombre.');
    if (telefono.replace(/\D/g, '').length < 10) throw new Error('Escribe un celular válido.');
    if (!direccion) throw new Error('Escribe la dirección de entrega.');

    const crudos: ItemIn[] = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
    if (!crudos.length) throw new Error('Tu carrito está vacío.');

    const catalogo = await leerHansPublico();
    const items: { codigo: string; nombre: string; cant: number; precio: number }[] = [];
    let mayorista = 0;

    for (const it of crudos) {
      const codigo = txt(it.codigo, 60);
      const modo = it.modo === 'mayorista' ? 'mayorista' : 'menudeo';
      const cant = Math.floor(Number(it.cant) || 0);
      const x = catalogo.find((c) => c.codigo === codigo);
      if (!x) throw new Error(`Una pieza ya no está disponible (${codigo || 'sin código'}). Actualiza la página.`);
      if (cant < 1) throw new Error(`Cantidad inválida para ${x.nombre}.`);
      if (x.stock <= 0) throw new Error(`${x.nombre} está agotado.`);
      if (cant > x.stock) throw new Error(`De ${x.nombre} solo quedan ${x.stock} unidades.`);

      if (modo === 'mayorista') {
        if (x.tipo !== 'mayorista' && x.tipo !== 'ambos') throw new Error(`${x.nombre} no se vende al por mayor.`);
        const min = Math.max(1, x.minMayorista || 1);
        if (cant < min) throw new Error(`${x.nombre}: el mínimo al por mayor es ${min} unidades.`);
        mayorista++;
      } else if (x.tipo === 'mayorista') {
        throw new Error(`${x.nombre} solo se vende al por mayor.`);
      }

      const precio = modo === 'mayorista' ? x.mayorista || x.menudeo : x.menudeo || x.mayorista;
      if (!(precio > 0)) throw new Error(`${x.nombre} no tiene precio. Escríbenos por WhatsApp.`);

      const i = items.findIndex((l) => l.codigo === x.codigo && l.precio === precio);
      if (i >= 0) items[i].cant += cant;
      else items.push({ codigo: x.codigo, nombre: x.nombre, cant, precio });
    }

    const total = items.reduce((s, l) => s + l.cant * l.precio, 0);
    const metodo = PAGOS.includes(String(b.metodo_pago)) ? String(b.metodo_pago) : 'Efectivo';

    const pedido = (await crearPedidoHans(
      {
        cliente,
        telefono,
        email: txt(b.email, 120),
        direccion,
        ciudad: txt(b.ciudad, 80),
        tipo: mayorista === items.length ? 'mayorista' : 'menudeo',
        metodo_pago: metodo,
        pago_estado: 'pendiente',
        fecha_entrega: '',
        notas: txt(b.notas, 400),
        items,
        total,
        origen: 'web',
      },
      true, // viene de la web pública
    )) as { codigo?: string };

    return NextResponse.json({ codigo: pedido?.codigo ?? '', total }, { status: 201 });
  } catch (e) {
    console.error('[hans pedido-web POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear el pedido' }, { status: 400 });
  }
}