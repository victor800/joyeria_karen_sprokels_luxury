// 📁 RUTA: src/app/dashboard/clientes/page.tsx
import PaginaTabla from '@/components/dashboard/PaginaTabla';
import { clientes } from '@/lib/datos-dashboard';

export default function Clientes() {
  return (
    <PaginaTabla
      titulo="Clientes VIP"
      sub="Socios del club, su cédula y el oro que tienen en custodia."
      accion="Nuevo socio"
      cols={['Socio', 'Cédula', 'Piezas en bóveda', 'Gramos', 'Estado']}
      filas={clientes}
    />
  );
}