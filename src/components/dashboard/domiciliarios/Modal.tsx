'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { s } from './estilos-domiciliarios';

type Props = {
  titulo: string;
  subtitulo?: string;
  chico?: boolean;
  onCerrar: () => void;
  children: ReactNode;
};

export default function Modal({ titulo, subtitulo, chico, onCerrar, children }: Props) {
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  // Escape cierra y se bloquea el scroll de la página mientras el popup está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previo;
    };
  }, []);

  return (
    <div
      className={s.fondo}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className={`${s.modal} ${chico ? s.modalChico : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className={s.modalCab}>
          <div>
            <h2 className={s.modalTitulo}>{titulo}</h2>
            {subtitulo && <p className={s.modalSub}>{subtitulo}</p>}
          </div>
          <button type="button" className={s.cerrar} onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}