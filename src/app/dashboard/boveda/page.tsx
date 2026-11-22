// 📁 RUTA: src/app/dashboard/boveda/page.tsx
import { bovedaAbierta, codigoConfigurado } from '@/lib/boveda-acceso';
import CajaFuerte from '@/components/boveda/CajaFuerte';
import BovedaContenido from './BovedaContenido';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const abierta = await bovedaAbierta();
  // sinCodigo = true mientras no exista BOVEDA_CODIGO: la bóveda abre sin pedir código (modo temporal)
  return (
    <CajaFuerte abierta={abierta} sinCodigo={!codigoConfigurado()}>
      {abierta ? <BovedaContenido /> : null}
    </CajaFuerte>
  );
}