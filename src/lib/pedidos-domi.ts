// 📁 RUTA: src/lib/pedidos-domi.ts   (REEMPLAZA TODO EL ARCHIVO)
// Pedidos que ve el domiciliario: los que el admin le asignó, de AMBAS secciones de la tienda.
// Karen → hoja "Pedidos" (lib/pedidos) · Hans → hoja "Hans_Pedidos" (lib/hans).
// El enlace (slug) es uno solo: solo valida el acceso, ya no decide qué hoja se lee.
import 'server-only';
import { sinAcentos, type Domiciliario } from '@/lib/domiciliarios-web';
import { listarPedidosHans, actualizarPedidoHans } from '@/lib/hans';
import { leerPedidosDetalle, cambiarEstadoPedido, actualizarPedido, type Pedido } from '@/lib/pedidos';

export type Estado = 'asignado' | 'en_ruta' | 'entregado' | 'novedad';
export type Tienda = 'karen' | 'hans';

export type PedidoDomi = {
  id: string; // "karen:<n°>" o "hans:<id>" (evita choques entre las dos hojas)
  tienda: Tienda;
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

type PedidoCrudo = PedidoDomi & { idReal: string; domiciliario: string; _nota: string; _raw?: Pedido };

/* ═════════ Textos de estado que se GUARDAN en cada hoja (cada tienda usa su propio vocabulario) ═════════ */
// Karen: los de ESTADOS en src/lib/pedidos.ts
const TEXTO_ESTADO: Record<Estado, string> = {
  asignado: 'En proceso',
  en_ruta: 'En ruta',
  entregado: 'Entregado',
  novedad: 'Novedad',
};
// Hans: los de P_ESTADOS en src/lib/hans.ts (nuevo · recibido · en_camino · entregado · cancelado).
// ⚠ 'novedad' hay que agregarlo a P_ESTADOS en hans.ts; si no, guardar una novedad en Hans falla.
const TEXTO_HANS: Record<Estado, string> = {
  asignado: 'recibido',
  en_ruta: 'en_camino',
  entregado: 'entregado',
  novedad: 'novedad',
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
  if (s.includes('ruta') || s.includes('camino')) return 'en_ruta'; // Karen "En ruta" · Hans "en_camino"
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
      id: `karen:${r.numero}`,
      idReal: r.numero,
      tienda: 'karen',
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
    if (!(await cambiarEstadoPedido(JOYERIA_KAREN, p.idReal, TEXTO_ESTADO[estado]))) throw new Error('Pedido no encontrado');
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

/* ═════════ Hans (src/lib/hans · hoja "Hans_Pedidos") ═════════ */

/** En Hans los artículos se guardan como texto JSON: [{ nombre, cant, precio, ... }] */
function detalleHans(items: string): string {
  try {
    const a = JSON.parse(items || '[]');
    if (!Array.isArray(a)) return '';
    return a
      .filter((i) => i?.nombre)
      .map((i) => `${i.nombre} x${Math.max(1, Number(i.cant) || 1)}`)
      .join(' · ');
  } catch {
    return '';
  }
}

async function cargarHans(): Promise<PedidoCrudo[]> {
  const filas = await listarPedidosHans();
  const out: PedidoCrudo[] = [];
  for (const r of filas) {
    const estado = aEstado(r.estado);
    const domi = r.domiciliario.trim();
    if (!estado || !domi || esRecoger(r.direccion)) continue;
    out.push({
      id: `hans:${r.id}`,
      idReal: r.id,
      tienda: 'hans',
      cliente: r.cliente,
      telefono: r.telefono,
      direccion: [r.direccion, r.ciudad].filter(Boolean).join(', '),
      barrio: '',
      total: cop(r.total),
      metodoPago: r.metodo_pago || (r.pago_estado ? `Pago ${r.pago_estado}` : ''),
      notas: r.notas,
      detalle: detalleHans(r.items),
      estado,
      novedad: '',
      fecha: fechaDe(r.entregado_en) || fechaDe(r.fecha_entrega) || fechaDe(r.creado),
      domiciliario: domi,
      _nota: r.notas,
    });
  }
  return out;
}

async function guardarHans(p: PedidoCrudo, estado: Estado, novedad: string) {
  const notas = novedad ? [p._nota, `Novedad domiciliario: ${novedad}`].filter(Boolean).join(' | ').slice(0, 1000) : '';
  await actualizarPedidoHans(p.idReal, novedad ? { estado: TEXTO_HANS[estado], notas } : { estado: TEXTO_HANS[estado] });
}

/* ═════════ API del módulo ═════════ */

/** Lee las dos hojas a la vez; si una falla, el domiciliario sigue viendo la otra. */
async function cargar(): Promise<PedidoCrudo[]> {
  const [k, h] = await Promise.allSettled([cargarKaren(), cargarHans()]);
  if (k.status === 'rejected') console.error('[pedidos-domi] hoja Karen:', k.reason);
  if (h.status === 'rejected') console.error('[pedidos-domi] hoja Hans:', h.reason);
  if (k.status === 'rejected' && h.status === 'rejected') throw new Error('No se pudieron leer las hojas de pedidos.');
  return [...(k.status === 'fulfilled' ? k.value : []), ...(h.status === 'fulfilled' ? h.value : [])];
}

const esDe = (p: PedidoCrudo, d: Domiciliario) => sinAcentos(p.domiciliario) === sinAcentos(d.usuario);

export async function pedidosDe(d: Domiciliario, _slug: string): Promise<PedidoDomi[]> {
  void _slug; // el enlace solo valida el acceso (en la ruta); aquí se leen las dos secciones
  const desde = hoy(1); // entregados de hoy y de ayer
  const orden: Record<Estado, number> = { en_ruta: 0, novedad: 1, asignado: 2, entregado: 3 };
  return (await cargar())
    .filter((p) => esDe(p, d) && (p.estado !== 'entregado' || p.fecha >= desde || p.fecha === ''))
    .map(({ domiciliario: _d, idReal: _i, _nota, _raw, ...p }) => p)
    .sort((a, b) => orden[a.estado] - orden[b.estado]);
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  asignado: ['en_ruta'],
  en_ruta: ['entregado', 'novedad'],
  novedad: ['en_ruta', 'entregado'],
  entregado: [],
};

export async function cambiarEstado(d: Domiciliario, _slug: string, id: string, estado: Estado, novedad: string) {
  void _slug;
  const p = (await cargar()).find((x) => x.id === id && esDe(x, d));
  if (!p) return { ok: false as const, error: 'Pedido no encontrado.', status: 404 };
  if (!TRANSICIONES[p.estado].includes(estado)) {
    return { ok: false as const, error: 'Ese cambio de estado no está permitido.', status: 409 };
  }
  const nota = novedad.trim().slice(0, 300);
  if (estado === 'novedad' && nota.length < 3) {
    return { ok: false as const, error: 'Cuente qué pasó con la novedad.', status: 400 };
  }
  const guardar = p.tienda === 'hans' ? guardarHans : guardarKaren;
  await guardar(p, estado, estado === 'novedad' ? nota : '');
  return { ok: true as const };
}