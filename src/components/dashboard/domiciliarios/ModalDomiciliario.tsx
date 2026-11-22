'use client';

import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  ESTADOS,
  ESTADO_TEXTO,
  VEHICULOS,
  VEHICULOS_CON_PLACA,
  type Domiciliario,
  type EstadoDomiciliario,
  type Local,
} from '@/types/domiciliario';
import { comprimirImagen } from '@/lib/imagen-cliente';
import { rutaFoto } from '@/lib/foto-url';
import Modal from './Modal';
import { s } from './estilos-domiciliarios';

type Props = {
  locales: Local[];
  inicial?: Domiciliario; // si viene, edita; si no, crea
  onCerrar: () => void;
  onGuardado: () => void;
};

type Foto = { url: string; nueva: string | null }; // url = ya guardada · nueva = elegida y pendiente de subir

class ErrorFoto extends Error {}

/* ───────── Selector de foto ───────── */
function SelectorFoto({
  titulo,
  foto,
  error,
  onElegir,
  onQuitar,
}: {
  titulo: string;
  foto: Foto;
  error?: string;
  onElegir: (f: File) => void;
  onQuitar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const vista = foto.nueva ?? (foto.url ? rutaFoto(foto.url) : '');

  return (
    <div>
      <label className={s.etiqueta}>{titulo}</label>
      <div className={s.foto}>
        <button
          type="button"
          className={s.fotoBtn}
          onClick={() => inputRef.current?.click()}
          aria-label={`Subir ${titulo.toLowerCase()}`}
        >
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt={titulo} className={s.fotoImg} />
          ) : (
            <span className={s.fotoVacia}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Subir foto
            </span>
          )}
        </button>
        {vista && (
          <button type="button" className={s.fotoQuitar} onClick={onQuitar} aria-label="Quitar foto">
            ✕
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onElegir(f);
          }}
        />
      </div>
      {error && <p className={s.error}>{error}</p>}
    </div>
  );
}

/* ───────── Popup crear / editar ───────── */
export default function ModalDomiciliario({ locales, inicial, onCerrar, onGuardado }: Props) {
  const editando = Boolean(inicial);

  const [form, setForm] = useState({
    nombre: inicial?.nombre ?? '',
    localId: inicial?.localId ?? (locales.length === 1 ? locales[0].id : ''),
    zona: inicial?.zona ?? '',
    vehiculo: inicial?.vehiculo ?? 'Moto',
    placa: inicial?.placa ?? '',
    estado: (inicial?.estado ?? 'creado') as EstadoDomiciliario,
    entregasHoy: String(inicial?.entregasHoy ?? 0),
  });
  const [fotoDom, setFotoDom] = useState<Foto>({ url: inicial?.fotoUrl ?? '', nueva: null });
  const [fotoVeh, setFotoVeh] = useState<Foto>({ url: inicial?.fotoVehiculoUrl ?? '', nueva: null });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const requierePlaca = VEHICULOS_CON_PLACA.includes(form.vehiculo);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: '' }));
  }

  async function elegirFoto(file: File, setFoto: Dispatch<SetStateAction<Foto>>, clave: string) {
    try {
      const dataUrl = await comprimirImagen(file);
      setFoto((p) => ({ ...p, nueva: dataUrl }));
      setErrores((e) => ({ ...e, [clave]: '' }));
    } catch (err) {
      setErrores((e) => ({ ...e, [clave]: err instanceof Error ? err.message : 'No se pudo leer la imagen.' }));
    }
  }

  /** Sube la foto nueva (si hay) a la hoja y devuelve la URL corta. */
  async function subir(f: Foto): Promise<string> {
    if (!f.nueva) return f.url;
    const res = await fetch('/api/fotos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen: f.nueva }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ErrorFoto(data.error ?? 'No se pudo subir la foto.');
    return data.url as string;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    setErrorGeneral('');

    try {
      const [fotoUrl, fotoVehiculoUrl] = await Promise.all([subir(fotoDom), subir(fotoVeh)]);

      const res = await fetch(editando ? `/api/domiciliarios/${inicial!.id}` : '/api/domiciliarios', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          placa: requierePlaca ? form.placa : '',
          fotoUrl,
          fotoVehiculoUrl,
          entregasHoy: Number(form.entregasHoy),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.errores) setErrores(data.errores);
        else setErrorGeneral(data.error ?? 'No se pudo guardar. Intenta de nuevo.');
        return;
      }

      onGuardado();
    } catch (err) {
      setErrorGeneral(err instanceof ErrorFoto ? err.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  const msg = (k: string) => (errores[k] ? <p className={s.error}>{errores[k]}</p> : null);

  return (
    <Modal
      titulo={editando ? 'Editar domiciliario' : 'Nuevo domiciliario'}
      subtitulo={
        editando
          ? inicial!.nombre
          : 'Al guardar se le asigna un ID automático y queda vinculado al local.'
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={onSubmit}>
        <div className={s.modalCuerpo}>
          <div className={s.rejilla}>
            {editando && (
              <div className={s.completo}>
                <label className={s.etiqueta}>ID del domiciliario</label>
                <input className={`${s.campo} ${s.soloLectura}`} value={inicial!.id} readOnly />
              </div>
            )}

            <div className={`${s.completo} ${s.fotos}`}>
              <SelectorFoto
                titulo="Foto del domiciliario"
                foto={fotoDom}
                error={errores.fotoUrl}
                onElegir={(f) => elegirFoto(f, setFotoDom, 'fotoUrl')}
                onQuitar={() => setFotoDom({ url: '', nueva: null })}
              />
              <SelectorFoto
                titulo="Foto del vehículo"
                foto={fotoVeh}
                error={errores.fotoVehiculoUrl}
                onElegir={(f) => elegirFoto(f, setFotoVeh, 'fotoVehiculoUrl')}
                onQuitar={() => setFotoVeh({ url: '', nueva: null })}
              />
            </div>

            <div className={s.completo}>
              <label className={s.etiqueta}>Nombre completo</label>
              <input className={s.campo} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
              {msg('nombre')}
            </div>

            <div>
              <label className={s.etiqueta}>Local</label>
              <select className={s.campo} value={form.localId} onChange={(e) => set('localId', e.target.value)}>
                <option value="">Selecciona un local…</option>
                {locales.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
              {form.localId && <p className={s.ayuda}>ID: {form.localId}</p>}
              {msg('localId')}
            </div>

            <div>
              <label className={s.etiqueta}>Zona</label>
              <input className={s.campo} value={form.zona} onChange={(e) => set('zona', e.target.value)} />
              {msg('zona')}
            </div>

            <div>
              <label className={s.etiqueta}>Vehículo</label>
              <select className={s.campo} value={form.vehiculo} onChange={(e) => set('vehiculo', e.target.value)}>
                {VEHICULOS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {msg('vehiculo')}
            </div>

            <div>
              <label className={s.etiqueta}>Placa</label>
              <input
                className={`${s.campo} ${s.placa}`}
                value={requierePlaca ? form.placa : ''}
                onChange={(e) => set('placa', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                placeholder={requierePlaca ? 'ABC123' : 'No aplica'}
                disabled={!requierePlaca}
                maxLength={7}
                autoCapitalize="characters"
                autoComplete="off"
              />
              {msg('placa')}
            </div>

            <div className={editando ? undefined : s.completo}>
              <label className={s.etiqueta}>Estado</label>
              <select
                className={s.campo}
                value={form.estado}
                onChange={(e) => set('estado', e.target.value as EstadoDomiciliario)}
              >
                {ESTADOS.map((st) => (
                  <option key={st} value={st}>
                    {ESTADO_TEXTO[st]}
                  </option>
                ))}
              </select>
              {msg('estado')}
            </div>

            {editando && (
              <div>
                <label className={s.etiqueta}>Entregas hoy</label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={s.campo}
                  value={form.entregasHoy}
                  onChange={(e) => set('entregasHoy', e.target.value)}
                />
                {msg('entregasHoy')}
              </div>
            )}
          </div>

          {errorGeneral && <p className={s.errorCaja}>{errorGeneral}</p>}
        </div>

        <div className={s.modalPie}>
          <button type="button" className={s.btnGhost} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className={s.btnOro} disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear domiciliario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}