// 📁 RUTA: src/app/dashboard/boveda/page.tsx
import PaginaTabla from '@/components/dashboard/PaginaTabla';
import { boveda } from '@/lib/datos-dashboard';

export default function Boveda() {
  return (
    <PaginaTabla
      titulo="Bóveda de oro"
      sub="Piezas en custodia y solicitudes de retiro de los socios."
      accion="Registrar custodia"
      cols={['Socio', 'Pieza', 'Peso', 'Ingreso', 'Estado']}
      filas={boveda}
    />
  );
}