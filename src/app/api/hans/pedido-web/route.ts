// 📁 RUTA: src/app/api/hans/pedido-web/route.ts   (REEMPLAZA TODO EL ARCHIVO)
// Recibe el pedido del carrito público de Hans y lo guarda en el panel de Hans (joyeria_id: 'hans').
// Zona y domicilio salen de la hoja Configuración; total = prendas + domicilio.
// Los precios se recalculan AQUÍ con el catálogo real: lo que mande el navegador no se toma como válido.
// El estado SIEMPRE nace en "nuevo": solo el panel puede avanzarlo (recibido → en camino → entregado).
import { NextResponse } from 'next/server';
import { crearPedidoHans } from '@/lib/hans';
import { leerHansPublico } from '@/lib/hans-publico';
import { leerConfig } from '@/lib/configuracion';                     // ⟵ CAMBIO: zonas y domicilio de la hoja Configuración
import { parseZonas, valorDomicilio, mismaZona } from '@/lib/zonas';  // ⟵ CAMBIO

export const dynamic = 'force-dynamic';

const PAGOS = ['Efectivo', 'Transferencia', 'Contra entrega', 'Tarjeta / PSE'];
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
/** Primera foto de la pieza, tomada del catálogo real (no del navegador). Se omite si es una imagen incrustada o muy larga. */
const fotoDe = (x: { fotos?: unknown }) => {
  const f = Array.isArray(x.fotos) ? String(x.fotos[0] ?? '').trim() : '';
  return f.startsWith('data:') || f.length > 500 ? '' : f;
};

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

    // ⟵ CAMBIO: la zona debe ser una de la hoja Configuración (fila "cobertura")
    const cfg = await leerConfig();
    const zonas = parseZonas(cfg.cobertura);
    const pedida = txt(b.zona, 80);
    const zona = zonas.length ? zonas.find((z) => mismaZona(z, pedida)) ?? '' : pedida;
    if (!zona) throw new Error('Elige una zona de entrega de la lista.');
    const domicilio = valorDomicilio(cfg.domicilio);   // fila "domicilio" (ej: 18000)

    const crudos: ItemIn[] = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
    if (!crudos.length) throw new Error('Tu carrito está vacío.');

    const catalogo = await leerHansPublico();
    const items: { codigo: string; nombre: string; cant: number; precio: number; foto: string }[] = [];
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
      else items.push({ codigo: x.codigo, nombre: x.nombre, cant, precio, foto: fotoDe(x) });
    }

    const subtotal = items.reduce((s, l) => s + l.cant * l.precio, 0);
    const total = subtotal + domicilio;   // ⟵ CAMBIO: prendas + domicilio
    const metodo = PAGOS.includes(String(b.metodo_pago)) ? String(b.metodo_pago) : 'Efectivo';

    // Todo lo que decide el flujo lo fija el SERVIDOR; el navegador no puede mandar estado ni domiciliario.
    const datos = {
      cliente,
      telefono,
      email: txt(b.email, 120),
      direccion,
      ciudad: [zona, txt(b.barrio ?? b.ciudad, 80)].filter(Boolean).join(' · '),   // ⟵ CAMBIO: zona · barrio
      zona,          // ⟵ CAMBIO
      subtotal,      // ⟵ CAMBIO
      domicilio,     // ⟵ CAMBIO
      tipo: mayorista === items.length ? 'mayorista' : 'menudeo',
      metodo_pago: metodo,
      pago_estado: 'pendiente',
      estado: 'nuevo',
      fecha_entrega: '',
      domiciliario: '',
      domiciliario_tel: '',
      recibido_en: '',
      despachado_en: '',
      entregado_en: '',
      notas: [`Zona: ${zona} · Domicilio: $${domicilio.toLocaleString('es-CO')}`, txt(b.notas, 400)].filter(Boolean).join(' — '),   // ⟵ CAMBIO
      items,
      total,
      origen: 'web',
      joyeria_id: 'hans',   // ⟵ CAMBIO: este pedido es de Hans (panel de Hans)
    };

    const pedido = (await crearPedidoHans(datos, true)) as { codigo?: string; estado?: string };

    // Aviso en el log del servidor si la capa de datos dejó otro estado (así se detecta el origen del problema)
    if (pedido?.estado && pedido.estado !== 'nuevo') {
      console.error('[hans pedido-web] El pedido se creó con estado inesperado:', pedido.codigo, pedido.estado);
    }

    return NextResponse.json({ codigo: pedido?.codigo ?? '', subtotal, domicilio, zona, total }, { status: 201 });
  } catch (e) {
    console.error('[hans pedido-web POST]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo crear el pedido' }, { status: 400 });
  }
}