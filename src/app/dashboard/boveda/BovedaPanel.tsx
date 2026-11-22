// 📁 RUTA: src/app/dashboard/boveda/BovedaPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EstadoBoveda, Registro } from '@/lib/boveda-registros';

const QUILATES = ['24', '18', '14'];
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()); // AAAA-MM-DD
const FORM_VACIO = { socio: '', telefono: '', pieza: '', quilate: '18', peso: '', ingreso: '', estado: 'custodia' as EstadoBoveda, nota: '' };

const ETIQUETA: Record<EstadoBoveda, string> = { custodia: 'En custodia', retiro: 'Retiro solicitado', retirada: 'Entregada' };
const fecha = (d: string) => {
  const x = new Date(`${d}T12:00:00`);
  return isNaN(x.getTime()) ? '—' : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(x);
};
const gramos = (p: string) => Number(String(p || '').replace(',', '.')) || 0;
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '•';

/* ---------- Iconos ---------- */
const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const IcoLapiz = () => (<svg {...ico}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>);
const IcoPapelera = () => (<svg {...ico}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>);
const IcoBuscar = () => (<svg {...ico}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>);
const IcoDescargar = () => (<svg {...ico}><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>);
const IcoMas = () => (<svg {...ico}><path d="M12 5v14M5 12h14" /></svg>);
const IcoCheck = () => (<svg {...ico}><path d="M5 12l5 5 9-10" /></svg>);
const IcoGema = ({ s = 22 }: { s?: number }) => (<svg {...ico} width={s} height={s} strokeWidth={1.5}><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></svg>);
const IcoLlave = () => (<svg {...ico} width={26} height={26} strokeWidth={1.4}><path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="16" r="1.4" /></svg>);

export default function BovedaPanel({ inicial, errorCarga }: { inicial: Registro[]; errorCarga?: string }) {
  const [lista, setLista] = useState<Registro[]>(inicial);
  const [q, setQ] = useState('');
  const [fEstado, setFEstado] = useState<'todos' | EstadoBoveda>('todos');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_VACIO, ingreso: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<{ t: string; ok: boolean } | null>(errorCarga ? { t: errorCarga, ok: false } : null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const aBorrar = lista.find((x) => x.id === confirmar) || null;

  const avisar = (t: string, ok = true, ms = 4000) => {
    setAviso({ t, ok });
    if (ms) setTimeout(() => setAviso(null), ms);
  };

  /** Si la cookie de la bóveda venció, se recarga para que vuelva a aparecer la caja fuerte */
  function sesionVencida(status: number) {
    if (status !== 401) return false;
    avisar('La bóveda se cerró por inactividad. Vuelve a abrirla con tu código…', false, 0);
    setTimeout(() => window.location.reload(), 1600);
    return true;
  }

  useEffect(() => {
    if (!abierto && !confirmar) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmar) { if (!borrando) setConfirmar(null); } else setAbierto(false);
    };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [abierto, confirmar, borrando]);

  /* ---------- Datos derivados ---------- */
  const cuentas = useMemo(() => {
    const c = { todos: lista.length, custodia: 0, retiro: 0, retirada: 0 };
    lista.forEach((r) => { c[r.estado]++; });
    return c;
  }, [lista]);

  const enBoveda = lista.filter((r) => r.estado !== 'retirada');
  const pesoTotal = enBoveda.reduce((t, r) => t + gramos(r.peso), 0);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lista
      .filter((r) => (fEstado === 'todos' || r.estado === fEstado) && (!t || `${r.socio} ${r.pieza} ${r.id} ${r.telefono}`.toLowerCase().includes(t)))
      .sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
  }, [lista, q, fEstado]);

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ---------- Acciones ---------- */
  function abrir() {
    setEditId(null);
    setForm({ ...FORM_VACIO, ingreso: hoy() });
    setError('');
    setAbierto(true);
  }
  function abrirEditar(r: Registro) {
    setEditId(r.id);
    setForm({ socio: r.socio, telefono: r.telefono, pieza: r.pieza, quilate: r.quilate, peso: r.peso, ingreso: r.ingreso, estado: r.estado, nota: r.nota });
    setError('');
    setAbierto(true);
  }

  async function guardar() {
    setError('');
    if (!form.socio.trim()) return setError('Escribe el nombre del socio');
    if (!form.pieza.trim()) return setError('Escribe el nombre de la pieza');
    if (form.peso.trim() && !(gramos(form.peso) > 0)) return setError('El peso debe ser un número, por ejemplo 4.5');
    setGuardando(true);
    try {
      const res = await fetch(editId ? `/api/boveda/registros/${editId}` : '/api/boveda/registros', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (sesionVencida(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `No se pudo guardar (error ${res.status})`);
      setLista((l) => (editId ? l.map((x) => (x.id === editId ? data : x)) : [data, ...l]));
      avisar(editId ? 'Cambios guardados.' : `Custodia registrada con el ID ${data.id}.`);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(r: Registro, estado: EstadoBoveda) {
    const previo = r.estado;
    setLista((l) => l.map((x) => (x.id === r.id ? { ...x, estado } : x))); // optimista
    try {
      const res = await fetch(`/api/boveda/registros/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }),
      });
      if (sesionVencida(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el estado');
      setLista((l) => l.map((x) => (x.id === r.id ? data : x)));
      avisar(`"${r.pieza}" marcada como ${ETIQUETA[estado].toLowerCase()}.`);
    } catch (e) {
      setLista((l) => l.map((x) => (x.id === r.id ? { ...x, estado: previo } : x)));
      avisar(e instanceof Error ? e.message : 'No se pudo cambiar el estado.', false);
    }
  }

  async function borrar(r: Registro) {
    setBorrando(true);
    try {
      const res = await fetch(`/api/boveda/registros/${r.id}`, { method: 'DELETE' });
      if (sesionVencida(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');
      setLista((l) => l.filter((x) => x.id !== r.id));
      avisar(`"${r.pieza}" eliminada de la bóveda.`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'No se pudo eliminar el registro.', false);
    } finally {
      setBorrando(false);
      setConfirmar(null);
    }
  }

  function exportar() {
    const cab = ['ID', 'Socio', 'Teléfono', 'Pieza', 'Quilate', 'Peso (g)', 'Ingreso', 'Estado', 'Nota'];
    const filas = filtrados.map((r) => [r.id, r.socio, r.telefono, r.pieza, `${r.quilate}K`, r.peso, r.ingreso, ETIQUETA[r.estado], r.nota]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cab, ...filas].map((f) => f.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `boveda-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    avisar(`Exportados ${filas.length} registro${filas.length === 1 ? '' : 's'}.`);
  }

  const chips: { k: 'todos' | EstadoBoveda; t: string }[] = [
    { k: 'todos', t: 'Todas' }, { k: 'custodia', t: 'En custodia' }, { k: 'retiro', t: 'Retiro solicitado' }, { k: 'retirada', t: 'Entregadas' },
  ];

  return (
    <main className="d-cont simple">
      <style>{CSS}</style>

      <div className="d-cab">
        <div>
          <h1>Bóveda de oro</h1>
          <p>Piezas en custodia y solicitudes de retiro de los socios.</p>
        </div>
        <button type="button" className="d-btn bv-nueva" onClick={abrir}><IcoMas /> REGISTRAR CUSTODIA</button>
      </div>

      {aviso && <div className={`bv-aviso ${aviso.ok ? '' : 'mal'}`} role="status">{aviso.t}</div>}

      <div className="bv-stats">
        <div><span>Piezas en bóveda</span><b>{enBoveda.length}</b></div>
        <div className={cuentas.retiro > 0 ? 'alerta' : ''}><span>Retiros solicitados</span><b>{cuentas.retiro}</b></div>
        <div className="gold"><span>Oro en custodia</span><b>{pesoTotal.toLocaleString('es-CO', { maximumFractionDigits: 2 })} g</b></div>
      </div>

      <div className="bv-bar">
        <div className="bv-bus">
          <IcoBuscar />
          <input placeholder="Buscar por socio, pieza o ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en la bóveda" />
        </div>
        <div className="bv-chips" role="group" aria-label="Filtrar por estado">
          {chips.map((c) => (
            <button key={c.k} type="button" aria-pressed={fEstado === c.k} onClick={() => setFEstado(c.k)}>{c.t} <i>{cuentas[c.k]}</i></button>
          ))}
        </div>
        <button type="button" className="bv-btn2" onClick={exportar} disabled={filtrados.length === 0}><IcoDescargar /> Exportar</button>
      </div>

      {filtrados.length === 0 ? (
        <div className="bv-vacio">
          <div className="g"><IcoLlave /></div>
          <b>{lista.length === 0 ? 'La bóveda está vacía' : 'No hay registros con ese filtro'}</b>
          {lista.length === 0 ? 'Pulsa REGISTRAR CUSTODIA para guardar la primera pieza.' : 'Prueba con otra búsqueda o estado.'}
        </div>
      ) : (
        <div className="bv-grid">
          {filtrados.map((r) => (
            <article key={r.id} className={`bv-card ${r.estado}`}>
              <header className="bv-card-h">
                <span className="bv-med"><IcoGema s={24} /></span>
                <div className="bv-card-t">
                  <h3 title={r.pieza}>{r.pieza}</h3>
                  <span className="bv-id">{r.id}</span>
                </div>
                <span className="bv-q">{r.quilate}K</span>
              </header>

              <div className="bv-card-b">
                <div className="bv-socio">
                  <span className="bv-av" aria-hidden>{iniciales(r.socio)}</span>
                  <div><b>{r.socio}</b><small>{r.telefono || 'Sin teléfono'}</small></div>
                </div>

                <dl className="bv-datos">
                  <div><dt>Peso</dt><dd>{r.peso ? `${r.peso} g` : '—'}</dd></div>
                  <div><dt>Ingreso</dt><dd>{fecha(r.ingreso)}</dd></div>
                </dl>

                <span className={`bv-est ${r.estado}`}><i aria-hidden />{ETIQUETA[r.estado]}</span>
                {r.nota && <p className="bv-nota">{r.nota}</p>}
              </div>

              <footer className="bv-card-f">
                {r.estado === 'retiro' && (
                  <button type="button" className="bv-entregar" onClick={() => cambiarEstado(r, 'retirada')}><IcoCheck /> Entregar pieza</button>
                )}
                {r.estado === 'retirada' && (
                  <button type="button" className="bv-b" onClick={() => cambiarEstado(r, 'custodia')}>Volver a custodia</button>
                )}
                <span className="bv-acc">
                  <button type="button" className="bv-ib" onClick={() => abrirEditar(r)} title="Editar" aria-label={`Editar ${r.pieza}`}><IcoLapiz /></button>
                  <button type="button" className="bv-ib del" onClick={() => setConfirmar(r.id)} title="Eliminar" aria-label={`Eliminar ${r.pieza}`}><IcoPapelera /></button>
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}

      {/* ---------- Confirmar eliminación ---------- */}
      {aBorrar && (
        <div className="bv-dlgf" onMouseDown={(e) => e.target === e.currentTarget && !borrando && setConfirmar(null)}>
          <div className="bv-dlg" role="alertdialog" aria-modal="true" aria-labelledby="bv-del-t">
            <div className="bv-dlg-ic"><IcoPapelera /></div>
            <h3 id="bv-del-t">¿Eliminar este registro?</h3>
            <p><b>{aBorrar.pieza}</b><br />{aBorrar.socio} · {aBorrar.id}</p>
            <p style={{ marginTop: 10, fontSize: 12.5, opacity: .75 }}>Se borrará de la bóveda y de la hoja. Esta acción no se puede deshacer.</p>
            <div className="bv-dlg-b">
              <button type="button" className="no" autoFocus onClick={() => setConfirmar(null)} disabled={borrando}>Cancelar</button>
              <button type="button" className="si" onClick={() => borrar(aBorrar)} disabled={borrando}>{borrando ? 'Eliminando…' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Crear / editar ---------- */}
      {abierto && (
        <div className="bv-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="bv-hoja" role="dialog" aria-modal="true" aria-label={editId ? 'Editar custodia' : 'Registrar custodia'}>
            <h2>{editId ? 'Editar custodia' : 'Registrar custodia'}</h2>
            <p className="bv-sub">{editId ? `ID ${editId}. Modifica los datos y guarda.` : 'Guarda una pieza que un socio deja en la bóveda.'}</p>

            <div className="bv-f">
              <div><label htmlFor="bs">Socio</label><input id="bs" value={form.socio} onChange={set('socio')} placeholder="Nombre del socio" /></div>
              <div><label htmlFor="bt">Teléfono</label><input id="bt" inputMode="tel" value={form.telefono} onChange={set('telefono')} placeholder="Opcional" /></div>
              <div className="full"><label htmlFor="bp">Pieza</label><input id="bp" value={form.pieza} onChange={set('pieza')} placeholder="Ej.: Cadena tejido lazo" /></div>
              <div><label htmlFor="bq">Quilate</label>
                <select id="bq" value={form.quilate} onChange={set('quilate')}>{QUILATES.map((c) => <option key={c} value={c}>{c}K</option>)}</select></div>
              <div><label htmlFor="bw">Peso (gramos)</label><input id="bw" inputMode="decimal" value={form.peso} onChange={set('peso')} placeholder="Ej.: 4.5" /></div>
              <div><label htmlFor="bi">Fecha de ingreso</label><input id="bi" type="date" value={form.ingreso} onChange={set('ingreso')} /></div>
              <div><label htmlFor="be">Estado</label>
                <select id="be" value={form.estado} onChange={set('estado')}>
                  {(Object.keys(ETIQUETA) as EstadoBoveda[]).map((k) => <option key={k} value={k}>{ETIQUETA[k]}</option>)}
                </select></div>
              <div className="full"><label htmlFor="bn">Nota (opcional)</label><textarea id="bn" rows={2} value={form.nota} onChange={set('nota')} placeholder="Detalles de la pieza o condiciones del retiro" /></div>
            </div>

            {error && <p className="bv-err" role="alert">{error}</p>}

            <div className="bv-btns">
              <button type="button" className="bv-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={guardar} disabled={guardando}>
                {guardando ? 'GUARDANDO…' : editId ? 'GUARDAR CAMBIOS' : 'REGISTRAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const CSS = `
.bv-aviso { padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; background: #e6f4ea; color: #1e6b34; }
.bv-aviso.mal { background: #fbe7e4; color: #a12622; }
.bv-nueva { display: inline-flex; align-items: center; gap: 8px; }
.bv-nueva svg { width: 18px; height: 18px; }

.bv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 4px 0 16px; }
.bv-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 16px; padding: 14px 18px; box-shadow: 0 6px 18px rgba(11,45,31,.05); }
.bv-stats span { display: block; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
.bv-stats b { display: block; margin-top: 6px; font-family: var(--jks-serif, Georgia), serif; font-size: 26px; font-weight: 500; color: #0b2d1f; }
.bv-stats .alerta b { color: #a8650f; }
.bv-stats .gold { background: linear-gradient(135deg, #0d3324, #07211a); border-color: rgba(216,185,95,.4); }
.bv-stats .gold span { color: rgba(216,185,95,.85); }
.bv-stats .gold b { color: #ecd07a; }

.bv-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.bv-bus { position: relative; flex: 1 1 260px; max-width: 380px; min-width: 200px; }
.bv-bus svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8a978f; }
.bv-bus input { width: 100%; padding: 10px 14px 10px 38px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13.5px; }
.bv-chips { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; background: #fff; }
.bv-chips button { font: inherit; font-size: 12.5px; padding: 9px 14px; border: 0; background: transparent; cursor: pointer; color: inherit; display: inline-flex; gap: 7px; align-items: center; white-space: nowrap; }
.bv-chips button i { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 99px; background: #f1ead2; color: #8a6d25; }
.bv-chips button[aria-pressed="true"] { background: #0b4a2e; color: #fff; }
.bv-chips button[aria-pressed="true"] i { background: rgba(236,208,122,.2); color: #ecd07a; }
.bv-btn2 { margin-left: auto; height: 40px; padding: 0 16px; border-radius: 99px; border: 1px solid rgba(176,141,60,.5); background: #fff; color: #6f5716; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.bv-btn2:hover:not(:disabled) { background: #f4efdf; }
.bv-btn2:disabled { opacity: .5; cursor: not-allowed; }

/* ---------- Tarjetas ---------- */
.bv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.bv-card { display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; background: #fff; border: 1px solid #ece7d6; box-shadow: 0 10px 28px rgba(11,45,31,.08); transition: transform .2s, box-shadow .2s; }
.bv-card:hover { transform: translateY(-3px); box-shadow: 0 18px 36px rgba(11,45,31,.14); }
.bv-card.retiro { border-color: rgba(201,165,72,.7); box-shadow: 0 10px 28px rgba(176,141,60,.2); }
.bv-card.retirada { opacity: .78; }
.bv-card-h { display: flex; align-items: center; gap: 12px; padding: 16px; color: #f3ead2; background: linear-gradient(135deg, #0d3324, #07211a); border-bottom: 3px solid #c9a548; }
.bv-med { flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; color: #ecd07a; border: 1px solid rgba(216,185,95,.55); background: rgba(216,185,95,.08); }
.bv-card-t { flex: 1; min-width: 0; }
.bv-card-t h3 { margin: 0; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 17px; color: #f3ead2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bv-id { display: block; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; letter-spacing: .06em; color: rgba(216,185,95,.75); }
.bv-q { padding: 4px 11px; border-radius: 99px; font-size: 12px; font-weight: 700; color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); }
.bv-card-b { flex: 1; padding: 16px; display: grid; gap: 14px; align-content: start; }
.bv-socio { display: flex; align-items: center; gap: 11px; }
.bv-av { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 700; color: #7a6221; background: #f1ead2; }
.bv-socio b { display: block; font-size: 14.5px; color: #14231b; line-height: 1.2; }
.bv-socio small { font-size: 12px; color: #7a857e; }
.bv-datos { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bv-datos > div { padding: 10px 12px; border-radius: 12px; background: #f6f3ea; }
.bv-datos dt { font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
.bv-datos dd { margin: 3px 0 0; font-size: 14.5px; font-weight: 600; color: #0b2d1f; font-variant-numeric: tabular-nums; }
.bv-est { justify-self: start; display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 12px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.bv-est i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.bv-est.custodia { background: #e6f4ea; color: #1e6b34; } .bv-est.retiro { background: #fdf1dc; color: #8a5a0f; } .bv-est.retirada { background: #eceae3; color: #5d675f; }
.bv-nota { margin: 0; font-size: 12.5px; line-height: 1.5; color: #5a6b62; }
.bv-card-f { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-top: 1px solid #f0ece0; background: #fdfcf8; }
.bv-acc { display: inline-flex; gap: 6px; margin-left: auto; }
.bv-ib { width: 36px; height: 36px; padding: 0; border-radius: 10px; display: grid; place-items: center; cursor: pointer; border: 1px solid #e6e1d2; background: #fff; color: #44514a; transition: .15s; }
.bv-ib:hover { background: #0b4a2e; border-color: #0b4a2e; color: #fff; }
.bv-ib.del:hover { background: #b04a3f; border-color: #b04a3f; }
.bv-entregar { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); }
.bv-b { height: 36px; padding: 0 14px; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; border: 1px solid rgba(176,141,60,.5); background: #fff; color: #6f5716; }
.bv-card button:focus-visible, .bv-btn2:focus-visible { outline: 2px solid #b08d3c; outline-offset: 2px; }

.bv-vacio { padding: 54px 20px; text-align: center; color: #7a857e; border-radius: 18px; background: #fff; border: 1px solid #ece7d6; }
.bv-vacio .g { width: 62px; height: 62px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; color: #b08d3c; background: #faf8f2; border: 1px dashed #c9bd94; }
.bv-vacio b { display: block; margin-bottom: 4px; color: #14231b; font-size: 15px; }

/* ---------- Diálogos ---------- */
.bv-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(10,20,15,.55); }
.bv-hoja { width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; padding: 26px; border-radius: 22px; background: #fff; }
.bv-hoja h2 { margin: 0 0 4px; font-size: 24px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; }
.bv-sub { margin: 0 0 18px; font-size: 13px; color: #7a857e; }
.bv-f { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.bv-f label { display: block; margin-bottom: 5px; font-size: 12px; font-weight: 600; color: #44514a; }
.bv-f input, .bv-f select, .bv-f textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; box-sizing: border-box; }
.bv-f textarea { resize: vertical; }
.bv-f .full { grid-column: 1 / -1; }
.bv-err { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: #a12622; background: #fbe7e4; }
.bv-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
.bv-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }

.bv-dlgf { position: fixed; inset: 0; z-index: 130; display: grid; place-items: center; padding: 18px; background: rgba(3,12,8,.74); backdrop-filter: blur(5px); }
.bv-dlg { width: 100%; max-width: 400px; text-align: center; padding: 30px 26px 24px; border-radius: 24px; color: #f3ead2; background: linear-gradient(180deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.4); box-shadow: 0 30px 80px rgba(0,0,0,.6); animation: bvpop .28s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes bvpop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
.bv-dlg-ic { width: 58px; height: 58px; margin: 0 auto 16px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: #b04a3f; border: 1px solid #0a291d; }
.bv-dlg h3 { margin: 0 0 8px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 22px; color: #f3ead2; }
.bv-dlg p { margin: 0; font-size: 13.5px; line-height: 1.55; color: rgba(243,234,210,.8); }
.bv-dlg p b { color: #ecd07a; font-weight: 600; }
.bv-dlg-b { display: flex; gap: 10px; margin-top: 22px; }
.bv-dlg-b button { flex: 1; font: inherit; font-size: 13px; padding: 12px 14px; border-radius: 99px; cursor: pointer; }
.bv-dlg-b .no { border: 1px solid rgba(216,185,95,.5); background: transparent; color: #ecd07a; }
.bv-dlg-b .si { border: 0; font-weight: 700; color: #fff; background: linear-gradient(135deg, #c65a4d, #a23c32); }
.bv-dlg-b button:disabled { opacity: .7; cursor: wait; }

@media (max-width: 760px) {
  main.d-cont.simple { padding-bottom: 150px; }
  .bv-nueva { position: fixed; right: 16px; bottom: calc(var(--bi-h) + 34px + env(safe-area-inset-bottom, 0px)); z-index: 60; height: 52px; padding: 0 22px; border-radius: 99px; box-shadow: 0 12px 28px rgba(5,28,19,.35); }
  .bv-aviso { position: sticky; top: 8px; z-index: 70; box-shadow: 0 8px 22px rgba(0,0,0,.15); }
  .bv-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .bv-stats > div { padding: 12px 14px; border-radius: 14px; }
  .bv-stats b { font-size: 21px; }
  .bv-stats .gold { grid-column: 1 / -1; }
  .bv-bus { flex: 1 1 100%; max-width: none; }
  .bv-bus input, .bv-f input, .bv-f select, .bv-f textarea { font-size: 16px; }
  .bv-chips { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
  .bv-chips::-webkit-scrollbar { display: none; }
  .bv-chips button { flex-shrink: 0; }
  .bv-btn2 { margin-left: 0; }
  .bv-grid { grid-template-columns: 1fr; }
  .bv-modal { place-items: end center; padding: 0; }
  .bv-hoja { max-width: none; max-height: 94vh; padding: 22px 18px 0; border-radius: 24px 24px 0 0; animation: bvsube .28s ease both; }
  .bv-hoja::before { content: ''; display: block; width: 42px; height: 4px; margin: -8px auto 14px; border-radius: 4px; background: #d6d0bd; }
  .bv-f { gap: 12px; }
  .bv-btns { position: sticky; bottom: 0; margin: 16px -18px 0; padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px)); background: #fff; border-top: 1px solid #f0ece0; }
  .bv-btns > * { flex: 1; height: 46px; justify-content: center; }
}
@keyframes bvsube { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (max-width: 360px) { .bv-f { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .bv-dlg, .bv-hoja { animation: none !important; } .bv-card { transition: none; } }
`;