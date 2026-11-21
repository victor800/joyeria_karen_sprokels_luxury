// 📁 RUTA: src/app/dashboard/domiciliarios/page.tsx
import PaginaTabla from '@/components/dashboard/PaginaTabla';
import { domiciliarios } from '@/lib/datos-dashboard';

export default function Domiciliarios() {
  return (
    <PaginaTabla
      titulo="Domiciliarios"
      sub="Equipo de entregas: zona, vehículo y estado en tiempo real."
      accion="Nuevo domiciliario"
      cols={['Nombre', 'Zona', 'Vehículo', 'Entregas hoy', 'Estado']}
      filas={domiciliarios}
    />
  );
}