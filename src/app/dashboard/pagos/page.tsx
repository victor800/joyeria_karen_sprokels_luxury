// 📁 RUTA: src/app/dashboard/pagos/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Pagos"
      descripcion="Pagos recibidos y pendientes, por método de pago."
      kpis={[
        { t: 'Recibidos hoy', v: '$0' },
        { t: 'Pendientes', v: '$0' },
        { t: 'Abonos activos', v: '0' },
      ]}
      columnas={['Fecha', 'Pedido', 'Cliente', 'Método', 'Valor', 'Estado']}
      accion="Registrar pago"
    />
  );
}