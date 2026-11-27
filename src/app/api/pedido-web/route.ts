// 📁 RUTA: src/app/api/pedido-web/route.ts   (ARCHIVO NUEVO)
// Recibe el pedido del carrito de Karen Sprockel's y lo guarda en la pestaña "Pedidos" de SU hoja
// (con su joyeria_id). Los pedidos de Hans siguen yendo a /api/hans/pedido-web → panel de Hans.
// Precios, cupón, zona y domicilio se recalculan AQUÍ: lo que mande el navegador no se toma como válido.
import { NextResponse } from 'next/server';
import { leerConfig } from '@/lib/configuracion';
import { leerPrendasPublicas } from '@/lib/prendas';
import { normalizarPrendas } from '@/lib/prendas-publicas';
import { listar as leerPromociones } from '@/lib/promociones-store';
import { estadoPromo, type Promocion } from '@/types/promocion';
import { parseZonas, valorDomicilio, mismaZona } from '@/lib/zonas';
import { guardarPedidoTienda, nuevoCodigo, type ItemPedido } from '@/lib/pedidos-tienda';
import { joyeriaActual } from '@/lib/joyeria';

export const dynamic = 'force-dynamic';

const ID_MANILLA = 'malla-personalizada';   // id interno de la manilla armada en el visor 3D (no cambiar: carritos guardados)
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const celular = (t: string) => {
  let d = t.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return d;
};
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

type ItemIn = { id?: unknown; nombre?: unknown; tamano?: unknown; qty?: unknown; precio?: unknown };

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (txt(b.hp, 50)) return NextResponse.json({ codigo: 'OK', total: 0 }, { status: 201 });   // trampa anti-spam

    const cfg = await leerConfig();

    /* ── Cliente y entrega ── */
    const cliente = txt(b.nombre, 120);
    const telefono = celular(txt(b.telefono, 30));
    const entrega = b.entrega === 'recoger' ? 'recoger' : 'domicilio';
    if (cliente.length < 3) throw new Error('Escribe tu nombre y apellido.');
    if (!/^3\d{9}$/.test(telefono)) throw new Error('Escribe un celular válido (10 dígitos).');

    const zonas = parseZonas(cfg.cobertura);
    let zona = '';
    if (entrega === 'domicilio') {
      const pedida = txt(b.zona, 80);
      if (zonas.length) {
        zona = zonas.find((z) => mismaZona(z, pedida)) ?? '';
        if (!zona) throw new Error('Elige una zona de entrega de la lista.');
      } else {
        zona = pedida;
        if (zona.length < 2) throw new Error('Indica la zona de entrega.');
      }
      if (txt(b.barrio, 80).length < 2) throw new Error('Indica el barrio.');
      if (txt(b.direccion, 220).length < 5) throw new Error('Escribe la dirección completa.');
    }

    /* ── Piezas con el precio real del catálogo ── */
    const crudos: ItemIn[] = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
    if (!crudos.length) throw new Error('Tu carrito está vacío.');

    const catalogo = normalizarPrendas(
      (await leerPrendasPublicas().catch(() => [])) as unknown[],
      cfg as unknown as Record<string, unknown>,
    );

    const items: ItemPedido[] = [];
    for (const it of crudos) {
      const id = txt(it.id, 120);
      const tamano = txt(it.tamano, 120);
      const cant = Math.floor(Number(it.qty) || 0);
      if (cant < 1) throw new Error('Cantidad inválida en el carrito.');

      if (id === ID_MANILLA) {
        // Manilla armada a medida: se fabrica a pedido; el precio lo confirma la joyería
        const precio = Math.max(0, Math.round(Number(it.precio) || 0));
        if (cant > 5) throw new Error('Máximo 5 manillas iguales por pedido.');
        items.push({ id, nombre: txt(it.nombre, 160) || 'Manilla personalizada', tamano, cant, precio });
        continue;
      }

      const p = catalogo.find((x) => x.id === id);
      const v = p?.variantes.find((x) => x.tamano === tamano) ?? (p && p.variantes.length === 1 ? p.variantes[0] : undefined);
      if (!p || !v) throw new Error('Una pieza ya no está disponible. Actualiza la página.');
      if (v.stock <= 0) throw new Error(`${p.nombre} está agotado.`);
      if (cant > v.stock) throw new Error(`De ${p.nombre} solo quedan ${v.stock}.`);
      if (!(v.precio > 0)) throw new Error(`${p.nombre} no tiene precio. Escríbenos por WhatsApp.`);
      items.push({ id: p.id, nombre: p.nombre, tamano: v.tamano, cant, precio: v.precio });
    }

    const subtotal = items.reduce((s, i) => s + i.cant * i.precio, 0);

    /* ── Cupón (solo si sigue activo) ── */
    let cupon = '';
    let descuento = 0;
    const codCupon = txt(b.cupon, 40).toUpperCase();
    if (codCupon) {
      const promos = (await leerPromociones().catch(() => [])) as Promocion[];
      const p = promos.find((x) => String(x.codigo ?? '').toUpperCase() === codCupon && estadoPromo(x, hoyBogota()) === 'activa');
      if (p) {
        cupon = p.codigo;
        descuento = Math.min(subtotal, p.tipo === 'porcentaje' ? Math.round((subtotal * Number(p.valor)) / 100) : Number(p.valor) || 0);
      }
    }

    /* ── Domicilio (valor de la hoja Configuración) ── */
    const domicilio = entrega === 'domicilio' ? valorDomicilio(cfg.domicilio) : 0;
    const total = subtotal - descuento + domicilio;

    // ⟵ CAMBIO: el MISMO id con el que el panel filtra los pedidos (JOYERIA_ID / joyeriaActual)
    const joyeriaId =
      process.env.JOYERIA_ID?.trim() ||
      String((await Promise.resolve().then(() => joyeriaActual()).catch(() => '')) || '') ||
      cfg.id || 'jks';

    const pedido = await guardarPedidoTienda({
      codigo: nuevoCodigo(),
      fecha: new Date().toISOString(),
      joyeria_id: joyeriaId,
      tienda: cfg.nombre || "Karen Sprockel's",
      cliente,
      telefono,
      email: txt(b.correo, 120),
      entrega: entrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda',
      zona,
      barrio: entrega === 'domicilio' ? txt(b.barrio, 80) : '',
      direccion: entrega === 'domicilio' ? [txt(b.direccion, 220), txt(b.complemento, 120)].filter(Boolean).join(', ') : '',
      indicaciones: txt(b.indicaciones, 300),
      items,
      subtotal,
      cupon,
      descuento,
      domicilio,
      total,
      metodo_pago: 'Por confirmar',
      pago_estado: 'pendiente',
      estado: 'nuevo',
      origen: 'web',
    });

    return NextResponse.json({ codigo: pedido.codigo, subtotal, descuento, cupon, domicilio, zona, total }, { status: 201 });
  } catch (e) {
    console.error('[pedido-web POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear el pedido' }, { status: 400 });
  }
}