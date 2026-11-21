// 📁 RUTA: src/app/dashboard/pedidos/page.tsx
import PaginaTabla from '@/components/dashboard/PaginaTabla';
import { pedidos } from '@/lib/datos-dashboard';

export default function Pedidos() {
  return (
    <PaginaTabla
      titulo="Pedidos"
      sub="Ventas en tienda y domicilios, del pedido a la entrega."
      accion="Nuevo pedido"
      cols={['N°', 'Cliente', 'Prenda', 'Total', 'Entrega', 'Estado']}
      filas={pedidos}
    />
  );
}