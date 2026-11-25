'use client';
import { useEffect, useRef } from 'react';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

function tono(c: AudioContext, freq: number, inicio: number, dur: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, inicio);
  g.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  o.connect(g).connect(c.destination);
  o.start(inicio);
  o.stop(inicio + dur + 0.05);
}

function campana() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;
  tono(c, 880, t, 0.25);
  tono(c, 1320, t + 0.18, 0.4);
}

/** Suena cuando `valor` AUMENTA respecto al anterior. No suena en la primera carga. */
export default function SonidoNuevo({ valor }: { valor?: number }) {
  const previo = useRef<number | null>(null);

  // Los navegadores bloquean el audio hasta que el usuario interactúa una vez
  useEffect(() => {
    const abrir = () => {
      const c = audio();
      if (c && c.state === 'suspended') void c.resume();
    };
    window.addEventListener('pointerdown', abrir, { once: true });
    window.addEventListener('keydown', abrir, { once: true });
    return () => {
      window.removeEventListener('pointerdown', abrir);
      window.removeEventListener('keydown', abrir);
    };
  }, []);

  useEffect(() => {
    if (valor == null) return;
    if (previo.current !== null && valor > previo.current) campana();
    previo.current = valor;
  }, [valor]);

  return null;
}