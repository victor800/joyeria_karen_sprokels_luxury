export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div className="p-8">Producto: {slug}</div>;
}
