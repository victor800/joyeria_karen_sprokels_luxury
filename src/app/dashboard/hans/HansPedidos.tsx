// 📁 RUTA: src/app/dashboard/hans/HansPedidos.tsx  (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type Pedido = {
  id: string; codigo: string; creado: string; cliente: string; telefono: string; email: string;
  direccion: string; ciudad: string; items: string; tipo: string; total: string; metodo_pago: string;
  pago_estado: string; estado: string; domiciliario: string; domiciliario_tel: string; fecha_entrega: string;
  recibido_en: string; despachado_en: string; entregado_en: string; notas: string; origen: string; actualizado: string;
};
type Linea = { codigo?: string; nombre: string; cant: number; precio: number; foto?: string };
type Cat = { codigo: string; nombre: string; menudeo: number; mayorista: number; foto?: string };
type Domi = { nombre: string; telefono: string };
type Props = {
  pedidos: Pedido[];
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
  catalogo: Cat[];
  avisar: (t: string, ms?: number) => void;
  cargando: boolean;
  recargar: () => void | Promise<void>;
  ultima: Date | null;
};

const ESTADOS = [
  { v: 'nuevo', t: 'Nuevo' },
  { v: 'recibido', t: 'Recibido' },
  { v: 'en_camino', t: 'En camino' },
  { v: 'entregado', t: 'Entregado' },
  { v: 'cancelado', t: 'Cancelado' },
];
const PAGOS = ['Efectivo', 'Transferencia', 'Contra entrega', 'Tarjeta / PSE'];

const nEst = (v: string) => ESTADOS.find((e) => e.v === v)?.t ?? v;
const num = (s?: string | number) => Number(String(s ?? '').replace(/\D/g, '')) || 0;
const copN = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const parseItems = (s: string): Linea[] => {
  try {
    const a = JSON.parse(s || '[]');
    if (!Array.isArray(a)) return [];
    return a
      .map((x) => ({
        codigo: x?.codigo ? String(x.codigo) : undefined,
        nombre: String(x?.nombre ?? ''),
        cant: Math.max(1, Number(x?.cant) || 1),
        precio: Number(x?.precio) || 0,
        foto: x?.foto ? String(x.foto) : undefined,
      }))
      .filter((x) => x.nombre);
  } catch { return []; }
};
const fmtF = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};
const fmtD = (s: string) => {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : s;
};
const fmtUlt = (d: Date | null) =>
  d ? d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'medium' }) : 'cargando…';
const diaLocal = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Enlaces rápidos (solo con caracteres seguros) */
const waLink = (tel: string) => {
  const d = (tel || '').replace(/\D/g, '');
  if (d.length < 7) return '';
  return `https://wa.me/${d.length === 10 ? `57${d}` : d}`;
};
const mapLink = (dir: string, ciudad: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${dir}${ciudad ? `, ${ciudad}` : ''}`)}`;

/** Aviso de entrega: hoy, mañana o atrasada (solo si el pedido sigue abierto). */
function urgencia(p: Pedido): { t: string; c: 'hoy' | 'tarde' | 'manana' } | null {
  if (!p.fecha_entrega || p.estado === 'entregado' || p.estado === 'cancelado') return null;
  const hoy = diaLocal(new Date().toISOString());
  if (p.fecha_entrega < hoy) return { t: 'Atrasado', c: 'tarde' };
  if (p.fecha_entrega === hoy) return { t: 'Hoy', c: 'hoy' };
  const m = new Date();
  m.setDate(m.getDate() + 1);
  if (p.fecha_entrega === diaLocal(m.toISOString())) return { t: 'Mañana', c: 'manana' };
  return null;
}

/** Celda CSV segura: comillas dobles y sin fórmulas peligrosas al abrir en Excel. */
function celda(v: string) {
  let s = String(v ?? '').replace(/\r?\n/g, ' ');
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[\d\s().-]+$/.test(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/* ---------- Modal en portal: siempre encima del layout (menús, barras inferiores) ---------- */
function Modal({ label, onClose, className = 'hp-hoja', children }: {
  label: string; onClose: () => void; className?: string; children: React.ReactNode;
}) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    setListo(true);
    const b = document.body;
    const prev = b.style.overflow;
    b.style.overflow = 'hidden';
    return () => { b.style.overflow = prev; };
  }, []);
  if (!listo) return null;
  // Color fijo en línea: el portal cuelga de <body> y heredaría el texto claro del tema
  const tinta: React.CSSProperties = { color: '#1d2a23', colorScheme: 'light' };
  return createPortal(
    <div className="hp-modal" style={tinta} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={className} style={tinta} role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>,
    document.body,
  );
}

/* ---------- Piezas reutilizables ---------- */
function Pasos({ p, v = false }: { p: Pedido; v?: boolean }) {
  if (p.estado === 'cancelado') return <p className="hp-err">Este pedido fue cancelado.</p>;
  const pasos = [
    { t: 'Pedido creado', f: p.creado },
    { t: 'Recibido', f: p.recibido_en },
    { t: 'En camino', f: p.despachado_en },
    { t: 'Entregado', f: p.entregado_en },
  ];
  return (
    <ol className={`hp-tl ${v ? 'v' : ''}`} aria-label="Estado de la entrega">
      {pasos.map((s) => (
        <li key={s.t} className={`hp-st ${s.f ? 'on' : ''}`}>{s.t}<small>{s.f ? fmtF(s.f) : 'Pendiente'}</small></li>
      ))}
    </ol>
  );
}

function Contacto({ p }: { p: Pedido }) {
  const tel = (p.telefono || '').replace(/[^\d+]/g, '');
  const wa = waLink(p.telefono);
  const mapa = p.direccion ? mapLink(p.direccion, p.ciudad) : '';
  if (!tel && !mapa) return null;
  return (
    <div className="hp-quick">
      {tel && <a href={`tel:${tel}`}>📞 Llamar</a>}
      {wa && <a href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
      {mapa && <a href={mapa} target="_blank" rel="noreferrer">📍 Mapa</a>}
    </div>
  );
}

/** Miniatura de la pieza; al tocarla se abre la foto completa en otra pestaña */
function Miniatura({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="hp-thl" title="Ver foto completa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hp-th" src={src} alt={alt} loading="lazy" />
    </a>
  );
}

function Fila({ k, w, children }: { k: string; w?: boolean; children: React.ReactNode }) {
  return <div className={w ? 'w' : undefined}><dt>{k}</dt><dd>{children}</dd></div>;
}

export default function HansPedidos({ pedidos, setPedidos, catalogo, avisar, cargando, recargar, ultima }: Props) {
  const [girando, setGirando] = useState(false);
  async function refrescar() {
    setGirando(true);
    const t0 = Date.now();
    try { await recargar(); }
    finally { setTimeout(() => setGirando(false), Math.max(0, 700 - (Date.now() - t0))); }
  }
  const [q, setQ] = useState('');
  const [est, setEst] = useState('todos');
  const [domi, setDomi] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [ed, setEd] = useState({ domiciliario: '', domiciliario_tel: '', fecha_entrega: '', notas: '' });
  const [busy, setBusy] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [domis, setDomis] = useState<Domi[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPag, setPorPag] = useState(10);

  // Al cambiar filtros o el tamaño de página, vuelve a la primera página
  useEffect(() => { setPagina(1); }, [q, est, domi, desde, hasta, porPag]);

  // Domiciliarios registrados (si la ruta existe); si no, se escribe el nombre a mano
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/domiciliarios', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        const arr: unknown[] = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.domiciliarios) ? d.domiciliarios : [];
        setDomis(
          arr
            .map((x) => {
              const o = x as Record<string, unknown>;
              return { nombre: String(o.nombre ?? o.name ?? '').trim(), telefono: String(o.telefono ?? o.celular ?? o.whatsapp ?? '').trim() };
            })
            .filter((x) => x.nombre),
        );
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selId && !nuevo) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (nuevo) setNuevo(false); else setSelId(null);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [selId, nuevo]);

  const sel = pedidos.find((p) => p.id === selId) ?? null;
  const nombresDomi = useMemo(
    () => Array.from(new Set([...domis.map((d) => d.nombre), ...pedidos.map((p) => p.domiciliario).filter(Boolean)])),
    [domis, pedidos],
  );

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (est !== 'todos' && p.estado !== est) return false;
      if (domi === '__sin') { if (p.domiciliario) return false; }
      else if (domi !== 'todos' && p.domiciliario !== domi) return false;
      const dia = diaLocal(p.creado);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      return !t || `${p.codigo} ${p.cliente} ${p.telefono} ${p.direccion} ${p.ciudad} ${p.domiciliario} ${p.items}`.toLowerCase().includes(t);
    });
  }, [pedidos, q, est, domi, desde, hasta]);

  // Paginación (sobre los pedidos ya filtrados)
  const totalPag = Math.max(1, Math.ceil(filtrados.length / porPag));
  const pag = Math.min(pagina, totalPag);
  const ini = (pag - 1) * porPag;
  const visibles = filtrados.slice(ini, ini + porPag);
  const numeros: (number | '…')[] = [];
  for (let n = 1; n <= totalPag; n++) {
    if (n === 1 || n === totalPag || Math.abs(n - pag) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== '…') numeros.push('…');
  }

  const cuenta = (v: string) => pedidos.filter((p) => p.estado === v).length;
  const totalVendido = pedidos.filter((p) => p.estado !== 'cancelado').reduce((s, p) => s + num(p.total), 0);
  const hayFiltro = !!(q || est !== 'todos' || domi !== 'todos' || desde || hasta);
  const nFiltros = (domi !== 'todos' ? 1 : 0) + (desde ? 1 : 0) + (hasta ? 1 : 0);
  const limpiar = () => { setQ(''); setEst('todos'); setDomi('todos'); setDesde(''); setHasta(''); };

  async function guardar(id: string, cambios: Partial<Pedido>, msg?: string) {
    setBusy(id);
    try {
      const res = await fetch('/api/hans/pedidos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...cambios }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar');
      setPedidos((l) => l.map((x) => (x.id === id ? d : x)));
      if (msg) avisar(msg);
      return d as Pedido;
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo guardar');
      return null;
    } finally {
      setBusy('');
    }
  }

  function abrir(p: Pedido) {
    setSelId(p.id);
    setEd({ domiciliario: p.domiciliario, domiciliario_tel: p.domiciliario_tel, fecha_entrega: p.fecha_entrega, notas: p.notas });
  }

  function elegirDomi(nombre: string) {
    const tel = domis.find((d) => d.nombre.toLowerCase() === nombre.trim().toLowerCase())?.telefono;
    setEd((e) => ({ ...e, domiciliario: nombre, domiciliario_tel: tel ?? e.domiciliario_tel }));
  }

  async function despachar(p: Pedido) {
    if (!ed.domiciliario.trim()) return avisar('Elige o escribe el domiciliario.');
    await guardar(p.id, { ...ed, estado: 'en_camino' }, `Pedido ${p.codigo} despachado con ${ed.domiciliario.trim()}.`);
  }

  function exportar() {
    if (!filtrados.length) return avisar('No hay pedidos para exportar.');
    const cab = [
      'Código', 'Fecha del pedido', 'Cliente', 'Teléfono', 'Correo', 'Dirección', 'Ciudad', 'Tipo', 'Artículos', 'Total',
      'Método de pago', 'Estado del pago', 'Estado', 'Domiciliario', 'Tel. domiciliario', 'Fecha de entrega',
      'Recibido', 'Despachado', 'Entregado', 'Notas', 'Origen',
    ];
    const filas = filtrados.map((p) => [
      p.codigo, fmtF(p.creado), p.cliente, p.telefono, p.email, p.direccion, p.ciudad,
      p.tipo === 'mayorista' ? 'Mayorista' : 'Menudeo',
      parseItems(p.items).map((i) => `${i.cant}× ${i.nombre} ($${i.precio.toLocaleString('es-CO')})`).join(' | '),
      String(num(p.total)), p.metodo_pago, p.pago_estado === 'pagado' ? 'Pagado' : 'Pendiente', nEst(p.estado),
      p.domiciliario, p.domiciliario_tel, p.fecha_entrega ? fmtD(p.fecha_entrega) : '',
      p.recibido_en ? fmtF(p.recibido_en) : '', p.despachado_en ? fmtF(p.despachado_en) : '', p.entregado_en ? fmtF(p.entregado_en) : '',
      p.notas, p.origen === 'web' ? 'Web' : 'Manual',
    ]);
    const csv = '\uFEFF' + [cab, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-hans-${diaLocal(new Date().toISOString())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    avisar(`Exportados ${filtrados.length} pedido${filtrados.length === 1 ? '' : 's'}.`);
  }

  /** Botón rápido de la tabla (escritorio) */
  const accion = (p: Pedido) => {
    const ocupado = busy === p.id;
    if (p.estado === 'nuevo') return <button type="button" className="hp-b" disabled={ocupado} onClick={() => guardar(p.id, { estado: 'recibido' }, `Pedido ${p.codigo} recibido.`)}>Recibir</button>;
    if (p.estado === 'recibido') return <button type="button" className="hp-b" onClick={() => abrir(p)}>Asignar</button>;
    if (p.estado === 'en_camino') return <button type="button" className="hp-b ok" disabled={ocupado} onClick={() => guardar(p.id, { estado: 'entregado' }, `Pedido ${p.codigo} entregado.`)}>Entregado</button>;
    return null;
  };

  /** Botón principal de la tarjeta (móvil / tablet) */
  const principal = (p: Pedido) => {
    const ocupado = busy === p.id;
    if (p.estado === 'nuevo') return <button type="button" className="hp-btn g" disabled={ocupado} onClick={() => guardar(p.id, { estado: 'recibido' }, `Pedido ${p.codigo} recibido.`)}>Recibir pedido</button>;
    if (p.estado === 'recibido') return <button type="button" className="hp-btn g" onClick={() => abrir(p)}>Asignar y despachar</button>;
    if (p.estado === 'en_camino') return <button type="button" className="hp-btn p" disabled={ocupado} onClick={() => guardar(p.id, { estado: 'entregado' }, `Pedido ${p.codigo} entregado.`)}>Marcar entregado</button>;
    return null;
  };

  /** Tarjeta colapsable (móvil / tablet) */
  const tarjeta = (p: Pedido) => {
    const its = parseItems(p.items);
    const uds = its.reduce((s, i) => s + i.cant, 0);
    const urg = urgencia(p);
    const telDomi = (p.domiciliario_tel || '').replace(/[^\d+]/g, '');
    return (
      <details key={p.id} className={`hp-card ${p.estado}`}>
        <summary>
          <div className="hp-sh">
            <div className="hp-s1">
              <span className="hp-cod">{p.codigo}</span>
              <span className={`hp-pill ${p.estado}`}>{nEst(p.estado)}</span>
              {urg && <span className={`hp-urg ${urg.c}`}>{urg.t}</span>}
            </div>
            <div className="hp-s2"><b>{p.cliente}</b><span className="hp-tot">{copN(num(p.total))}</span></div>
            <div className="hp-s3">
              <span>{fmtF(p.creado)} · {uds} u.</span>
              <span className={`hp-pg ${p.pago_estado}`}>{p.pago_estado === 'pagado' ? '✔ Pagado' : 'Pago pendiente'}</span>
            </div>
          </div>
          <span className="hp-chev" aria-hidden="true" />
        </summary>

        <div className="hp-cb">
          <Contacto p={p} />

          <dl className="hp-dl">
            <Fila k="Teléfono">{p.telefono || '—'}</Fila>
            <Fila k="Venta">{p.tipo === 'mayorista' ? 'Mayorista' : 'Menudeo'}</Fila>
            <Fila k="Dirección" w>{p.direccion || '—'}{p.ciudad ? `, ${p.ciudad}` : ''}</Fila>
            <Fila k="Fecha de entrega">{p.entregado_en ? `Entregado ${fmtF(p.entregado_en)}` : fmtD(p.fecha_entrega)}</Fila>
            <Fila k="Pago">{p.metodo_pago || '—'}</Fila>
            <Fila k="Domiciliario" w>
              {p.domiciliario ? (
                <>{p.domiciliario}{telDomi && <> · <a className="hp-lnk" href={`tel:${telDomi}`}>📞 {p.domiciliario_tel}</a></>}</>
              ) : (
                <span className="hp-mute">Sin asignar</span>
              )}
            </Fila>
            {p.email && <Fila k="Correo" w>{p.email}</Fila>}
          </dl>

          <details className="hp-sub" open>
            <summary><span>Artículos ({uds})</span></summary>
            <div>
              {its.map((i, k) => (
                <div className="hp-li" key={k}><span className="hp-art"><Miniatura src={i.foto} alt={i.nombre} /><span>{i.cant}× {i.nombre}</span></span><b>{copN(i.precio * i.cant)}</b></div>
              ))}
              <div className="hp-li tot"><span>Total</span><b>{copN(num(p.total))}</b></div>
            </div>
          </details>

          <details className="hp-sub">
            <summary><span>Seguimiento de la entrega</span></summary>
            <div><Pasos p={p} v /></div>
          </details>

          {p.notas && <div className="hp-note">📝 {p.notas}</div>}

          <div className="hp-cact">
            {principal(p)}
            <button type="button" className="hp-btn" onClick={() => abrir(p)}>Ver y editar</button>
          </div>
        </div>
      </details>
    );
  };

  return (
    <div className="hp">
      <style>{`
        .hp * { box-sizing: border-box; }
        .hp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 4px 0 16px; }
        .hp-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 14px; padding: 10px 14px; }
        .hp-stats span { display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
        .hp-stats b { display: block; margin-top: 4px; font-size: 21px; font-weight: 500; color: #0b2d1f; }
        .hp-stats .n b { color: #b7791f; }
        .hp-stats .c b { color: #c2570c; }
        .hp-stats .e b { color: #1e6b34; }

        /* ===== Barra de herramientas ===== */
        .hp-tool { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
        .hp-row1 { display: contents; }
        .hp-fgrp { display: contents; }
        .hp-acts { display: flex; gap: 10px; margin-left: auto; flex-wrap: wrap; }
        .hp-fbtn { display: none; }
        .hp-bus { flex: 1 1 260px; max-width: 380px; padding: 9px 14px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .hp-sel, .hp-date { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .hp-lbl { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #7a857e; }
        .hp-gap { flex: 1; }
        .hp-btn { height: 38px; padding: 0 16px; border-radius: 10px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid #b08d3c; background: #fffdf8; color: #7a6a30; }
        .hp-btn.p { background: #0b2d1f; color: #f6e7b4; border-color: #0b2d1f; }
        .hp-btn.g { background: #f0c14b; color: #1b1608; border-color: #f0c14b; }
        .hp-btn:disabled { opacity: .55; cursor: wait; }
        .hp-new { box-shadow: 0 4px 14px rgba(240,193,75,.35); }
        .hp-spin { display: inline-block; animation: hpgir .8s linear infinite; }
        @keyframes hpgir { to { transform: rotate(360deg); } }
        .hp-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .hp-chips button { font: inherit; font-size: 12px; padding: 6px 13px; border-radius: 99px; border: 1px solid rgba(176,141,60,.4); background: #fff; cursor: pointer; }
        .hp-chips button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f3ead2; }
        .hp-chips em { font-style: normal; opacity: .65; margin-left: 4px; }

        /* ===== Tabla (escritorio) ===== */
        .hp-wrap { background: #fff; border: 1px solid #ece7d6; border-radius: 18px; overflow-x: auto; box-shadow: 0 2px 14px rgba(11,45,31,.05); }
        .hp-t { width: 100%; min-width: 1120px; border-collapse: collapse; font-size: 13px; }
        .hp-t th { position: sticky; top: 0; background: #0b2d1f; color: #f6e7b4; text-align: left; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; padding: 12px 14px; white-space: nowrap; }
        .hp-t td { padding: 12px 14px; border-bottom: 1px solid #f0ecdd; vertical-align: top; color: #2c3a33; }
        .hp-t tbody tr:hover { background: #fffaf0; }
        .hp-t tbody tr:last-child td { border-bottom: 0; }
        .hp-t small { display: block; color: #8a978f; font-size: 11.5px; margin-top: 2px; }
        .hp-cod { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; color: #0b2d1f; font-size: 12.5px; }
        .hp-tot { font-weight: 600; color: #0b2d1f; white-space: nowrap; }
        .hp-pill { display: inline-block; padding: 3px 11px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .hp-pill.nuevo { background: #fff1c9; color: #8a5a00; }
        .hp-pill.recibido { background: #dcecff; color: #1f4f95; }
        .hp-pill.en_camino { background: #ffe3cc; color: #b24a08; }
        .hp-pill.entregado { background: #dff3e5; color: #1e6b34; }
        .hp-pill.cancelado { background: #eee; color: #777; }
        .hp-urg { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 700; margin-top: 3px; }
        .hp-urg.hoy { background: #fff1c9; color: #8a5a00; }
        .hp-urg.tarde { background: #ffd9d6; color: #a12622; }
        .hp-urg.manana { background: #dcecff; color: #1f4f95; }
        .hp-pg { font-size: 11px; font-weight: 600; margin-top: 4px; display: block; }
        .hp-pg.pagado { color: #1e6b34; }
        .hp-pg.pendiente { color: #b7791f; }
        .hp-acc { display: flex; gap: 6px; justify-content: flex-end; white-space: nowrap; }
        .hp-b { height: 32px; padding: 0 12px; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; border: 0; background: #f0c14b; color: #1b1608; }
        .hp-b.ok { background: #1e8a4a; color: #fff; }
        .hp-b.v { background: transparent; color: #7a6a30; border: 1px solid #d8b95f; }
        .hp-b:disabled { opacity: .55; cursor: wait; }
        .hp-vacio { text-align: center; padding: 56px 20px; color: #7a857e; background: #fff; border: 1px solid #ece7d6; border-radius: 18px; }
        .hp-foot { margin: 10px 4px 0; font-size: 12px; color: #8a978f; }
        .hp-pag { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
        .hp-pinfo { font-size: 12.5px; color: #5a6b62; }
        .hp-nav { display: inline-flex; gap: 4px; align-items: center; }
        .hp-nav button { min-width: 34px; height: 34px; padding: 0 8px; border-radius: 9px; border: 1px solid rgba(176,141,60,.4); background: #fff; font: inherit; font-size: 13px; font-weight: 600; color: #44514a; cursor: pointer; }
        .hp-nav button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f6e7b4; }
        .hp-nav button:disabled { opacity: .4; cursor: default; }
        .hp-dots { padding: 0 4px; color: #8a978f; }

        /* ===== Tarjetas colapsables (móvil / tablet) ===== */
        .hp-cards { display: none; }
        .hp-card { background: #fff; border: 1px solid #ece7d6; border-left: 5px solid #d8b95f; border-radius: 16px; box-shadow: 0 2px 10px rgba(11,45,31,.06); overflow: hidden; }
        .hp-card.nuevo { border-left-color: #e0a526; }
        .hp-card.recibido { border-left-color: #4a86d8; }
        .hp-card.en_camino { border-left-color: #e8782a; }
        .hp-card.entregado { border-left-color: #1e8a4a; }
        .hp-card.cancelado { border-left-color: #b9b9b9; }
        .hp-card > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 14px 14px 12px; -webkit-tap-highlight-color: transparent; }
        .hp-card > summary::-webkit-details-marker { display: none; }
        .hp-sh { flex: 1; min-width: 0; display: grid; gap: 6px; }
        .hp-s1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .hp-s2 { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .hp-s2 b { font-size: 16px; font-weight: 600; color: #0b2d1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .hp-s2 .hp-tot { font-size: 16px; }
        .hp-s3 { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: #8a978f; flex-wrap: wrap; }
        .hp-s3 .hp-pg { margin: 0; }
        .hp-chev { width: 10px; height: 10px; border-right: 2.5px solid #b08d3c; border-bottom: 2.5px solid #b08d3c; transform: rotate(45deg); transition: transform .2s; flex-shrink: 0; margin: -4px 4px 0 0; }
        .hp-card[open] .hp-chev { transform: rotate(-135deg); margin-top: 4px; }
        .hp-cb { padding: 12px 14px 14px; border-top: 1px dashed #e6dfc6; display: grid; gap: 12px; }
        .hp-quick { display: flex; gap: 8px; flex-wrap: wrap; }
        .hp-quick a { flex: 1 1 auto; min-width: 96px; text-align: center; padding: 11px 12px; border-radius: 12px; background: #0b2d1f; color: #f6e7b4; font-size: 13px; font-weight: 600; text-decoration: none; }
        .hp-dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; }
        .hp-dl > div { min-width: 0; }
        .hp-dl .w { grid-column: 1 / -1; }
        .hp-dl dt { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a978f; font-weight: 700; }
        .hp-dl dd { margin: 3px 0 0; font-size: 13.5px; color: #2c3a33; word-break: break-word; }
        .hp-lnk { color: #0b4a2e; font-weight: 600; text-decoration: none; }
        .hp-mute { color: #8a978f; }
        .hp-sub { border: 1px solid #ece7d6; border-radius: 12px; background: #faf8f2; }
        .hp-sub > summary { list-style: none; cursor: pointer; padding: 12px; display: flex; align-items: center; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8a6d1f; -webkit-tap-highlight-color: transparent; }
        .hp-sub > summary::-webkit-details-marker { display: none; }
        .hp-sub > summary span { flex: 1; }
        .hp-sub > summary::after { content: "⌄"; font-size: 20px; line-height: 1; color: #b08d3c; transition: transform .2s; }
        .hp-sub[open] > summary::after { transform: rotate(180deg); }
        .hp-sub[open] > summary { border-bottom: 1px solid #ece7d6; }
        .hp-sub > div { padding: 8px 12px 12px; }
        .hp-li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0ecdd; font-size: 13.5px; color: #2c3a33; }
        .hp-li b { white-space: nowrap; color: #0b2d1f; }
        .hp-li.tot { border: 0; padding-bottom: 0; font-weight: 700; }
        .hp-note { font-size: 13px; color: #6b5a1f; background: #fff8e6; border: 1px solid #f0dfa8; border-radius: 12px; padding: 10px 12px; }
        .hp-cact { display: flex; gap: 8px; flex-wrap: wrap; }
        .hp-cact .hp-btn { flex: 1 1 140px; }

        /* ===== Línea de tiempo ===== */
        .hp-tl { list-style: none; margin: 6px 0 16px; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .hp-st { position: relative; padding-top: 22px; font-size: 12px; color: #9aa59f; text-align: center; }
        .hp-st::before { content: ""; position: absolute; top: 5px; left: 0; right: 0; height: 3px; background: #e6e1cf; }
        .hp-st::after { content: ""; position: absolute; top: 0; left: calc(50% - 7px); width: 14px; height: 14px; border-radius: 50%; background: #e6e1cf; border: 2px solid #fff; }
        .hp-st.on { color: #0b2d1f; font-weight: 600; }
        .hp-st.on::before { background: #d8b95f; }
        .hp-st.on::after { background: #0b4a2e; }
        .hp-st small { display: block; font-weight: 400; color: #7a857e; font-size: 11px; margin-top: 2px; }
        .hp-tl.v { grid-template-columns: 1fr; gap: 0; margin: 0; }
        .hp-tl.v .hp-st { text-align: left; padding: 0 0 14px 28px; font-size: 13px; }
        .hp-tl.v .hp-st::before { top: 14px; bottom: -2px; left: 6px; right: auto; width: 3px; height: auto; }
        .hp-tl.v .hp-st::after { top: 1px; left: 0; }
        .hp-tl.v .hp-st:last-child { padding-bottom: 0; }
        .hp-tl.v .hp-st:last-child::before { display: none; }

        /* ===== Modales (en portal, por encima de todo el dashboard) ===== */
        .hp-modal, .hp-modal * { box-sizing: border-box; }
        .hp-modal { position: fixed; inset: 0; background: rgba(6,14,10,.62); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); display: grid; place-items: center; z-index: 1000; padding: 16px; animation: hpfade .18s ease-out;
          color: #1d2a23; color-scheme: light; }
        @keyframes hpfade { from { opacity: 0; } }
        @keyframes hpsube { from { transform: translateY(24px); opacity: .4; } }
        .hp-hoja { background: #fff; border-radius: 22px; width: 100%; max-width: 760px; max-height: 92vh; overflow-y: auto; padding: 24px 26px; overscroll-behavior: contain; animation: hpsube .22s ease-out; }
        .hp-hh { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
        .hp-hh h2 { margin: 0; font-size: 24px; font-weight: 500; color: #0b2d1f; }
        .hp-hh small { margin-left: auto; color: #8a978f; font-size: 12px; }
        .hp-hoja .hp-quick { margin: 12px 0 0; }
        .hp-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
        .hp-bx { border: 1px solid #ece7d6; border-radius: 14px; padding: 12px 14px; background: #faf8f2; font-size: 13px; line-height: 1.6; }
        .hp-bx h4 { margin: 0 0 6px; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #8a6d1f; font-weight: 700; }
        .hp-bx b { color: #0b2d1f; }
        .hp-it { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
        .hp-it th { text-align: left; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #8a978f; padding: 6px 8px; border-bottom: 1px solid #ece7d6; }
        .hp-it td { padding: 8px; border-bottom: 1px solid #f3efe2; }
        .hp-it td:last-child, .hp-it th:last-child { text-align: right; }
        .hp-it tfoot td { border: 0; font-weight: 700; color: #0b2d1f; padding-top: 10px; }
        .hp-f { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .hp-f label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #44514a; }
        .hp-f input, .hp-f select, .hp-f textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; color: #1d2a23; }
        .hp-f .full { grid-column: 1 / -1; }
        .hp-btns { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 14px; }
        .hp-btns .hp-btn.x { color: #b04a3f; border-color: rgba(176,74,63,.5); background: #fff; margin-right: auto; }
        .hp-err { color: #a12622; font-size: 13px; margin: 8px 0 0; }

        /* ===== Popup: pedido manual ===== */
        .np { background: #fbf9f3; border-radius: 24px; width: 100%; max-width: 740px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.45); animation: hpsube .24s ease-out; }
        .np-head { position: relative; display: flex; gap: 14px; align-items: flex-start; padding: 20px 22px 18px; background: linear-gradient(115deg, #000 0%, #030a07 42%, #0b2d1f 100%); border-bottom: 2px solid #d8b95f; flex-shrink: 0; }
        .np-head::after { content: ""; position: absolute; right: -40px; top: -60px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(240,193,75,.28), transparent 70%); pointer-events: none; }
        .np-head small { display: block; font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: rgba(246,231,180,.65); font-weight: 700; }
        .np-head h2 { margin: 4px 0; font-size: 26px; font-weight: 500; color: #f0c14b; }
        .np-head p { margin: 0; font-size: 12.5px; color: rgba(243,234,210,.78); line-height: 1.45; }
        .np-close { position: relative; z-index: 1; margin-left: auto; width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; border: 1px solid rgba(240,193,75,.5); background: rgba(255,255,255,.04); color: #f0c14b; font-size: 15px; cursor: pointer; }
        .np-close:hover { background: rgba(240,193,75,.15); }
        .np-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 16px 18px 10px; display: grid; gap: 12px; align-content: start; }
        .np-sec { background: #fff; border: 1px solid #ece7d6; border-radius: 18px; padding: 14px 16px 16px; box-shadow: 0 2px 10px rgba(11,45,31,.04); }
        .np-sec h3 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #0b2d1f; }
        .np-sec h3 i { font-style: normal; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #0b2d1f, #14573f); color: #f0c14b; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .np-sec h3 em { margin-left: auto; font-style: normal; font-size: 12px; color: #8a978f; font-weight: 500; }
        .np-g { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .np-g .full { grid-column: 1 / -1; }
        .np-l { display: block; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: #7a857e; margin-bottom: 5px; }
        .np-l b { color: #b04a3f; }
        .np-in { width: 100%; height: 44px; padding: 0 13px; border-radius: 12px; border: 1px solid #ddd6c0; background: #fffdf8; font: inherit; font-size: 15px; color: #1d2a23; outline: 0; transition: border-color .15s, box-shadow .15s, background .15s; }
        textarea.np-in { height: auto; min-height: 70px; padding: 10px 13px; resize: vertical; }
        .np-in:focus { border-color: #d8b95f; box-shadow: 0 0 0 3px rgba(240,193,75,.22); background: #fff; }
        .np-seg { display: flex; width: 100%; padding: 4px; border-radius: 14px; background: #f3efe2; gap: 4px; }
        .np-seg button { flex: 1; height: 38px; border: 0; border-radius: 10px; background: transparent; font: inherit; font-size: 13px; font-weight: 600; color: #7a6a30; cursor: pointer; }
        .np-seg button[aria-pressed="true"] { background: #0b2d1f; color: #f6e7b4; box-shadow: 0 2px 8px rgba(11,45,31,.25); }
        .np-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .np-chips button { height: 38px; padding: 0 14px; border-radius: 99px; border: 1px solid #ddd6c0; background: #fffdf8; font: inherit; font-size: 13px; font-weight: 600; color: #44514a; cursor: pointer; }
        .np-chips button[aria-pressed="true"] { background: #f0c14b; border-color: #f0c14b; color: #1b1608; }
        .np-bus { position: relative; margin-top: 12px; }
        .np-bus .np-in { padding-left: 38px; }
        .np-bus > span { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #b08d3c; pointer-events: none; }
        .np-sug { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; margin-top: 10px; max-height: 232px; overflow-y: auto; padding: 2px; }
        .np-sug button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; border-radius: 12px; border: 1px solid #ece7d6; background: #faf8f2; text-align: left; cursor: pointer; font: inherit; transition: border-color .15s, background .15s; }
        .np-sug button:hover { border-color: #d8b95f; background: #fff8e6; }
        .np-sug small { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: #8a978f; }
        .np-sug b { font-size: 13px; color: #0b2d1f; font-weight: 600; line-height: 1.3; }
        .np-sug em { font-style: normal; font-size: 12.5px; color: #8a6d1f; font-weight: 700; }
        .np-vac { font-size: 12.5px; color: #8a978f; margin: 10px 2px 0; }
        .np-lns { display: grid; gap: 8px; margin-top: 12px; }
        .np-ln { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 14px; border: 1px solid #ece7d6; border-left: 4px solid #d8b95f; background: #fff; }
        .np-info { min-width: 0; }
        .np-info b { display: block; font-size: 14px; color: #0b2d1f; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .np-info small { font-size: 11.5px; color: #8a978f; }
        .np-info .np-in { height: 36px; font-size: 14px; margin-bottom: 3px; }
        .np-step { display: inline-flex; align-items: center; border: 1px solid #ddd6c0; border-radius: 10px; overflow: hidden; background: #fffdf8; }
        .np-step button { width: 34px; height: 36px; border: 0; background: transparent; font-size: 18px; color: #0b2d1f; cursor: pointer; }
        .np-step button:disabled { opacity: .3; cursor: default; }
        .np-step input { width: 40px; height: 36px; border: 0; text-align: center; font: inherit; font-size: 15px; font-weight: 600; background: transparent; outline: 0; color: #0b2d1f; }
        .np-pr { display: flex; align-items: center; width: 124px; height: 36px; border: 1px solid #ddd6c0; border-radius: 10px; background: #fffdf8; overflow: hidden; }
        .np-pr span { padding-left: 10px; color: #8a6d1f; font-weight: 700; font-size: 13px; }
        .np-pr input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; padding: 0 8px 0 4px; text-align: right; }
        .np-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(176,74,63,.4); background: #fff; color: #b04a3f; cursor: pointer; }
        .np-add { margin-top: 10px; width: 100%; height: 42px; border-radius: 12px; border: 1.5px dashed #d8b95f; background: #fffdf8; color: #7a6a30; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .np-add:hover { background: #fff6dc; }
        .np-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex-shrink: 0; padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px)); background: #0b2d1f; border-top: 2px solid #d8b95f; }
        .np-tot { flex: 1; min-width: 120px; }
        .np-tot span { display: block; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: rgba(246,231,180,.65); font-weight: 700; }
        .np-tot b { font-size: 25px; font-weight: 500; color: #f0c14b; }
        .np-cancel { height: 48px; padding: 0 18px; border-radius: 99px; border: 1px solid rgba(240,193,75,.45); background: transparent; color: #f6e7b4; font: inherit; font-size: 13px; cursor: pointer; }
        .np-ok { height: 48px; padding: 0 26px; border-radius: 99px; border: 0; background: #f0c14b; color: #1b1608; font: inherit; font-size: 13px; font-weight: 700; letter-spacing: .1em; cursor: pointer; box-shadow: 0 6px 18px rgba(240,193,75,.3); }
        .np-ok:disabled { opacity: .6; cursor: wait; }
        .np-err { width: 100%; order: -1; margin: 0; font-size: 12.5px; color: #ffe1dd; background: rgba(161,38,34,.4); border: 1px solid rgba(255,150,140,.45); padding: 8px 12px; border-radius: 10px; }

        /* ===== Tablet y móvil (< 1024 px): tarjetas ===== */
        @media (max-width: 1023px) {
          .hp { padding-bottom: 24px; }
          .hp-wrap { display: none; }
          .hp-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: start; }

          .hp-tool { display: grid; gap: 10px; }
          .hp-row1 { display: flex; gap: 8px; }
          .hp-bus { max-width: none; flex: 1; min-width: 0; height: 44px; font-size: 16px; }
          .hp-fbtn { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 16px; border-radius: 99px; border: 1px solid #b08d3c; background: #fffdf8; color: #7a6a30; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
          .hp-fbtn i { font-style: normal; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: #0b2d1f; color: #f6e7b4; font-size: 11px; display: grid; place-items: center; }
          .hp-fgrp { display: none; }
          .hp-fgrp.open { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #fff; border: 1px solid #ece7d6; border-radius: 14px; padding: 12px; }
          .hp-fgrp .hp-sel { grid-column: 1 / -1; height: 44px; font-size: 16px; }
          .hp-fgrp .hp-lbl { display: grid; gap: 4px; font-size: 12px; }
          .hp-fgrp .hp-date { height: 44px; font-size: 16px; width: 100%; }
          .hp-fgrp .hp-btn { grid-column: 1 / -1; }
          .hp-acts { margin-left: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .hp-acts .hp-btn { height: 44px; font-size: 13px; }
          /* Botón de pedido manual: grande, arriba y dentro del flujo (no queda tapado por la barra inferior) */
          .hp-acts .hp-new { grid-column: 1 / -1; order: -1; height: 52px; font-size: 14.5px; border-radius: 14px; }

          .hp-chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .hp-chips::-webkit-scrollbar { display: none; }
          .hp-chips button { flex-shrink: 0; white-space: nowrap; height: 38px; }

          .hp-pag { justify-content: center; }
          .hp-nav button { min-width: 40px; height: 40px; }
          .hp-pag .hp-sel { height: 40px; }

          .hp-f input, .hp-f select, .hp-f textarea, .np-in, .np-pr input, .np-step input { font-size: 16px; }
        }

        /* ===== Móvil (< 700 px) ===== */
        @media (max-width: 700px) {
          .hp-cards { grid-template-columns: 1fr; }
          .hp-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
          .hp-stats > div:last-child { grid-column: 1 / -1; }
          .hp-stats b { font-size: 18px; }
          .hp-g2, .hp-f { grid-template-columns: 1fr; }
          .hp-pinfo { width: 100%; text-align: center; }
          .hp-gap { display: none; }

          .hp-modal { padding: 0; align-items: end; }
          .hp-hoja { max-width: 100%; max-height: 94dvh; border-radius: 22px 22px 0 0; padding: 22px 14px 18px; position: relative; }
          .hp-hoja::before { content: ""; position: absolute; top: 8px; left: 50%; width: 42px; height: 4px; margin-left: -21px; border-radius: 99px; background: #d9d4c2; }
          .hp-hh h2 { font-size: 21px; }
          .hp-hh small { margin-left: 0; width: 100%; }
          .hp-tl { grid-template-columns: 1fr; gap: 0; margin: 6px 0 16px; }
          .hp-tl .hp-st { text-align: left; padding: 0 0 14px 28px; font-size: 13px; }
          .hp-tl .hp-st::before { top: 14px; bottom: -2px; left: 6px; right: auto; width: 3px; height: auto; }
          .hp-tl .hp-st::after { top: 1px; left: 0; }
          .hp-tl .hp-st:last-child { padding-bottom: 0; }
          .hp-tl .hp-st:last-child::before { display: none; }
          .hp-btns { position: sticky; bottom: 0; margin: 14px -14px -18px; padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)); background: #fff; border-top: 1px solid #ece7d6; z-index: 3; }
          .hp-btns .hp-btn { flex: 1 1 44%; height: 46px; }
          .hp-btns .hp-btn.x { flex: 1 1 100%; margin-right: 0; order: 9; }
          .hp-it { font-size: 12.5px; }

          /* pedido manual como hoja inferior */
          .np { max-width: 100%; height: 96dvh; max-height: 96dvh; border-radius: 24px 24px 0 0; }
          .np-head { padding: 24px 16px 14px; }
          .np-head::before { content: ""; position: absolute; top: 8px; left: 50%; width: 42px; height: 4px; margin-left: -21px; border-radius: 99px; background: rgba(240,193,75,.45); }
          .np-head h2 { font-size: 22px; }
          .np-head p { font-size: 12px; }
          .np-body { padding: 12px 10px 10px; gap: 10px; }
          .np-sec { padding: 12px; border-radius: 16px; }
          .np-g { grid-template-columns: 1fr; gap: 10px; }
          .np-sug { grid-template-columns: 1fr 1fr; max-height: 200px; }
          .np-ln { grid-template-columns: auto minmax(0, 1fr) auto; }
          .np-ln .np-info { grid-column: 1 / -1; }
          .np-pr { width: auto; }
          .np-cancel { display: none; }
          .np-ok { flex: 1 1 52%; }
          .np-tot b { font-size: 22px; }
        }

        /* ===== Foto de la pieza en el pedido ===== */
        .hp-art { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .hp-thl { flex: 0 0 auto; display: block; line-height: 0; }
        .hp-th { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #ece7d6; background: #f3efe2; display: block; }
        .hp-li .hp-th { width: 48px; height: 48px; }

        /* ===== Colores fijos del modal (legibles sobre fondo blanco) ===== */
        .hp-modal, .hp-hoja, .np { color: #1d2a23 !important; color-scheme: light; }
        .hp-hoja h2, .hp-hoja h3 { color: #0b2d1f !important; }
        .hp-bx { color: #2c3a33 !important; }
        .hp-bx b { color: #0b2d1f !important; }
        .hp-bx h4 { color: #8a6d1f !important; }
        .hp-it th { color: #5a6b62 !important; }
        .hp-it td { color: #2c3a33 !important; }
        .hp-it td small { color: #5a6b62 !important; }
        .hp-it tfoot td { color: #0b2d1f !important; }
        .hp-hh small { color: #5a6b62 !important; }
        .hp-st { color: #6b7a72 !important; }
        .hp-st.on { color: #0b2d1f !important; }
        .hp-st small { color: #5a6b62 !important; }
        .hp-f label { color: #2c3a33 !important; }
        .hp-f input, .hp-f select, .hp-f textarea { color: #1d2a23 !important; -webkit-text-fill-color: #1d2a23; background: #fff !important; }
        .hp-f input:disabled, .hp-f select:disabled, .hp-f textarea:disabled { color: #5a6b62 !important; -webkit-text-fill-color: #5a6b62; background: #f3efe2 !important; opacity: 1; }
        .hp-modal input::placeholder, .hp-modal textarea::placeholder { color: #7a857e !important; -webkit-text-fill-color: #7a857e; opacity: 1; }
        .hp-modal input[type="date"] { color: #1d2a23 !important; -webkit-text-fill-color: #1d2a23; }
        .hp-modal .hp-btn { color: #7a6a30; }
        .hp-modal .hp-btn.p { color: #f6e7b4; }
        .hp-modal .hp-btn.g { color: #1b1608; }
        .hp-modal .hp-btn.x { color: #b04a3f; }
        .np-sec h3 { color: #0b2d1f !important; }
        .np-l { color: #5a6b62 !important; }
        .np-in { color: #1d2a23 !important; -webkit-text-fill-color: #1d2a23; }
        .np-info b, .np-sug b { color: #0b2d1f !important; }
        .np-info small, .np-sug small { color: #5a6b62 !important; }
      `}</style>

      <div className="hp-stats">
        <div className="n"><span>Nuevos</span><b>{cuenta('nuevo')}</b></div>
        <div><span>Recibidos</span><b>{cuenta('recibido')}</b></div>
        <div className="c"><span>En camino</span><b>{cuenta('en_camino')}</b></div>
        <div className="e"><span>Entregados</span><b>{cuenta('entregado')}</b></div>
        <div><span>Total pedidos</span><b>{copN(totalVendido)}</b></div>
      </div>

      <div className="hp-tool">
        <div className="hp-row1">
          <input className="hp-bus" placeholder="Buscar cliente, código, teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="hp-fbtn" aria-expanded={verFiltros} onClick={() => setVerFiltros((v) => !v)}>
            ⚲ Filtros{nFiltros > 0 && <i>{nFiltros}</i>}
          </button>
        </div>
        <div className={`hp-fgrp ${verFiltros ? 'open' : ''}`}>
          <select className="hp-sel" aria-label="Filtrar por domiciliario" value={domi} onChange={(e) => setDomi(e.target.value)}>
            <option value="todos">Todos los domiciliarios</option>
            <option value="__sin">Sin domiciliario</option>
            {nombresDomi.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="hp-lbl">Desde <input className="hp-date" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} /></label>
          <label className="hp-lbl">Hasta <input className="hp-date" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} /></label>
          {hayFiltro && <button type="button" className="hp-btn" onClick={limpiar}>Limpiar filtros</button>}
        </div>
        <div className="hp-acts">
          <button type="button" className="hp-btn" onClick={refrescar} disabled={girando}>
            <span className={girando ? 'hp-spin' : undefined}>↻</span> Actualizar
          </button>
          <button type="button" className="hp-btn p" onClick={exportar}>⬇ Exportar CSV ({filtrados.length})</button>
          <button type="button" className="hp-btn g hp-new" onClick={() => setNuevo(true)}>+ Nuevo pedido manual</button>
        </div>
      </div>

      <div className="hp-chips" role="group" aria-label="Estado del pedido">
        <button type="button" aria-pressed={est === 'todos'} onClick={() => setEst('todos')}>Todos<em>{pedidos.length}</em></button>
        {ESTADOS.map((e) => (
          <button key={e.v} type="button" aria-pressed={est === e.v} onClick={() => setEst(e.v)}>{e.t}<em>{cuenta(e.v)}</em></button>
        ))}
      </div>

      {cargando ? (
        <div className="hp-vacio">Cargando pedidos…</div>
      ) : filtrados.length === 0 ? (
        <div className="hp-vacio">
          {pedidos.length === 0
            ? 'Aún no hay pedidos. Los de la web llegarán aquí; mientras tanto puedes crear uno con “+ Nuevo pedido manual”.'
            : 'No hay pedidos con esos filtros.'}
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hp-wrap">
            <table className="hp-t">
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Destino</th><th>Artículos</th><th>Total</th>
                  <th>Estado</th><th>Domiciliario</th><th>Entrega</th><th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const its = parseItems(p.items);
                  const uds = its.reduce((s, i) => s + i.cant, 0);
                  const urg = urgencia(p);
                  return (
                    <tr key={p.id}>
                      <td><span className="hp-cod">{p.codigo}</span><small>{fmtF(p.creado)}</small><small>{p.origen === 'web' ? '🌐 Web' : '✍ Manual'}</small></td>
                      <td><b>{p.cliente}</b><small>{p.telefono || '—'}</small></td>
                      <td>{p.direccion || '—'}<small>{p.ciudad}</small></td>
                      <td>{uds} u.<small>{its[0]?.nombre}{its.length > 1 ? ` +${its.length - 1} más` : ''}</small></td>
                      <td><span className="hp-tot">{copN(num(p.total))}</span><span className={`hp-pg ${p.pago_estado}`}>{p.pago_estado === 'pagado' ? '✔ Pagado' : 'Pago pendiente'}</span></td>
                      <td><span className={`hp-pill ${p.estado}`}>{nEst(p.estado)}</span></td>
                      <td>{p.domiciliario || <small>Sin asignar</small>}{p.domiciliario_tel && <small>{p.domiciliario_tel}</small>}</td>
                      <td>
                        {p.entregado_en ? <>Entregado<small>{fmtF(p.entregado_en)}</small></> : p.fecha_entrega ? <>{fmtD(p.fecha_entrega)}<small>Programada</small>{urg && <span className={`hp-urg ${urg.c}`}>{urg.t}</span>}</> : <small>Sin fecha</small>}
                      </td>
                      <td><div className="hp-acc">{accion(p)}<button type="button" className="hp-b v" onClick={() => abrir(p)}>Ver</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet y móvil: tarjetas colapsables */}
          <div className="hp-cards">{visibles.map(tarjeta)}</div>
        </>
      )}

      {filtrados.length > 0 && (
        <div className="hp-pag">
          <span className="hp-pinfo">
            Mostrando {ini + 1}–{Math.min(ini + porPag, filtrados.length)} de {filtrados.length}
            {filtrados.length !== pedidos.length && ` (${pedidos.length} en total)`}
          </span>
          <span className="hp-gap" />
          <label className="hp-lbl">
            Filas
            <select className="hp-sel" value={porPag} onChange={(e) => setPorPag(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="hp-nav" role="navigation" aria-label="Paginación">
            <button type="button" disabled={pag <= 1} onClick={() => setPagina(pag - 1)} aria-label="Página anterior">‹</button>
            {numeros.map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} className="hp-dots">…</span>
              ) : (
                <button key={n} type="button" aria-current={n === pag ? 'page' : undefined} aria-pressed={n === pag} onClick={() => setPagina(n)}>{n}</button>
              ),
            )}
            <button type="button" disabled={pag >= totalPag} onClick={() => setPagina(pag + 1)} aria-label="Página siguiente">›</button>
          </div>
        </div>
      )}
      <p className="hp-foot">
        Última actualización: {fmtUlt(ultima)} · se refresca sola cada 30 s. Exportar descarga todos los pedidos filtrados (no solo la página visible).
      </p>

      <datalist id="hp-domis">{nombresDomi.map((n) => <option key={n} value={n} />)}</datalist>

      {sel && (
        <Modal label={`Pedido ${sel.codigo}`} onClose={() => setSelId(null)}>
          <div className="hp-hh">
            <h2>{sel.codigo}</h2>
            <span className={`hp-pill ${sel.estado}`}>{nEst(sel.estado)}</span>
            <small>{fmtF(sel.creado)} · {sel.origen === 'web' ? 'Desde la web' : 'Manual'}</small>
          </div>

          <Contacto p={sel} />

          <div className="hp-g2">
            <div className="hp-bx">
              <h4>Cliente</h4>
              <b>{sel.cliente}</b><br />
              {sel.telefono || 'Sin teléfono'}<br />
              {sel.email || 'Sin correo'}<br />
              Venta: {sel.tipo === 'mayorista' ? 'Mayorista' : 'Menudeo'}
            </div>
            <div className="hp-bx">
              <h4>Entrega y pago</h4>
              {sel.direccion || 'Sin dirección'}{sel.ciudad ? `, ${sel.ciudad}` : ''}<br />
              Fecha de entrega: <b>{fmtD(sel.fecha_entrega)}</b><br />
              Pago: {sel.metodo_pago || '—'} ·{' '}
              <b style={{ color: sel.pago_estado === 'pagado' ? '#1e6b34' : '#b7791f' }}>{sel.pago_estado === 'pagado' ? 'Pagado' : 'Pendiente'}</b>
            </div>
          </div>

          <table className="hp-it">
            <thead><tr><th>Artículo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>
              {parseItems(sel.items).map((i, k) => (
                <tr key={k}><td><div className="hp-art"><Miniatura src={i.foto} alt={i.nombre} /><div>{i.nombre}{i.codigo && <small style={{ color: '#5a6b62' }}> · {i.codigo}</small>}</div></div></td><td>{i.cant}</td><td>{copN(i.precio)}</td><td>{copN(i.precio * i.cant)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}>Total</td><td>{copN(num(sel.total))}</td></tr></tfoot>
          </table>

          <Pasos p={sel} />

          <div className="hp-f">
            <div>
              <label htmlFor="hp-dm">Domiciliario</label>
              <input id="hp-dm" list="hp-domis" value={ed.domiciliario} onChange={(e) => elegirDomi(e.target.value)} placeholder="Elige o escribe el nombre" disabled={sel.estado === 'entregado' || sel.estado === 'cancelado'} />
            </div>
            <div>
              <label htmlFor="hp-dt">Teléfono del domiciliario</label>
              <input id="hp-dt" inputMode="tel" value={ed.domiciliario_tel} onChange={(e) => setEd((x) => ({ ...x, domiciliario_tel: e.target.value }))} disabled={sel.estado === 'entregado' || sel.estado === 'cancelado'} />
            </div>
            <div>
              <label htmlFor="hp-fe">Fecha de entrega</label>
              <input id="hp-fe" type="date" value={ed.fecha_entrega} onChange={(e) => setEd((x) => ({ ...x, fecha_entrega: e.target.value }))} disabled={sel.estado === 'entregado' || sel.estado === 'cancelado'} />
            </div>
            <div>
              <label>Pago</label>
              <button type="button" className="hp-btn" style={{ width: '100%' }} disabled={busy === sel.id} onClick={() => guardar(sel.id, { pago_estado: sel.pago_estado === 'pagado' ? 'pendiente' : 'pagado' }, 'Pago actualizado.')}>
                {sel.pago_estado === 'pagado' ? 'Marcar pago pendiente' : 'Marcar como pagado'}
              </button>
            </div>
            <div className="full">
              <label htmlFor="hp-nt">Notas</label>
              <textarea id="hp-nt" rows={2} value={ed.notas} onChange={(e) => setEd((x) => ({ ...x, notas: e.target.value }))} placeholder="Indicaciones de entrega, observaciones…" />
            </div>
          </div>

          <div className="hp-btns">
            {['nuevo', 'recibido', 'en_camino'].includes(sel.estado) && (
              <button type="button" className="hp-btn x" disabled={busy === sel.id} onClick={() => { if (window.confirm('¿Cancelar este pedido?')) guardar(sel.id, { estado: 'cancelado' }, 'Pedido cancelado.'); }}>Cancelar pedido</button>
            )}
            <button type="button" className="hp-btn" onClick={() => setSelId(null)}>Cerrar</button>
            <button type="button" className="hp-btn" disabled={busy === sel.id} onClick={() => guardar(sel.id, ed, 'Cambios guardados.')}>Guardar cambios</button>
            {sel.estado === 'nuevo' && <button type="button" className="hp-btn g" disabled={busy === sel.id} onClick={() => guardar(sel.id, { ...ed, estado: 'recibido' }, `Pedido ${sel.codigo} recibido.`)}>Recibir pedido</button>}
            {sel.estado === 'recibido' && <button type="button" className="hp-btn g" disabled={busy === sel.id} onClick={() => despachar(sel)}>Asignar y despachar</button>}
            {sel.estado === 'en_camino' && <button type="button" className="hp-btn p" disabled={busy === sel.id} onClick={() => guardar(sel.id, { estado: 'entregado' }, `Pedido ${sel.codigo} entregado.`)}>Marcar entregado</button>}
          </div>
        </Modal>
      )}

      {nuevo && (
        <NuevoPedido
          catalogo={catalogo}
          onClose={() => setNuevo(false)}
          onCreated={(p) => { setPedidos((l) => [p, ...l]); setNuevo(false); setEst('todos'); avisar(`Pedido ${p.codigo} creado y guardado en la hoja Pedidos.`, 5000); }}
        />
      )}
    </div>
  );
}

/* ---------- Popup: pedido manual ---------- */
function NuevoPedido({ catalogo, onClose, onCreated }: { catalogo: Cat[]; onClose: () => void; onCreated: (p: Pedido) => void }) {
  const [f, setF] = useState({
    cliente: '', telefono: '', email: '', direccion: '', ciudad: '', tipo: 'menudeo',
    metodo_pago: 'Efectivo', pago_estado: 'pendiente', fecha_entrega: '', notas: '',
  });
  const [ls, setLs] = useState<Linea[]>([]);
  const [bus, setBus] = useState('');
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const hoy = diaLocal(new Date().toISOString());
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const precioCat = (c: Cat, tipo: string) => (tipo === 'mayorista' ? c.mayorista || c.menudeo : c.menudeo || c.mayorista);
  const validas = ls.filter((l) => l.nombre.trim() && l.cant > 0);
  const total = validas.reduce((s, l) => s + l.cant * l.precio, 0);
  const uds = validas.reduce((s, l) => s + l.cant, 0);

  const sugeridos = useMemo(() => {
    const t = bus.trim().toLowerCase();
    const base = t ? catalogo.filter((c) => `${c.codigo} ${c.nombre}`.toLowerCase().includes(t)) : catalogo;
    return base.slice(0, t ? 12 : 6);
  }, [bus, catalogo]);

  function cambiarTipo(tipo: string) {
    setF((x) => ({ ...x, tipo }));
    setLs((a) => a.map((l) => {
      const c = l.codigo ? catalogo.find((k) => k.codigo === l.codigo) : undefined;
      return c ? { ...l, precio: precioCat(c, tipo) } : l;
    }));
  }
  function agregar(c: Cat) {
    setLs((a) => {
      const i = a.findIndex((l) => l.codigo === c.codigo);
      if (i >= 0) return a.map((l, j) => (j === i ? { ...l, cant: l.cant + 1 } : l));
      return [...a, { codigo: c.codigo, nombre: c.nombre, cant: 1, precio: precioCat(c, f.tipo), foto: c.foto }];
    });
    setBus('');
    setErr('');
  }
  const upd = (i: number, patch: Partial<Linea>) => setLs((a) => a.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const quitar = (i: number) => setLs((a) => a.filter((_, j) => j !== i));

  async function crear() {
    setErr('');
    if (!f.cliente.trim()) return setErr('Escribe el nombre del cliente.');
    if (f.telefono.replace(/\D/g, '').length < 7) return setErr('Escribe un teléfono válido del cliente.');
    if (!f.direccion.trim()) return setErr('Escribe la dirección de entrega.');
    if (!validas.length) return setErr('Agrega al menos un artículo.');
    if (validas.some((l) => l.precio <= 0)) return setErr('Hay artículos sin precio.');
    setGuardando(true);
    try {
      const res = await fetch('/api/hans/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, items: validas, total, origen: 'manual' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo crear el pedido');
      onCreated(d as Pedido);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear el pedido');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal label="Nuevo pedido manual" onClose={onClose} className="np">
      <header className="np-head">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <small>Joyería Hans · pedido manual</small>
          <h2>Nuevo pedido</h2>
          <p>Para pedidos por WhatsApp o llamada. Entra como «Nuevo» y se guarda en la hoja Pedidos.</p>
        </div>
        <button type="button" className="np-close" aria-label="Cerrar" onClick={onClose}>✕</button>
      </header>

      <div className="np-body">
        <section className="np-sec">
          <h3><i>1</i>Cliente</h3>
          <div className="np-g">
            <div className="full">
              <label className="np-l" htmlFor="np-c">Nombre <b>*</b></label>
              <input id="np-c" className="np-in" autoComplete="off" value={f.cliente} onChange={set('cliente')} placeholder="Ej.: Laura Gómez" />
            </div>
            <div>
              <label className="np-l" htmlFor="np-t">Teléfono / WhatsApp <b>*</b></label>
              <input id="np-t" className="np-in" inputMode="tel" value={f.telefono} onChange={set('telefono')} placeholder="300 000 0000" />
            </div>
            <div>
              <label className="np-l" htmlFor="np-e">Correo (opcional)</label>
              <input id="np-e" className="np-in" type="email" inputMode="email" value={f.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
            </div>
          </div>
        </section>

        <section className="np-sec">
          <h3><i>2</i>Entrega</h3>
          <div className="np-g">
            <div className="full">
              <label className="np-l" htmlFor="np-d">Dirección <b>*</b></label>
              <input id="np-d" className="np-in" value={f.direccion} onChange={set('direccion')} placeholder="Calle, número, apto / indicaciones" />
            </div>
            <div>
              <label className="np-l" htmlFor="np-ci">Ciudad / barrio</label>
              <input id="np-ci" className="np-in" value={f.ciudad} onChange={set('ciudad')} placeholder="Ej.: Medellín, Laureles" />
            </div>
            <div>
              <label className="np-l" htmlFor="np-fe">Fecha de entrega</label>
              <input id="np-fe" className="np-in" type="date" min={hoy} value={f.fecha_entrega} onChange={set('fecha_entrega')} />
            </div>
          </div>
        </section>

        <section className="np-sec">
          <h3><i>3</i>Artículos<em>{uds} u. · {copN(total)}</em></h3>
          <div className="np-seg" role="group" aria-label="Tipo de venta">
            <button type="button" aria-pressed={f.tipo === 'menudeo'} onClick={() => cambiarTipo('menudeo')}>Menudeo</button>
            <button type="button" aria-pressed={f.tipo === 'mayorista'} onClick={() => cambiarTipo('mayorista')}>Mayorista</button>
          </div>

          <div className="np-bus">
            <span aria-hidden="true">🔍</span>
            <input className="np-in" placeholder="Buscar en el catálogo por nombre o SKU…" value={bus} onChange={(e) => setBus(e.target.value)} aria-label="Buscar artículo del catálogo" />
          </div>
          {catalogo.length === 0 ? (
            <p className="np-vac">El catálogo está vacío: agrega artículos libres abajo.</p>
          ) : sugeridos.length === 0 ? (
            <p className="np-vac">Sin resultados para «{bus}».</p>
          ) : (
            <div className="np-sug">
              {sugeridos.map((c) => (
                <button key={c.codigo} type="button" onClick={() => agregar(c)}>
                  <small>{c.codigo}</small>
                  <b>{c.nombre}</b>
                  <em>{copN(precioCat(c, f.tipo))} · + agregar</em>
                </button>
              ))}
            </div>
          )}

          {ls.length > 0 && (
            <div className="np-lns">
              {ls.map((l, i) => (
                <div className="np-ln" key={i}>
                  <div className="np-info">
                    {l.codigo ? (
                      <b>{l.nombre}</b>
                    ) : (
                      <input className="np-in" aria-label="Nombre del artículo" placeholder="Nombre del artículo" value={l.nombre} onChange={(e) => upd(i, { nombre: e.target.value })} />
                    )}
                    <small>{l.codigo ? `${l.codigo} · ` : 'Artículo libre · '}Subtotal {copN(l.cant * l.precio)}</small>
                  </div>
                  <div className="np-step">
                    <button type="button" aria-label="Quitar una unidad" disabled={l.cant <= 1} onClick={() => upd(i, { cant: Math.max(1, l.cant - 1) })}>−</button>
                    <input aria-label="Cantidad" inputMode="numeric" value={l.cant} onChange={(e) => upd(i, { cant: Math.max(1, Math.min(999, num(e.target.value))) })} />
                    <button type="button" aria-label="Agregar una unidad" onClick={() => upd(i, { cant: Math.min(999, l.cant + 1) })}>+</button>
                  </div>
                  <label className="np-pr">
                    <span>$</span>
                    <input aria-label="Precio unitario" inputMode="numeric" placeholder="Precio" value={l.precio ? l.precio.toLocaleString('es-CO') : ''} onChange={(e) => upd(i, { precio: num(e.target.value) })} />
                  </label>
                  <button type="button" className="np-x" aria-label="Quitar artículo" onClick={() => quitar(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="np-add" onClick={() => setLs((a) => [...a, { nombre: '', cant: 1, precio: 0 }])}>+ Artículo libre (fuera del catálogo)</button>
        </section>

        <section className="np-sec">
          <h3><i>4</i>Pago y notas</h3>
          <span className="np-l">Método de pago</span>
          <div className="np-chips" role="group" aria-label="Método de pago">
            {PAGOS.map((p) => (
              <button key={p} type="button" aria-pressed={f.metodo_pago === p} onClick={() => setF((x) => ({ ...x, metodo_pago: p }))}>{p}</button>
            ))}
          </div>
          <span className="np-l" style={{ marginTop: 12 }}>Estado del pago</span>
          <div className="np-seg" role="group" aria-label="Estado del pago">
            <button type="button" aria-pressed={f.pago_estado === 'pendiente'} onClick={() => setF((x) => ({ ...x, pago_estado: 'pendiente' }))}>Pendiente</button>
            <button type="button" aria-pressed={f.pago_estado === 'pagado'} onClick={() => setF((x) => ({ ...x, pago_estado: 'pagado' }))}>✔ Pagado</button>
          </div>
          <label className="np-l" htmlFor="np-n" style={{ marginTop: 12 }}>Notas</label>
          <textarea id="np-n" className="np-in" rows={2} value={f.notas} onChange={set('notas')} placeholder="Talla, color del hilo, indicaciones de entrega…" />
        </section>
      </div>

      <footer className="np-foot">
        {err && <p className="np-err" role="alert">{err}</p>}
        <div className="np-tot"><span>Total · {uds} u.</span><b>{total > 0 ? copN(total) : '$0'}</b></div>
        <button type="button" className="np-cancel" onClick={onClose}>Cancelar</button>
        <button type="button" className="np-ok" onClick={crear} disabled={guardando}>{guardando ? 'GUARDANDO…' : 'CREAR PEDIDO'}</button>
      </footer>
    </Modal>
  );
}