// 📁 RUTA: src/app/dashboard/apartados/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Apartados"
      descripcion="Separados con abonos, saldos pendientes y vencimientos."
      kpis={[
        { t: 'Apartados activos', v: '0' },
        { t: 'Saldo por cobrar', v: '$0' },
        { t: 'Vencen esta semana', v: '0' },
      ]}
      columnas={['Cliente', 'Pieza', 'Total', 'Abonado', 'Saldo', 'Vence', 'Estado']}
      accion="Nuevo apartado"
    />
  );
}