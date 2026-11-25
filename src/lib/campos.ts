// lib/campos.ts
export type OpcionCampo = string | { value: string; label: string };

export type Campo = {
  name: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'select' | 'textarea';
  requerido?: boolean;
  placeholder?: string;
  completo?: boolean;
  opciones?: OpcionCampo[];
};