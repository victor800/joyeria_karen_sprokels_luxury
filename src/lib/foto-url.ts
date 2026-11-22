const PATRON = /\/f\/([A-Za-z0-9_-]{8})$/;

export function codigoDeUrl(url: string | undefined | null): string | null {
  return url?.match(PATRON)?.[1] ?? null;
}

/** Ruta relativa para <img>: funciona igual en local y en producción. */
export function rutaFoto(url: string | undefined | null): string {
  const c = codigoDeUrl(url);
  return c ? `/f/${c}` : '';
}