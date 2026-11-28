// 📁 RUTA: src/components/dashboard/Notificaciones.tsx   (ARCHIVO NUEVO)
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Notificacion } from '@/lib/notificaciones';
import './extras-dashboard.css';

const K_LEIDAS = 'jks:notif:leidas';
const K_BORRADAS = 'jks:notif:borradas';
const K_SONIDO = 'jks:notif:sonido';
const CADA_MS = 30_000;

function leer(k: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function guardar(k: string, set: Set<string>) {
  try {
    localStorage.setItem(k, JSON.stringify([...set].slice(-300)));
  } catch {}
}

const ICONO: Record<Notificacion['tipo'], string> = { pedido: '◆', domicilio: '➤', stock: '▼' };

export function CampanaNotificaciones() {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [leidas, setLeidas] = useState<Set<string>>(new Set());
  const [borradas, setBorradas] = useState<Set<string>>(new Set());
  const [sonido, setSonido] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [solo, setSolo] = useState<'todas' | 'sin_leer'>('todas');
  const [toasts, setToasts] = useState<Notificacion[]>([]);

  const raiz = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const conocidas = useRef<Set<string> | null>(null);
  const borradasRef = useRef(borradas);
  const sonidoRef = useRef(sonido);
  borradasRef.current = borradas;
  sonidoRef.current = sonido;

  // Preferencias guardadas en este navegador
  useEffect(() => {
    setLeidas(new Set(leer(K_LEIDAS)));
    setBorradas(new Set(leer(K_BORRADAS)));
    setSonido(localStorage.getItem(K_SONIDO) !== 'off');
  }, []);

  // El navegador solo permite audio después de un clic/tecla: lo "desbloqueamos" una vez
  useEffect(() => {
    const desbloquear = () => {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audio.current ??= new AC();
        if (audio.current.state === 'suspended') void audio.current.resume();
      } catch {}
    };
    window.addEventListener('pointerdown', desbloquear, { once: true });
    window.addEventListener('keydown', desbloquear, { once: true });
    return () => {
      window.removeEventListener('pointerdown', desbloquear);
      window.removeEventListener('keydown', desbloquear);
    };
  }, []);

  const sonar = useCallback(() => {
    try {
      const ctx = audio.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      // Dos notas cortas tipo "campanita"
      [[880, 0], [1318.5, 0.17]].forEach(([freq, delay]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t0 = ctx.currentTime + delay;
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        o.connect(g).connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 0.6);
      });
    } catch {}
  }, []);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/notificaciones', { cache: 'no-store' });
      if (!r.ok) return;
      const { items: nuevos } = (await r.json()) as { items: Notificacion[] };
      setItems(nuevos);

      // Primera carga: solo memorizamos lo que ya existe (sin sonido)
      if (conocidas.current === null) {
        conocidas.current = new Set(nuevos.map((n) => n.id));
        return;
      }
      const conocido = conocidas.current;
      const frescas = nuevos.filter((n) => !conocido.has(n.id) && !borradasRef.current.has(n.id));
      nuevos.forEach((n) => conocido.add(n.id));

      if (frescas.length) {
        if (sonidoRef.current) sonar();
        const mostrar = frescas.slice(0, 3);
        setToasts((t) => [...mostrar, ...t].slice(0, 3));
        const ids = mostrar.map((n) => n.id);
        setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 7000);
      }
    } catch {}
  }, [sonar]);

  // Consulta periódica + al volver a la pestaña
  useEffect(() => {
    void cargar();
    const t = setInterval(cargar, CADA_MS);
    const vis = () => document.visibilityState === 'visible' && void cargar();
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [cargar]);

  // Cerrar con clic afuera o Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);

  const visibles = items.filter((n) => !borradas.has(n.id));
  const sinLeer = visibles.filter((n) => !leidas.has(n.id));
  const lista = solo === 'sin_leer' ? sinLeer : visibles;

  const marcar = (ids: string[]) => {
    const s = new Set(leidas);
    ids.forEach((i) => s.add(i));
    setLeidas(s);
    guardar(K_LEIDAS, s);
  };
  const quitar = (ids: string[]) => {
    const s = new Set(borradas);
    ids.forEach((i) => s.add(i));
    setBorradas(s);
    guardar(K_BORRADAS, s);
  };
  const alternarSonido = () => {
    const nuevo = !sonido;
    setSonido(nuevo);
    localStorage.setItem(K_SONIDO, nuevo ? 'on' : 'off');
    if (nuevo) sonar(); // vista previa
  };

  return (
    <div className="n-wrap" ref={raiz}>
      <button
        type="button"
        className="n-btn"
        aria-label={`Notificaciones${sinLeer.length ? `, ${sinLeer.length} sin leer` : ''}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
        </svg>
        {sinLeer.length > 0 && <span className="n-badge">{sinLeer.length > 9 ? '9+' : sinLeer.length}</span>}
      </button>

      {abierto && (
        <div className="n-panel" role="dialog" aria-label="Notificaciones">
          <div className="n-head">
            <h4>Notificaciones</h4>
            <div>
              <button type="button" className="n-link" onClick={alternarSonido} aria-pressed={sonido}>
                {sonido ? 'Sonido activado' : 'Sonido silenciado'}
              </button>
            </div>
          </div>

          <div className="n-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={solo === 'todas'} onClick={() => setSolo('todas')}>
              Todas ({visibles.length})
            </button>
            <button type="button" role="tab" aria-selected={solo === 'sin_leer'} onClick={() => setSolo('sin_leer')}>
              Sin leer ({sinLeer.length})
            </button>
            <button
              type="button"
              className="n-link n-der"
              disabled={!sinLeer.length}
              onClick={() => marcar(sinLeer.map((n) => n.id))}
            >
              Marcar todas como leídas
            </button>
          </div>

          {lista.length === 0 ? (
            <p className="n-vacio">{solo === 'sin_leer' ? 'Está al día: no hay nada sin leer.' : 'Aún no hay notificaciones.'}</p>
          ) : (
            <ul className="n-lista">
              {lista.map((n) => {
                const nueva = !leidas.has(n.id);
                return (
                  <li key={n.id} className={nueva ? 'n-nueva' : ''}>
                    <Link
                      href={n.href}
                      onClick={() => {
                        marcar([n.id]);
                        setAbierto(false);
                      }}
                    >
                      <span className={`n-ico t-${n.tipo}`} aria-hidden>{ICONO[n.tipo]}</span>
                      <span className="n-txt">
                        <b>{n.titulo}</b>
                        <small>{n.detalle}</small>
                        <small className="n-cuando">{n.cuando}</small>
                      </span>
                    </Link>
                    <span className="n-acc">
                      {nueva && (
                        <button type="button" title="Marcar como leída" aria-label="Marcar como leída" onClick={() => marcar([n.id])}>✓</button>
                      )}
                      <button type="button" title="Descartar" aria-label="Descartar notificación" onClick={() => quitar([n.id])}>×</button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {visibles.length > 0 && (
            <div className="n-pie">
              <button type="button" className="n-link" onClick={() => quitar(visibles.map((n) => n.id))}>
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Avisos emergentes cuando llega algo nuevo */}
      <div className="n-toasts" aria-live="polite">
        {toasts.map((n) => (
          <div key={n.id} className="n-toast">
            <Link
              href={n.href}
              onClick={() => {
                marcar([n.id]);
                setToasts((t) => t.filter((x) => x.id !== n.id));
              }}
            >
              <span className={`n-ico t-${n.tipo}`} aria-hidden>{ICONO[n.tipo]}</span>
              <span className="n-txt">
                <b>{n.titulo}</b>
                <small>{n.detalle}</small>
              </span>
            </Link>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}