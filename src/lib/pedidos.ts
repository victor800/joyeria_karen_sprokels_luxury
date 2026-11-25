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

const ENCABEZADO = [
  'ID Joyería', 'N°', 'Fecha creación', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado', 'Pago',
  'Nota', 'ID Domiciliario', 'Domiciliario', 'Valor domicilio',
];

function fechaCorta(iso?: unknown) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Pedidos de UNA joyería, el más reciente primero. Mismo orden que las columnas de la tabla. */
export async function leerPedidos(joyeriaId: string): Promise<Cel[][]> {
  await asegurarPestana(HOJA_PEDIDOS);
  const { data } = await hojas().spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_PEDIDOS}!A2:M`,
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
      ];
    });
}

export type NuevoPedido = {
  cliente: string;
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

/** Agrega el pedido al final de la hoja con el ID de la joyería. Devuelve el N° generado. */
export async function crearPedido(joyeriaId: string, p: NuevoPedido): Promise<string> {
  await asegurarPestana(HOJA_PEDIDOS);
  const api = hojas();
  const spreadsheetId = SHEET_ID();

  const cab = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A1:M1` });
  if ((cab.data.values?.[0]?.length ?? 0) < ENCABEZADO.length) {
    await api.spreadsheets.values.update({
      spreadsheetId,
      range: `${HOJA_PEDIDOS}!A1:M1`,
      valueInputOption: 'RAW',
      requestBody: { values: [ENCABEZADO] },
    });
  }

  // Consecutivo por joyería: P-0001, P-0002…
  const { data } = await api.spreadsheets.values.get({ spreadsheetId, range: `${HOJA_PEDIDOS}!A2:B` });
  const max = (data.values ?? [])
    .filter((r) => r[0] === joyeriaId)
    .reduce((m, r) => Math.max(m, parseInt(String(r[1]).replace(/\D/g, ''), 10) || 0), 0);
  const numero = `P-${String(max + 1).padStart(4, '0')}`;

  await api.spreadsheets.values.append({
    spreadsheetId,
    range: `${HOJA_PEDIDOS}!A:M`,
    // RAW: un texto como "=SUMA(...)" se guarda como texto, no como fórmula
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        joyeriaId, numero, new Date().toISOString(), p.cliente, p.prenda, p.total, p.entrega, p.estado, p.pago,
        p.nota, p.domiciliarioId, p.domiciliarioNombre, p.valorDomicilio,
      ]],
    },
  });
  return numero;
}