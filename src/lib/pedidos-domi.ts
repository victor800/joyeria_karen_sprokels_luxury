// 📁 RUTA: src/lib/pedidos-domi.ts   (REEMPLAZA la versión anterior)
// Pedidos que ve el domiciliario: solo los que el admin le asignó, de la tienda del enlace (slug).
// Karen → pestaña "Pedidos" (lib/pedidos) · Hans → "Hans_Pedidos" (lib/hans).
import 'server-only';
import { sinAcentos, tiendaDeSlug, type Domiciliario } from '@/lib/domiciliarios-web';
import { listarPedidosHans, actualizarPedidoHans } from '@/lib/hans';
import { leerPedidosDetalle, cambiarEstadoPedido, actualizarPedido, type Pedido } from '@/lib/pedidos';

export type Estado = 'asignado' | 'en_ruta' | 'entregado' | 'novedad';

export type PedidoDomi = {
  id: string;
  cliente: string;
  telefono: string;
  direccion: string;
  barrio: string;
  total: string;
  metodoPago: string;
  notas: string;
  detalle: string; // piezas del pedido
  estado: Estado;
  novedad: string;
  fecha: string; // YYYY-MM-DD ('' si no se conoce)
};

type PedidoCrudo = PedidoDomi & { domiciliario: string; _nota: string; _raw?: Pedido };

/* ═════════ Textos de estado que se GUARDAN en cada hoja (ajústalos a los de tu panel) ═════════ */
const TEXTO_ESTADO: Record<Estado, string> = {
  asignado: 'En proceso',
  en_ruta: 'En ruta',   // ⚠ agrégalo a ESTADOS en src/lib/pedidos.ts (ver instrucciones)
  entregado: 'Entregado',
  novedad: 'Novedad',   // ⚠ agrégalo a ESTADOS en src/lib/pedidos.ts
};

const JOYERIA_KAREN = process.env.JOYERIA_KAREN_ID || 'jks_e1852bd04257';

/* ═════════ Utilidades ═════════ */
const cop = (n: unknown) => `$${(Number(n) || 0).toLocaleString('es-CO')}`;
const fechaDe = (v: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : '');
const hoy = (atras = 0) => new Date(Date.now() - atras * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

/** Texto de la hoja → estado del panel. null = pedido cancelado (no se muestra) */
function aEstado(t: unknown): Estado | null {
  const s = sinAcentos(String(t ?? ''));
  if (s.includes('cancel') || s.includes('anulad')) return null;
  if (s.includes('entreg')) return 'entregado';
  if (s.includes('noved')) return 'novedad';
  if (s.includes('ruta')) return 'en_ruta';
  return 'asignado';
}

const esRecoger = (d: string) => sinAcentos(d).includes('recoger');

/* ═════════ Karen (src/lib/pedidos · hoja "Pedidos") ═════════ */
async function cargarKaren(): Promise<PedidoCrudo[]> {
  const filas = await leerPedidosDetalle(JOYERIA_KAREN);
  const out: PedidoCrudo[] = [];
  for (const r of filas) {
    const estado = aEstado(r.estado);
    if (!estado || !r.domiciliario.trim() || esRecoger(r.destino)) continue;
    out.push({
      id: r.numero,
      cliente: r.cliente,
      telefono: r.telefono,
      direccion: r.destino,
      barrio: '',
      total: cop(r.total),
      metodoPago: r.pago ? `Pago ${r.pago}` : '',
      notas: r.nota,
      detalle: r.prenda,
      estado,
      novedad: '',
      fecha: fechaDe(r.entrega) || fechaDe(r.creado),
      domiciliario: r.domiciliario,
      _nota: r.nota,
      _raw: r,
    });
  }
  return out;
}

async function guardarKaren(p: PedidoCrudo, estado: Estado, novedad: string) {
  if (!novedad || !p._raw) {
    // Solo cambia la celda Estado (no toca el resto de la fila)
    if (!(await cambiarEstadoPedido(JOYERIA_KAREN, p.id, TEXTO_ESTADO[estado]))) throw new Error('Pedido no encontrado');
    return;
  }
  // Novedad: además del estado, se agrega el motivo a la Nota
  const r = p._raw;
  const nota = [r.nota, `Novedad domiciliario: ${novedad}`].filter(Boolean).join(' | ').slice(0, 500);
  const ok = await actualizarPedido(JOYERIA_KAREN, r.numero, {
    cliente: r.cliente, telefono: r.telefono, destino: r.destino, prenda: r.prenda, total: r.total,
    entrega: r.entrega, estado: TEXTO_ESTADO[estado], pago: r.pago, nota,
    domiciliarioId: r.domiciliarioId, domiciliarioNombre: r.domiciliario, valorDomicilio: r.valorDomicilio,
  });
  if (!ok) throw new Error('Pedido no encontrado');
}

/* ═════════ Hans ═════════ */
async function cargarHans(): Promise<PedidoCrudo[]> {
  const filas = (await listarPedidosHans()) as any[];
  const out: PedidoCrudo[] = [];
  for (const r of filas) {
    const estado = aEstado(r.estado);
    const domi = String(r.domiciliarioNombre ?? r.domiciliario ?? '').trim();
    const dir = String(r.direccion ?? '');
    if (!estado || !domi || esRecoger(dir)) continue;
    const items: any[] = Array.isArray(r.items) ? r.items : [];
    out.push({
      id: String(r.id ?? r.codigo ?? ''),
      cliente: String(r.cliente ?? ''),
      telefono: String(r.telefono ?? ''),
      direccion: [dir, r.ciudad].filter(Boolean).join(', '),
      barrio: '',
      total: cop(r.total),
      metodoPago: String(r.metodo_pago || (r.pago_estado ? `Pago ${r.pago_estado}` : '')),
      notas: String(r.notas ?? ''),
      detalle: items.map((i) => `${i.nombre ?? ''}${i.tamano ? ` (${i.tamano})` : ''} x${i.cantidad ?? i.qty ?? 1}`).join(' · '),
      estado,
      novedad: '',
      fecha: fechaDe(r.fecha) || fechaDe(r.entrega),
      domiciliario: domi,
      _nota: String(r.notas ?? ''),
    });
  }
  return out;
}

async function guardarHans(p: PedidoCrudo, estado: Estado, novedad: string) {
  const id = p.id;
  const notas = novedad ? [p._nota, `Novedad domiciliario: ${novedad}`].filter(Boolean).join(' | ').slice(0, 1000) : notaActual;
  await actualizarPedidoHans(id, novedad ? { estado: TEXTO_ESTADO[estado], notas } : { estado: TEXTO_ESTADO[estado] });
}

/* ═════════ API del módulo ═════════ */
const cargar = (slug: string) => (tiendaDeSlug(slug) === 'hans' ? cargarHans() : cargarKaren());
const esDe = (p: PedidoCrudo, d: Domiciliario) => sinAcentos(p.domiciliario) === sinAcentos(d.usuario);

export async function pedidosDe(d: Domiciliario, slug: string): Promise<PedidoDomi[]> {
  const desde = hoy(1); // entregados de hoy y de ayer
  const orden: Record<Estado, number> = { en_ruta: 0, novedad: 1, asignado: 2, entregado: 3 };
  return (await cargar(slug))
    .filter((p) => esDe(p, d) && (p.estado !== 'entregado' || p.fecha >= desde || p.fecha === ''))
    .map(({ domiciliario: _d, _nota, _raw, ...p }) => p)
    .sort((a, b) => orden[a.estado] - orden[b.estado]);
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  asignado: ['en_ruta'],
  en_ruta: ['entregado', 'novedad'],
  novedad: ['en_ruta', 'entregado'],
  entregado: [],
};

export async function cambiarEstado(d: Domiciliario, slug: string, id: string, estado: Estado, novedad: string) {
  const p = (await cargar(slug)).find((x) => x.id === id && esDe(x, d));
  if (!p) return { ok: false as const, error: 'Pedido no encontrado.', status: 404 };
  if (!TRANSICIONES[p.estado].includes(estado)) {
    return { ok: false as const, error: 'Ese cambio de estado no está permitido.', status: 409 };
  }
  const nota = novedad.trim().slice(0, 300);
  if (estado === 'novedad' && nota.length < 3) {
    return { ok: false as const, error: 'Cuente qué pasó con la novedad.', status: 400 };
  }
  const guardar = tiendaDeSlug(slug) === 'hans' ? guardarHans : guardarKaren;
  await guardar(p, estado, estado === 'novedad' ? nota : '');
  return { ok: true as const };
}