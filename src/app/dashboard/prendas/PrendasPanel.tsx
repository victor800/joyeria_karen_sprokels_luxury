// 📁 RUTA: src/app/dashboard/prendas/PrendasPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Prenda = {
  id: string; codigo: string; nombre: string; categoria: string; quilate: string; peso: string;
  tamano: string; descripcion: string; foto_url: string; precio_manual: string; stock: string;
  activo: string; creado: string; actualizado: string; precio: number;
};
type Precios = { p24: string; p18: string; p14: string; margen: string };

const CATEGORIAS = ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Dijes', 'Cadenas', 'Esclavas'];
const QUILATES = ['24', '18', '14'];
const VERDE = '#0b4a2e';
const ORO = '#b08d3c';

const FORM_VACIO = {
  nombre: '', categoria: 'Anillos', quilate: '18', peso: '', tamano: '',
  stock: '1', precio_manual: '', descripcion: '', foto_url: '',
};

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Sin precio');
const fecha = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(d);
};

export default function PrendasPanel({ inicial, precios }: { inicial: Prenda[]; precios: Precios }) {
  const [lista, setLista] = useState<Prenda[]>(inicial);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'borrador'>('todas');
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto]);

  // Precio estimado en vivo dentro del formulario
  const estimado = useMemo(() => {
    const manual = Number(form.precio_manual.replace(/\D/g, ''));
    if (manual > 0) return manual;
    const gramo = Number(String(precios[`p${form.quilate}` as keyof Precios]).replace(/\D/g, ''));
    const peso = Number(form.peso.replace(',', '.'));
    const margen = Number(String(precios.margen || '0').replace(',', '.')) || 0;
    return peso > 0 && gramo > 0 ? Math.round(peso * gramo * (1 + margen / 100)) : 0;
  }, [form, precios]);

  const visibles = lista.filter((p) => {
    const texto = `${p.nombre} ${p.codigo} ${p.categoria}`.toLowerCase();
    if (q && !texto.includes(q.toLowerCase())) return false;
    if (filtro === 'activas') return p.activo === 'true';
    if (filtro === 'borrador') return p.activo !== 'true';
    return true;
  });
  const nActivas = lista.filter((p) => p.activo === 'true').length;

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function abrir() {
    setForm(FORM_VACIO);
    setError('');
    setAbierto(true);
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Usa una imagen PNG, JPG o WEBP');
    if (file.size > 4 * 1024 * 1024) return setError('La foto pesa más de 4 MB');
    setSubiendo(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/prendas/foto', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto');
      setForm((f) => ({ ...f, foto_url: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setSubiendo(false);
    }
  }

  async function crear() {
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('/api/prendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la prenda');
      setLista((l) => [data, ...l]);
      setAbierto(false);
      setAviso('Prenda creada. Está inhabilitada hasta que actives el interruptor.');
      setTimeout(() => setAviso(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(p: Prenda) {
    const nuevo = p.activo === 'true' ? 'false' : 'true';
    setLista((l) => l.map((x) => (x.id === p.id ? { ...x, activo: nuevo } : x))); // optimista
    try {
      const res = await fetch(`/api/prendas/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLista((l) => l.map((x) => (x.id === p.id ? data : x)));
    } catch {
      setLista((l) => l.map((x) => (x.id === p.id ? { ...x, activo: p.activo } : x)));
      setAviso('No se pudo cambiar el estado. Intenta de nuevo.');
      setTimeout(() => setAviso(''), 3500);
    }
  }

  async function borrar(p: Prenda) {
    if (!window.confirm(`¿Eliminar "${p.nombre}" (${p.codigo})? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/prendas/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLista((l) => l.filter((x) => x.id !== p.id));
    } catch {
      setAviso('No se pudo eliminar la prenda.');
      setTimeout(() => setAviso(''), 3500);
    }
  }

  return (
    <main className="d-cont simple">
      <style>{`
        .pr-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 4px 0 18px; }
        .pr-bus { flex: 1; min-width: 200px; padding: 10px 16px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 14px; }
        .pr-fil { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; background: #fff; }
        .pr-fil button { font: inherit; font-size: 13px; padding: 9px 16px; border: 0; background: transparent; cursor: pointer; color: inherit; }
        .pr-fil button[aria-pressed="true"] { background: ${VERDE}; color: #fff; }
        .pr-aviso { background: #e6f4ea; color: #1e6b34; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }

        .pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .pr-card { background: #faf8f2; border: 1px solid #e6e2d6; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.05); display: flex; flex-direction: column; transition: .2s; }
        .pr-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0,0,0,.09); }
        .pr-foto { position: relative; aspect-ratio: 4 / 4.3; background: linear-gradient(135deg, #0d3a26, #14543a); display: grid; place-items: center; color: ${ORO}; }
        .pr-foto img { width: 100%; height: 100%; object-fit: cover; transition: .3s; }
        .pr-card.off .pr-foto img { filter: grayscale(.85); opacity: .55; }
        .pr-card.off .pr-foto::after { content: ""; position: absolute; inset: 0; background: rgba(250,248,242,.25); }
        .pr-q { position: absolute; top: 12px; left: 12px; background: ${ORO}; color: #1c1c1c; font-weight: 700; font-size: 12px; padding: 5px 11px; border-radius: 99px; z-index: 2; }
        .pr-est { position: absolute; top: 12px; right: 12px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 99px; background: #fff; z-index: 2; }
        .pr-est.on { color: #1e6b34; } .pr-est.off { color: #a8741a; }
        .pr-cuerpo { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .pr-cod { font-size: 11px; letter-spacing: .14em; color: ${ORO}; font-weight: 600; }
        .pr-nom { margin: 0; font-size: 18px; line-height: 1.25; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; }
        .pr-cat { font-size: 12px; color: #7a857e; }
        .pr-spec { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .pr-spec div { background: #fff; border: 1px solid #ece8dd; border-radius: 12px; padding: 8px 6px; text-align: center; }
        .pr-spec small { display: block; font-size: 10px; color: #8a978f; text-transform: uppercase; letter-spacing: .08em; }
        .pr-spec b { font-size: 13px; }
        .pr-precio { font-size: 22px; font-weight: 700; color: ${VERDE}; }
        .pr-pie { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #ece8dd; padding-top: 12px; margin-top: auto; }
        .pr-fecha { font-size: 11px; color: #8a978f; }
        .pr-acc { display: flex; align-items: center; gap: 10px; }
        .pr-tog { width: 46px; height: 26px; border-radius: 99px; border: 0; background: #cfcfc6; position: relative; cursor: pointer; transition: .2s; padding: 0; }
        .pr-tog::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
        .pr-tog[aria-checked="true"] { background: ${VERDE}; }
        .pr-tog[aria-checked="true"]::after { left: 23px; }
        .pr-del { border: 0; background: transparent; cursor: pointer; color: #b04a3f; font-size: 12px; padding: 4px; }
        .pr-vacio { text-align: center; padding: 60px 20px; color: #7a857e; background: #faf8f2; border: 1px dashed #d8d3c4; border-radius: 20px; }

        .pr-modal { position: fixed; inset: 0; background: rgba(10,20,15,.55); display: grid; place-items: center; z-index: 100; padding: 16px; }
        .pr-hoja { background: #fff; border-radius: 22px; width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; padding: 26px; }
        .pr-hoja h2 { margin: 0 0 4px; font-size: 24px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; }
        .pr-sub { font-size: 13px; color: #7a857e; margin: 0 0 18px; }
        .pr-fotos { display: flex; gap: 16px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
        .pr-prev { width: 110px; height: 120px; border-radius: 16px; overflow: hidden; border: 1px dashed rgba(128,128,128,.5); background: #f3f1ea; display: grid; place-items: center; font-size: 12px; color: #999; flex-shrink: 0; }
        .pr-prev img { width: 100%; height: 100%; object-fit: cover; }
        .pr-f { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pr-f label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #44514a; }
        .pr-f input, .pr-f select, .pr-f textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; }
        .pr-f .full { grid-column: 1 / -1; }
        .pr-est-box { margin-top: 16px; background: #eef4ef; border-radius: 14px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
        .pr-est-box small { color: #5a6b62; font-size: 12px; } .pr-est-box b { font-size: 22px; color: ${VERDE}; }
        .pr-err { color: #a12622; font-size: 13px; margin-top: 12px; }
        .pr-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
        .pr-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }
        .pr-sp { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: prgiro .7s linear infinite; vertical-align: -2px; margin-right: 6px; }
        @keyframes prgiro { to { transform: rotate(360deg); } }
        @media (max-width: 560px) { .pr-f { grid-template-columns: 1fr; } }
      `}</style>

      <div className="d-cab">
        <div>
          <h1>Prendas</h1>
          <p>Catálogo de piezas en oro certificado. {nActivas} publicada{nActivas === 1 ? '' : 's'} de {lista.length}.</p>
        </div>
        <button type="button" className="d-btn" onClick={abrir}>NUEVA PRENDA</button>
      </div>

      {aviso && <div className="pr-aviso" role="status">{aviso}</div>}

      <div className="pr-bar">
        <input className="pr-bus" placeholder="Buscar por nombre, código o categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pr-fil" role="group" aria-label="Filtrar">
          <button type="button" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</button>
          <button type="button" aria-pressed={filtro === 'activas'} onClick={() => setFiltro('activas')}>Publicadas</button>
          <button type="button" aria-pressed={filtro === 'borrador'} onClick={() => setFiltro('borrador')}>Inhabilitadas</button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="pr-vacio">
          {lista.length === 0 ? 'Aún no has creado prendas. Pulsa NUEVA PRENDA para empezar.' : 'No hay prendas con ese filtro.'}
        </div>
      ) : (
        <div className="pr-grid">
          {visibles.map((p) => {
            const on = p.activo === 'true';
            return (
              <article key={p.id} className={`pr-card ${on ? '' : 'off'}`}>
                <div className="pr-foto">
                  <span className="pr-q">{p.quilate}K</span>
                  <span className={`pr-est ${on ? 'on' : 'off'}`}>{on ? '● Publicada' : '● Inhabilitada'}</span>
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt={p.nombre} />
                  ) : (
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" />
                    </svg>
                  )}
                </div>
                <div className="pr-cuerpo">
                  <span className="pr-cod">{p.codigo}</span>
                  <h3 className="pr-nom">{p.nombre}</h3>
                  <span className="pr-cat">{p.categoria}{p.descripcion ? ` · ${p.descripcion.slice(0, 60)}${p.descripcion.length > 60 ? '…' : ''}` : ''}</span>
                  <div className="pr-spec">
                    <div><small>Peso</small><b>{p.peso} g</b></div>
                    <div><small>Tamaño</small><b>{p.tamano || '—'}</b></div>
                    <div><small>Stock</small><b>{p.stock}</b></div>
                  </div>
                  <div className="pr-precio">{cop(p.precio)}</div>
                  <div className="pr-pie">
                    <span className="pr-fecha">Creada {fecha(p.creado)}</span>
                    <div className="pr-acc">
                      <button type="button" className="pr-del" onClick={() => borrar(p)} aria-label={`Eliminar ${p.nombre}`}>Eliminar</button>
                      <button
                        type="button" role="switch" aria-checked={on} className="pr-tog"
                        onClick={() => alternar(p)} aria-label={on ? 'Inhabilitar prenda' : 'Publicar prenda'}
                        title={on ? 'Publicada: clic para inhabilitar' : 'Inhabilitada: clic para publicar'}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {abierto && (
        <div className="pr-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="pr-hoja" role="dialog" aria-modal="true" aria-label="Nueva prenda">
            <h2>Nueva prenda</h2>
            <p className="pr-sub">Se crea inhabilitada. Tú decides cuándo publicarla con el interruptor de la tarjeta.</p>

            <div className="pr-fotos">
              <div className="pr-prev">
                {form.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.foto_url} alt="Vista previa" />
                ) : 'Sin foto'}
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Foto de la pieza</strong>
                <span style={{ fontSize: 12, color: '#7a857e', display: 'block', marginBottom: 10 }}>PNG, JPG o WEBP · máximo 4 MB</span>
                <label className="pr-b2" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  {subiendo && <span className="pr-sp" aria-hidden />}
                  {subiendo ? 'Subiendo…' : form.foto_url ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={subirFoto} disabled={subiendo} />
                </label>
              </div>
            </div>

            <div className="pr-f">
              <div className="full"><label htmlFor="pn">Nombre</label><input id="pn" value={form.nombre} onChange={set('nombre')} placeholder="Ej.: Anillo solitario en oro 18K" /></div>
              <div><label htmlFor="pc">Categoría</label>
                <select id="pc" value={form.categoria} onChange={set('categoria')}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="pq">Quilate</label>
                <select id="pq" value={form.quilate} onChange={set('quilate')}>{QUILATES.map((c) => <option key={c} value={c}>{c}K</option>)}</select></div>
              <div><label htmlFor="pp">Peso (gramos)</label><input id="pp" inputMode="decimal" value={form.peso} onChange={set('peso')} placeholder="Ej.: 4.5" /></div>
              <div><label htmlFor="pt">Tamaño</label><input id="pt" value={form.tamano} onChange={set('tamano')} placeholder="Ej.: Talla 7, 45 cm, 18 mm" /></div>
              <div><label htmlFor="ps">Stock</label><input id="ps" inputMode="numeric" value={form.stock} onChange={set('stock')} /></div>
              <div><label htmlFor="pm">Precio manual (opcional)</label><input id="pm" inputMode="numeric" value={form.precio_manual} onChange={set('precio_manual')} placeholder="Déjalo vacío para calcular" /></div>
              <div className="full"><label htmlFor="pd">Descripción</label><textarea id="pd" rows={3} value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles, acabado, piedras…" /></div>
            </div>

            <div className="pr-est-box">
              <div>
                <small>Precio estimado</small><br />
                <small>{form.precio_manual ? 'Precio manual' : `peso × oro ${form.quilate}K${precios.margen ? ` + ${precios.margen}% margen` : ''}`}</small>
              </div>
              <b>{cop(estimado)}</b>
            </div>

            {error && <p className="pr-err" role="alert">{error}</p>}

            <div className="pr-btns">
              <button type="button" className="pr-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={crear} disabled={guardando || subiendo}>
                {guardando ? 'GUARDANDO…' : 'CREAR PRENDA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}