// 📁 RUTA: src/lib/pedidos-tienda.ts   (ARCHIVO NUEVO)
// Guarda los pedidos del carrito de Karen Sprockel's en la pestaña "Pedidos" de SU hoja.
// Respeta las columnas que ya tenga la pestaña (las busca por nombre); las que falten se agregan al final.
import 'server-only';
import { hojas, SHEET_ID, asegurarPestana } from './google-sheets';

const HOJA = 'Pedidos';

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

/** Columna → nombres con los que puede venir en la hoja (sin tildes, minúsculas) */
const COLUMNAS: [keyof PedidoTienda | 'resumen', string, string[]][] = [
  ['codigo', 'codigo', ['codigo', 'id', 'pedido', 'n pedido', 'numero']],
  ['fecha', 'fecha', ['fecha', 'creado', 'fecha pedido']],
  ['joyeria_id', 'joyeria_id', ['joyeria_id', 'joyeria', 'tienda_id', 'id tienda']],
  ['tienda', 'tienda', ['tienda', 'marca']],
  ['cliente', 'cliente', ['cliente', 'nombre', 'nombre cliente']],
  ['telefono', 'telefono', ['telefono', 'celular', 'whatsapp', 'tel']],
  ['email', 'email', ['email', 'correo']],
  ['entrega', 'entrega', ['entrega', 'tipo entrega', 'tipo_entrega']],
  ['zona', 'zona', ['zona', 'cobertura', 'ciudad', 'municipio']],
  ['barrio', 'barrio', ['barrio']],
  ['direccion', 'direccion', ['direccion', 'direccion entrega']],
  ['indicaciones', 'notas', ['notas', 'indicaciones', 'observaciones']],
  ['items', 'items', ['items', 'productos', 'piezas', 'detalle']],
  ['resumen', 'resumen', ['resumen', 'descripcion']],
  ['subtotal', 'subtotal', ['subtotal']],
  ['cupon', 'cupon', ['cupon', 'codigo cupon']],
  ['descuento', 'descuento', ['descuento']],
  ['domicilio', 'domicilio', ['domicilio', 'envio', 'valor domicilio', 'costo envio']],
  ['total', 'total', ['total', 'valor', 'valor total']],
  ['metodo_pago', 'metodo_pago', ['metodo_pago', 'metodo pago', 'pago', 'forma pago']],
  ['pago_estado', 'pago_estado', ['pago_estado', 'estado pago']],
  ['estado', 'estado', ['estado']],
  ['origen', 'origen', ['origen', 'canal']],
];

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

function valorDe(p: PedidoTienda, k: keyof PedidoTienda | 'resumen'): string | number {
  if (k === 'items') return JSON.stringify(p.items);
  if (k === 'resumen') return p.items.map((i) => `${i.nombre}${i.tamano ? ` (${i.tamano})` : ''} x${i.cant}`).join(' · ');
  const v = p[k];
  return typeof v === 'number' ? v : String(v ?? '');
}

export function nuevoCodigo() {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).replace(/-/g, '').slice(2);
  return `JKS-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function guardarPedidoTienda(p: PedidoTienda) {
  const api = hojas();
  const id = SHEET_ID();

  const leerEncabezado = () => api.spreadsheets.values.get({ spreadsheetId: id, range: `${HOJA}!1:1` });
  let res;
  try {
    res = await leerEncabezado();
  } catch {
    await asegurarPestana(HOJA);
    res = await leerEncabezado();
  }

  const encabezado = ((res.data.values?.[0] ?? []) as unknown[]).map((h) => String(h ?? ''));
  const usadas = new Set<string>();
  const mapa: (keyof PedidoTienda | 'resumen' | null)[] = encabezado.map((h) => {
    const n = norm(h);
    const col = COLUMNAS.find(([k, , alias]) => !usadas.has(k) && alias.some((a) => norm(a) === n));
    if (!col) return null;
    usadas.add(col[0]);
    return col[0];
  });

  // Columnas que la hoja todavía no tiene: se agregan al final para no perder datos
  const faltan = COLUMNAS.filter(([k]) => !usadas.has(k));
  if (faltan.length) {
    const nuevoEnc = [...encabezado, ...faltan.map(([, h]) => h)];
    faltan.forEach(([k]) => mapa.push(k));
    await api.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${HOJA}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [nuevoEnc] },
    });
  }

  const fila = mapa.map((k) => (k ? valorDe(p, k) : ''));
  await api.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${HOJA}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [fila] },
  });

  return p;
}