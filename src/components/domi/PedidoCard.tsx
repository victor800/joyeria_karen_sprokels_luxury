// 📁 RUTA: src/components/domi/PedidoCard.tsx   (NUEVO)
// Card del pedido para el panel del domiciliario (Hans y Karen). Verde oscuro + dorado.
'use client';
import { useState } from 'react';
import type { Estado, PedidoDomi } from '@/lib/pedidos-domi'; // solo tipos: no arrastra 'server-only'

type Props = {
  pedido: PedidoDomi;
  /** Llama a tu API (PATCH/POST) y refresca la lista. Debe lanzar Error con el mensaje si falla. */
  onCambiar: (id: string, estado: Estado, novedad: string) => Promise<void>;
};

const ESTADO_UI: Record<Estado, { label: string; color: string; bg: string }> = {
  asignado: { label: 'Asignado', color: '#e8c872', bg: 'rgba(232,200,114,.14)' },
  en_ruta: { label: 'En ruta', color: '#6fd6ff', bg: 'rgba(111,214,255,.14)' },
  novedad: { label: 'Novedad', color: '#ff8a7a', bg: 'rgba(255,138,122,.14)' },
  entregado: { label: 'Entregado', color: '#7be3a4', bg: 'rgba(123,227,164,.14)' },
};

const ACCIONES: Record<Estado, { a: Estado; label: string; tono: 'oro' | 'ok' | 'alerta' }[]> = {
  asignado: [{ a: 'en_ruta', label: '🛵 Salir a ruta', tono: 'oro' }],
  en_ruta: [
    { a: 'entregado', label: '✅ Entregado', tono: 'ok' },
    { a: 'novedad', label: '⚠️ Novedad', tono: 'alerta' },
  ],
  novedad: [
    { a: 'en_ruta', label: '🛵 Retomar ruta', tono: 'oro' },
    { a: 'entregado', label: '✅ Entregado', tono: 'ok' },
  ],
  entregado: [],
};

/* ── fechas ── */
function aFecha(v: string): Date | null {
  if (!v) return null;
  const s = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00-05:00` : v.replace(' ', 'T');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fechaCorta(v: string): string {
  const d = aFecha(v);
  if (!d) return v;
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(v);
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short',
    ...(soloDia ? {} : { hour: 'numeric', minute: '2-digit' }),
  });
}
function hace(v: string): string {
  const d = aFecha(v);
  if (!d) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return `hace ${dias} día${dias > 1 ? 's' : ''}`;
}

/* ── enlaces ── */
const soloDigitos = (t: string) => t.replace(/\D/g, '');
const wa = (t: string) => {
  const n = soloDigitos(t);
  return `https://wa.me/${n.length === 10 ? `57${n}` : n}`;
};
const mapa = (dir: string, ciudad: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([dir, ciudad || 'Medellín', 'Antioquia'].filter(Boolean).join(', '))}`;

export default function PedidoCard({ pedido: p, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(p.estado !== 'entregado');
  const [pidiendoNovedad, setPidiendoNovedad] = useState(false);
  const [novedad, setNovedad] = useState('');
  const [cargando, setCargando] = useState<Estado | null>(null);
  const [error, setError] = useState('');

  const ui = ESTADO_UI[p.estado];

  async function ejecutar(a: Estado) {
    if (a === 'novedad' && !pidiendoNovedad) {
      setPidiendoNovedad(true);
      return;
    }
    if (a === 'entregado' && !confirm(`¿Confirmas que entregaste el pedido #${p.codigo} a ${p.cliente}?`)) return;
    setError('');
    setCargando(a);
    try {
      await onCambiar(p.id, a, a === 'novedad' ? novedad : '');
      setPidiendoNovedad(false);
      setNovedad('');
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setCargando(null);
    }
  }

  return (
    <article className={`pdc ${p.estado === 'entregado' ? 'pdc--hecho' : ''}`}>
      <style>{CSS}</style>

      {/* ── Encabezado ── */}
      <button type="button" className="pdc-head" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <div className="pdc-head-izq">
          <div className="pdc-chips">
            <span className="pdc-tienda">{p.tienda === 'hans' ? 'Hans' : "Karen Sprockel's"}</span>
            {p.tipo && <span className="pdc-tipo">{p.tipo}</span>}
          </div>
          <h3 className="pdc-cliente">{p.cliente || 'Cliente sin nombre'}</h3>
          <p className="pdc-codigo">Pedido #{p.codigo || p.id}</p>
        </div>
        <div className="pdc-head-der">
          <span className="pdc-estado" style={{ color: ui.color, background: ui.bg, borderColor: ui.color }}>
            {ui.label}
          </span>
          <span className="pdc-total">{p.total}</span>
        </div>
      </button>

      {/* ── Asignación ── */}
      {p.asignadoEn && (
        <div className="pdc-asignado">
          <span>🕒 Asignado {fechaCorta(p.asignadoEn)}</span>
          <span className="pdc-hace">{hace(p.asignadoEn)}</span>
        </div>
      )}

      {abierto && (
        <div className="pdc-cuerpo">
          {/* Dirección */}
          <a className="pdc-bloque pdc-dir" href={mapa(p.direccion, p.ciudad)} target="_blank" rel="noreferrer">
            <span className="pdc-ico">📍</span>
            <span>
              <strong>{p.direccion || 'Sin dirección'}</strong>
              {p.ciudad && <small>{p.ciudad}</small>}
            </span>
            <span className="pdc-flecha">↗</span>
          </a>

          {/* Contacto */}
          {p.telefono && (
            <div className="pdc-contacto">
              <a className="pdc-btn-sec" href={`tel:${soloDigitos(p.telefono)}`}>📞 Llamar</a>
              <a className="pdc-btn-sec pdc-wa" href={wa(p.telefono)} target="_blank" rel="noreferrer">💬 WhatsApp</a>
            </div>
          )}

          {/* Piezas */}
          {p.items.length > 0 && (
            <div className="pdc-bloque">
              <p className="pdc-titulo">Piezas</p>
              <ul className="pdc-items">
                {p.items.map((it, i) => (
                  <li key={i}>
                    <span className="pdc-cant">{it.cantidad}×</span>
                    <span>
                      {it.nombre}
                      {it.detalle && <small>{it.detalle}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cobro */}
          <div className="pdc-grid">
            <div>
              <p className="pdc-titulo">Total a cobrar</p>
              <p className="pdc-valor pdc-oro">{p.total}</p>
            </div>
            {p.valorDomicilio && (
              <div>
                <p className="pdc-titulo">Domicilio</p>
                <p className="pdc-valor">{p.valorDomicilio}</p>
              </div>
            )}
            {(p.metodoPago || p.pagoEstado) && (
              <div>
                <p className="pdc-titulo">Pago</p>
                <p className="pdc-valor">{[p.metodoPago, p.pagoEstado].filter(Boolean).join(' · ')}</p>
              </div>
            )}
            {p.fechaEntrega && (
              <div>
                <p className="pdc-titulo">Entregar</p>
                <p className="pdc-valor">{fechaCorta(p.fechaEntrega)}</p>
              </div>
            )}
            {p.entregadoEn && (
              <div>
                <p className="pdc-titulo">Entregado</p>
                <p className="pdc-valor">{fechaCorta(p.entregadoEn)}</p>
              </div>
            )}
          </div>

          {/* Notas */}
          {p.notas && (
            <div className="pdc-bloque pdc-nota">
              <p className="pdc-titulo">Notas</p>
              <p>{p.notas}</p>
            </div>
          )}

          {/* Novedad */}
          {pidiendoNovedad && (
            <div className="pdc-bloque">
              <p className="pdc-titulo">¿Qué pasó?</p>
              <textarea
                className="pdc-textarea"
                rows={3}
                maxLength={300}
                placeholder="Ej: el cliente no contesta, dirección incorrecta…"
                value={novedad}
                onChange={(e) => setNovedad(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {error && <p className="pdc-error">{error}</p>}

          {/* Acciones */}
          {ACCIONES[p.estado].length > 0 && (
            <div className="pdc-acciones">
              {pidiendoNovedad ? (
                <>
                  <button type="button" className="pdc-btn pdc-btn--gris" onClick={() => setPidiendoNovedad(false)} disabled={!!cargando}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="pdc-btn pdc-btn--alerta"
                    onClick={() => ejecutar('novedad')}
                    disabled={!!cargando || novedad.trim().length < 3}
                  >
                    {cargando === 'novedad' ? 'Guardando…' : 'Reportar novedad'}
                  </button>
                </>
              ) : (
                ACCIONES[p.estado].map((ac) => (
                  <button
                    key={ac.a}
                    type="button"
                    className={`pdc-btn pdc-btn--${ac.tono}`}
                    onClick={() => ejecutar(ac.a)}
                    disabled={!!cargando}
                  >
                    {cargando === ac.a ? 'Guardando…' : ac.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const CSS = `
.pdc{background:linear-gradient(160deg,#0f2a22 0%,#0a1f19 100%);border:1px solid rgba(212,175,55,.28);border-radius:18px;
  color:#f3efe2;box-shadow:0 10px 28px rgba(0,0,0,.35);overflow:hidden;margin-bottom:14px;font-family:inherit}
.pdc--hecho{opacity:.72}
.pdc-head{all:unset;box-sizing:border-box;width:100%;display:flex;justify-content:space-between;gap:12px;padding:16px 16px 10px;cursor:pointer}
.pdc-head-izq{min-width:0}
.pdc-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.pdc-tienda{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#0a1f19;background:linear-gradient(90deg,#d4af37,#f1d98a);
  padding:3px 8px;border-radius:999px;font-weight:700}
.pdc-tipo{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#d4af37;border:1px solid rgba(212,175,55,.4);padding:2px 8px;border-radius:999px}
.pdc-cliente{margin:0;font-size:17px;font-weight:700;line-height:1.25;overflow-wrap:anywhere}
.pdc-codigo{margin:2px 0 0;font-size:12px;color:rgba(243,239,226,.55)}
.pdc-head-der{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
.pdc-estado{font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid}
.pdc-total{font-size:16px;font-weight:800;color:#f1d98a}
.pdc-asignado{display:flex;justify-content:space-between;gap:8px;margin:0 16px;padding:8px 12px;border-radius:10px;
  background:rgba(212,175,55,.08);font-size:12.5px;color:#e9dfbf}
.pdc-hace{color:#d4af37;font-weight:600;white-space:nowrap}
.pdc-cuerpo{padding:12px 16px 16px;display:flex;flex-direction:column;gap:10px}
.pdc-bloque{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 12px}
.pdc-dir{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}
.pdc-dir strong{display:block;font-size:14px;overflow-wrap:anywhere}
.pdc-dir small{display:block;font-size:12px;color:rgba(243,239,226,.6)}
.pdc-ico{font-size:18px}
.pdc-flecha{margin-left:auto;color:#d4af37;font-weight:700}
.pdc-contacto{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pdc-btn-sec{display:flex;justify-content:center;align-items:center;padding:10px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;
  color:#f3efe2;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
.pdc-wa{background:rgba(37,211,102,.14);border-color:rgba(37,211,102,.4)}
.pdc-titulo{margin:0 0 4px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(212,175,55,.85);font-weight:700}
.pdc-items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.pdc-items li{display:flex;gap:8px;font-size:14px}
.pdc-items small{display:block;font-size:12px;color:rgba(243,239,226,.6)}
.pdc-cant{color:#d4af37;font-weight:800;min-width:26px}
.pdc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.pdc-grid>div{background:rgba(255,255,255,.04);border-radius:12px;padding:10px 12px}
.pdc-valor{margin:0;font-size:14px;font-weight:600}
.pdc-oro{color:#f1d98a;font-size:17px;font-weight:800}
.pdc-nota p:last-child{margin:0;font-size:13.5px;line-height:1.45;white-space:pre-wrap}
.pdc-textarea{width:100%;box-sizing:border-box;background:#0a1f19;color:#f3efe2;border:1px solid rgba(212,175,55,.4);border-radius:10px;
  padding:10px;font:inherit;font-size:16px;resize:vertical}
.pdc-error{margin:0;color:#ff8a7a;font-size:13px}
.pdc-acciones{display:flex;gap:8px}
.pdc-btn{flex:1;border:0;border-radius:12px;padding:13px 10px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:transform .1s,opacity .2s}
.pdc-btn:active{transform:scale(.97)}
.pdc-btn:disabled{opacity:.5;cursor:default}
.pdc-btn--oro{background:linear-gradient(90deg,#d4af37,#f1d98a);color:#0a1f19}
.pdc-btn--ok{background:#2e9e62;color:#fff}
.pdc-btn--alerta{background:#c4553f;color:#fff}
.pdc-btn--gris{background:rgba(255,255,255,.1);color:#f3efe2}
`;