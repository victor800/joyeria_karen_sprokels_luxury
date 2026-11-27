// 📁 RUTA: src/lib/domiciliarios-web.ts   (ARCHIVO NUEVO)
// Acceso público de domiciliarios: lee la hoja "Domiciliarios", valida usuario + clave
// (clave = últimos 4 dígitos del teléfono), firma la cookie de sesión y limita los intentos.
import 'server-only';
import crypto from 'node:crypto';

/** Slug público del enlace: https://TU-DOMINIO/domi/<SLUG> (cámbialo si quieres otro) */
export const SLUG_DOMICILIARIOS = 'karen-sprockels';
export const SESSION_DOMI = 'domi_session';
export const DIAS_SESION = 30;
const HOJA = 'Domiciliarios';

export const slugValido = (slug: string | null | undefined) => slug === SLUG_DOMICILIARIOS;

export type Domiciliario = { usuario: string; telefono: string; activo: boolean };

/* ═════════ Lectura de la hoja ═════════ */

/**
 * ÚNICO punto que depende de cómo lees Google Sheets en tu proyecto.
 * Debe devolver la hoja "Domiciliarios" como matriz de texto: la fila 0 son los encabezados.
 */
async function leerHojaDomiciliarios(): Promise<string[][]> {
  // ⬇ CONECTA AQUÍ tu lector de hojas (el de src/lib/sheets). Ejemplo de forma:
  // const { leerHoja } = await import('@/lib/sheets');
  // return leerHoja(HOJA);
  void HOJA;
  throw new Error('Falta conectar la lectura de la hoja "Domiciliarios" en leerHojaDomiciliarios().');
}

export const sinAcentos = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const soloDigitos = (t: string) => t.replace(/\D/g, '');

/** Busca la columna por palabras clave, respetando el orden de prioridad de las claves */
function columna(enc: string[], ...claves: string[]) {
  for (const c of claves) {
    const i = enc.findIndex((h) => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

const NEGATIVOS = ['inactivo', 'no', 'false', '0', 'suspendido', 'bloqueado', 'baja', 'retirado'];

function parsear(filas: string[][]): Domiciliario[] {
  if (filas.length < 2) return [];
  const enc = filas[0].map((h) => sinAcentos(String(h ?? '')));
  const iUsuario = columna(enc, 'usuario', 'nombre');
  const iTel = columna(enc, 'telefono', 'celular', 'whatsapp', 'tel', 'cel');
  const iEstado = columna(enc, 'activo', 'estado');
  if (iUsuario < 0 || iTel < 0) return [];

  const lista: Domiciliario[] = [];
  for (const fila of filas.slice(1)) {
    const usuario = String(fila[iUsuario] ?? '').trim();
    const telefono = String(fila[iTel] ?? '').trim();
    if (!usuario || soloDigitos(telefono).length < 7) continue;
    const activo = iEstado < 0 || !NEGATIVOS.includes(sinAcentos(String(fila[iEstado] ?? '')));
    lista.push({ usuario, telefono, activo });
  }
  return lista;
}

const g = globalThis as unknown as {
  __domiCache?: { en: number; lista: Domiciliario[] };
  __domiLimites?: Map<string, { n: number; hasta: number }>;
};

/** Lista de domiciliarios (caché de 60 s; el inicio de sesión siempre lee la hoja fresca) */
async function obtenerLista(fresco: boolean): Promise<Domiciliario[]> {
  const c = g.__domiCache;
  if (!fresco && c && Date.now() - c.en < 60_000) return c.lista;
  const lista = parsear(await leerHojaDomiciliarios());
  g.__domiCache = { en: Date.now(), lista };
  return lista;
}

/* ═════════ Validación de credenciales ═════════ */

function iguales(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Usuario (nombre o teléfono) + clave (últimos 4 dígitos del teléfono) */
export async function validar(entrada: string, clave: string): Promise<Domiciliario | null> {
  const lista = await obtenerLista(true);
  const nombre = sinAcentos(entrada);
  const tel = soloDigitos(entrada);

  const d = lista.find(
    (x) =>
      x.activo &&
      ((nombre && sinAcentos(x.usuario) === nombre) ||
        (tel.length >= 7 && soloDigitos(x.telefono).slice(-10) === tel.slice(-10))),
  );
  if (!d) return null;

  const esperada = soloDigitos(d.telefono).slice(-4);
  if (esperada.length < 4) return null;
  return iguales(esperada, soloDigitos(clave)) ? d : null;
}

/* ═════════ Sesión firmada (cookie) ═════════ */

function secreto() {
  const s = process.env.DOMI_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Falta la variable de entorno DOMI_SESSION_SECRET (mínimo 16 caracteres).');
  return s;
}

const huella = (tel: string) => crypto.createHash('sha256').update(soloDigitos(tel)).digest('hex').slice(0, 12);
const firmar = (cuerpo: string) => crypto.createHmac('sha256', secreto()).update(cuerpo).digest('base64url');

export function firmarSesion(d: Domiciliario, slug: string) {
  const cuerpo = Buffer.from(
    JSON.stringify({ u: d.usuario, s: slug, k: huella(d.telefono), e: Math.floor(Date.now() / 1000) + DIAS_SESION * 86400 }),
  ).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo)}`;
}

/** Cookie válida, del slug correcto, y el domiciliario sigue activo con el mismo teléfono en la hoja */
export async function sesionVigente(token: string | null | undefined, slug: string): Promise<Domiciliario | null> {
  if (!token) return null;
  const [cuerpo, firma] = token.split('.');
  if (!cuerpo || !firma || !iguales(firma, firmar(cuerpo))) return null;

  let p: { u: string; s: string; k: string; e: number };
  try {
    p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (p.s !== slug || p.e < Date.now() / 1000) return null;

  const lista = await obtenerLista(false);
  const d = lista.find((x) => x.activo && sinAcentos(x.usuario) === sinAcentos(p.u));
  return d && huella(d.telefono) === p.k ? d : null;
}

/* ═════════ Límite de intentos (por IP y por usuario) ═════════ */

const VENTANA = 15 * 60 * 1000;
const MAX_IP = 10;
const MAX_USUARIO = 5;

const limites = () => (g.__domiLimites ??= new Map());

function leer(clave: string) {
  const r = limites().get(clave);
  if (!r || r.hasta < Date.now()) {
    limites().delete(clave);
    return null;
  }
  return r;
}

export function segundosBloqueo(ip: string, usuario: string) {
  const a = leer(`ip:${ip}`);
  const b = leer(`u:${sinAcentos(usuario)}`);
  const hasta = Math.max(a && a.n >= MAX_IP ? a.hasta : 0, b && b.n >= MAX_USUARIO ? b.hasta : 0);
  return hasta > Date.now() ? Math.ceil((hasta - Date.now()) / 1000) : 0;
}

export function registrarFallo(ip: string, usuario: string) {
  for (const k of [`ip:${ip}`, `u:${sinAcentos(usuario)}`]) {
    const r = leer(k);
    limites().set(k, { n: (r?.n ?? 0) + 1, hasta: r?.hasta ?? Date.now() + VENTANA });
  }
}

export function limpiarFallos(usuario: string) {
  limites().delete(`u:${sinAcentos(usuario)}`);
}