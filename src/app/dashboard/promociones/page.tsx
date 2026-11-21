// 📁 RUTA: src/app/dashboard/promociones/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Promociones y cupones"
      descripcion="Descuentos, códigos y ofertas por temporada."
      kpis={[
        { t: 'Promociones activas', v: '0' },
        { t: 'Cupones usados', v: '0' },
        { t: 'Programadas', v: '0' },
      ]}
      columnas={['Código', 'Descripción', 'Descuento', 'Vigencia', 'Usos', 'Estado']}
      accion="Nuevo cupón"
    />
  );
}