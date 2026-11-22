import { leerFoto } from '@/lib/fotos-store';

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[A-Za-z0-9_-]{8}$/.test(codigo)) return new Response('No encontrado', { status: 404 });

  try {
    const foto = await leerFoto(codigo);
    if (!foto) return new Response('No encontrado', { status: 404 });

    return new Response(new Uint8Array(foto.buffer), {
      headers: {
        'Content-Type': foto.mime,
        // El código nunca cambia de imagen: se puede cachear un año.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Error al leer la foto', { status: 500 });
  }
}