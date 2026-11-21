// 📁 RUTA: src/app/dashboard/reportes/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Reportes"
      descripcion="Ventas, utilidad, inventario valorizado y clientes frecuentes."
      kpis={[
        { t: 'Ventas del mes', v: '$0' },
        { t: 'Utilidad', v: '$0' },
        { t: 'Inventario valorizado', v: '$0' },
      ]}
      columnas={['Reporte', 'Descripción', 'Periodo', 'Generado']}
      accion="Generar reporte"
      vacio="Aún no has generado reportes."
    />
  );
}