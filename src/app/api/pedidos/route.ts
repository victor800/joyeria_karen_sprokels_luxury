// 📁 RUTA: src/app/api/pedidos/route.ts
import { NextResponse } from 'next/server';
import { crearPedido, type NuevoPedido } from '@/lib/pedidos';
import { crearPedidoHans } from '@/lib/hans';

export const dynamic = 'force-dynamic';

/** ID de la joyería de Karen en la hoja de Pedidos */
const JOYERIA_KAREN = process.env.JOYERIA_KAREN_ID || 'jks_e1852bd04257';

/** Slug de /t/[slug] → admin que recibe el pedido. Ajusta a tus slugs reales. */
function adminDe(slug: string): 'hans' | 'karen' | null {
  const s = slug.trim().toLowerCase();
  if (s.includes('hans') || s.includes('hanks')) return 'hans';
  if (s.includes('karen')) return 'karen';
  return null;
}

/* ── Límite simple por IP (en memoria; en serverless es por instancia) ── */
const intentos = new Map<string, number[]>();
function limitado(ip: string) {
  const ahora = Date.now();
  const ventana = 10 * 60 * 1000;
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < ventana);
  lista.push(ahora);
  intentos.set(ip, lista);
  if (intentos.size > 5000) intentos.clear();
  return lista.length > 6;
}

const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

function validar(b: any): string | null {
  if (!b || typeof b !== 'object') return 'Pedido inválido';
  if (typeof b.slug !== 'string' || !b.slug.trim()) return 'Falta la tienda';
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 50) return 'El pedido no tiene piezas';
  for (const i of b.items) {
    if (typeof i?.nombre !== 'string' || !i.nombre.trim()) return 'Pieza inválida';
    if (!Number.isInteger(i.qty) || i.qty < 1 || i.qty > 99) return 'Cantidad inválida';
    if (!Number.isFinite(Number(i.precio)) || Number(i.precio) < 0) return 'Precio inválido';
  }
  const e = b.envio;
  if (!e || typeof e !== 'object') return 'Faltan los datos de entrega';
  if (txt(e.nombre, 120).length < 5) return 'Nombre inválido';
  if (!/^3\d{9}$/.test(String(e.telefono ?? ''))) return 'Celular inválido';
  if (e.entrega !== 'domicilio' && e.entrega !== 'recoger') return 'Forma de entrega inválida';
  if (e.entrega === 'domicilio' && (!txt(e.ciudad, 80) || !txt(e.barrio, 80) || !txt(e.direccion, 120))) {
    return 'Dirección incompleta';
  }
  return null;
}

/** Totales recalculados con las líneas recibidas (no se confía en el "total" del navegador) */
function calcular(b: any) {
  const subtotal = b.items.reduce((a: number, i: any) => a + Number(i.precio) * i.qty, 0);
  const descuento = Math.min(subtotal, Math.max(0, Number(b.descuento) || 0));
  return { subtotal, descuento, total: Math.round(subtotal - descuento) };
}

/** Texto de la nota: marca de origen, cupón, correo e indicaciones */
function notaDe(b: any, descuento: number, max: number) {
  const e = b.envio;
  return [
    'Pedido desde la web',
    b.cupon ? `Cupón ${txt(b.cupon, 30)} (−$${descuento.toLocaleString('es-CO')})` : '',
    e.entrega === 'recoger' ? 'Recoge en tienda' : '',
    e.correo ? `Correo: ${txt(e.correo, 80)}` : '',
    e.indicaciones ? `Indicaciones: ${txt(e.indicaciones, 200)}` : '',
  ].filter(Boolean).join(' | ').slice(0, max);
}

/* ═════════ Karen: fila de la hoja "Pedidos" ═════════ */
function aPedidoKaren(b: any): NuevoPedido {
  const e = b.envio;
  const { total, descuento } = calcular(b);

  const destino = e.entrega === 'domicilio'
    ? [txt(e.direccion, 120), txt(e.complemento, 60), txt(e.barrio, 80), txt(e.ciudad, 80)].filter(Boolean).join(', ')
    : 'Recoger en tienda';

  const prenda = b.items
    .map((i: any) => `${txt(i.nombre, 80)}${i.tamano ? ` (${txt(i.tamano, 30)})` : ''} x${i.qty}`)
    .join(' · ')
    .slice(0, 400);

  return {
    cliente: txt(e.nombre, 120),
    telefono: String(e.telefono),
    destino,
    prenda,
    total,
    entrega: '',            // la fecha la define Karen en el panel
    estado: 'Pendiente',
    pago: 'Pendiente',
    nota: notaDe(b, descuento, 500),
    domiciliarioId: '',
    domiciliarioNombre: '',
    valorDomicilio: 0,
  };
}

/* ═════════ Hans: formato de crearPedidoHans (hoja "Hans_Pedidos") ═════════ */
function aPedidoHans(b: any): Record<string, unknown> {
  const e = b.envio;
  const { total, descuento } = calcular(b);

  const direccion = e.entrega === 'domicilio'
    ? [txt(e.direccion, 120), txt(e.complemento, 60), txt(e.barrio, 80)].filter(Boolean).join(', ')
    : 'Recoger en tienda';

  return {
    cliente: txt(e.nombre, 120),
    telefono: String(e.telefono),
    email: txt(e.correo, 80),
    direccion: direccion.slice(0, 300),
    ciudad: e.entrega === 'domicilio' ? txt(e.ciudad, 80) : '',
    items: b.items.map((i: any) => ({
      id: txt(i.id, 60),
      nombre: txt(i.nombre, 80),
      tamano: txt(i.tamano, 30),
      cantidad: i.qty,
      qty: i.qty,
      precio: Math.round(Number(i.precio)),
    })),
    tipo: 'menudeo',
    total,
    metodo_pago: '',
    pago_estado: 'pendiente',
    notas: notaDe(b, descuento, 1000),
    origen: 'web',
  };
}

/** Se mantiene como estaba (sin datos). Los pedidos se leen desde cada panel de admin. */
export async function GET() {
  return NextResponse.json({ pedidos: [] });
}

/** Público: lo llama el botón "Pedir" del catálogo. No requiere sesión de admin. */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limitado(ip)) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 });

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  const falla = validar(cuerpo);
  if (falla) return NextResponse.json({ error: falla }, { status: 400 });

  const admin = adminDe(cuerpo.slug);
  if (!admin) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 });

  try {
    if (admin === 'karen') {
      const numero = await crearPedido(JOYERIA_KAREN, aPedidoKaren(cuerpo));
      return NextResponse.json({ ok: true, id: numero }, { status: 201 });
    }

    // web = true → siempre entra como "nuevo" y sin domiciliario
    const pedido = await crearPedidoHans(aPedidoHans(cuerpo), true);
    return NextResponse.json({ ok: true, id: pedido.codigo }, { status: 201 });
  } catch (e) {
    console.error('[pedidos POST]', admin, e);
    return NextResponse.json({ error: 'No se pudo registrar el pedido' }, { status: 500 });
  }
}