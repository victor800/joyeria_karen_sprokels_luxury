// 📁 RUTA: src/app/dashboard/inventario/InventarioPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Item, Precios } from '@/lib/inventario';

const CATEGORIAS = ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Dijes', 'Cadenas', 'Esclavas'];
const QUILATES = ['24', '18', '14'];
const FILAS = [10, 25, 50];

const FORM_VACIO = {
  nombre: '', categoria: 'Anillos', quilate: '18', peso: '', existencias: '1', minimo: '1',
  ubicacion: '', precio_manual: '', foto_url: '',
};

type Estado = 'ok' | 'bajo' | 'agotado';
const estadoDe = (it: Item): Estado => (it.existencias <= 0 ? 'agotado' : it.existencias <= it.minimo ? 'bajo' : 'ok');
const ETIQUETA: Record<Estado, string> = { ok: 'Disponible', bajo: 'Stock bajo', agotado: 'Agotado' };

const cop = (n: number) => (n > 0 ? `$${n.toLocaleString('es-CO')}` : 'Sin precio');
const digitos = (v: unknown) => Number(String(v ?? '').replace(/\D/g, '')) || 0;
const fecha = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(d);
};
const hora = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(d);
};

const calcPrecio = (precios: Precios, quilate: string, peso: string, manual: string) => {
  const m = digitos(manual);
  if (m > 0) return m;
  const gramo = digitos(precios[`p${quilate}` as keyof Precios]);
  const pe = Number(String(peso || '').replace(',', '.'));
  const margen = Number(String(precios.margen || '0').replace(',', '.')) || 0;
  return pe > 0 && gramo > 0 ? Math.round(pe * gramo * (1 + margen / 100)) : 0;
};

function paginasVisibles(a: number, t: number): (number | '…')[] {
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  const s = new Set<number>([1, t, a - 1, a, a + 1]);
  if (a <= 3) [2, 3, 4].forEach((x) => s.add(x));
  if (a >= t - 2) [t - 3, t - 2, t - 1].forEach((x) => s.add(x));
  const arr = Array.from(s).filter((x) => x >= 1 && x <= t).sort((x, y) => x - y);
  const out: (number | '…')[] = [];
  arr.forEach((x, i) => { if (i && x - arr[i - 1] > 1) out.push('…'); out.push(x); });
  return out;
}

/* ---------- Iconos ---------- */
const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const IcoLapiz = () => (<svg {...ico}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>);
const IcoPapelera = () => (<svg {...ico}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>);
const IcoMas = () => (<svg {...ico}><path d="M12 5v14M5 12h14" /></svg>);
const IcoMenos = () => (<svg {...ico}><path d="M5 12h14" /></svg>);
const IcoBuscar = () => (<svg {...ico}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>);
const IcoDescargar = () => (<svg {...ico}><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>);
const IcoChev = ({ dir }: { dir: 'izq' | 'der' }) => (<svg {...ico}><path d={dir === 'izq' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>);
const IcoGema = ({ s = 20 }: { s?: number }) => (<svg {...ico} width={s} height={s} strokeWidth={1.5}><path d="M6 4h12l4 5-10 11L2 9z" /><path d="M2 9h20M9 4l-2 5 5 11 5-11-2-5" /></svg>);
const IcoOro = () => (<svg {...ico}><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" /></svg>);

export default function InventarioPanel({ inicial, precios }: { inicial: Item[]; precios: Precios }) {
  const [lista, setLista] = useState<Item[]>(inicial);
  const [q, setQ] = useState('');
  const [fEstado, setFEstado] = useState<'todos' | Estado>('todos');
  const [fCat, setFCat] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<{ t: string; ok: boolean } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [confirmarOro, setConfirmarOro] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [menuExp, setMenuExp] = useState(false);

  const aBorrar = lista.find((x) => x.id === confirmar) || null;
  const tienePrecios = [precios.p24, precios.p18, precios.p14].some((v) => digitos(v) > 0);

  const avisar = (t: string, ok = true, ms = 4000) => {
    setAviso({ t, ok });
    setTimeout(() => setAviso(null), ms);
  };

  // Cierra diálogos con Escape
  useEffect(() => {
    if (!abierto && !confirmar && !confirmarOro) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmar) { if (!borrando) setConfirmar(null); }
      else if (confirmarOro) { if (!aplicando) setConfirmarOro(false); }
      else setAbierto(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, confirmar, confirmarOro, borrando, aplicando]);

  // Bloquea el scroll del fondo mientras hay un diálogo abierto (importante en móvil)
  useEffect(() => {
    const hayDialogo = abierto || !!confirmar || confirmarOro;
    if (!hayDialogo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [abierto, confirmar, confirmarOro]);

  // Cierra el menú de exportar al hacer clic fuera
  useEffect(() => {
    if (!menuExp) return;
    const fuera = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.iv-exp')) setMenuExp(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [menuExp]);

  useEffect(() => { setPagina(1); }, [q, fEstado, fCat, porPagina]);

  /* ---------- Datos derivados ---------- */
  const cuentas = useMemo(() => {
    const c = { todos: lista.length, ok: 0, bajo: 0, agotado: 0 };
    lista.forEach((it) => { c[estadoDe(it)]++; });
    return c;
  }, [lista]);

  const piezasEnStock = lista.reduce((t, it) => t + it.existencias, 0);
  const valorInventario = lista.reduce((t, it) => t + it.precio * it.existencias, 0);
  const ultimoAjuste = lista.reduce((m, it) => (it.precio_fecha && it.precio_fecha > m ? it.precio_fecha : m), '');
  const elegibles = lista.filter((it) => !it.precio_manual && digitos(precios[`p${it.quilate}` as keyof Precios]) > 0 && Number(String(it.peso).replace(',', '.')) > 0).length;
  const manuales = lista.filter((it) => it.precio_manual).length;

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lista
      .filter((it) => {
        if (t && !`${it.nombre} ${it.id} ${it.categoria} ${it.ubicacion}`.toLowerCase().includes(t)) return false;
        if (fEstado !== 'todos' && estadoDe(it) !== fEstado) return false;
        if (fCat !== 'todas' && it.categoria !== fCat) return false;
        return true;
      })
      .sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
  }, [lista, q, fEstado, fCat]);

  const totalPag = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const pag = Math.min(pagina, totalPag);
  const desde = filtrados.length ? (pag - 1) * porPagina + 1 : 0;
  const hasta = Math.min(pag * porPagina, filtrados.length);
  const visibles = filtrados.slice((pag - 1) * porPagina, pag * porPagina);
  const catsPresentes = Array.from(new Set(lista.map((it) => it.categoria).filter(Boolean)));

  const estimado = useMemo(() => calcPrecio(precios, form.quilate, form.peso, form.precio_manual), [form, precios]);

  const set = (k: keyof typeof FORM_VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ---------- Acciones ---------- */
  function abrir() {
    setEditId(null);
    setForm(FORM_VACIO);
    setError('');
    setAbierto(true);
  }
  function abrirEditar(it: Item) {
    setEditId(it.id);
    setForm({
      nombre: it.nombre, categoria: it.categoria || 'Anillos', quilate: it.quilate || '18', peso: it.peso,
      existencias: String(it.existencias), minimo: String(it.minimo), ubicacion: it.ubicacion,
      precio_manual: it.precio_manual, foto_url: it.foto_url,
    });
    setError('');
    setAbierto(true);
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    setError('');
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Usa una imagen PNG, JPG o WEBP');
      if (file.size > 4 * 1024 * 1024) throw new Error('La imagen pesa más de 4 MB');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/prendas/foto', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto');
      setForm((f) => ({ ...f, foto_url: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    setError('');
    if (!form.nombre.trim()) return setError('Escribe el nombre de la pieza');
    if (!/^\d+$/.test(form.existencias.trim() || '0')) return setError('Las existencias deben ser un número entero');
    if (!/^\d+$/.test(form.minimo.trim() || '0')) return setError('El mínimo debe ser un número entero');
    setGuardando(true);
    try {
      const orig = editId ? lista.find((x) => x.id === editId) : null;
      const payload: Record<string, unknown> = { ...form, existencias: Number(form.existencias || 0), minimo: Number(form.minimo || 0) };
      // El precio solo se recalcula si cambió algo que lo afecta (o si es una pieza nueva)
      const cambiaPrecio = !orig || form.peso !== orig.peso || form.quilate !== orig.quilate || form.precio_manual !== orig.precio_manual;
      if (cambiaPrecio) payload.precio = estimado;
      const res = await fetch(orig ? `/api/inventario/${orig.id}` : '/api/inventario', {
        method: orig ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `No se pudo guardar (error ${res.status})`);
      setLista((l) => (orig ? l.map((x) => (x.id === orig.id ? data : x)) : [data, ...l]));
      avisar(orig ? 'Cambios guardados.' : `Pieza creada con el ID ${data.id}.`);
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function ajustar(it: Item, d: number) {
    const nuevo = Math.max(0, it.existencias + d);
    if (nuevo === it.existencias) return;
    setLista((l) => l.map((x) => (x.id === it.id ? { ...x, existencias: nuevo } : x))); // optimista
    try {
      const res = await fetch(`/api/inventario/${it.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ existencias: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setLista((l) => l.map((x) => (x.id === it.id ? data : x)));
    } catch {
      setLista((l) => l.map((x) => (x.id === it.id ? { ...x, existencias: it.existencias } : x)));
      avisar('No se pudo cambiar la existencia.', false);
    }
  }

  async function borrar(it: Item) {
    setBorrando(true);
    try {
      const res = await fetch(`/api/inventario/${it.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLista((l) => l.filter((x) => x.id !== it.id));
      avisar(`"${it.nombre}" eliminada.`);
    } catch {
      avisar('No se pudo eliminar la pieza.', false);
    } finally {
      setBorrando(false);
      setConfirmar(null);
    }
  }

  async function aplicarOro() {
    setAplicando(true);
    try {
      const res = await fetch('/api/inventario/precios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(precios),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudieron actualizar los precios');
      setLista(data.items as Item[]);
      avisar(`Precios actualizados con el oro de hoy en ${data.actualizadas} pieza${data.actualizadas === 1 ? '' : 's'}.${data.omitidas ? ` ${data.omitidas} sin cambio (precio manual o sin peso).` : ''}`, true, 6000);
      setConfirmarOro(false);
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudieron actualizar los precios', false);
    } finally {
      setAplicando(false);
    }
  }

  /* ---------- Exportar (todo lo filtrado, no solo la página) ---------- */
  function exportar(tipo: 'csv' | 'xls') {
    setMenuExp(false);
    const cab = ['ID', 'Pieza', 'Categoría', 'Quilate', 'Peso (g)', 'Ubicación', 'Existencias', 'Mínimo', 'Estado', 'Precio', 'Valor en stock', 'Creada'];
    const filas = filtrados.map((it) => [
      it.id, it.nombre, it.categoria, `${it.quilate}K`, it.peso, it.ubicacion, it.existencias, it.minimo,
      ETIQUETA[estadoDe(it)], it.precio, it.precio * it.existencias, fecha(it.creado),
    ]);
    const nombre = `inventario-${new Date().toISOString().slice(0, 10)}`;
    let blob: Blob;
    if (tipo === 'csv') {
      const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [cab, ...filas].map((r) => r.map(esc).join(';')).join('\r\n');
      blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    } else {
      const h = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const tabla = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${cab.map((c) => `<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((r) => `<tr>${r.map((c) => `<td>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      blob = new Blob([tabla], { type: 'application/vnd.ms-excel;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.${tipo}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    avisar(`Exportadas ${filas.length} pieza${filas.length === 1 ? '' : 's'}.`);
  }

  const chips: { k: 'todos' | Estado; t: string }[] = [
    { k: 'todos', t: 'Todas' }, { k: 'ok', t: 'Disponibles' }, { k: 'bajo', t: 'Stock bajo' }, { k: 'agotado', t: 'Agotadas' },
  ];

  return (
    <main className="d-cont simple">
      <style>{`
        .iv-aviso { padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; background: #e6f4ea; color: #1e6b34; }
        .iv-aviso.mal { background: #fbe7e4; color: #a12622; }

        /* ---------- Resumen ---------- */
        .iv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 4px 0 16px; }
        .iv-stats > div { background: #fff; border: 1px solid #ece7d6; border-radius: 16px; padding: 14px 18px; box-shadow: 0 6px 18px rgba(11,45,31,.05); }
        .iv-stats span { display: block; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: #8a978f; font-weight: 600; }
        .iv-stats b { display: block; margin-top: 6px; font-family: var(--jks-serif, Georgia), serif; font-size: 26px; font-weight: 500; color: #0b2d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iv-stats .alerta b { color: #a8650f; }
        .iv-stats .gold { background: linear-gradient(135deg, #0d3324, #07211a); border-color: rgba(216,185,95,.4); }
        .iv-stats .gold span { color: rgba(216,185,95,.85); }
        .iv-stats .gold b { color: #ecd07a; }

        /* ---------- Precio del oro ---------- */
        .iv-oro { display: flex; align-items: center; justify-content: space-between; gap: 18px 28px; flex-wrap: wrap; margin-bottom: 20px; padding: 16px 20px; border-radius: 18px; color: #f3ead2;
          background: linear-gradient(120deg, #0d3324 0%, #0a2619 60%, #07211a 100%); border: 1px solid rgba(216,185,95,.3); box-shadow: 0 14px 34px rgba(5,28,19,.2); }
        .iv-oro-t small { display: block; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #d8b95f; font-weight: 600; margin-bottom: 8px; }
        .iv-oro-p { display: flex; gap: 10px; flex-wrap: wrap; }
        .iv-oro-p div { padding: 8px 14px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(216,185,95,.2); }
        .iv-oro-p span { display: block; font-size: 9.5px; letter-spacing: .16em; color: rgba(216,185,95,.85); font-weight: 600; }
        .iv-oro-p b { display: block; margin-top: 2px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 18px; color: #ecd07a; }
        .iv-oro-p em { font-style: normal; font-size: 10px; color: rgba(243,234,210,.55); margin-left: 4px; }
        .iv-oro-a { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .iv-oro-a p { margin: 0; font-size: 12px; line-height: 1.5; color: rgba(243,234,210,.65); text-align: right; }
        .iv-oro-a p b { color: #f3ead2; font-weight: 600; }
        .iv-btn-oro { height: 46px; padding: 0 22px; border: 0; border-radius: 99px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 9px; color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); transition: transform .2s, box-shadow .2s; }
        .iv-btn-oro:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(176,141,60,.4); }
        .iv-btn-oro:disabled { opacity: .45; cursor: not-allowed; }

        /* ---------- Barra de herramientas ---------- */
        .iv-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .iv-bus { position: relative; flex: 1 1 260px; max-width: 380px; min-width: 200px; }
        .iv-bus svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8a978f; }
        .iv-bus input { width: 100%; padding: 10px 14px 10px 38px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13.5px; }
        .iv-chips { display: inline-flex; border: 1px solid rgba(128,128,128,.35); border-radius: 99px; overflow: hidden; background: #fff; }
        .iv-chips button { font: inherit; font-size: 12.5px; padding: 9px 14px; border: 0; background: transparent; cursor: pointer; color: inherit; display: inline-flex; gap: 7px; align-items: center; }
        .iv-chips button i { font-style: normal; font-size: 10.5px; padding: 1px 7px; border-radius: 99px; background: #f1ead2; color: #8a6d25; }
        .iv-chips button[aria-pressed="true"] { background: #0b4a2e; color: #fff; }
        .iv-chips button[aria-pressed="true"] i { background: rgba(236,208,122,.2); color: #ecd07a; }
        .iv-sel { padding: 9px 14px; border-radius: 99px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }
        .iv-exp { position: relative; margin-left: auto; }
        .iv-btn-2 { height: 40px; padding: 0 16px; border-radius: 99px; border: 1px solid rgba(176,141,60,.5); background: #fff; color: #6f5716; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: .2s; }
        .iv-btn-2:hover { background: #f4efdf; }
        .iv-btn-2:disabled { opacity: .5; cursor: not-allowed; }
        .iv-menu { position: absolute; right: 0; top: 46px; z-index: 30; min-width: 190px; padding: 6px; border-radius: 14px; background: #fff; border: 1px solid #ece7d6; box-shadow: 0 18px 40px rgba(5,28,19,.18); }
        .iv-menu button { display: block; width: 100%; text-align: left; padding: 10px 12px; border: 0; border-radius: 9px; background: transparent; font: inherit; font-size: 13px; cursor: pointer; color: #14231b; }
        .iv-menu button:hover { background: #f6f3ea; }
        .iv-menu small { display: block; font-size: 11px; color: #8a978f; }

        /* ---------- Tabla ---------- */
        .iv-card { border-radius: 18px; background: #fff; border: 1px solid #ece7d6; box-shadow: 0 10px 28px rgba(11,45,31,.07); overflow: hidden; }
        .iv-scroll { overflow-x: auto; }
        .iv-t { width: 100%; min-width: 1080px; border-collapse: collapse; font-size: 13.5px; }
        .iv-t thead th { text-align: left; padding: 14px 16px; font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; white-space: nowrap;
          color: rgba(243,234,210,.88); background: linear-gradient(180deg, #0d3324, #0a2619); }
        .iv-t thead th.c { text-align: center; } .iv-t thead th.r { text-align: right; }
        .iv-t tbody td { padding: 12px 16px; border-top: 1px solid #f0ece0; vertical-align: middle; color: #1d2b24; }
        .iv-t tbody tr { transition: background .15s; }
        .iv-t tbody tr:hover { background: #fbf9f2; }
        .iv-t td.c { text-align: center; } .iv-t td.r { text-align: right; }
        .iv-pieza { display: flex; align-items: center; gap: 12px; min-width: 220px; }
        .iv-th { position: relative; flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; overflow: hidden; display: grid; place-items: center; color: #b08d3c; background: #0e3b27; border: 1px solid rgba(176,141,60,.45); }
        .iv-th img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .iv-nom { font-weight: 600; color: #14231b; line-height: 1.25; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .iv-id { display: block; margin-top: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: .06em; color: #8a978f; }
        .iv-cat { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; background: #f1ead2; color: #7a6221; white-space: nowrap; }
        .iv-q { font-weight: 600; color: #0b4a2e; } .iv-q small { display: block; margin-top: 2px; font-weight: 400; font-size: 11.5px; color: #7a857e; }
        .iv-ubi { color: #44514a; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .iv-step { display: inline-flex; align-items: center; gap: 4px; padding: 3px; border-radius: 99px; background: #f6f3ea; border: 1px solid #ece7d6; }
        .iv-step button { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 50%; display: grid; place-items: center; background: #fff; color: #0b4a2e; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.08); transition: .15s; }
        .iv-step button svg { width: 13px; height: 13px; }
        .iv-step button:hover:not(:disabled) { background: #0b4a2e; color: #fff; }
        .iv-step button:disabled { opacity: .35; cursor: default; }
        .iv-step b { min-width: 28px; text-align: center; font-size: 14px; font-variant-numeric: tabular-nums; }
        .iv-min { color: #7a857e; font-variant-numeric: tabular-nums; }
        .iv-est { display: inline-flex; align-items: center; gap: 7px; height: 26px; padding: 0 11px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
        .iv-est i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .iv-est.ok { background: #e6f4ea; color: #1e6b34; } .iv-est.bajo { background: #fdf1dc; color: #8a5a0f; } .iv-est.agotado { background: #fbe7e4; color: #a12622; }
        .iv-precio { font-family: var(--jks-serif, Georgia), serif; font-size: 17px; font-weight: 500; color: #0b2d1f; white-space: nowrap; }
        .iv-precio em { font-style: normal; font-family: system-ui, sans-serif; font-size: 9.5px; letter-spacing: .1em; margin-left: 6px; padding: 1px 7px; border-radius: 99px; border: 1px solid rgba(176,141,60,.5); color: #8a6d25; vertical-align: 2px; }
        .iv-precio small { display: block; margin-top: 1px; font-family: system-ui, sans-serif; font-size: 11px; color: #8a978f; }
        .iv-fecha { white-space: nowrap; color: #44514a; } .iv-fecha small { display: block; margin-top: 2px; font-size: 11.5px; color: #8a978f; }
        .iv-acc { display: inline-flex; gap: 6px; }
        .iv-ib { width: 34px; height: 34px; padding: 0; border-radius: 10px; display: grid; place-items: center; cursor: pointer; border: 1px solid #e6e1d2; background: #fff; color: #44514a; transition: .15s; }
        .iv-ib:hover { background: #0b4a2e; border-color: #0b4a2e; color: #fff; }
        .iv-ib.del:hover { background: #b04a3f; border-color: #b04a3f; }
        .iv-t button:focus-visible, .iv-btn-oro:focus-visible, .iv-btn-2:focus-visible, .iv-pag button:focus-visible { outline: 2px solid #b08d3c; outline-offset: 2px; }

        .iv-vacio { padding: 54px 20px; text-align: center; color: #7a857e; }
        .iv-vacio .g { width: 58px; height: 58px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; color: #b08d3c; background: #faf8f2; border: 1px dashed #c9bd94; }
        .iv-vacio b { display: block; margin-bottom: 4px; color: #14231b; font-size: 15px; }

        /* ---------- Paginación ---------- */
        .iv-pag { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap; padding: 14px 18px; border-top: 1px solid #f0ece0; background: #fdfcf8; }
        .iv-pag-info { font-size: 12.5px; color: #6b7a72; }
        .iv-nums { display: inline-flex; align-items: center; gap: 4px; }
        .iv-nums button { min-width: 34px; height: 34px; padding: 0 8px; border-radius: 10px; border: 1px solid transparent; background: transparent; font: inherit; font-size: 13px; cursor: pointer; color: #3c4a42; display: inline-grid; place-items: center; transition: .15s; }
        .iv-nums button:hover:not(:disabled):not(.on) { background: #f1ead2; }
        .iv-nums button.on { background: #0b2d1f; color: #ecd07a; font-weight: 600; }
        .iv-nums button:disabled { opacity: .35; cursor: default; }
        .iv-nums span { padding: 0 4px; color: #9aa59f; }
        .iv-pp { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: #6b7a72; }
        .iv-pp select { padding: 6px 10px; border-radius: 9px; border: 1px solid rgba(128,128,128,.35); background: #fff; font: inherit; font-size: 13px; }

        /* ---------- Diálogos ---------- */
        .iv-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(10,20,15,.55); }
        .iv-hoja { width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; padding: 26px; border-radius: 22px; background: #fff; }
        .iv-hoja h2 { margin: 0 0 4px; font-size: 24px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; }
        .iv-sub { margin: 0 0 18px; font-size: 13px; color: #7a857e; }
        .iv-f { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .iv-f label { display: block; margin-bottom: 5px; font-size: 12px; font-weight: 600; color: #44514a; }
        .iv-f input, .iv-f select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); font: inherit; font-size: 14px; background: #fff; }
        .iv-f .full { grid-column: 1 / -1; }
        .iv-foto { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 14px; background: #faf8f2; border: 1px dashed #c9bd94; }
        .iv-foto .iv-th { width: 64px; height: 64px; border-radius: 14px; }
        .iv-foto p { margin: 0; font-size: 12px; color: #7a857e; line-height: 1.45; }
        .iv-foto-b { display: flex; gap: 8px; margin-top: 8px; }
        .iv-foto-b label, .iv-foto-b button { margin: 0; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 99px; cursor: pointer; border: 1px solid rgba(176,141,60,.5); background: #fff; color: #6f5716; }
        .iv-foto-b button.q { border-color: #e0b9b3; color: #a12622; }
        .iv-estbox { margin-top: 16px; padding: 14px 16px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; background: #eef4ef; }
        .iv-estbox small { color: #5a6b62; font-size: 12px; } .iv-estbox b { font-size: 22px; color: #0b4a2e; }
        .iv-err { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: #a12622; background: #fbe7e4; }
        .iv-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
        .iv-b2 { font: inherit; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(128,128,128,.4); background: transparent; cursor: pointer; color: inherit; }
        .iv-sp { display: inline-block; width: 13px; height: 13px; margin-right: 6px; vertical-align: -2px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: ivgiro .7s linear infinite; }
        @keyframes ivgiro { to { transform: rotate(360deg); } }

        .iv-dlgf { position: fixed; inset: 0; z-index: 130; display: grid; place-items: center; padding: 18px; background: rgba(3,12,8,.74); backdrop-filter: blur(5px); }
        .iv-dlg { width: 100%; max-width: 400px; text-align: center; padding: 30px 26px 24px; border-radius: 24px; color: #f3ead2; background: linear-gradient(180deg, #0d3324, #07211a); border: 1px solid rgba(216,185,95,.4); box-shadow: 0 30px 80px rgba(0,0,0,.6); animation: ivpop .28s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes ivpop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        .iv-dlg-ic { width: 58px; height: 58px; margin: 0 auto 16px; border-radius: 50%; display: grid; place-items: center; color: #ecd07a; border: 1px solid rgba(216,185,95,.55); background: rgba(216,185,95,.08); }
        .iv-dlg-ic.rojo { color: #fff; background: #b04a3f; border-color: #0a291d; }
        .iv-dlg h3 { margin: 0 0 8px; font-family: var(--jks-serif, Georgia), serif; font-weight: 500; font-size: 22px; color: #f3ead2; }
        .iv-dlg p { margin: 0; font-size: 13.5px; line-height: 1.55; color: rgba(243,234,210,.8); }
        .iv-dlg p b { color: #ecd07a; font-weight: 600; }
        .iv-dlg-p { display: flex; justify-content: center; gap: 8px; margin: 14px 0 4px; }
        .iv-dlg-p div { padding: 7px 12px; border-radius: 10px; background: rgba(255,255,255,.05); border: 1px solid rgba(216,185,95,.2); }
        .iv-dlg-p span { display: block; font-size: 9px; letter-spacing: .14em; color: rgba(216,185,95,.85); font-weight: 600; }
        .iv-dlg-p b { font-size: 15px; color: #ecd07a; }
        .iv-dlg-b { display: flex; gap: 10px; margin-top: 22px; }
        .iv-dlg-b button { flex: 1; font: inherit; font-size: 13px; padding: 12px 14px; border-radius: 99px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: .2s; }
        .iv-dlg-no { border: 1px solid rgba(216,185,95,.5); background: transparent; color: #ecd07a; }
        .iv-dlg-no:hover { background: rgba(216,185,95,.12); }
        .iv-dlg-si { border: 0; font-weight: 700; color: #1c1608; background: linear-gradient(135deg, #f0d680, #c9a548 55%, #b08d3c); }
        .iv-dlg-si.rojo { color: #fff; background: linear-gradient(135deg, #c65a4d, #a23c32); }
        .iv-dlg-b button:disabled { opacity: .7; cursor: wait; }

        .iv-nueva { display: inline-flex; align-items: center; gap: 8px; }
        .iv-nueva svg { width: 18px; height: 18px; }
        @media (prefers-reduced-motion: reduce) { .iv-dlg, .iv-hoja { animation: none !important; } }

        /* ======================= MÓVIL ======================= */
        @media (max-width: 760px) {
          main.d-cont.simple { padding-bottom: 96px; }

          /* Botón flotante "Nueva pieza" */
          .iv-nueva { position: fixed; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 60;
            height: 52px; padding: 0 22px; border-radius: 99px; box-shadow: 0 12px 28px rgba(5,28,19,.35); }

          /* Aviso siempre visible */
          .iv-aviso { position: sticky; top: 8px; z-index: 70; box-shadow: 0 8px 22px rgba(0,0,0,.15); }

          /* Resumen: 2 columnas, el valor del inventario ocupa todo el ancho */
          .iv-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
          .iv-stats > div { padding: 12px 14px; border-radius: 14px; }
          .iv-stats b { font-size: 21px; }
          .iv-stats .gold { grid-column: 1 / -1; }

          /* Precio del oro compacto */
          .iv-oro { padding: 14px; gap: 14px; border-radius: 16px; }
          .iv-oro-t { width: 100%; }
          .iv-oro-p { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .iv-oro-p div { padding: 8px 10px; }
          .iv-oro-p b { font-size: 15px; }
          .iv-oro-p em { display: none; }
          .iv-oro-a { width: 100%; flex-direction: column; align-items: stretch; gap: 12px; }
          .iv-oro-a p { text-align: left; }
          .iv-btn-oro { width: 100%; justify-content: center; height: 48px; letter-spacing: .08em; }

          /* Barra de herramientas */
          .iv-bus { flex: 1 1 100%; max-width: none; }
          .iv-bus input, .iv-sel, .iv-f input, .iv-f select, .iv-pp select { font-size: 16px; } /* evita el zoom en iOS */
          .iv-chips { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
          .iv-chips::-webkit-scrollbar { display: none; }
          .iv-chips button { white-space: nowrap; flex-shrink: 0; }
          .iv-sel { flex: 1 1 0; min-width: 0; }
          .iv-exp { margin-left: 0; }
          .iv-menu { right: auto; left: 0; }

          /* Tabla -> tarjetas */
          .iv-card { background: transparent; border: 0; box-shadow: none; overflow: visible; }
          .iv-scroll { overflow: visible; }
          .iv-t, .iv-t tbody { display: block; min-width: 0; }
          .iv-t thead { display: none; }
          .iv-t tbody tr { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; margin-bottom: 12px; padding: 14px;
            background: #fff; border: 1px solid #ece7d6; border-radius: 18px; box-shadow: 0 8px 22px rgba(11,45,31,.07); }
          .iv-t tbody tr:hover { background: #fff; }
          .iv-t tbody td { display: block; padding: 0; border: 0; text-align: left; min-width: 0; }
          .iv-t td.c, .iv-t td.r { text-align: left; }
          .iv-t tbody td::before { display: block; margin-bottom: 4px; font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #8a978f; }
          .iv-t td:nth-child(2)::before { content: 'Categoría'; }
          .iv-t td:nth-child(3)::before { content: 'Quilate · peso'; }
          .iv-t td:nth-child(4)::before { content: 'Ubicación'; }
          .iv-t td:nth-child(5)::before { content: 'Existencias'; }
          .iv-t td:nth-child(6)::before { content: 'Mínimo'; }
          .iv-t td:nth-child(7)::before { content: 'Estado'; }
          .iv-t td:nth-child(8)::before { content: 'Precio'; }
          .iv-t td:nth-child(9)::before { content: 'Creada'; }

          .iv-t td:nth-child(1) { grid-column: 1 / -1; }
          .iv-pieza { min-width: 0; }
          .iv-th { width: 56px; height: 56px; }
          .iv-nom { max-width: 62vw; font-size: 15px; }
          .iv-ubi { max-width: none; }
          .iv-t td:nth-child(8) { grid-column: 1 / -1; padding: 10px 12px; border-radius: 12px; background: #f6f3ea; }
          .iv-precio { font-size: 20px; }
          .iv-step button { width: 34px; height: 34px; }
          .iv-step button svg { width: 15px; height: 15px; }
          .iv-step b { min-width: 34px; font-size: 16px; }
          .iv-t td:nth-child(10) { grid-column: 1 / -1; padding-top: 12px; border-top: 1px solid #f0ece0; }
          .iv-t td:nth-child(10)::before { display: none; }
          .iv-acc { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
          .iv-ib { width: 100%; height: 42px; gap: 8px; grid-auto-flow: column; justify-content: center; font-size: 13px; font-weight: 600; }
          .iv-ib:first-child::after { content: 'Editar'; }
          .iv-ib.del::after { content: 'Eliminar'; }

          /* Paginación */
          .iv-pag { justify-content: center; border: 1px solid #ece7d6; border-radius: 16px; }
          .iv-pag-info { width: 100%; text-align: center; }

          /* Formulario como "bottom sheet" */
          .iv-modal { place-items: end center; padding: 0; }
          .iv-hoja { max-width: none; max-height: 94vh; padding: 22px 18px 0; border-radius: 24px 24px 0 0; animation: ivsube .28s ease both; }
          .iv-hoja::before { content: ''; display: block; width: 42px; height: 4px; margin: -8px auto 14px; border-radius: 4px; background: #d6d0bd; }
          .iv-hoja h2 { font-size: 22px; }
          .iv-f { gap: 12px; }
          .iv-btns { position: sticky; bottom: 0; margin: 16px -18px 0; padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px)); background: #fff; border-top: 1px solid #f0ece0; }
          .iv-btns > * { flex: 1; height: 46px; justify-content: center; }

          .iv-dlg { max-width: 360px; }
        }
        @keyframes ivsube { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (max-width: 360px) { .iv-f { grid-template-columns: 1fr; } }
      `}</style>

      <div className="d-cab">
        <div>
          <h1>Inventario</h1>
          <p>Existencias por pieza, ubicación y alertas de stock bajo.</p>
        </div>
        <button type="button" className="d-btn iv-nueva" onClick={abrir}><IcoMas /> NUEVA PIEZA</button>
      </div>

      {aviso && <div className={`iv-aviso ${aviso.ok ? '' : 'mal'}`} role="status">{aviso.t}</div>}

      <div className="iv-stats">
        <div><span>Piezas en stock</span><b>{piezasEnStock.toLocaleString('es-CO')}</b></div>
        <div><span>Referencias</span><b>{lista.length}</b></div>
        <div className="alerta"><span>Stock bajo</span><b>{cuentas.bajo + cuentas.agotado}</b></div>
        <div className="gold"><span>Valor del inventario</span><b>{cop(valorInventario)}</b></div>
      </div>

      {/* ---------- Precio del oro: un solo botón para todas las piezas ---------- */}
      <section className="iv-oro" aria-label="Precio del oro">
        <div className="iv-oro-t">
          <small>Precio del oro · por gramo{digitos(precios.margen) || Number(precios.margen) ? ` · margen ${precios.margen}%` : ''}</small>
          <div className="iv-oro-p">
            {QUILATES.map((k) => (
              <div key={k}><span>ORO {k}K</span><b>{digitos(precios[`p${k}` as keyof Precios]) ? cop(digitos(precios[`p${k}` as keyof Precios])) : '—'}<em>COP</em></b></div>
            ))}
          </div>
        </div>
        <div className="iv-oro-a">
          <p>
            {tienePrecios
              ? <>Último ajuste:<br /><b>{ultimoAjuste ? `${fecha(ultimoAjuste)} · ${hora(ultimoAjuste)}` : 'sin ajustes todavía'}</b></>
              : <>Configura el precio del oro<br />en Configuración para usar este botón.</>}
          </p>
          <button type="button" className="iv-btn-oro" onClick={() => setConfirmarOro(true)} disabled={!tienePrecios || lista.length === 0}>
            <IcoOro /> Actualizar precios con el oro de hoy
          </button>
        </div>
      </section>

      {/* ---------- Herramientas ---------- */}
      <div className="iv-bar">
        <div className="iv-bus">
          <IcoBuscar />
          <input placeholder="Buscar por pieza, ID, categoría o ubicación…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en el inventario" />
        </div>
        <div className="iv-chips" role="group" aria-label="Filtrar por estado">
          {chips.map((c) => (
            <button key={c.k} type="button" aria-pressed={fEstado === c.k} onClick={() => setFEstado(c.k)}>{c.t} <i>{cuentas[c.k]}</i></button>
          ))}
        </div>
        {catsPresentes.length > 1 && (
          <select className="iv-sel" value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Filtrar por categoría">
            <option value="todas">Todas las categorías</option>
            {catsPresentes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <div className="iv-exp">
          <button type="button" className="iv-btn-2" onClick={() => setMenuExp((v) => !v)} aria-haspopup="menu" aria-expanded={menuExp} disabled={filtrados.length === 0}>
            <IcoDescargar /> Exportar
          </button>
          {menuExp && (
            <div className="iv-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => exportar('xls')}>Excel (.xls)<small>{filtrados.length} pieza{filtrados.length === 1 ? '' : 's'} filtradas</small></button>
              <button type="button" role="menuitem" onClick={() => exportar('csv')}>CSV (.csv)<small>Para Google Sheets u otros</small></button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="iv-card">
        {filtrados.length === 0 ? (
          <div className="iv-vacio">
            <div className="g"><IcoGema s={26} /></div>
            <b>{lista.length === 0 ? 'Aún no hay piezas en el inventario' : 'No hay piezas con ese filtro'}</b>
            {lista.length === 0 ? 'Pulsa NUEVA PIEZA para registrar la primera.' : 'Prueba con otra búsqueda o estado.'}
          </div>
        ) : (
          <div className="iv-scroll">
            <table className="iv-t">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th>Categoría</th>
                  <th>Quilate</th>
                  <th>Ubicación</th>
                  <th className="c">Existencias</th>
                  <th className="c">Mínimo</th>
                  <th>Estado</th>
                  <th>Precio</th>
                  <th>Creada</th>
                  <th className="r">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((it) => {
                  const est = estadoDe(it);
                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="iv-pieza">
                          <span className="iv-th">
                            {it.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.foto_url.split('|')[0]} alt="" loading="lazy" />
                            ) : (
                              <IcoGema />
                            )}
                          </span>
                          <div>
                            <div className="iv-nom" title={it.nombre}>{it.nombre}</div>
                            <span className="iv-id">{it.id}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="iv-cat">{it.categoria || '—'}</span></td>
                      <td><span className="iv-q">{it.quilate}K<small>{it.peso ? `${it.peso} g` : 'sin peso'}</small></span></td>
                      <td><div className="iv-ubi" title={it.ubicacion}>{it.ubicacion || '—'}</div></td>
                      <td className="c">
                        <span className="iv-step">
                          <button type="button" onClick={() => ajustar(it, -1)} disabled={it.existencias <= 0} aria-label={`Restar una unidad a ${it.nombre}`}><IcoMenos /></button>
                          <b>{it.existencias}</b>
                          <button type="button" onClick={() => ajustar(it, 1)} aria-label={`Sumar una unidad a ${it.nombre}`}><IcoMas /></button>
                        </span>
                      </td>
                      <td className="c"><span className="iv-min">{it.minimo}</span></td>
                      <td><span className={`iv-est ${est}`}><i aria-hidden="true" />{ETIQUETA[est]}</span></td>
                      <td>
                        <span className="iv-precio">
                          {cop(it.precio)}{it.precio_manual && <em title="Precio fijado manualmente">MANUAL</em>}
                          {it.precio > 0 && it.existencias > 0 && <small>Stock: {cop(it.precio * it.existencias)}</small>}
                        </span>
                      </td>
                      <td><div className="iv-fecha">{fecha(it.creado)}<small>{hora(it.creado)}</small></div></td>
                      <td className="r">
                        <span className="iv-acc">
                          <button type="button" className="iv-ib" onClick={() => abrirEditar(it)} title="Editar" aria-label={`Editar ${it.nombre}`}><IcoLapiz /></button>
                          <button type="button" className="iv-ib del" onClick={() => setConfirmar(it.id)} title="Eliminar" aria-label={`Eliminar ${it.nombre}`}><IcoPapelera /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtrados.length > 0 && (
          <footer className="iv-pag">
            <span className="iv-pag-info">Mostrando {desde}–{hasta} de {filtrados.length} pieza{filtrados.length === 1 ? '' : 's'}</span>
            <nav className="iv-nums" aria-label="Paginación">
              <button type="button" onClick={() => setPagina(pag - 1)} disabled={pag <= 1} aria-label="Página anterior"><IcoChev dir="izq" /></button>
              {paginasVisibles(pag, totalPag).map((n, i) => (n === '…'
                ? <span key={`p${i}`}>…</span>
                : <button key={n} type="button" className={n === pag ? 'on' : ''} onClick={() => setPagina(n)} aria-current={n === pag ? 'page' : undefined} aria-label={`Página ${n}`}>{n}</button>))}
              <button type="button" onClick={() => setPagina(pag + 1)} disabled={pag >= totalPag} aria-label="Página siguiente"><IcoChev dir="der" /></button>
            </nav>
            <label className="iv-pp">Filas
              <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}>
                {FILAS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </footer>
        )}
      </div>

      {/* ---------- Confirmar precio del oro ---------- */}
      {confirmarOro && (
        <div className="iv-dlgf" onMouseDown={(e) => e.target === e.currentTarget && !aplicando && setConfirmarOro(false)}>
          <div className="iv-dlg" role="alertdialog" aria-modal="true" aria-labelledby="iv-oro-t">
            <div className="iv-dlg-ic"><IcoOro /></div>
            <h3 id="iv-oro-t">¿Aplicar el oro de hoy?</h3>
            <div className="iv-dlg-p">
              {QUILATES.map((k) => (<div key={k}><span>{k}K</span><b>{cop(digitos(precios[`p${k}` as keyof Precios]))}</b></div>))}
            </div>
            <p>Se recalcularán <b>{elegibles}</b> pieza{elegibles === 1 ? '' : 's'} (peso × oro del quilate{Number(precios.margen) ? ` + ${precios.margen}% de margen` : ''}).
              {manuales > 0 && <> Las <b>{manuales}</b> con precio manual no se tocan.</>}</p>
            <div className="iv-dlg-b">
              <button type="button" className="iv-dlg-no" autoFocus onClick={() => setConfirmarOro(false)} disabled={aplicando}>Cancelar</button>
              <button type="button" className="iv-dlg-si" onClick={aplicarOro} disabled={aplicando}>
                {aplicando ? <span className="iv-sp" aria-hidden /> : <IcoOro />}
                {aplicando ? 'Aplicando…' : 'Aplicar a todas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Confirmar eliminación ---------- */}
      {aBorrar && (
        <div className="iv-dlgf" onMouseDown={(e) => e.target === e.currentTarget && !borrando && setConfirmar(null)}>
          <div className="iv-dlg" role="alertdialog" aria-modal="true" aria-labelledby="iv-del-t">
            <div className="iv-dlg-ic rojo"><IcoPapelera /></div>
            <h3 id="iv-del-t">¿Eliminar esta pieza?</h3>
            <p><b>{aBorrar.nombre}</b><br />{aBorrar.id} · {aBorrar.quilate}K · {aBorrar.existencias} en stock</p>
            <p style={{ marginTop: 10, fontSize: 12.5, opacity: .75 }}>Se borrará del inventario y de la hoja. Esta acción no se puede deshacer.</p>
            <div className="iv-dlg-b">
              <button type="button" className="iv-dlg-no" autoFocus onClick={() => setConfirmar(null)} disabled={borrando}>Cancelar</button>
              <button type="button" className="iv-dlg-si rojo" onClick={() => borrar(aBorrar)} disabled={borrando}>
                {borrando ? <span className="iv-sp" aria-hidden /> : <IcoPapelera />}
                {borrando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Crear / editar ---------- */}
      {abierto && (
        <div className="iv-modal" onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="iv-hoja" role="dialog" aria-modal="true" aria-label={editId ? 'Editar pieza' : 'Nueva pieza'}>
            <h2>{editId ? 'Editar pieza' : 'Nueva pieza'}</h2>
            <p className="iv-sub">{editId ? `ID ${editId}. Modifica los datos y guarda.` : 'Al guardar se le asigna un ID único y se registra en la hoja de inventario.'}</p>

            <div className="iv-f">
              <div className="full"><label htmlFor="in">Nombre</label><input id="in" value={form.nombre} onChange={set('nombre')} placeholder="Ej.: Cadena tejido lazo" /></div>
              <div><label htmlFor="ic">Categoría</label>
                <select id="ic" value={form.categoria} onChange={set('categoria')}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="iq">Quilate</label>
                <select id="iq" value={form.quilate} onChange={set('quilate')}>{QUILATES.map((c) => <option key={c} value={c}>{c}K</option>)}</select></div>
              <div><label htmlFor="ip">Peso (gramos)</label><input id="ip" inputMode="decimal" value={form.peso} onChange={set('peso')} placeholder="Ej.: 4.5" /></div>
              <div><label htmlFor="iu">Ubicación</label><input id="iu" value={form.ubicacion} onChange={set('ubicacion')} placeholder="Ej.: Vitrina 2, Caja fuerte" /></div>
              <div><label htmlFor="ie">Existencias</label><input id="ie" inputMode="numeric" value={form.existencias} onChange={set('existencias')} /></div>
              <div><label htmlFor="im">Mínimo (alerta de stock bajo)</label><input id="im" inputMode="numeric" value={form.minimo} onChange={set('minimo')} /></div>
              <div className="full"><label htmlFor="ipm">Precio manual (opcional)</label><input id="ipm" inputMode="numeric" value={form.precio_manual} onChange={set('precio_manual')} placeholder="Déjalo vacío para calcular con el oro" /></div>

              <div className="full">
                <label>Foto (opcional)</label>
                <div className="iv-foto">
                  <span className="iv-th">
                    {form.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.foto_url.split('|')[0]} alt="Vista previa" />
                    ) : (
                      <IcoGema s={24} />
                    )}
                  </span>
                  <div>
                    <p>PNG, JPG o WEBP · máx. 4 MB</p>
                    <div className="iv-foto-b">
                      <label>
                        {subiendo ? 'Subiendo…' : form.foto_url ? 'Cambiar foto' : 'Subir foto'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={subirFoto} disabled={subiendo} />
                      </label>
                      {form.foto_url && <button type="button" className="q" onClick={() => setForm((f) => ({ ...f, foto_url: '' }))}>Quitar</button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="iv-estbox">
              <div>
                <small>Precio</small><br />
                <small>{form.precio_manual ? 'Precio manual' : `peso × oro ${form.quilate}K${Number(precios.margen) ? ` + ${precios.margen}% margen` : ''}`}</small>
              </div>
              <b>{cop(estimado)}</b>
            </div>

            {error && <p className="iv-err" role="alert">{error}</p>}

            <div className="iv-btns">
              <button type="button" className="iv-b2" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="d-btn" onClick={guardar} disabled={guardando || subiendo}>
                {guardando ? 'GUARDANDO…' : editId ? 'GUARDAR CAMBIOS' : 'CREAR PIEZA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}