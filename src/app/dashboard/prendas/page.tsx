// 📁 RUTA: src/app/dashboard/prendas/page.tsx
import PaginaTabla from '@/components/dashboard/PaginaTabla';
import { prendas } from '@/lib/datos-dashboard';

export default function Prendas() {
  return (
    <PaginaTabla
      titulo="Prendas"
      sub="Catálogo de piezas en oro certificado, con peso y precio por gramo."
      accion="Nueva prenda"
      cols={['Código', 'Prenda', 'Categoría', 'Peso', 'Precio', 'Stock', 'Estado']}
      filas={prendas}
    />
  );
}