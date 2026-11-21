// 📁 RUTA: src/lib/configuracion.ts
import 'server-only';
import { randomBytes } from 'node:crypto';
import { hojas, SHEET_ID, HOJA_CONFIG, asegurarPestana } from './google-sheets';

/** Campos que se pueden editar desde el panel */
export const CAMPOS = [
  'nombre', 'encabezado', 'logo_url', 'nit', 'telefono', 'correo', 'direccion', 'instagram',
  'p24', 'p18', 'p14', 'margen',
  'domicilio', 'horario', 'cobertura', 'seguro',
] as const;
export type Campo = (typeof CAMPOS)[number];

const NUMERICOS: Campo[] = ['p24', 'p18', 'p14', 'margen', 'domicilio', 'seguro'];

/** Campos protegidos: se generan una vez y no se pueden modificar */
const FIJOS = ['id', 'slug', 'creado'] as const;

/** Campos que ve el cliente en la página pública */
export const PUBLICOS = [
  'slug', 'nombre', 'encabezado', 'logo_url', 'telefono', 'instagram', 'direccion', 'horario',
] as const;

export type Config = Record<string, string>;

const MAX = 300;

/** Ruta pública de la tienda: https://dominio.com/t/<slug> */
export const RUTA_TIENDA = '/t';

export function urlTienda(origen: string, slug: string) {
  return `${origen.replace(/\/$/, '')}${RUTA_TIENDA}/${slug}`;
}

export function slugify(t: string) {
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '') // quita apóstrofes sin dejar guion
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function leerFilas(): Promise<Config> {
  const leer = () =>
    hojas().spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: `${HOJA_CONFIG}!A:B`,
    });

  let res;
  try {
    res = await leer();
  } catch {
    // La pestaña quizá no existe todavía: la crea y reintenta
    await asegurarPestana(HOJA_CONFIG);
    res = await leer();
  }

  const cfg: Config = {};
  (res.data.values ?? []).slice(1).forEach(([k, v]) => {
    if (k) cfg[String(k)] = String(v ?? '');
  });
  return cfg;
}

async function escribir(cfg: Config) {
  const orden = [...FIJOS, ...CAMPOS, 'url_tienda', 'actualizado'];
  const filas = [['clave', 'valor'], ...orden.map((k) => [k, cfg[k] ?? ''])];
  const api = hojas();
  await api.spreadsheets.values.clear({ spreadsheetId: SHEET_ID(), range: `${HOJA_CONFIG}!A:B` });
  // RAW: lo escrito se guarda como texto, nunca como fórmula
  await api.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${HOJA_CONFIG}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: filas },
  });
}

/** Lee la configuración; la primera vez crea el id único y el slug */
export async function leerConfig(): Promise<Config> {
  const cfg = await leerFilas();
  if (!cfg.id || !cfg.slug) {
    const nombre = cfg.nombre || "Karen Sprockel's Luxury";
    cfg.id ||= `jks_${randomBytes(6).toString('hex')}`;
    cfg.slug ||= `${slugify(nombre)}-${randomBytes(2).toString('hex')}`;
    cfg.creado ||= new Date().toISOString();
    cfg.nombre ||= nombre;
    await escribir(cfg);
  }
  return cfg;
}

function limpiar(campo: Campo, valor: unknown): string {
  const v = String(valor ?? '').trim().slice(0, MAX);
  if (campo === 'logo_url' && v && !/^(https:\/\/|\/)/i.test(v)) {
    throw new Error('La URL de la foto debe empezar con https:// o con /');
  }
  if (campo === 'correo' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    throw new Error('El correo no es válido');
  }
  if (NUMERICOS.includes(campo) && v && !/^[\d.,\s]+$/.test(v)) {
    throw new Error(`"${campo}" debe ser un número`);
  }
  return v;
}

/** Guarda solo los campos permitidos; id y slug nunca cambian. Guarda también la URL corta. */
export async function guardarConfig(entrada: Record<string, unknown>, origen: string): Promise<Config> {
  const cfg = await leerConfig();
  for (const c of CAMPOS) {
    if (c in entrada) cfg[c] = limpiar(c, entrada[c]);
  }
  cfg.url_tienda = urlTienda(origen, cfg.slug);
  cfg.actualizado = new Date().toISOString();
  await escribir(cfg);
  return cfg;
}