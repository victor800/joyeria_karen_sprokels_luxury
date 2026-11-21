// 📁 RUTA: src/app/dashboard/personalizados/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Pedidos personalizados"
      descripcion="Encargos a medida, grabados y estado de fabricación."
      kpis={[
        { t: 'En diseño', v: '0' },
        { t: 'En fabricación', v: '0' },
        { t: 'Listos para entrega', v: '0' },
      ]}
      columnas={['Cliente', 'Descripción', 'Quilataje', 'Anticipo', 'Entrega estimada', 'Estado']}
      accion="Nuevo encargo"
    />
  );
}