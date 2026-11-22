import 'server-only';
import { leerConfig } from './configuracion';
import type { Local } from '@/types/domiciliario';

/** Hoy hay un solo local (la configuración). Si luego tienes varios, solo cambia esta función. */
export async function obtenerLocales(): Promise<Local[]> {
  const cfg = await leerConfig();
  return [{ id: cfg.id, nombre: cfg.nombre || 'Mi local' }];
}