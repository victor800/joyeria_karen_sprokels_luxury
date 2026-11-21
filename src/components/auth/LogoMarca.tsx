'use client';

import { useState } from 'react';
import Icono from '@/components/ui/Icono';

/** Muestra el logo; si no existe /public/logo.png, muestra las siglas. */
export default function LogoMarca({ src, alt, siglas }: { src: string; alt: string; siglas: string }) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-secondary-container">
        <Icono nombre="diamond" className="text-5xl" />
        <span className="font-headline-lg text-headline-lg tracking-widest">{siglas}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFallo(true)}
      className="h-auto w-full select-none rounded-xl object-contain"
    />
  );
}
