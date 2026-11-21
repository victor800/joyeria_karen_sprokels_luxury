// 📁 RUTA: src/app/dashboard/garantias/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Garantías y servicios"
      descripcion="Reparaciones, ajustes de talla, limpieza y certificados."
      kpis={[
        { t: 'Casos abiertos', v: '0' },
        { t: 'En reparación', v: '0' },
        { t: 'Entregados este mes', v: '0' },
      ]}
      columnas={['Cliente', 'Pieza', 'Servicio', 'Ingreso', 'Entrega', 'Estado']}
      accion="Nuevo servicio"
    />
  );
}