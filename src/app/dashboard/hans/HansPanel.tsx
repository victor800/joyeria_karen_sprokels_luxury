// 📁 RUTA: src/app/dashboard/hans/HansPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

const LOGO_HANS = '/hans.jpeg';

type Tipo = 'menudeo' | 'mayorista' | 'ambos' | 'tejida';
type Oro = '' | '18k' | '24k';
type Item = {
  id: string; codigo: string; nombre: string; categoria: string; tipo: Tipo; material: string;
  precio_menudeo: string; precio_mayorista: string; min_mayorista: string; stock: string;
  descripcion: string; foto_url: string; video_url: string; activo: string; creado: string;
  // Oro (opcionales; el backend debe aceptarlos)
  oro?: Oro; gramos?: string; mano_obra?: string; mano_obra_mayor?: string;
};
type Config = { oro18: number; oro24: number; actualizado: string };

const TIPOS: { v: Tipo; t: string }[] = [
  { v: 'menudeo', t: 'Menudeo' },
  { v: 'mayorista', t: 'Al por mayor' },
  { v: 'ambos', t: 'Mayor y menudeo' },
  { v: 'tejida', t: 'Pulsera tejida (elaboración)' },
];
const CATS_BASE = ['Pulseras tejidas', 'Anillos', 'Collares', 'Aretes', 'Cadenas', 'Dijes'];
const SEP = '|';
const MAX_FOTOS = 6;
const MAX_VIDEO_MB = 50;
const VERDE = '#0b4a2e';
const FACTOR_18K = 0.75; // 18k = 75% de oro puro

const FORM_VACIO = {
  nombre: '', categoria: '', tipo: 'ambos' as Tipo, material: '', precio_menudeo: '', precio_mayorista: '',
  min_mayorista: '', stock: '1', descripcion: '', foto_url: '', video_url: '',
  oro: '' as Oro, gramos: '', mano_obra: '', mano_obra_mayor: '',
};

const parseFotos = (v: string) => (v || '').split(SEP).map((x) => x.trim()).filter(Boolean);
const num = (s?: string) => Number(String(s || '').replace(/\D/g, '')) || 0;
const gr = (s?: string) => Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const copN = (n: number) => (n > 0 ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const cop = (s: string) => copN(num(s));
const tipoTxt = (t: string) => TIPOS.find((x) => x.v === t)?.t ?? t;

/** Precio por gramo según quilataje */
const precioGramo = (oro: string | undefined, c: Config) => (oro === '18k' ? c.oro18 : oro === '24k' ? c.oro24 : 0);

/** Precio final de una prenda. Si lleva oro y hay precio configurado, se calcula; si no, el manual. */
function precioItem(
  x: { oro?: string; gramos?: string; mano_obra?: string; mano_obra_mayor?: string; precio_menudeo: string; precio_mayorista: string },
  cual: 'menudeo' | 'mayorista',
  c: Config,
): { valor: number; auto: boolean } {
  const pg = precioGramo(x.oro, c);
  const g = gr(x.gramos);
  if (x.oro && pg > 0 && g > 0) {
    const mo = num(cual === 'menudeo' ? x.mano_obra : x.mano_obra_mayor);
    const bruto = g * pg + mo;
    return { valor: Math.round(bruto / 100) * 100, auto: true };
  }
  return { valor: num(cual === 'menudeo' ? x.precio_menudeo : x.precio_mayorista), auto: false };
}

export default function HansPanel() {
  const [tab, setTab] = useState<'catalogo' | 'config'>('catalogo');
  const [lista, setLista] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>(CATS_BASE);
  const [cfg, setCfg] = useState<Config>({ oro18: 0, oro24: 0, actualizado: '' });
  const [cfgForm, setCfgForm] = useState({ oro18: '', oro24: '' });
  const [guardandoCfg, setGuardandoCfg] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errCarga, setErrCarga] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [nuevaCat, setNuevaCat] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subFoto, setSubFoto] = useState(false);
  const [subVideo, setSubVideo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [borrar, setBorrar] = useState<Item | null>(null);

  const avisar = (t: string, ms = 3500) => { setAviso(t); setTimeout(() => setAviso(''), ms); };

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch('/api/hans', { cache: 'no-store' }),
          fetch('/api/hans/categorias', { cache: 'no-store' }),
          fetch('/api/hans/config', { cache: 'no-store' }),
        ]);
        if (!a.ok) throw new Error();
        const d = await a.json();
        setLista(Array.isArray(d.items) ? d.items : []);
        if (b.ok) {
          const cc = await b.json();
          if (Array.isArray(cc.categorias) && cc.categorias.length) setCats(cc.categorias);
        }
        if (c.ok) {
          const k = await c.json();
          const n: Config = { oro18: num(String(k.oro18)), oro24: num(String(k.oro24)), actualizado: k.actualizado || '' };
          setCfg(n);
          setCfgForm({ oro18: n.oro18 ? String(n.oro18) : '', oro24: n.oro24 ? String(n.oro24) : '' });
        }
      } catch {
        setErrCarga('No se pudo cargar Joyería Hans (el backend se crea en el Paso 2).');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!abierto && !borrar) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (borrar) setBorrar(null); else setAbierto(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, borrar]);

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const presentes = useMemo(() => Array.from(new Set([...cats, ...lista.map((x) => x.categoria).filter(Boolean)])), [cats, lista]);
  const visibles = lista.filter((x) => {
    if (cat === '__revisar') { if (x.activo === 'true') return false; }
    else if (cat !== 'todas' && x.categoria !== cat) return false;
    return !q || `${x.nombre} ${x.codigo} ${x.categoria}`.toLowerCase().includes(q.toLowerCase());
  });
  const nActivos = lista.filter((x) => x.activo === 'true').length;
  const nRevisar = lista.length - nActivos;
  const nOro = lista.filter((x) => x.oro).length;

  function abrir(categoria?: string) {
    setEditId(null);
    setForm({ ...FORM_VACIO, categoria: categoria || presentes[0] || '' });
    setError('');
    setAbierto(true);
  }
  function abrirEditar(x: Item) {
    setEditId(x.id);
    setForm({
      nombre: x.nombre, categoria: x.categoria, tipo: x.tipo || 'ambos', material: x.material || '',
      precio_menudeo: x.precio_menudeo || '', precio_mayorista: x.precio_mayorista || '', min_mayorista: x.min_mayorista || '',
      stock: x.stock || '1', descripcion: x.descripcion || '', foto_url: x.foto_url || '', video_url: x.video_url || '',
      oro: (x.oro as Oro) || '', gramos: x.gramos || '', mano_obra: x.mano_obra || '', mano_obra_mayor: x.mano_obra_mayor || '',
    });
    setError('');
    setAbierto(true);
  }

  async function crearCategoria() {
    const nombre = nuevaCat.trim();
    if (!nombre) return;
    if (presentes.some((c) => c.toLowerCase() === nombre.toLowerCase())) {
      setForm((f) => ({ ...f, categoria: presentes.find((c) => c.toLowerCase() === nombre.toLowerCase())! }));
      setNuevaCat('');
      return;
    }
    try {
      const res = await fetch('/api/hans/categorias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo crear la categoría');
      setCats(Array.isArray(d.categorias) ? d.categorias : [...cats, nombre]);
      setForm((f) => ({ ...f, categoria: nombre }));
      setNuevaCat('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la categoría');
    }
  }

  async function subirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const libres = MAX_FOTOS - parseFotos(form.foto_url).length;
    const lote = files.slice(0, Math.max(libres, 0));
    setSubFoto(true);
    setError(files.length > lote.length ? `Máximo ${MAX_FOTOS} fotos` : '');
    const nuevas: string[] = [];
    try {
      for (const file of lote) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Usa imágenes PNG, JPG o WEBP');
        if (file.size > 4 * 1024 * 1024) throw new Error(`"${file.name}" pesa más de 4 MB`);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/hans/foto', { method: 'POST', body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'No se pudo subir la foto');
        nuevas.push(d.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      if (nuevas.length) setForm((f) => ({ ...f, foto_url: [...parseFotos(f.foto_url), ...nuevas].join(SEP) }));
      setSubFoto(false);
    }
  }

  async function subirVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return setError('Usa un video MP4, WEBM o MOV');
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return setError(`El video pesa más de ${MAX_VIDEO_MB} MB`);
    setSubVideo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/hans/video', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo subir el video');
      setForm((f) => ({ ...f, video_url: d.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el video');
    } finally {
      setSubVideo(false);
    }
  }

  async function guardar() {
    setError('');
    if (!form.nombre.trim()) return setError('Ponle un nombre al artículo');
    if (!form.categoria.trim()) return setError('Elige o crea una categoría');
    if (form.oro && !gr(form.gramos)) return setError('Indica los gramos de oro de la prenda');
    setGuardando(true);
    try {
      const editando = editId !== null;
      const payload: Record<string, string> = { ...form };
      // Guardamos el precio calculado como "foto" para que la tienda pública lo lea directo.
      if (form.oro) {
        const m = precioItem(form, 'menudeo', cfg);
        const w = precioItem(form, 'mayorista', cfg);
        if (m.auto) payload.precio_menudeo = String(m.valor);
        if (w.auto) payload.precio_mayorista = String(w.valor);
      }
      // Todo artículo nuevo nace INHABILITADO: el admin lo revisa y lo enciende.
      if (!editando) payload.activo = 'false';

      const res = await fetch(editando ? `/api/hans/${editId}` : '/api/hans', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar');

      if (editando) {
        setLista((l) => l.map((x) => (x.id === editId ? d : x)));
        avisar('Cambios guardados.');
      } else {
        // Garantía: si el backend lo creó publicado, lo apagamos.
        if (d.activo !== 'false') {
          try {
            const r2 = await fetch(`/api/hans/${d.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: 'false' }),
            });
            if (r2.ok) d = await r2.json(); else d = { ...d, activo: 'false' };
          } catch { d = { ...d, activo: 'false' }; }
        }
        setLista((l) => [d, ...l]);
        avisar('Artículo creado en revisión (inhabilitado). Revísalo y enciende el interruptor para publicarlo.', 5000);
      }
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(x: Item) {
    const nuevo = x.activo === 'true' ? 'false' : 'true';
    setLista((l) => l.map((y) => (y.id === x.id ? { ...y, activo: nuevo } : y)));
    try {
      const res = await fetch(`/api/hans/${x.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: nuevo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      setLista((l) => l.map((y) => (y.id === x.id ? d : y)));
    } catch {
      setLista((l) => l.map((y) => (y.id === x.id ? { ...y, activo: x.activo } : y)));
      avisar('No se pudo cambiar el estado.');
    }
  }

  async function eliminar(x: Item) {
    try {
      const res = await fetch(`/api/hans/${x.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLista((l) => l.filter((y) => y.id !== x.id));
      avisar(`"${x.nombre}" eliminado.`);
    } catch {
      avisar('No se pudo eliminar.');
    } finally {
      setBorrar(null);
    }
  }

  /* ---------- Configuración: precio del oro ---------- */
  const calc18desde24 = () => {
    const v24 = num(cfgForm.oro24);
    if (!v24) return avisar('Primero escribe el precio del oro 24k.');
    setCfgForm((f) => ({ ...f, oro18: String(Math.round((v24 * FACTOR_18K) / 100) * 100) }));
  };

  async function guardarConfig() {
    const nuevo: Config = { oro18: num(cfgForm.oro18), oro24: num(cfgForm.oro24), actualizado: new Date().toISOString() };
    if (!nuevo.oro18 && !nuevo.oro24) return avisar('Escribe al menos un precio de oro por gramo.');
    setGuardandoCfg(true);
    try {
      const res = await fetch('/api/hans/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oro18: nuevo.oro18, oro24: nuevo.oro24 }),
      });
      if (!res.ok) throw new Error();
      setCfg(nuevo);

      // Recalcula y aplica a todas las prendas de oro
      const afectadas = lista.filter((x) => x.oro && gr(x.gramos) > 0 && precioGramo(x.oro, nuevo) > 0);
      let fallos = 0;
      const resultados = await Promise.all(
        afectadas.map(async (x) => {
          const m = precioItem(x, 'menudeo', nuevo).valor;
          const w = precioItem(x, 'mayorista', nuevo).valor;
          try {
            const r = await fetch(`/api/hans/${x.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ precio_menudeo: String(m), precio_mayorista: String(w) }),
            });
            if (!r.ok) throw new Error();
            return await r.json();
          } catch { fallos++; return null; }
        }),
      );
      const mapa = new Map<string, Item>();
      resultados.forEach((r) => { if (r?.id) mapa.set(r.id, r); });
      setLista((l) => l.map((x) => mapa.get(x.id) ?? x));
      avisar(
        fallos
          ? `Precio guardado. ${afectadas.length - fallos} prendas actualizadas, ${fallos} fallaron: reintenta.`
          : `Precio del oro guardado. ${afectadas.length} prenda${afectadas.length === 1 ? '' : 's'} actualizada${afectadas.length === 1 ? '' : 's'}.`,
        5000,
      );
    } catch {
      avisar('No se pudo guardar la configuración.');
    } finally {
      setGuardandoCfg(false);
    }
  }

  const fotosForm = parseFotos(form.foto_url);
  const verMayor = form.tipo === 'mayorista' || form.tipo === 'ambos';
  const verMenudeo = form.tipo !== 'mayorista';
  const prevM = precioItem(form, 'menudeo', cfg);
  const prevW = precioItem(form, 'mayorista', cfg);
  const sinPrecioOro = !!form.oro && precioGramo(form.oro, cfg) === 0;

  return (
    <main className="d-cont simple">
      <style>{`
        .hn-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; padding: 22px 28px; border-radius: 26px; background: radial-gradient(120% 140% at 0% 0%, #12503a 0%, #0b2d1f 55%, #07211a 100%); border: 1px solid rgba(216,185,95,.45); box-shadow: 0 10px 30px rgba(7,33,26,.25); }
        .hn-marca { display: flex; align-items: center; gap: 28px; min-width: 0; }
        .hn-logo { width: 170px; height: 170px; flex-shrink: 0; border-radius: 28px; overflow: hidden; background: #fff; border: 3px solid #d8b95f; box-shadow: 0 8px 24px rgba(0,0,0,.35), 0 0 0 6px rgba(216,185,95,.15); display: grid; place-items: center; padding: 6px; box-sizing: border-box; }
        .hn-logo img { width: 100%; height: 100%; object-fit: contain; }
        .hn-marca h1 { margin: 0; font-size: 38px; line-height: 1.1; font-weight: 500; color: #f6e7b4; letter-spacing: .01em; }
        .hn-marca p { margin: 8px 0 0; font-size: 14px; color: rgba(243,234,210,.78); }
        .hn-hero .d-btn { background: #f0c14b; color: #1b1608; }
        .hn-tabs { display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid #ece7d6; }
        .hn-tabs button { font: inherit; font-size: 14px; font-weight: 600; padding: 10px 20px; border: 0; background: transparent; cursor: pointer; color: #7a857e; border-bottom: 3px solid transparent; margin-bottom: -1px; }
        .hn-tabs button[aria-selected="true"] { color: #0b2d1f; border-bottom-color: #d8b95f; }
        .hn-aviso { background: #e6f4ea; color: #1e6b34; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; margin-bottom: 12px; }
        .hn-errc { background: #fdecea; color: #a12622; padding: 9px 13px; border-radius: 10px; font-size: 12.5px; margin-bottom: 12px; }
        .hn-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 4px 0 16px; }
        .hn-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 14px; padding: 10px 14px; }
        .hn-stats span { display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
        .hn-stats b { display: block; margin-top: 4px; font-size: 21px; font-weight: 500; color: #0b2d1f; }
        .hn-stats .rev b { color: #b7791f; }
        .hn-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
        .hn-bus { flex: 1 1 260px; max-width: 420px; padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .hn-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .hn-chips button { font: inherit; font-size: 12px; padding: 6px 13px; border-radius: 99px; border: 1px solid rgba(176,141,60,.4); background: #fff; cursor: pointer; }
        .hn-chips button[aria-pressed="true"] { background: #0b2d1f; border-color: #0b2d1f; color: #f3ead2; }
        .hn-chips button.rev { border-color: #e0a526; color: #8a5a00; background: #fff8e6; }
        .hn-chips button.rev[aria-pressed="true"] { background: #e0a526; color: #1b1608; border-color: #e0a526; }
        .hn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .hn-card { border-radius: 16px; overflow: hidden; background: #0e1a15; color: #f1ede0; border: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; }
        .hn-card.off { opacity: .8; border-color: rgba(240,193,75,.45); }
        .hn-foto { position: relative; aspect-ratio: 4 / 3; background: #07241a; display: grid; place-items: center; color: #b08d3c; }
        .hn-foto img { width: 100%; height: 100%; object-fit: cover; }
        .hn-cnt { position: absolute; top: 8px; left: 8px; font-size: 11px; padding: 3px 9px; border-radius: 99px; background: rgba(6,16,11,.65); color: #f3ead2; }
        .hn-tipo { position: absolute; top: 8px; right: 8px; font-size: 10.5px; padding: 3px 9px; border-radius: 99px; background: #f0c14b; color: #1b1608; font-weight: 600; }
        .hn-rev { position: absolute; bottom: 8px; left: 8px; font-size: 10.5px; padding: 3px 10px; border-radius: 99px; background: #e0a526; color: #1b1608; font-weight: 700; letter-spacing: .04em; }
        .hn-oro { position: absolute; bottom: 8px; right: 8px; font-size: 10.5px; padding: 3px 10px; border-radius: 99px; background: rgba(6,16,11,.75); color: #f0c14b; border: 1px solid rgba(240,193,75,.5); font-weight: 600; }
        .hn-info { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .hn-info small { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; }
        .hn-info h3 { margin: 0; font-size: 18px; font-weight: 500; color: #fff; }
        .hn-info p { margin: 0; font-size: 12px; line-height: 1.5; color: #b4bdb7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .hn-pre { display: flex; gap: 14px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.08); }
        .hn-pre span { display: block; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #93a09a; font-weight: 600; }
        .hn-pre b { font-size: 16px; font-weight: 500; color: #f0c14b; }
        .hn-pre em { font-style: normal; font-size: 10.5px; color: #93a09a; display: block; }
        .hn-video { width: 100%; border-radius: 10px; background: #000; max-height: 180px; }
        .hn-acc { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); }
        .hn-sw { display: inline-flex; align-items: center; gap: 8px; margin-right: auto; font-size: 11.5px; color: #b4bdb7; }
        .hn-tog { position: relative; width: 34px; height: 20px; padding: 0; border-radius: 99px; cursor: pointer; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); }
        .hn-tog::after { content: ""; position: absolute; top: 2px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #cfd6d1; transition: .2s; }
        .hn-tog[aria-checked="true"] { background: #f0c14b; border-color: #f0c14b; }
        .hn-tog[aria-checked="true"]::after { left: 15px; background: #14201a; }
        .hn-b { height: 34px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; border: 0; background: #f0c14b; color: #1b1608; }
        .hn-b.x { width: 34px; padding: 0; background: rgba(255,255,255,.06); color: #c9d1cc; border: 1px solid rgba(255,255,255,.12); }
        .hn-b.x:hover { background: #b04a3f; color: #fff; }
        .hn-vacio { text-align: center; padding: 60px 20px; color: #7a857e; background: #faf8f2; border: 1px dashed #d8d3c4; border-radius: 20px; }
        .hn-modal { position: fixed; inset: 0; background: rgba(10,20,15,.55); display: grid; place-items: center; z-index: 100; padding: 16px; }
        .hn-hoja { background: #fff; border-radius: 22px; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto; padding: 26px; }
        .hn-hoja h2 { margin: 0 0 4px; font-size: 24px; font-weight: 500; }
        .hn-sub { font-size: 13px; color: #7a857e; margin: 0 0 18px; }
        .hn-f { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .hn-f label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; color: #44514a; }
        .hn-f input, .hn-f select, .hn-f textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; box-sizing: border-box; }
        .hn-f .full { grid-column: 1 / -1; }
        .hn-nc { display: flex; gap: 8px; }
        .hn-nc button { flex-shrink: 0; padding: 0 14px; border-radius: 10px; border: 1px solid #b08d3c; background: #fffdf8; color: #7a6a30; cursor: pointer; font: inherit; font-size: 12.5px; }
        .hn-sec { margin: 6px 0 14px; padding: 14px; border-radius: 14px; background: #faf8f2; border: 1px solid #ece7d6; }
        .hn-sec strong { display: block; font-size: 13px; margin-bottom: 4px; }
        .hn-sec > span { display: block; font-size: 12px; color: #7a857e; margin-bottom: 10px; }
        .hn-sec.oro { background: #fffaf0; border-color: #ecd9a3; }
        .hn-calc { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: #0b2d1f; color: #f6e7b4; font-size: 13px; display: flex; gap: 18px; flex-wrap: wrap; }
        .hn-calc b { color: #f0c14b; font-weight: 600; }
        .hn-warn { margin-top: 10px; font-size: 12.5px; color: #8a5a00; background: #fff3d6; padding: 8px 12px; border-radius: 10px; }
        .hn-ths { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; }
        .hn-th { position: relative; aspect-ratio: 4 / 5; border-radius: 12px; overflow: hidden; background: #0e3b27; border: 1px solid rgba(128,128,128,.35); }
        .hn-th img { width: 100%; height: 100%; object-fit: cover; }
        .hn-th button { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: rgba(6,24,17,.75); color: #fff; cursor: pointer; padding: 0; line-height: 1; }
        .hn-th.add { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; background: #fff; border: 1px dashed #c9bd94; color: #7a6a30; cursor: pointer; padding: 6px; }
        .hn-vid { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .hn-vid video { width: 100%; max-height: 220px; border-radius: 12px; background: #000; }
        .hn-vid .add { padding: 10px 16px; border-radius: 10px; border: 1px dashed #c9bd94; background: #fff; color: #7a6a30; cursor: pointer; font-size: 13px; }
        .hn-vid .rm { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(176,74,63,.5); background: #fff; color: #b04a3f; cursor: pointer; font: inherit; font-size: 12.5px; }
        .hn-url { font-size: 11.5px; color: #5a6b62; word-break: break-all; }
        .hn-err { color: #a12622; font-size: 13px; margin: 8px 0 0; }
        .hn-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
        .hn-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }
        .hn-dlg { width: 100%; max-width: 360px; text-align: center; padding: 28px 24px 22px; border-radius: 22px; color: #f3ead2; background: linear-gradient(180deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.4); }
        .hn-dlg h3 { margin: 0 0 8px; font-weight: 500; font-size: 21px; }
        .hn-dlg p { margin: 0 0 20px; font-size: 13.5px; color: rgba(243,234,210,.8); }
        .hn-dlg .b { display: flex; gap: 10px; }
        .hn-dlg .b button { flex: 1; font: inherit; font-size: 13px; padding: 11px; border-radius: 99px; cursor: pointer; }
        .hn-no { border: 1px solid rgba(216,185,95,.5); background: transparent; color: #ecd07a; }
        .hn-si { border: 0; font-weight: 600; color: #fff; background: linear-gradient(135deg, #c65a4d, #a23c32); }
        /* Configuración */
        .hn-cfg { max-width: 760px; }
        .hn-cfgc { background: #fff; border: 1px solid #ece7d6; border-radius: 20px; padding: 24px; margin-bottom: 16px; }
        .hn-cfgc h2 { margin: 0 0 4px; font-size: 22px; font-weight: 500; color: #0b2d1f; }
        .hn-cfgc > p { margin: 0 0 18px; font-size: 13px; color: #7a857e; line-height: 1.5; }
        .hn-ro { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hn-ro label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #44514a; letter-spacing: .04em; }
        .hn-ro .in { display: flex; align-items: center; border: 1px solid #d8b95f; border-radius: 12px; background: #fffdf8; overflow: hidden; }
        .hn-ro .in span { padding: 0 10px 0 14px; color: #7a6a30; font-weight: 600; }
        .hn-ro .in input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 20px; padding: 12px 8px; }
        .hn-ro .in em { font-style: normal; padding: 0 14px; font-size: 12px; color: #8a978f; }
        .hn-cfgb { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; align-items: center; }
        .hn-cfgb .d-btn { background: ${VERDE}; }
        .hn-nota { font-size: 12px; color: #7a857e; margin-top: 12px; line-height: 1.55; }
        @media (max-width: 640px) {
          .hn-f, .hn-ro { grid-template-columns: 1fr; }
          .hn-hero { padding: 18px; }
          .hn-marca { gap: 16px; }
          .hn-logo { width: 110px; height: 110px; border-radius: 22px; }
          .hn-marca h1 { font-size: 26px; }
        }
      `}</style>

      <div className="hn-hero">
        <div className="hn-marca">
          <span className="hn-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_HANS} alt="Joyería Hans" />
          </span>
          <div>
            <h1>Joyería Hans</h1>
            <p>Venta al por mayor y menudeo · pulseras tejidas.<br />{nActivos} publicado{nActivos === 1 ? '' : 's'} de {lista.length}.</p>
          </div>
        </div>
        {tab === 'catalogo' && <button type="button" className="d-btn" onClick={() => abrir()}>NUEVO ARTÍCULO</button>}
      </div>

      <div className="hn-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'catalogo'} onClick={() => setTab('catalogo')}>Catálogo</button>
        <button type="button" role="tab" aria-selected={tab === 'config'} onClick={() => setTab('config')}>⚙ Configuración</button>
      </div>

      {aviso && <div className="hn-aviso" role="status">{aviso}</div>}
      {errCarga && <div className="hn-errc" role="alert">{errCarga}</div>}

      {tab === 'config' && (
        <div className="hn-cfg">
          <section className="hn-cfgc">
            <h2>Precio del oro</h2>
            <p>
              Escribe el precio por gramo. Al guardar, se recalculan automáticamente todas las prendas de Hans que tengan oro
              (gramos × precio del gramo + mano de obra) y se actualizan en el catálogo.
            </p>
            <div className="hn-ro">
              <div>
                <label htmlFor="o24">ORO 24 K</label>
                <div className="in">
                  <span>$</span>
                  <input id="o24" inputMode="numeric" value={cfgForm.oro24 ? num(cfgForm.oro24).toLocaleString('es-CO') : ''} onChange={(e) => setCfgForm((f) => ({ ...f, oro24: e.target.value.replace(/\D/g, '') }))} placeholder="0" />
                  <em>/ gramo</em>
                </div>
              </div>
              <div>
                <label htmlFor="o18">ORO 18 K</label>
                <div className="in">
                  <span>$</span>
                  <input id="o18" inputMode="numeric" value={cfgForm.oro18 ? num(cfgForm.oro18).toLocaleString('es-CO') : ''} onChange={(e) => setCfgForm((f) => ({ ...f, oro18: e.target.value.replace(/\D/g, '') }))} placeholder="0" />
                  <em>/ gramo</em>
                </div>
              </div>
            </div>
            <div className="hn-cfgb">
              <button type="button" className="d-btn" onClick={guardarConfig} disabled={guardandoCfg}>
                {guardandoCfg ? 'APLICANDO…' : 'GUARDAR Y APLICAR A TODAS LAS PRENDAS'}
              </button>
              <button type="button" className="hn-b2" onClick={calc18desde24}>Calcular 18k desde 24k (75 %)</button>
            </div>
            <p className="hn-nota">
              Vigente: 24k {copN(cfg.oro24)} · 18k {copN(cfg.oro18)}
              {cfg.actualizado ? ` · actualizado ${new Date(cfg.actualizado).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.
              <br />Hay {nOro} prenda{nOro === 1 ? '' : 's'} con oro. Las prendas sin oro conservan su precio manual. En cada prenda (Editar) eliges 18k o 24k, los gramos y la mano de obra.
            </p>
          </section>
        </div>
      )}

      {tab === 'catalogo' && (
        <>
          <div className="hn-stats">
            <div><span>Artículos</span><b>{lista.length}</b></div>
            <div><span>Publicados</span><b>{nActivos}</b></div>
            <div className="rev"><span>Por revisar</span><b>{nRevisar}</b></div>
            <div><span>Categorías</span><b>{presentes.length}</b></div>
            <div><span>Con video</span><b>{lista.filter((x) => x.video_url).length}</b></div>
          </div>

          <div className="hn-bar">
            <input className="hn-bus" placeholder="Buscar por nombre, código o categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="hn-chips" role="group" aria-label="Categorías">
            <button type="button" aria-pressed={cat === 'todas'} onClick={() => setCat('todas')}>Todas</button>
            <button type="button" className="rev" aria-pressed={cat === '__revisar'} onClick={() => setCat('__revisar')}>Por revisar ({nRevisar})</button>
            {presentes.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>

          {cargando ? (
            <div className="hn-vacio">Cargando…</div>
          ) : visibles.length === 0 ? (
            <div className="hn-vacio">{lista.length === 0 ? 'Aún no hay artículos. Pulsa NUEVO ARTÍCULO para empezar.' : 'No hay artículos con ese filtro.'}</div>
          ) : (
            <div className="hn-grid">
              {visibles.map((x) => {
                const fotos = parseFotos(x.foto_url);
                const on = x.activo === 'true';
                const pm = precioItem(x, 'menudeo', cfg);
                const pw = precioItem(x, 'mayorista', cfg);
                return (
                  <article key={x.id} className={`hn-card ${on ? '' : 'off'}`}>
                    <div className="hn-foto">
                      {fotos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fotos[0]} alt={x.nombre} />
                      ) : (
                        <span>Sin foto</span>
                      )}
                      {fotos.length > 1 && <span className="hn-cnt">{fotos.length} fotos</span>}
                      <span className="hn-tipo">{tipoTxt(x.tipo)}</span>
                      {!on && <span className="hn-rev">EN REVISIÓN</span>}
                      {x.oro && <span className="hn-oro">Oro {x.oro}{gr(x.gramos) ? ` · ${gr(x.gramos)} g` : ''}</span>}
                    </div>
                    <div className="hn-info">
                      <small>{x.categoria} · {x.codigo}</small>
                      <h3>{x.nombre}</h3>
                      <p>{x.descripcion || 'Sin descripción.'}</p>
                      {x.video_url && <video className="hn-video" src={x.video_url} controls preload="metadata" playsInline />}
                      <div className="hn-pre">
                        {x.tipo !== 'mayorista' && x.tipo !== 'tejida' && (
                          <div><span>Menudeo</span><b>{copN(pm.valor)}</b></div>
                        )}
                        {x.tipo === 'tejida' && <div><span>Precio</span><b>{copN(pm.valor)}</b></div>}
                        {(x.tipo === 'mayorista' || x.tipo === 'ambos') && (
                          <div>
                            <span>Mayorista</span><b>{copN(pw.valor)}</b>
                            {x.min_mayorista && <em>desde {x.min_mayorista} u.</em>}
                          </div>
                        )}
                        <div><span>Stock</span><b>{x.stock || 0}</b></div>
                      </div>
                      <div className="hn-acc">
                        <div className="hn-sw">
                          <button type="button" role="switch" aria-checked={on} className="hn-tog" onClick={() => alternar(x)} aria-label={on ? 'Inhabilitar' : 'Publicar'} />
                          <span>{on ? 'Publicado' : 'Inhabilitado'}</span>
                        </div>
                        <button type="button" className="hn-b" onClick={() => abrirEditar(x)}>Editar</button>
                        <button type="button" className="hn-b x" onClick={() => setBorrar(x)} aria-label={`Eliminar ${x.nombre}`}>✕</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {borrar && (
        <div className="hn-modal" onMouseDown={(e) => e.target === e.currentTarget && setBorrar(null)}>
          <div className="hn-dlg" role="alertdialog" aria-modal="true">
            <h3>¿Eliminar este artículo?</h3>
            <p><b>{borrar.nombre}</b><br />Esta acción no se puede deshacer.</p>
            <div className="b">
              <button type="button" className="hn-no" autoFocus onClick={() => setBorrar(null)}>Cancelar</button>
              <button type="button" className="hn-si" onClick={() => eliminar(borrar)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {abierto && (
        <div className="hn-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="hn-hoja" role="dialog" aria-modal="true" aria-label={editId ? 'Editar artículo' : 'Nuevo artículo'}>
            <h2>{editId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
            <p className="hn-sub">{editId ? 'Modifica los datos y guarda.' : 'Se crea inhabilitado (en revisión). Cuando lo revises y se vea bien, lo publicas con el interruptor de la tarjeta.'}</p>

            <div className="hn-f">
              <div className="full"><label htmlFor="hn-n">Nombre</label><input id="hn-n" value={form.nombre} onChange={set('nombre')} placeholder="Ej.: Pulsera tejida hilo encerado" /></div>
              <div>
                <label htmlFor="hn-c">Categoría</label>
                <select id="hn-c" value={form.categoria} onChange={set('categoria')}>
                  {!presentes.includes(form.categoria) && <option value={form.categoria}>{form.categoria || 'Selecciona…'}</option>}
                  {presentes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="hn-nc">Crear categoría nueva</label>
                <div className="hn-nc">
                  <input id="hn-nc" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearCategoria(); } }} placeholder="Ej.: Tobilleras" />
                  <button type="button" onClick={crearCategoria}>Crear</button>
                </div>
              </div>
              <div>
                <label htmlFor="hn-t">Tipo de venta</label>
                <select id="hn-t" value={form.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select>
              </div>
              <div><label htmlFor="hn-m">Material</label><input id="hn-m" value={form.material} onChange={set('material')} placeholder="Ej.: Acero, hilo encerado, plata" /></div>
            </div>

            <div className="hn-sec oro">
              <strong>Oro (precio automático)</strong>
              <span>Si la prenda es de oro, el precio se calcula con el precio del gramo de la pestaña Configuración.</span>
              <div className="hn-f" style={{ marginBottom: 0 }}>
                <div>
                  <label htmlFor="hn-o">Quilataje</label>
                  <select id="hn-o" value={form.oro} onChange={set('oro')}>
                    <option value="">Sin oro (precio manual)</option>
                    <option value="18k">Oro 18 k</option>
                    <option value="24k">Oro 24 k</option>
                  </select>
                </div>
                {form.oro && <div><label htmlFor="hn-g">Gramos de oro</label><input id="hn-g" inputMode="decimal" value={form.gramos} onChange={set('gramos')} placeholder="Ej.: 3.5" /></div>}
                {form.oro && verMenudeo && <div><label htmlFor="hn-mo">Mano de obra menudeo ($)</label><input id="hn-mo" inputMode="numeric" value={form.mano_obra} onChange={set('mano_obra')} placeholder="Ej.: 40000" /></div>}
                {form.oro && verMayor && <div><label htmlFor="hn-mw">Mano de obra mayorista ($)</label><input id="hn-mw" inputMode="numeric" value={form.mano_obra_mayor} onChange={set('mano_obra_mayor')} placeholder="Ej.: 25000" /></div>}
              </div>
              {sinPrecioOro && <div className="hn-warn">Aún no hay precio de oro {form.oro} configurado. Ve a ⚙ Configuración.</div>}
              {form.oro && !sinPrecioOro && prevM.auto && (
                <div className="hn-calc">
                  {verMenudeo && <div>Menudeo: <b>{copN(prevM.valor)}</b></div>}
                  {verMayor && <div>Mayorista: <b>{copN(prevW.valor)}</b></div>}
                </div>
              )}
            </div>

            <div className="hn-f">
              {!form.oro && verMenudeo && <div><label htmlFor="hn-pm">{form.tipo === 'tejida' ? 'Precio' : 'Precio menudeo'}</label><input id="hn-pm" inputMode="numeric" value={form.precio_menudeo} onChange={set('precio_menudeo')} placeholder="Ej.: 25000" /></div>}
              {!form.oro && verMayor && <div><label htmlFor="hn-pw">Precio mayorista (c/u)</label><input id="hn-pw" inputMode="numeric" value={form.precio_mayorista} onChange={set('precio_mayorista')} placeholder="Ej.: 15000" /></div>}
              {verMayor && <div><label htmlFor="hn-mm">Compra mínima mayorista (unidades)</label><input id="hn-mm" inputMode="numeric" value={form.min_mayorista} onChange={set('min_mayorista')} placeholder="Ej.: 12" /></div>}
              <div><label htmlFor="hn-s">Stock</label><input id="hn-s" inputMode="numeric" value={form.stock} onChange={set('stock')} /></div>
              <div className="full"><label htmlFor="hn-d">Descripción</label><textarea id="hn-d" rows={3} value={form.descripcion} onChange={set('descripcion')} placeholder="Colores, medidas, detalles…" /></div>
            </div>

            <div className="hn-sec">
              <strong>Fotos</strong>
              <span>{fotosForm.length}/{MAX_FOTOS} · PNG, JPG o WEBP · máx. 4 MB c/u · la primera es la portada</span>
              <div className="hn-ths">
                {fotosForm.map((u, k) => (
                  <div key={u + k} className="hn-th">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Foto ${k + 1}`} />
                    <button type="button" aria-label={`Quitar foto ${k + 1}`} onClick={() => setForm((f) => ({ ...f, foto_url: fotosForm.filter((_, j) => j !== k).join(SEP) }))}>×</button>
                  </div>
                ))}
                {fotosForm.length < MAX_FOTOS && (
                  <label className="hn-th add">
                    {subFoto ? 'Subiendo…' : '+ Agregar fotos'}
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={subirFotos} disabled={subFoto} />
                  </label>
                )}
              </div>
            </div>

            <div className="hn-sec">
              <strong>Video (opcional)</strong>
              <span>MP4, WEBM o MOV · máx. {MAX_VIDEO_MB} MB. Se guarda en la carpeta y se devuelve una URL corta para verlo.</span>
              <div className="hn-vid">
                {form.video_url && (
                  <>
                    <video src={form.video_url} controls preload="metadata" playsInline />
                    <div className="hn-url">{form.video_url}</div>
                    <button type="button" className="rm" onClick={() => setForm((f) => ({ ...f, video_url: '' }))}>Quitar video</button>
                  </>
                )}
                {!form.video_url && (
                  <label className="add">
                    {subVideo ? 'Subiendo video…' : '+ Subir video'}
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={subirVideo} disabled={subVideo} />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="hn-err" role="alert">{error}</p>}

            <div className="hn-btns">
              <button type="button" className="hn-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={guardar} disabled={guardando || subFoto || subVideo} style={{ background: VERDE }}>
                {guardando ? 'GUARDANDO…' : editId ? 'GUARDAR CAMBIOS' : 'CREAR ARTÍCULO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}