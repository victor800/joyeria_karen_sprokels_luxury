// 📁 RUTA: src/lib/hans.ts
import 'server-only';
import { hojas, SHEET_ID } from '@/lib/google-sheets';

const ID_HOJA = () => process.env.GOOGLE_SHEET_ID_HANS || SHEET_ID();
const ART = 'Hans_Articulos';
const CAT = 'Hans_Categorias';
const CFG = 'Hans_Config';
const CATS_BASE = ['Pulseras tejidas', 'Anillos', 'Collares', 'Aretes', 'Cadenas', 'Dijes'];

const COLS = [
  'id', 'codigo', 'nombre', 'categoria', 'tipo', 'material', 'precio_menudeo', 'precio_mayorista',
  'min_mayorista', 'stock', 'descripcion', 'foto_url', 'video_url', 'activo', 'creado', 'actualizado',
  'oro', 'gramos', 'mano_obra', 'mano_obra_mayor', 'diseno',
] as const;
export type HansItem = Record<(typeof COLS)[number], string>;
const EDITABLES = COLS.filter((c) => !['id', 'codigo', 'creado', 'actualizado'].includes(c));
const TIPOS = ['menudeo', 'mayorista', 'ambos', 'tejida'];

const letra = (n: number) => String.fromCharCode(64 + n); // 1 -> A
const ULT = letra(COLS.length);

async function asegurarPestana(nombre: string, encabezado: string[]) {
  const api = hojas();
  const { data } = await api.spreadsheets.get({ spreadsheetId: ID_HOJA(), fields: 'sheets.properties.title' });
  if (!data.sheets?.some((s) => s.properties?.title === nombre)) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: ID_HOJA(),
      requestBody: { requests: [{ addSheet: { properties: { title: nombre } } }] },
    });
  }
  const r = await api.spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${nombre}!A1:${letra(encabezado.length)}1` });
  const actual = (r.data.values?.[0] ?? []).map(String);
  // Si no hay encabezado, o es una versión vieja (faltan columnas), lo reescribe
  if (actual.length < encabezado.length || encabezado.some((h, i) => actual[i] !== h)) {
    await api.spreadsheets.values.update({
      spreadsheetId: ID_HOJA(),
      range: `${nombre}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [encabezado] },
    });
  }
}

const filaAItem = (f: string[]): HansItem =>
  Object.fromEntries(COLS.map((c, i) => [c, String(f[i] ?? '')])) as HansItem;
const itemAFila = (it: HansItem) => COLS.map((c) => it[c] ?? '');

async function leerTodo() {
  await asegurarPestana(ART, [...COLS]);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${ART}!A2:${ULT}` });
  return (r.data.values ?? []).map((f) => filaAItem(f as string[])).filter((x) => x.id);
}

export async function listarHans() {
  const items = await leerTodo();
  return items.sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
}

function limpiar(cuerpo: Record<string, unknown>) {
  const out: Partial<HansItem> = {};
  for (const c of EDITABLES) {
    if (cuerpo[c] === undefined) continue;
    out[c] = String(cuerpo[c] ?? '').trim();
  }
  if (out.tipo !== undefined && !TIPOS.includes(out.tipo)) throw new Error('Tipo de venta inválido');
  if (out.activo !== undefined) out.activo = out.activo === 'true' ? 'true' : 'false';
  if (out.oro !== undefined && !['', '18k', '24k'].includes(out.oro)) out.oro = '';
  for (const k of ['precio_menudeo', 'precio_mayorista', 'min_mayorista', 'stock', 'mano_obra', 'mano_obra_mayor'] as const) {
    if (out[k] !== undefined) out[k] = out[k]!.replace(/\D/g, '');
  }
  // gramos conserva el decimal (ej. 3.5)
  if (out.gramos !== undefined) out.gramos = out.gramos.replace(',', '.').replace(/[^\d.]/g, '');
  if (out.diseno !== undefined && out.diseno.length > 45000) throw new Error('El diseño es demasiado grande');
  return out;
}

export async function crearHans(cuerpo: Record<string, unknown>) {
  const datos = limpiar(cuerpo);
  if (!datos.nombre) throw new Error('Ponle un nombre al artículo');
  if (!datos.categoria) throw new Error('Elige o crea una categoría');
  const todos = await leerTodo();
  const mayor = todos.reduce((m, x) => Math.max(m, Number(x.codigo.replace(/\D/g, '')) || 0), 0);
  const ahora = new Date().toISOString();
  const item = Object.fromEntries(COLS.map((c) => [c, ''])) as HansItem;
  Object.assign(item, datos, {
    id: crypto.randomUUID().slice(0, 8),
    codigo: `HNS-${String(mayor + 1).padStart(4, '0')}`,
    tipo: datos.tipo || 'ambos',
    stock: datos.stock || '0',
    activo: 'false',
    creado: ahora,
    actualizado: ahora,
  });
  await hojas().spreadsheets.values.append({
    spreadsheetId: ID_HOJA(),
    range: `${ART}!A:${ULT}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [itemAFila(item)] },
  });
  return item;
}

async function buscarFila(id: string) {
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${ART}!A:A` });
  const idx = (r.data.values ?? []).findIndex((f) => f[0] === id);
  if (idx < 1) throw new Error('Artículo no encontrado');
  return idx + 1; // fila 1-based
}

export async function actualizarHans(id: string, cuerpo: Record<string, unknown>) {
  await asegurarPestana(ART, [...COLS]);
  const fila = await buscarFila(id);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${ART}!A${fila}:${ULT}${fila}` });
  const actual = filaAItem((r.data.values?.[0] ?? []) as string[]);
  const nuevo: HansItem = { ...actual, ...limpiar(cuerpo), actualizado: new Date().toISOString() };
  await hojas().spreadsheets.values.update({
    spreadsheetId: ID_HOJA(),
    range: `${ART}!A${fila}:${ULT}${fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [itemAFila(nuevo)] },
  });
  return nuevo;
}

export async function eliminarHans(id: string) {
  await asegurarPestana(ART, [...COLS]);
  const fila = await buscarFila(id);
  const { data } = await hojas().spreadsheets.get({ spreadsheetId: ID_HOJA(), fields: 'sheets.properties(title,sheetId)' });
  const gid = data.sheets?.find((s) => s.properties?.title === ART)?.properties?.sheetId;
  if (gid === undefined || gid === null) throw new Error('No se encontró la pestaña');
  await hojas().spreadsheets.batchUpdate({
    spreadsheetId: ID_HOJA(),
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId: gid, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila } } }],
    },
  });
}

export async function listarCategoriasHans() {
  await asegurarPestana(CAT, ['nombre']);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${CAT}!A2:A` });
  const guardadas = (r.data.values ?? []).map((f) => String(f[0] ?? '').trim()).filter(Boolean);
  if (!guardadas.length) {
    await hojas().spreadsheets.values.append({
      spreadsheetId: ID_HOJA(),
      range: `${CAT}!A:A`,
      valueInputOption: 'RAW',
      requestBody: { values: CATS_BASE.map((c) => [c]) },
    });
    return [...CATS_BASE];
  }
  return guardadas;
}

export async function crearCategoriaHans(nombre: string) {
  const n = nombre.trim().slice(0, 40);
  if (!n) throw new Error('Escribe el nombre de la categoría');
  const actuales = await listarCategoriasHans();
  if (actuales.some((c) => c.toLowerCase() === n.toLowerCase())) return actuales;
  await hojas().spreadsheets.values.append({
    spreadsheetId: ID_HOJA(),
    range: `${CAT}!A:A`,
    valueInputOption: 'RAW',
    requestBody: { values: [[n]] },
  });
  return [...actuales, n];
}

/* ---------- Configuración (precio del oro + tabla de piezas) en la hoja Hans_Config ---------- */
export type HansConfig = { oro18: number; oro24: number; actualizado: string; piezas: unknown | null };

export async function leerConfigHans(): Promise<HansConfig> {
  await asegurarPestana(CFG, ['clave', 'valor']);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${CFG}!A2:B` });
  const m = new Map<string, string>();
  (r.data.values ?? []).forEach((f) => m.set(String(f[0] ?? ''), String(f[1] ?? '')));
  let piezas: unknown | null = null;
  try {
    const p = JSON.parse(m.get('piezas') || 'null');
    if (p && typeof p === 'object') piezas = p;
  } catch {}
  return {
    oro18: Number(m.get('oro18')) || 0,
    oro24: Number(m.get('oro24')) || 0,
    actualizado: m.get('actualizado') || '',
    piezas,
  };
}

export async function guardarConfigHans(c: HansConfig) {
  await asegurarPestana(CFG, ['clave', 'valor']);
  const json = JSON.stringify(c.piezas ?? null);
  if (json.length > 45000) throw new Error('La tabla de piezas es demasiado grande');
  // Reescribe la hoja completa (son solo 4 filas)
  await hojas().spreadsheets.values.clear({ spreadsheetId: ID_HOJA(), range: `${CFG}!A2:B` });
  await hojas().spreadsheets.values.update({
    spreadsheetId: ID_HOJA(),
    range: `${CFG}!A2`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['oro18', String(c.oro18)],
        ['oro24', String(c.oro24)],
        ['actualizado', c.actualizado],
        ['piezas', json],
      ],
    },
  });
}

/* ---------- Pedidos de Joyería Hans (hoja Hans_Pedidos) ---------- */
const PED = 'Hans_Pedidos';
const PCOLS = [
  'id', 'codigo', 'creado', 'cliente', 'telefono', 'email', 'direccion', 'ciudad', 'items', 'tipo', 'total',
  'metodo_pago', 'pago_estado', 'estado', 'domiciliario', 'domiciliario_tel', 'fecha_entrega',
  'recibido_en', 'despachado_en', 'entregado_en', 'notas', 'origen', 'actualizado',
] as const;
export type HansPedido = Record<(typeof PCOLS)[number], string>;
const PEDITABLES = [
  'cliente', 'telefono', 'email', 'direccion', 'ciudad', 'items', 'tipo', 'total', 'metodo_pago', 'pago_estado',
  'estado', 'domiciliario', 'domiciliario_tel', 'fecha_entrega', 'notas', 'origen',
] as const;
const P_ESTADOS = ['nuevo', 'recibido', 'en_camino', 'entregado', 'cancelado'];
const PULT = letra(PCOLS.length);

const filaAPedido = (f: string[]): HansPedido =>
  Object.fromEntries(PCOLS.map((c, i) => [c, String(f[i] ?? '')])) as HansPedido;
const pedidoAFila = (p: HansPedido) => PCOLS.map((c) => p[c] ?? '');

async function leerPedidos() {
  await asegurarPestana(PED, [...PCOLS]);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${PED}!A2:${PULT}` });
  return (r.data.values ?? []).map((f) => filaAPedido(f as string[])).filter((x) => x.id);
}

export async function listarPedidosHans() {
  const p = await leerPedidos();
  return p.sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
}

function limpiarPedido(cuerpo: Record<string, unknown>) {
  const out: Partial<HansPedido> = {};
  for (const c of PEDITABLES) {
    const v = cuerpo[c];
    if (v === undefined) continue;
    if (c === 'items') {
      out.items = typeof v === 'string' ? v : JSON.stringify(v ?? []);
    } else {
      out[c] = String(v ?? '').trim().slice(0, c === 'notas' ? 1000 : 300);
    }
  }
  if (out.items !== undefined) {
    let arr: unknown;
    try { arr = JSON.parse(out.items || '[]'); } catch { throw new Error('Artículos inválidos'); }
    if (!Array.isArray(arr)) throw new Error('Artículos inválidos');
    if (out.items.length > 45000) throw new Error('El pedido es demasiado grande');
  }
  if (out.estado !== undefined && !P_ESTADOS.includes(out.estado)) throw new Error('Estado inválido');
  if (out.pago_estado !== undefined && !['pendiente', 'pagado'].includes(out.pago_estado)) out.pago_estado = 'pendiente';
  if (out.tipo !== undefined && !['menudeo', 'mayorista'].includes(out.tipo)) out.tipo = 'menudeo';
  if (out.origen !== undefined && !['web', 'manual'].includes(out.origen)) out.origen = 'manual';
  if (out.total !== undefined) out.total = out.total.replace(/\D/g, '');
  for (const k of ['telefono', 'domiciliario_tel'] as const) {
    if (out[k] !== undefined) out[k] = out[k]!.replace(/[^\d+\s()-]/g, '');
  }
  if (out.fecha_entrega !== undefined && out.fecha_entrega !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(out.fecha_entrega)) {
    out.fecha_entrega = '';
  }
  return out;
}

/** `web: true` = pedido que llega desde la tienda: siempre entra como "nuevo". */
export async function crearPedidoHans(cuerpo: Record<string, unknown>, web = false) {
  const d = limpiarPedido(cuerpo);
  if (!d.cliente) throw new Error('Escribe el nombre del cliente');
  const arr = JSON.parse(d.items || '[]') as unknown[];
  if (!arr.length) throw new Error('El pedido no tiene artículos');
  const todos = await leerPedidos();
  const mayor = todos.reduce((m, x) => Math.max(m, Number(x.codigo.replace(/\D/g, '')) || 0), 0);
  const ahora = new Date().toISOString();
  const p = Object.fromEntries(PCOLS.map((c) => [c, ''])) as HansPedido;
  Object.assign(p, d, {
    id: crypto.randomUUID().slice(0, 8),
    codigo: `PED-${String(mayor + 1).padStart(4, '0')}`,
    tipo: d.tipo || 'menudeo',
    pago_estado: d.pago_estado || 'pendiente',
    estado: 'nuevo',
    origen: web ? 'web' : d.origen || 'manual',
    creado: ahora,
    actualizado: ahora,
  });
  if (web) { p.domiciliario = ''; p.domiciliario_tel = ''; }
  await hojas().spreadsheets.values.append({
    spreadsheetId: ID_HOJA(),
    range: `${PED}!A:${PULT}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [pedidoAFila(p)] },
  });
  return p;
}

async function buscarFilaPedido(id: string) {
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${PED}!A:A` });
  const idx = (r.data.values ?? []).findIndex((f) => f[0] === id);
  if (idx < 1) throw new Error('Pedido no encontrado');
  return idx + 1;
}

export async function actualizarPedidoHans(id: string, cuerpo: Record<string, unknown>) {
  await asegurarPestana(PED, [...PCOLS]);
  const fila = await buscarFilaPedido(id);
  const r = await hojas().spreadsheets.values.get({ spreadsheetId: ID_HOJA(), range: `${PED}!A${fila}:${PULT}${fila}` });
  const actual = filaAPedido((r.data.values?.[0] ?? []) as string[]);
  const d = limpiarPedido(cuerpo);
  const ahora = new Date().toISOString();
  const nuevo: HansPedido = { ...actual, ...d, actualizado: ahora };
  // Fechas de cada paso: se marcan solas al cambiar de estado
  if (d.estado && d.estado !== actual.estado) {
    if (d.estado === 'recibido' && !nuevo.recibido_en) nuevo.recibido_en = ahora;
    if (d.estado === 'en_camino') {
      if (!nuevo.recibido_en) nuevo.recibido_en = ahora;
      if (!nuevo.despachado_en) nuevo.despachado_en = ahora;
    }
    if (d.estado === 'entregado') {
      if (!nuevo.recibido_en) nuevo.recibido_en = ahora;
      if (!nuevo.despachado_en) nuevo.despachado_en = ahora;
      if (!nuevo.entregado_en) nuevo.entregado_en = ahora;
    }
  }
  if (nuevo.estado === 'en_camino' && !nuevo.domiciliario) throw new Error('Asigna un domiciliario antes de despachar');
  await hojas().spreadsheets.values.update({
    spreadsheetId: ID_HOJA(),
    range: `${PED}!A${fila}:${PULT}${fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [pedidoAFila(nuevo)] },
  });
  return nuevo;
}