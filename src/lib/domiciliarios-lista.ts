import 'server-only';
import { listar } from '@/lib/domiciliarios-store';

export type OpcionDomiciliario = { id: string; nombre: string };

/** Domiciliarios asignables de esta joyería (sin suspendidos). */
export async function domiciliariosAsignables(joyeriaId: string): Promise<OpcionDomiciliario[]> {
  const todos = await listar(joyeriaId);
  return todos
    .filter((d) => d.estado !== 'suspendido')
    .map((d) => ({ id: d.id, nombre: d.nombre }));
}