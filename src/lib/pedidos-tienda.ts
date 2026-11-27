// 📁 RUTA: src/lib/pedidos-tienda.ts   (REEMPLAZA TODO EL ARCHIVO)
// Guarda los pedidos del carrito de Karen Sprockel's en la pestaña "Pedidos" de SU hoja,
// usando EXACTAMENTE los encabezados que ya usa el panel (A → O):
//   ID Joyería | N° | Fecha creación | Cliente | Prenda | Total | Entrega | Estado | Pago | Nota |
//   ID Domiciliario | Domiciliario | Valor domicilio | Teléfono | Destino
// Nunca crea columnas nuevas: lo que no tiene columna propia (correo, cupón, subtotal…) va en "Nota".
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';
import { ESTADOS, PAGOS } from './pedidos';   // mismas opciones que usa el panel

const HOJA = 'Pedidos';

const ENCABEZADOS = [
  'ID Joyería', 'N°', 'Fecha creación', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado', 'Pago', 'Nota',
  'ID Domiciliario', 'Domiciliario', 'Valor domicilio', 'Teléfono', 'Destino',
] as const;
type Col = (typeof ENCABEZADOS)[number];

export type ItemPedido = { id: string; nombre: string; tamano: string; cant: number; precio: number };

export type PedidoTienda = {
  codigo: string;
  fecha: string;
  joyeria_id: string;
  tienda: string;
  cliente: string;
  telefono: string;
  email: string;
  entrega: string;
  zona: string;
  barrio: string;
  direccion: string;
  indicaciones: string;
  items: ItemPedido[];
  subtotal: number;
  cupon: string;
  descuento: number;
  domicilio: number;
  total: number;
  metodo_pago: string;
  pago_estado: string;
  estado: string;
  origen: string;
};

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[°º]/g, '').replace(/[_\s]+/g, ' ').trim();
const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** Código de respaldo (solo si la columna N° no es numérica) */
export function nuevoCodigo() {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).replace(/-/g, '').slice(2);
  return `JKS-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Fecha con el MISMO formato que ya tienen las filas del panel */
function fechaComo(muestra: string) {
  const ahora = new Date();
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(ahora).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const fecha = `${p.year}-${p.month}-${p.day}`;
  const hora = `${p.hour}:${p.minute}`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(muestra)) return ahora.toISOString();
  if (/^\d{4}-\d{2}-\d{2} \d/.test(muestra)) return `${fecha} ${hora}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(muestra)) return fecha;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d/.test(muestra)) return `${p.day}/${p.month}/${p.year} ${hora}`;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(muestra)) return `${p.day}/${p.month}/${p.year}`;
  return `${fecha} ${hora}`;
}

/** Elige la opción del panel que corresponde (ej. "Nuevo" o "Pendiente"); si no hay ninguna, la primera de la lista */
function opcionPanel(lista: readonly unknown[], ...preferidas: string[]) {
  const ops = lista.map((o) => (typeof o === 'string' ? o : String((o as { value?: unknown })?.value ?? o)));
  for (const pref of preferidas) {
    const hit = ops.find((o) => norm(o) === norm(pref));
    if (hit) return hit;
  }
  return ops[0] ?? preferidas[0];
}

export async function guardarPedidoTienda(p: PedidoTienda) {
  const api = hojas();
  const id = SHEET_ID();

  const leer = () => api.spreadsheets.values.get({ spreadsheetId: id, range: `${HOJA}!A:O` });
  let res;
  try {
    res = await leer();
  } catch {
    await asegurarPestana(HOJA);
    res = await leer();
  }

  const filas = (res.data.values ?? []) as unknown[][];
  let encabezado = (filas[0] ?? []).map((h) => String(h ?? ''));
  if (!encabezado.some((h) => h.trim())) {
    encabezado = [...ENCABEZADOS];
    await api.spreadsheets.values.update({
      spreadsheetId: id, range: `${HOJA}!A1`, valueInputOption: 'RAW', requestBody: { values: [encabezado] },
    });
  }

  // posición de cada columna del panel (por nombre, sin importar tildes ni mayúsculas)
  const pos = (c: Col) => encabezado.findIndex((h) => norm(h) === norm(c));
  const datos = filas.slice(1);
  const columna = (c: Col) => { const i = pos(c); return i < 0 ? [] : datos.map((r) => String(r[i] ?? '')).filter(Boolean); };

  // N°: consecutivo si la hoja usa números; si no, el código del pedido
  const nums = columna('N°').map((v) => Number(v.replace(/\D/g, ''))).filter((n) => n > 0);
  const soloNumeros = columna('N°').every((v) => /^\d+$/.test(v.trim()));
  const numero = soloNumeros ? String((nums.length ? Math.max(...nums) : 0) + 1) : p.codigo;

  const prenda = p.items.map((i) => `${i.nombre}${i.tamano ? ` (${i.tamano})` : ''} x${i.cant}`).join(' · ');
  const destino = p.entrega === 'Domicilio'
    ? [p.direccion, p.barrio, p.zona].filter(Boolean).join(', ')
    : 'Recoger en tienda';
  const nota = [
    p.indicaciones,
    p.items.length > 1 || p.descuento > 0 || p.domicilio > 0 ? `Prendas ${cop(p.subtotal)}` : '',
    p.cupon ? `Cupón ${p.cupon} (−${cop(p.descuento)})` : '',
    p.domicilio > 0 ? `Domicilio ${p.zona} ${cop(p.domicilio)}` : '',
    p.email ? `Correo: ${p.email}` : '',
    p.entrega !== 'Domicilio' ? 'Recoge en tienda' : '',
    'Pedido web',
  ].filter(Boolean).join(' · ');

  const valores: Record<Col, string | number> = {
    'ID Joyería': p.joyeria_id,
    'N°': numero,
    'Fecha creación': fechaComo(columna('Fecha creación').at(-1) ?? ''),
    'Cliente': p.cliente,
    'Prenda': prenda,
    'Total': p.total,
    'Entrega': '',   // en el panel es la FECHA de entrega: la pone la joyería al programar
    'Estado': opcionPanel(ESTADOS, 'nuevo', 'pendiente', 'recibido'),
    'Pago': opcionPanel(PAGOS, 'pendiente', 'por pagar', 'sin pagar'),
    'Nota': nota,
    'ID Domiciliario': '',
    'Domiciliario': '',
    'Valor domicilio': p.domicilio,
    'Teléfono': p.telefono,
    'Destino': destino,
  };

  const fila: (string | number)[] = encabezado.map(() => '');
  for (const c of ENCABEZADOS) {
    const i = pos(c);
    if (i >= 0) fila[i] = valores[c];
  }

  await api.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${HOJA}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [fila] },
  });

  return { ...p, codigo: numero };
}