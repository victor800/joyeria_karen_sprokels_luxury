// 📁 RUTA: components/auth/iconos.tsx
import type { SVGProps } from 'react';

/** Iconos SVG propios: sin dependencias, sin fuentes externas. */
const RUTAS: Record<string, string[]> = {
  shield: ['M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z', 'M10 11h4v4h-4z'],
  shieldCheck: ['M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z', 'M8.5 12l2.5 2.5 4.5-5'],
  lock: ['M5 11h14v9H5z', 'M8 11V8a4 4 0 018 0v3'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  key: ['M4 15a4 4 0 108 0 4 4 0 10-8 0', 'M10.8 12.2L20 3', 'M16 7l3 3', 'M14 9l2 2'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M9 12a3 3 0 106 0 3 3 0 10-6 0'],
  eyeOff: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M9 12a3 3 0 106 0 3 3 0 10-6 0', 'M4 4l16 16'],
  user: ['M8 8a4 4 0 108 0 4 4 0 10-8 0', 'M4 21c0-4 3.5-7 8-7s8 3 8 7'],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z'],
  badge: ['M4 5h16v14H4z', 'M8 11a2 2 0 104 0 2 2 0 10-4 0', 'M7 16c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5', 'M15 9h3', 'M15 12h3'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  diamond: ['M6 4h12l4 6-10 11L2 10l4-6z', 'M2 10h20', 'M9 4l-2 6 5 11 5-11-2-6'],
  cube: ['M12 2l9 5v10l-9 5-9-5V7l9-5z', 'M12 12l9-5', 'M12 12v10', 'M12 12L3 7'],
  dots: ['M6 6h.01', 'M12 6h.01', 'M18 6h.01', 'M6 12h.01', 'M12 12h.01', 'M18 12h.01', 'M6 18h.01', 'M12 18h.01', 'M18 18h.01'],
  support: ['M4 14v-2a8 8 0 0116 0v2', 'M4 14h3v5H5a1 1 0 01-1-1v-4z', 'M20 14h-3v5h2a1 1 0 001-1v-4z', 'M17 19c0 1.5-2 2-5 2'],
  scale: ['M12 3v18', 'M6 21h12', 'M4 7h16', 'M6 7l-3 7a3.5 3.5 0 006 0L6 7z', 'M18 7l-3 7a3.5 3.5 0 006 0l-3-7z'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  arrowUp: ['M7 17L17 7', 'M8 7h9v9'],
  alert: ['M12 8v5', 'M12 17h.01', 'M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z'],
};

export type NombreIcono = keyof typeof RUTAS;

export function Icono({ nombre, ...props }: { nombre: NombreIcono } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {RUTAS[nombre].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function GoogleG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" {...props}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}