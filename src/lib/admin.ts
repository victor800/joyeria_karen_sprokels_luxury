// 📁 RUTA: src/lib/admin.ts
import 'server-only';

/**
 * ⚠️ SEGURIDAD: devolver true solo si hay una sesión de administradora válida.
 * Lo usan /api/configuracion y /api/configuracion/logo.
 */
export async function autorizada(_req: Request): Promise<boolean> {
  // TODO: validar sesión real
  return process.env.NODE_ENV !== 'production';
}