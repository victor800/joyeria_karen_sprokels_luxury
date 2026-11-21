'use client';

import { useEffect, useState } from 'react';

const ZONA = 'America/Bogota';

function useAhora() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/** Fecha y hora en vivo (zona horaria de Colombia). */
export default function Reloj() {
  const ahora = useAhora();
  const hora = ahora
    ? ahora.toLocaleTimeString('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : '--:--:--';
  const fechaBase = ahora
    ? ahora.toLocaleDateString('es-CO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '\u00a0';
  // Solo la primera letra en mayúscula: "Sábado, 21 de noviembre de 2026"
  const fecha = fechaBase.charAt(0).toUpperCase() + fechaBase.slice(1);

  return (
    <div className="d-reloj" role="timer" aria-label="Fecha y hora actual">
      <strong>{hora}</strong>
      <span>{fecha}</span>
    </div>
  );
}

/** Saludo según la hora del día. */
export function Saludo() {
  const ahora = useAhora();
  if (!ahora) return <>Hola</>;
  const h = Number(
    new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(ahora),
  );
  return <>{h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}</>;
}