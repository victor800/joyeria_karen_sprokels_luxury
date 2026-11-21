// 📁 RUTA: src/app/dashboard/inventario/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Inventario"
      descripcion="Existencias por pieza, ubicación y alertas de stock bajo."
      kpis={[
        { t: 'Piezas en stock', v: '0' },
        { t: 'Stock bajo', v: '0' },
        { t: 'Valor del inventario', v: '$0' },
      ]}
      columnas={['SKU', 'Pieza', 'Ubicación', 'Existencias', 'Mínimo', 'Estado']}
      accion="Registrar movimiento"
    />
  );
}