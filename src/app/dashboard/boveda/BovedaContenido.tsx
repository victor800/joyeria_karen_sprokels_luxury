// 📁 RUTA: src/app/dashboard/boveda/BovedaContenido.tsx
import { listarRegistros, type Registro } from '@/lib/boveda-registros';
import BovedaPanel from './BovedaPanel';

export default async function BovedaContenido() {
  let inicial: Registro[] = [];
  let errorCarga = '';
  try {
    inicial = await listarRegistros();
  } catch (e) {
    console.error('BovedaContenido', e);
    errorCarga = e instanceof Error && e.message ? e.message : 'No se pudo leer la bóveda';
  }
  return <BovedaPanel inicial={inicial} errorCarga={errorCarga} />;
}