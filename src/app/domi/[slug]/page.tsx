// 📁 RUTA: src/app/domi/[slug]/page.tsx
// Enlace público de domiciliarios: valida el slug y la sesión, y muestra el login o el panel.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SESSION_DOMI, sesionVigente, slugValido } from '@/lib/domiciliarios-web';
import PanelDomi from './PanelDomi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mis entregas',
  robots: { index: false, follow: false },
};

export default async function PaginaDomi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugValido(slug)) notFound();

  const token = (await cookies()).get(SESSION_DOMI)?.value;
  // Si la hoja no responde o falta la configuración, se muestra el login en vez de romper la página
  const d = await sesionVigente(token, slug).catch((err) => {
    console.error('[/domi] sesión:', err);
    return null;
  });

  return <PanelDomi slug={slug} nombre={d?.usuario ?? null} />;
}