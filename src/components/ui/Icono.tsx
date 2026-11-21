/** Icono de Material Symbols. Nombres en https://fonts.google.com/icons */
export default function Icono({ nombre, className = '' }: { nombre: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {nombre}
    </span>
  );
}
