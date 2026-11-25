import 'server-only';

/** Devuelve el ID de la joyería actual.
 *  TODO: cuando tengas login, léelo de la sesión (NextAuth/Supabase/Clerk). */
export async function joyeriaActual(): Promise<string> {
  const id = process.env.JOYERIA_ID;
  if (!id) throw new Error('Falta JOYERIA_ID en las variables de entorno');
  return id;
}