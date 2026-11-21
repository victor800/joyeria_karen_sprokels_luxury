// 📁 RUTA: src/app/dashboard/proveedores/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Proveedores y compras"
      descripcion="Fabricantes, compra de oro y piezas, cuentas por pagar."
      kpis={[
        { t: 'Proveedores activos', v: '0' },
        { t: 'Compras del mes', v: '$0' },
        { t: 'Por pagar', v: '$0' },
      ]}
      columnas={['Proveedor', 'Contacto', 'Producto', 'Última compra', 'Saldo', 'Estado']}
      accion="Nuevo proveedor"
    />
  );
}