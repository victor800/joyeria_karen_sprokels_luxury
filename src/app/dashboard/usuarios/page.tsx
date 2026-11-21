// 📁 RUTA: src/app/dashboard/usuarios/page.tsx
import PaginaModulo from '@/components/dashboard/PaginaModulo';

export default function Page() {
  return (
    <PaginaModulo
      titulo="Usuarios y roles"
      descripcion="Administrador, vendedor, bodega, mensajero y contador, cada uno con sus permisos."
      kpis={[
        { t: 'Usuarios activos', v: '0' },
        { t: 'Roles', v: '5' },
        { t: 'Último acceso', v: '—' },
      ]}
      columnas={['Nombre', 'Correo', 'Rol', 'Último acceso', 'Estado']}
      accion="Nuevo usuario"
    />
  );
}