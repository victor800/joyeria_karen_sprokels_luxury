// 📁 RUTA: src/lib/resumen-dashboard.ts   (ARCHIVO NUEVO)
import 'server-only';
import { unstable_cache } from 'next/cache';
import { listarPrendas } from '@/lib/prendas';
import { listarHans, listarPedidosHans } from '@/lib/hans';
import { leerConfig } from '@/lib/configuracion';

const ZONA = 'America/Bogota';

/** Una pieza/artículo activo con este stock o menos cuenta como "stock bajo" */
const UMBRAL_STOCK_BAJO = 1;
const POR_DESPACHAR = ['nuevo', 'recibido'];
const ACTIVOS = [...POR_DESPACHAR, 'en_camino'];

/** Una "venta" es cualquier pedido que no esté cancelado. Cámbialo aquí si prefieres contar solo pagados o entregados. */
const esVenta = (estado: string) => estado !== 'cancelado';

export type Resumen = {
  kpis: {
    ventasHoy: number;
    pedidosHoy: number;
    ventasMes: number;
    pedidosMes: number;
    ticket: number;
    activos: number;
    porDespachar: number;
    enRuta: number;
    sinAsignar: number;
    stockBajo: number;
  };
  semana: { letra: string; total: number }[];
  categorias: { nombre: string; n: number; pct: number }[];
  recientes: { id: string; codigo: string; cliente: string; total: number; estado: string; cuando: string }[];
  domiciliarios: { nombre: string; telefono: string; pedidos: number }[];
  actividad: { texto: string; cuando: string }[];
  oro: { k24: number; k18: number; k14: number } | null;
  fallos: string[];
};

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtSemana = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short' });
const fmtCuando = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const LETRA: Record<string, string> = { Mon: 'L', Tue: 'M', Wed: 'X', Thu: 'J', Fri: 'V', Sat: 'S', Sun: 'D' };

/** "2026-11-28" en hora de Colombia, o '' si la fecha no es válida */
function diaDe(iso: string | Date): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDia.format(d);
}
function cuando(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtCuando.format(d);
}
const num = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;

async function calcular(): Promise<Resumen> {
  const fallos: string[] = [];
  const [rPrendas, rHans, rPedidos, rCfg] = await Promise.allSettled([
    listarPrendas(),
    listarHans(),
    listarPedidosHans(),
    leerConfig(),
  ]);

  // Si una hoja falla, el resto del Inicio sigue funcionando
  const prendas = rPrendas.status === 'fulfilled' ? rPrendas.value : (fallos.push('prendas'), []);
  const articulos = rHans.status === 'fulfilled' ? rHans.value : (fallos.push('artículos de Hans'), []);
  const pedidos = rPedidos.status === 'fulfilled' ? rPedidos.value : (fallos.push('pedidos'), []);
  const cfg = rCfg.status === 'fulfilled' ? (rCfg.value as unknown as Record<string, unknown>) : null;
  if (!cfg) fallos.push('precios del oro');

  const ahora = new Date();
  const hoy = diaDe(ahora);
  const mes = hoy.slice(0, 7);

  // ── Ventas ──
  let ventasHoy = 0, pedidosHoy = 0, ventasMes = 0, pedidosMes = 0;
  const porDia = new Map<string, number>();
  for (const p of pedidos) {
    if (!esVenta(p.estado)) continue;
    const d = diaDe(p.creado);
    if (!d) continue;
    const t = num(p.total);
    porDia.set(d, (porDia.get(d) ?? 0) + t);
    if (d === hoy) { ventasHoy += t; pedidosHoy++; }
    if (d.startsWith(mes)) { ventasMes += t; pedidosMes++; }
  }

  // Últimos 7 días terminando hoy (cada día con su letra real: L M X J V S D)
  const semana = Array.from({ length: 7 }, (_, i) => {
    const f = new Date(ahora.getTime() - (6 - i) * 86_400_000);
    return { letra: LETRA[fmtSemana.format(f)] ?? '', total: porDia.get(diaDe(f)) ?? 0 };
  });

  // ── Pedidos y domicilios ──
  const activos = pedidos.filter((p) => ACTIVOS.includes(p.estado)).length;
  const porDespachar = pedidos.filter((p) => POR_DESPACHAR.includes(p.estado)).length;
  const sinAsignar = pedidos.filter((p) => POR_DESPACHAR.includes(p.estado) && !p.domiciliario).length;
  const enCamino = pedidos.filter((p) => p.estado === 'en_camino');

  const turno = new Map<string, { telefono: string; pedidos: number }>();
  for (const p of enCamino) {
    const nombre = p.domiciliario || 'Sin nombre';
    const actual = turno.get(nombre) ?? { telefono: p.domiciliario_tel, pedidos: 0 };
    actual.pedidos++;
    turno.set(nombre, actual);
  }

  // ── Catálogo ──
  const bajo = (stock: string) => (Number(stock) || 0) <= UMBRAL_STOCK_BAJO;
  const stockBajo =
    prendas.filter((p) => p.activo === 'true' && bajo(p.stock)).length +
    articulos.filter((a) => a.activo === 'true' && bajo(a.stock)).length;

  const conteo = new Map<string, number>();
  for (const c of [...prendas.map((p) => p.categoria), ...articulos.map((a) => a.categoria)]) {
    if (c) conteo.set(c, (conteo.get(c) ?? 0) + 1);
  }
  const totalCat = [...conteo.values()].reduce((a, b) => a + b, 0);
  const categorias = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, n]) => ({ nombre, n, pct: totalCat ? Math.round((n / totalCat) * 100) : 0 }));

  // ── Actividad reciente: cada paso de un pedido y cada pieza nueva ──
  const eventos: { ts: number; texto: string; cuando: string }[] = [];
  const evento = (iso: string, texto: string) => {
    const ts = new Date(iso).getTime();
    if (iso && !Number.isNaN(ts)) eventos.push({ ts, texto, cuando: cuando(iso) });
  };
  for (const p of pedidos) {
    const quien = p.cliente || 'cliente';
    evento(p.creado, `Nuevo pedido ${p.codigo} de ${quien}`);
    evento(p.recibido_en, `Pedido ${p.codigo} recibido`);
    evento(p.despachado_en, `Pedido ${p.codigo} salió a ruta${p.domiciliario ? ` con ${p.domiciliario}` : ''}`);
    evento(p.entregado_en, `Pedido ${p.codigo} entregado a ${quien}`);
  }
  for (const p of prendas) evento(p.creado, `Nueva prenda ${p.codigo} · ${p.nombre}`);
  for (const a of articulos) evento(a.creado, `Nuevo artículo de Hans ${a.codigo} · ${a.nombre}`);
  const actividad = eventos
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
    .map(({ texto, cuando: c }) => ({ texto, cuando: c }));

  // ── Precio del gramo de oro (el mismo que usan las prendas) ──
  const oro = cfg ? { k24: num(cfg['p24']), k18: num(cfg['p18']), k14: num(cfg['p14']) } : null;

  return {
    kpis: {
      ventasHoy,
      pedidosHoy,
      ventasMes,
      pedidosMes,
      ticket: pedidosMes ? Math.round(ventasMes / pedidosMes) : 0,
      activos,
      porDespachar,
      enRuta: enCamino.length,
      sinAsignar,
      stockBajo,
    },
    semana,
    categorias,
    recientes: pedidos.slice(0, 5).map((p) => ({
      id: p.id,
      codigo: p.codigo,
      cliente: p.cliente,
      total: num(p.total),
      estado: p.estado,
      cuando: cuando(p.creado),
    })),
    domiciliarios: [...turno.entries()].map(([nombre, d]) => ({ nombre, ...d })),
    actividad,
    oro,
    fallos,
  };
}

/** Las hojas de Google tienen límite de lecturas por minuto: el resumen se guarda 30 segundos */
export const obtenerResumen = unstable_cache(calcular, ['resumen-dashboard'], {
  revalidate: 30,
  tags: ['dashboard-resumen'],
});