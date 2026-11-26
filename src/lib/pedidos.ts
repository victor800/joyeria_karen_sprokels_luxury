// 📁 RUTA: src/lib/pedidos.ts
import 'server-only';
import { asegurarPestana, hojas, SHEET_ID } from './google-sheets';
import { cop, type Cel } from './datos-dashboard';

export const HOJA_PEDIDOS = 'Pedidos';
export const ESTADOS = ['Pendiente', 'En proceso', 'Entregado', 'Cancelado'] as const;
export const PAGOS = ['Pendiente', 'Transferencia', 'Efectivo', 'Pagado'] as const;

const TONO: Record<string, 'ok' | 'warn' | 'mal' | 'info'> = {
  Pendiente: 'warn',
  'En proceso': 'info',
  Entregado: 'ok',
  Cancelado: 'mal',
};
const TONO_PAGO: Record<string, 'ok' | 'warn' | 'mal' | 'info'> = {
  Pendiente: 'warn',
  Transferencia: 'info',
  Efectivo: 'info',
  Pagado: 'ok',
};

// Columnas A–M como antes; N y O son nuevas (se agregan solas al guardar el próximo pedido)
const ENCABEZADO = [
  'ID Joyería', 'N°', 'Fecha creación', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado', 'Pago',
  'Nota', 'ID Domiciliario', 'Domiciliario', 'Valor domicilio', 'Teléfono', 'Destino',
];
const ULTIMA_COL = 'O';

function fechaCorta(iso?: unknown) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/**
 * Tabla genérica para PedidosTabla.
 * Orden: 0 N°, 1 Cliente, 2 Prenda, 3 Total, 4 Entrega, 5 Estado, 6 Pago,
 *        7 Domiciliario, 8 Valor domicilio, 9 Nota, 10 Teléfono, 11 Destino
 */
export async function leerPedidos(joyeriaId: string): Promise<Cel[][]> {
  await asegurarPestana(HOJA_PEDIDOS);
  const { data } = await hojas().spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PEDIDOS}!A2:${ULTIMA_COL}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reverse()
    .map((r): Cel[] => {
      const estado = String(r[7] ?? 'Pendiente');
      const pago = String(r[8] || 'Pendiente');
      const valorDom = Number(r[12]) || 0;
      return [
        String(r[1] ?? ''),
        String(r[3] ?? ''),
        String(r[4] ?? ''),
        cop(Number(r[5]) || 0),
        fechaCorta(r[6]),
        { chip: estado, t: TONO[estado] ?? 'info' },
        { chip: pago, t: TONO_PAGO[pago] ?? 'info' },
        String(r[11] || '—'),
        valorDom ? cop(valorDom) : '—',
        String(r[9] || '—'),
        String(r[13] || ''), // Teléfono del cliente
        String(r[14] || ''), // Destino / dirección
      ];
    });
}

/** Un pedido con datos crudos, para la tabla nueva. */
export type Pedido = {
  numero: string;
  creado: string; // ISO
  cliente: string;
  telefono: string;
  destino: string;
  prenda: string;
  total: number;
  entrega: string; // YYYY-MM-DD o ''
  estado: string;
  pago: string;
  nota: string;
  domiciliarioId: string;
  domiciliario: string;
  valorDomicilio: number;
};

/** Pedidos de UNA joyería, el más reciente primero. */
export async function leerPedidosDetalle(joyeriaId: string): Promise<Pedido[]> {
  await asegurarPestana(HOJA_PEDIDOS);
  const { data } = await hojas().spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PEDIDOS}!A2:${ULTIMA_COL}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reverse()
    .map((r): Pedido => ({
      numero: String(r[1] ?? ''),
      creado: String(r[2] ?? ''),
      cliente: String(r[3] ?? ''),
      telefono: String(r[13] ?? ''),
      destino: String(r[14] ?? ''),
      prenda: String(r[4] ?? ''),
      total: Number(r[5]) || 0,
      entrega: /^\d{4}-\d{2}-\d{2}$/.test(String(r[6] ?? '')) ? String(r[6]) : '',
      estado: String(r[7] || 'Pendiente'),
      pago: String(r[8] || 'Pendiente'),
      nota: String(r[9] ?? ''),
      domiciliarioId: String(r[10] ?? ''),
      domiciliario: String(r[11] ?? ''),
      valorDomicilio: Number(r[12]) || 0,
    }));
}

export type NuevoPedido = {
  cliente: string;
  telefono: string;
  destino: string;
  prenda: string;
  total: number;
  entrega: string; // YYYY-MM-DD o ''
  estado: string;
  pago: string;
  nota: string;
  domiciliarioId: string;
  domiciliarioNombre: string;
  valorDomicilio: number;
};

/** Arma la fila A–O de la hoja a partir de los datos del pedido */
function filaHoja(joyeriaId: string, numero: string, creado: string, p: NuevoPedido) {
  return [
    joyeriaId, numero, creado, p.cliente, p.prenda, p.total, p.entrega, p.estado, p.pago,
    p.nota, p.domiciliarioId, p.domiciliarioNombre, p.valorDomicilio, p.telefono, p.destino,
  ];
}

const formatoNumero = (n: number) => `P-${String(n).padStart(4, '0')}`;
const valorNumero = (v: unknown) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/**
 * Agrega el pedido al final de la hoja con el ID de la joyería. Devuelve el N° generado.
 * Después de escribir, verifica que el N° no esté repetido (pedidos simultáneos) y, si lo está,
 * le asigna el siguiente libre a ESTA fila.
 */
export async function crearPedido(joyeriaId: string, p: NuevoPedido): Promise<string> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();

  const cab = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A1:${ULTIMA_COL}1` });
  if ((cab.data.values?.[0]?.length ?? 0) < ENCABEZADO.length) {
    await api.spreadsheets.values.update({
      spreadsheetId,
      range: `${HOJA_PEDIDOS}!A1:${ULTIMA_COL}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADO] },
    });
  }

  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
  const max = (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reduce((m, r) => Math.max(m, valorNumero(r[1])), 0);
  let numero = formatoNumero(max + 1);

  const res = await api.spreadsheets.values.append({
    spreadsheetId,
    range: `${HOJA_PEDIDOS}!A:${ULTIMA_COL}`,
    // RAW: un texto como "=SUMA(...)" se guarda como texto, no como fórmula
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [filaHoja(joyeriaId, numero, new Date().toISOString(), p)] },
  });

  // Verificación anti-duplicado: ¿en qué fila quedó mi pedido y hay otro igual antes que él?
  try {
    const rango = res.data.updates?.updatedRange ?? '';
    const fila = parseInt(/!\D*(\d+)/.exec(rango)?.[1] ?? '', 10);
    if (fila > 1) {
      const { data: tras } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
      const filas = tras.values ?? [];
      const propias = filas
        .map((r, idx) => ({ r, hoja: idx + 2 }))
        .filter(({ r }) => r[0] === joyeriaId);
      const repetido = propias.some(({ r, hoja }) => String(r[1]) === numero && hoja !== fila);
      if (repetido) {
        const nuevoMax = propias.reduce((m, { r }) => Math.max(m, valorNumero(r[1])), 0);
        numero = formatoNumero(nuevoMax + 1);
        await api.spreadsheets.values.update({
          spreadsheetId,
          range: `${HOJA_PEDIDOS}!B${fila}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[numero]] },
        });
      }
    }
  } catch (e) {
    // El pedido ya está guardado; si la verificación falla no se pierde nada
    console.error('[crearPedido] verificación de N° duplicado', e);
  }

  return numero;
}

/** Cambia el estado de un pedido de ESTA joyería. false = no se encontró el pedido. */
export async function cambiarEstadoPedido(joyeriaId: string, numero: string, estado: string): Promise<boolean> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();
  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
  const i = (data.values ?? []).findIndex((r) => r[0] === joyeriaId && String(r[1]) === numero);
  if (i < 0) return false;
  await api.spreadsheets.values.update({
    spreadsheetId,
    range: `${HOJA_PEDIDOS}!H${i + 2}`, // columna H = Estado; la fila 1 es el encabezado
    valueInputOption: 'RAW',
    requestBody: { values: [[estado]] },
  });
  return true;
}

/**
 * Edita un pedido de ESTA joyería (conserva el N° y la fecha de creación).
 * false = no se encontró el pedido.
 */
export async function actualizarPedido(joyeriaId: string, numero: string, p: NuevoPedido): Promise<boolean> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();
  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:C` });
  const filas = data.values ?? [];
  const i = filas.findIndex((r) => r[0] === joyeriaId && String(r[1]) === numero);
  if (i < 0) return false;

  const creado = String(filas[i][2] ?? '') || new Date().toISOString();
  const fila = i + 2; // la fila 1 es el encabezado
  await api.spreadsheets.values.update({
    spreadsheetId,
    range: `${HOJA_PEDIDOS}!A${fila}:${ULTIMA_COL}${fila}`,
    valueInputOption: 'RAW',
    requestBody: { values: [filaHoja(joyeriaId, numero, creado, p)] },
  });
  return true;
}

/** Elimina la fila de un pedido de ESTA joyería. false = no se encontró el pedido. */
export async function eliminarPedido(joyeriaId: string, numero: string): Promise<boolean> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();
  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
  const i = (data.values ?? []).findIndex((r) => r[0] === joyeriaId && String(r[1]) === numero);
  if (i < 0) return false;

  // deleteDimension necesita el id numérico de la pestaña, no su nombre
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties(sheetId,title)' });
  const sheetId = meta.data.sheets?.find((s) => s.properties?.title === HOJA_PEDIDOS)?.properties?.sheetId;
  if (sheetId == null) return false;

  await api.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            // índices base 0: la fila 1 (encabezado) es el 0, así que el dato i está en i + 1
            range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 },
          },
        },
      ],
    },
  });
  return true;
}