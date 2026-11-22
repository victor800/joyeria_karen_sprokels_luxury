// 📁 RUTA: src/lib/admin.ts
import 'server-only';

/**
 * MODO DEMO: abierto mientras pruebas.
 * Cuando conectes Firebase o Apple, aquí se valida la sesión real.
 */
export async function autorizada(_req?: Request): Promise<boolean> {
  return true;
}