// 📁 RUTA: src/components/dashboard/TablasMovil.tsx
'use client';

import { useEffect } from 'react';

const MOVIL = '(max-width: 900px)';
const ES_ACCION = /acci|opci/i;

function poner(el: Element, k: string, v: string) {
  if (el.getAttribute(k) !== v) el.setAttribute(k, v);
}

/** React marca cada nodo con __reactFiber$ cuando ya lo hidrató. Antes de eso, no se toca. */
function hidratado(el: Element) {
  for (const k in el) {
    if (k.startsWith('__reactFiber$')) return true;
  }
  return false;
}

export default function TablasMovil() {
  useEffect(() => {
    const mq = window.matchMedia(MOVIL);
    let raf = 0;
    let reintento = 0;
    let intentos = 0;

    /** Devuelve true si quedaron elementos sin hidratar (hay que reintentar) */
    function preparar(): boolean {
      if (!mq.matches) return false;
      let pendiente = false;

      // Tablas → tarjetas con detalle desplegable
      document.querySelectorAll<HTMLTableElement>('.dash table.d-tabla').forEach((tabla) => {
        const cab = Array.from(tabla.tHead?.rows[0]?.cells ?? []).map((th) => (th.textContent ?? '').trim());

        tabla.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr) => {
          const celdas = Array.from(tr.cells);
          if (!hidratado(tr) || celdas.some((c) => !hidratado(c))) {
            pendiente = true;
            return;
          }

          const vacio = celdas.length === 1 || celdas.some((c) => c.colSpan > 1);
          const simple = vacio || celdas.length <= 2;

          const iEstado = celdas.findIndex((c, i) => i > 0 && !!c.querySelector('.chip'));
          const iSub = celdas.findIndex(
            (c, i) => i > 0 && i !== iEstado && !ES_ACCION.test(cab[i] ?? ''),
          );

          poner(tr, 'data-movil', vacio ? 'vacio' : 'fila');
          poner(tr, 'data-simple', String(simple));
          if (!simple) {
            poner(tr, 'tabindex', '0');
            poner(tr, 'role', 'button');
            if (!tr.hasAttribute('aria-expanded')) tr.setAttribute('aria-expanded', 'false');
          }

          celdas.forEach((c, i) => {
            const etiqueta = cab[i] ?? '';
            let rol = 'detalle';
            if (vacio) rol = 'vacio';
            else if (i === 0) rol = 'titulo';
            else if (i === iEstado) rol = 'estado';
            else if (ES_ACCION.test(etiqueta)) rol = 'acciones';
            else if (i === iSub) rol = 'subtitulo';
            poner(c, 'data-label', etiqueta);
            poner(c, 'data-rol', rol);
          });
        });
      });

      // Tarjetas con título → secciones colapsables
      document.querySelectorAll<HTMLElement>('.dash .d-card').forEach((card) => {
        const h3 = card.querySelector(':scope > h3');
        if (!h3 || card.classList.contains('d-kpi') || card.children.length < 2) return;
        if (!hidratado(card) || !hidratado(h3)) {
          pendiente = true;
          return;
        }
        poner(card, 'data-colapsable', 'true');
        poner(h3, 'role', 'button');
        poner(h3, 'tabindex', '0');
        if (!h3.hasAttribute('aria-expanded')) h3.setAttribute('aria-expanded', 'true');
      });

      return pendiente;
    }

    function ciclo() {
      const pendiente = preparar();
      // Si algo aún no se hidrata, reintenta (máx. ~12 s)
      if (pendiente && intentos < 40) {
        intentos += 1;
        reintento = window.setTimeout(ciclo, 300);
      }
    }

    function programar() {
      cancelAnimationFrame(raf);
      clearTimeout(reintento);
      intentos = 0;
      raf = requestAnimationFrame(ciclo);
    }

    function alternar(el: Element | null) {
      if (!el) return;
      const fila = el.closest<HTMLTableRowElement>('.dash table.d-tabla tbody tr');
      if (fila && fila.dataset.simple !== 'true') {
        const abre = fila.dataset.abierta !== 'true';
        fila.dataset.abierta = String(abre);
        fila.setAttribute('aria-expanded', String(abre));
        return;
      }
      const h3 = el.closest<HTMLElement>('.dash .d-card[data-colapsable] > h3');
      const card = h3?.parentElement;
      if (h3 && card) {
        const cierra = card.dataset.cerrada !== 'true';
        card.dataset.cerrada = String(cierra);
        h3.setAttribute('aria-expanded', String(!cierra));
      }
    }

    function clic(e: MouseEvent) {
      if (!mq.matches) return;
      const t = e.target as HTMLElement;
      if (t.closest('a, button, input, select, textarea, label')) return;
      alternar(t);
    }

    function tecla(e: KeyboardEvent) {
      if (!mq.matches || (e.key !== 'Enter' && e.key !== ' ')) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'TR' || t.tagName === 'H3') {
        e.preventDefault();
        alternar(t);
      }
    }

    programar();
    // Las tablas se llenan después (datos que cargan): se reprocesan solas
    const obs = new MutationObserver(programar);
    obs.observe(document.body, { childList: true, subtree: true });
    mq.addEventListener('change', programar);
    document.addEventListener('click', clic);
    document.addEventListener('keydown', tecla);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(reintento);
      obs.disconnect();
      mq.removeEventListener('change', programar);
      document.removeEventListener('click', clic);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  return null;
}