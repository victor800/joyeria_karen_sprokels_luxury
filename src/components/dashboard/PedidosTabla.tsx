'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Cel } from '@/lib/datos-dashboard';
import type { Campo } from '@/lib/campos';
import './pedidos-tabla.css';

type Resultado = { ok: boolean; error?: string };

type Props = {
  filas: Cel[][];
  campos: Campo[];
  onCrear: (datos: Record<string, string>) => Promise<Resultado>;
  onEditar: (numero: string, datos: Record<string, string>) => Promise<Resultado>;
  onEliminar: (numero: string) => Promise<Resultado>;
  /** Nombre de la joyería para el saludo de WhatsApp */
  nombreJoyeria?: string;
  /** Teléfono de cada domiciliario, con el nombre normalizado (minúsculas, sin tildes) como clave */
  telefonosDomi?: Record<string, string>;
  aviso?: string;
};

// Orden de columnas que entrega leerPedidos(). Las dos últimas (tel, destino) son nuevas.
const C = { num: 0, cliente: 1, prenda: 2, total: 3, entrega: 4, estado: 5, pago: 6, domi: 7, valorDomi: 8, nota: 9, tel: 10, destino: 11 };

const texto = (c?: Cel) => (c == null ? '' : typeof c === 'string' ? c : c.chip);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** "$ 120.000" o "120000" → 120000 */
const monto = (s: string) => {
  const d = s.replace(/[^\d]/g, '');
  return d ? Number(d) : 0;
};
const cop = (n: number) => `$ ${n.toLocaleString('es-CO')}`;

/** Pago en efectivo: el domiciliario cobra todo en mano. Ajusta la regex si tus PAGOS se llaman distinto. */
const esEfectivo = (pago: string) => /efectivo|contra ?entrega/.test(norm(pago));
const esPagado = (pago: string) => /^pag/.test(norm(pago)) || /pagado|cancelado/.test(norm(pago));
const sinValor = (s: string) => !s || s === '-' || s === '—';

/** Valor del pedido + domicilio, siempre */
function cobro(f: Cel[]) {
  const total = monto(texto(f[C.total]));
  const dom = monto(texto(f[C.valorDomi]));
  return { total, dom, suma: dom > 0, aCobrar: total + dom };
}

/** Acepta dd/mm/aaaa o aaaa-mm-dd y devuelve un número comparable aaaammdd */
function fechaNum(s: string): number | null {
  const a = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (a) return Number(a[3]) * 10000 + Number(a[2]) * 100 + Number(a[1]);
  const b = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (b) return Number(b[1]) * 10000 + Number(b[2]) * 100 + Number(b[3]);
  return null;
}
const aInputFecha = (s: string) => {
  const n = fechaNum(s);
  return n == null ? '' : String(n).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
};
const hoyNum = (d: Date, extra = 0) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + extra);
  return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
};

function tono(estado: string) {
  const e = norm(estado);
  if (/entregad|complet/.test(e)) return 'verde';
  if (/camino|ruta|despach/.test(e)) return 'naranja';
  if (/cancel|anulad/.test(e)) return 'rojo';
  if (/prepar|proceso|recibid/.test(e)) return 'azul';
  if (/nuevo|pendiente/.test(e)) return 'amarillo';
  return 'gris';
}

/** "anillo, collar + pulsera" → ['anillo', 'collar', 'pulsera'] */
const listaPrendas = (s: string) => s.split(/[\n,;+]+/).map((x) => x.trim()).filter(Boolean);

/** Número colombiano → formato internacional para wa.me ('' si no es válido) */
function telWA(s: string) {
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `57${d}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return '';
}

/* ───────── Iconos ───────── */
const IcoWA = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const IcoEditar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </svg>
);
const IcoBorrar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);

export default function PedidosTabla({ filas, campos, onCrear, onEditar, onEliminar, nombreJoyeria, telefonosDomi = {}, aviso }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [domi, setDomi] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  // Modales: detalle (por número de pedido), formulario (crear/editar) y confirmación de borrado
  const [detalle, setDetalle] = useState<string | null>(null);
  const [form, setForm] = useState<{ modo: 'crear' } | { modo: 'editar'; num: string } | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const [ahora, setAhora] = useState<Date | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const hayModal = !!(detalle || form || borrar);
  const buscar = (num: string | null) => (num ? filas.find((f) => texto(f[C.num]) === num) : undefined);

  useEffect(() => {
    setAhora(new Date());
    setRefrescando(false);
  }, [filas]);

  // Auto-refresco cada 30 s (pausado mientras hay un modal abierto)
  useEffect(() => {
    if (hayModal) return;
    const id = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(id);
  }, [hayModal, router]);

  // Escape cierra el modal de más arriba; además se bloquea el scroll del fondo
  useEffect(() => {
    if (!hayModal) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || guardando) return;
      if (borrar) setBorrar(null);
      else if (form) setForm(null);
      else setDetalle(null);
    };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [hayModal, borrar, form, guardando]);

  const telDomi = (nombre: string) => telefonosDomi[norm(nombre)] ?? '';

  const estados = useMemo(() => [...new Set(filas.map((f) => texto(f[C.estado])).filter(Boolean))], [filas]);
  const domis = useMemo(
    () => [...new Set(filas.map((f) => texto(f[C.domi])).filter((d) => d && norm(d) !== 'sin asignar' && d !== '-'))],
    [filas],
  );
  const conteo = useMemo(() => {
    const m: Record<string, number> = {};
    filas.forEach((f) => {
      const e = texto(f[C.estado]);
      m[e] = (m[e] ?? 0) + 1;
    });
    return m;
  }, [filas]);

  const filtradas = useMemo(() => {
    const t = norm(q.trim());
    const d = desde ? Number(desde.replace(/-/g, '')) : null;
    const h = hasta ? Number(hasta.replace(/-/g, '')) : null;
    return filas.filter((f) => {
      if (estado !== 'todos' && texto(f[C.estado]) !== estado) return false;
      if (domi !== 'todos' && texto(f[C.domi]) !== domi) return false;
      if (d || h) {
        const n = fechaNum(texto(f[C.entrega]));
        if (n == null) return false;
        if (d && n < d) return false;
        if (h && n > h) return false;
      }
      return !t || f.some((c) => norm(texto(c)).includes(t));
    });
  }, [filas, q, estado, domi, desde, hasta]);

  const totalPag = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const pag = Math.min(pagina, totalPag);
  const ini = (pag - 1) * porPagina;
  const visibles = filtradas.slice(ini, ini + porPagina);
  const hayFiltro = q.trim() !== '' || estado !== 'todos' || domi !== 'todos' || desde !== '' || hasta !== '';

  // Efectivo (pedido + domicilio) que deben cobrar en mano los pedidos filtrados aún activos
  const efectivoPendiente = useMemo(
    () =>
      filtradas.reduce((acc, f) => {
        if (!esEfectivo(texto(f[C.pago]))) return acc;
        if (/entregad|complet|cancel|anulad/.test(norm(texto(f[C.estado])))) return acc;
        return acc + cobro(f).aCobrar;
      }, 0),
    [filtradas],
  );

  const cambiar = (fn: () => void) => {
    fn();
    setPagina(1);
  };

  function refrescar() {
    setRefrescando(true);
    router.refresh();
    setTimeout(() => setRefrescando(false), 1200);
  }

  function exportar() {
    const cols = ['N°', 'Cliente', 'Teléfono', 'Prenda', 'Valor pedido', 'Valor domicilio', 'Total a cobrar', 'Entrega', 'Estado', 'Pago', 'Domiciliario', 'Nota'];
    const esc = (s: string) => `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    const filasCsv = filtradas.map((f) => [
      texto(f[C.num]), texto(f[C.cliente]), texto(f[C.tel]), texto(f[C.prenda]),
      String(cobro(f).total), String(cobro(f).dom), String(cobro(f).aCobrar),
      texto(f[C.entrega]), texto(f[C.estado]), texto(f[C.pago]), texto(f[C.domi]), texto(f[C.nota]),
    ]);
    const lineas = [cols, ...filasCsv].map((r) => r.map(esc).join(';'));
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Valores iniciales del formulario al editar */
  function valoresForm(f: Cel[]): Record<string, string> {
    const dom = texto(f[C.domi]);
    const opcionesDom = campos.find((c) => c.name === 'domiciliarioId')?.opciones ?? [];
    const idDom = opcionesDom.find((o) => typeof o !== 'string' && o.label === dom);
    const limpia = (s: string) => (sinValor(s) ? '' : s);
    return {
      cliente: texto(f[C.cliente]),
      telefono: limpia(texto(f[C.tel])),
      destino: limpia(texto(f[C.destino])),
      prenda: texto(f[C.prenda]),
      total: String(monto(texto(f[C.total])) || ''),
      entrega: aInputFecha(texto(f[C.entrega])),
      estado: texto(f[C.estado]),
      pago: texto(f[C.pago]),
      domiciliarioId: idDom && typeof idDom !== 'string' ? idDom.value : '',
      valorDomicilio: String(monto(texto(f[C.valorDomi])) || ''),
      nota: limpia(texto(f[C.nota])),
    };
  }

  /** Mensaje de WhatsApp para avisar al cliente */
  function linkWhatsApp(f: Cel[]) {
    const cb = cobro(f);
    const pago = texto(f[C.pago]);
    const dom = texto(f[C.domi]);
    const tieneDom = !sinValor(dom) && norm(dom) !== 'sin asignar';
    const tDom = tieneDom ? telDomi(dom) : '';
    const entrega = texto(f[C.entrega]);
    const nombre = texto(f[C.cliente]).trim().split(/\s+/)[0] || '';
    const items = listaPrendas(texto(f[C.prenda]));

    const lineas = [
      `Hola ${nombre} 👋, te saludamos de ${nombreJoyeria || 'nuestra joyería'}.`,
      '',
      `Tu pedido ${texto(f[C.num])} está *${texto(f[C.estado]).toLowerCase()}*:`,
      ...items.map((p) => `• ${p}`),
      '',
      cb.suma
        ? `💰 Total: ${cop(cb.aCobrar)} (pedido ${cop(cb.total)} + domicilio ${cop(cb.dom)})`
        : `💰 Total: ${cop(cb.aCobrar)}`,
      esEfectivo(pago) ? 'Pago en efectivo contra entrega, por favor ten el valor listo.' : `Pago: ${pago.toLowerCase()}`,
      !sinValor(entrega) ? `📅 Entrega: ${entrega}` : '',
      tieneDom ? `🛵 Domiciliario: ${dom}${tDom ? ` · Tel. ${tDom}` : ''}` : '',
      '',
      '¡Gracias por tu compra! 💎',
    ];
    const msg = lineas.filter((l, i, a) => !(l === '' && (i === 0 || a[i - 1] === ''))).join('\n');
    const tel = telWA(texto(f[C.tel]));
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const datos = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]));
    setError(null);
    iniciar(async () => {
      try {
        const r = form.modo === 'editar' ? await onEditar(form.num, datos) : await onCrear(datos);
        if (r.ok) setForm(null);
        else setError(r.error ?? 'No se pudo guardar.');
      } catch {
        setError('No se pudo guardar. Intenta de nuevo.');
      }
    });
  }

  function confirmarBorrado() {
    if (!borrar) return;
    setError(null);
    iniciar(async () => {
      try {
        const r = await onEliminar(borrar);
        if (r.ok) {
          setBorrar(null);
          setDetalle(null);
        } else setError(r.error ?? 'No se pudo eliminar.');
      } catch {
        setError('No se pudo eliminar. Intenta de nuevo.');
      }
    });
  }

  function badgeEntrega(s: string) {
    if (!ahora) return null;
    const n = fechaNum(s);
    if (n == null) return null;
    if (n === hoyNum(ahora)) return <span className="pt-dia hoy">Hoy</span>;
    if (n === hoyNum(ahora, 1)) return <span className="pt-dia manana">Mañana</span>;
    if (n < hoyNum(ahora)) return <span className="pt-dia vencido">Vencido</span>;
    return null;
  }

  const paginas = useMemo(() => {
    const out: (number | '…')[] = [];
    for (let i = 1; i <= totalPag; i++) {
      if (i === 1 || i === totalPag || Math.abs(i - pag) <= 1) out.push(i);
      else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
  }, [totalPag, pag]);

  const filaDetalle = buscar(detalle);
  const filaEditar = form?.modo === 'editar' ? buscar(form.num) : undefined;
  const filaBorrar = buscar(borrar);
  const valores = filaEditar ? valoresForm(filaEditar) : {};

  function abrirCrear() {
    setError(null);
    setForm({ modo: 'crear' });
  }
  function abrirEditar(f: Cel[]) {
    setError(null);
    setForm({ modo: 'editar', num: texto(f[C.num]) });
  }
  function abrirBorrar(f: Cel[]) {
    setError(null);
    setBorrar(texto(f[C.num]));
  }

  return (
    <main className="d-cont simple pt">
      <div className="d-cab">
        <div>
          <h1>Pedidos</h1>
          <p>Ventas en tienda y domicilios, del pedido a la entrega.</p>
        </div>
      </div>

      {aviso && <p className="d-aviso" role="alert">{aviso}</p>}

      {/* Filtros */}
      <div className="pt-filtros">
        <input
          className="pt-input pt-buscar"
          type="search"
          placeholder="Buscar cliente, código, teléfono…"
          aria-label="Buscar"
          value={q}
          onChange={(e) => cambiar(() => setQ(e.target.value))}
        />
        <select className="pt-input pt-select-domi" aria-label="Domiciliario" value={domi} onChange={(e) => cambiar(() => setDomi(e.target.value))}>
          <option value="todos">Todos los domiciliarios</option>
          {domis.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <label className="pt-fecha">
          <span>Desde</span>
          <input className="pt-input" type="date" value={desde} max={hasta || undefined} onChange={(e) => cambiar(() => setDesde(e.target.value))} />
        </label>
        <label className="pt-fecha">
          <span>Hasta</span>
          <input className="pt-input" type="date" value={hasta} min={desde || undefined} onChange={(e) => cambiar(() => setHasta(e.target.value))} />
        </label>
        <div className="pt-acciones">
          <button type="button" className="pt-btn linea" onClick={refrescar} disabled={refrescando}>
            <span className={refrescando ? 'pt-giro' : undefined}>↻</span> Actualizar
          </button>
          <button type="button" className="pt-btn oscuro" onClick={exportar} disabled={filtradas.length === 0}>
            ⬇ Exportar CSV ({filtradas.length})
          </button>
          <button type="button" className="pt-btn dorado" onClick={abrirCrear}>
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Chips de estado con conteo */}
      <div className="pt-chips" role="tablist" aria-label="Filtrar por estado">
        <button type="button" role="tab" aria-selected={estado === 'todos'} className="pt-chipf" onClick={() => cambiar(() => setEstado('todos'))}>
          Todos <b>{filas.length}</b>
        </button>
        {estados.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={estado === s} className="pt-chipf" onClick={() => cambiar(() => setEstado(s))}>
            {s} <b>{conteo[s] ?? 0}</b>
          </button>
        ))}
        {hayFiltro && (
          <button
            type="button"
            className="pt-limpiar"
            onClick={() => cambiar(() => { setQ(''); setEstado('todos'); setDomi('todos'); setDesde(''); setHasta(''); })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {efectivoPendiente > 0 && (
        <p className="pt-efectivo">
          Efectivo por cobrar en mano (pedidos activos): <b>{cop(efectivoPendiente)}</b>
        </p>
      )}

      {/* Tabla */}
      <div className="pt-card">
        <table className="pt-tabla">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Artículos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Domiciliario</th>
              <th>Entrega</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={8} className="pt-vacio">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                    <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
                  </svg>
                  {hayFiltro ? (
                    <p>No hay pedidos con esos filtros.</p>
                  ) : (
                    <p>Aún no hay pedidos.<br />Cuando agregues el primero aparecerá aquí.</p>
                  )}
                </td>
              </tr>
            ) : (
              visibles.map((f, i) => {
                const key = `${texto(f[C.num])}-${ini + i}`;
                const dom = texto(f[C.domi]);
                const sinDom = !dom || norm(dom) === 'sin asignar' || dom === '-';
                const pago = texto(f[C.pago]);
                const pagado = esPagado(pago);
                const cb = cobro(f);
                const tel = texto(f[C.tel]);
                return (
                  <tr key={key}>
                    <td data-label="Pedido">
                      <div className="pt-cod">{texto(f[C.num])}</div>
                    </td>
                    <td data-label="Cliente">
                      <div className="pt-fuerte">{texto(f[C.cliente])}</div>
                    </td>
                    <td data-label="Artículos">
                      <div>{texto(f[C.prenda])}</div>
                    </td>
                    <td data-label="Total">
                      <div className="pt-fuerte">{cop(cb.aCobrar)}</div>
                      {cb.suma && (
                        <div className="pt-suma">
                          {cop(cb.total)} + domicilio {cop(cb.dom)}
                        </div>
                      )}
                      <div className={`pt-pago ${pagado ? 'ok' : 'pend'}`}>
                        {esEfectivo(pago) ? 'Efectivo: cobrar en mano' : pagado ? pago : `Pago ${pago.toLowerCase()}`}
                      </div>
                    </td>
                    <td data-label="Estado">
                      <span className="pt-estado" data-t={tono(texto(f[C.estado]))}>{texto(f[C.estado])}</span>
                    </td>
                    <td data-label="Domiciliario">
                      <span className={sinDom ? 'pt-sec' : 'pt-dom'}>{sinDom ? 'Sin asignar' : dom}</span>
                    </td>
                    <td data-label="Entrega">
                      <div className="pt-fuerte">{texto(f[C.entrega]) || '—'}</div>
                      {badgeEntrega(texto(f[C.entrega]))}
                    </td>
                    <td className="pt-celda-acc">
                      <div className="pt-fila-acc">
                        <button type="button" className="pt-ico pt-ver" onClick={() => setDetalle(texto(f[C.num]))}>
                          Ver
                        </button>
                        <a
                          className={`pt-ico wa${telWA(tel) ? '' : ' sin'}`}
                          href={linkWhatsApp(f)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Avisar a ${texto(f[C.cliente])} por WhatsApp`}
                          title={telWA(tel) ? `WhatsApp ${tel}` : 'Sin teléfono: elegirás el contacto en WhatsApp'}
                        >
                          <IcoWA />
                        </a>
                        <button type="button" className="pt-ico" onClick={() => abrirEditar(f)} aria-label="Editar pedido" title="Editar">
                          <IcoEditar />
                        </button>
                        <button type="button" className="pt-ico del" onClick={() => abrirBorrar(f)} aria-label="Eliminar pedido" title="Eliminar">
                          <IcoBorrar />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie: conteo + paginación */}
      <div className="pt-pie">
        <span className="pt-sec">
          {filtradas.length === 0 ? 'Mostrando 0 de 0' : `Mostrando ${ini + 1}–${ini + visibles.length} de ${filtradas.length}`}
        </span>
        <div className="pt-pag">
          <label className="pt-filas">
            Filas
            <select className="pt-input" value={porPagina} onChange={(e) => cambiar(() => setPorPagina(Number(e.target.value)))}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button type="button" className="pt-pg" aria-label="Anterior" disabled={pag <= 1} onClick={() => setPagina(pag - 1)}>‹</button>
          {paginas.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="pt-sec">…</span>
            ) : (
              <button key={p} type="button" className="pt-pg" aria-current={p === pag ? 'page' : undefined} onClick={() => setPagina(p)}>
                {p}
              </button>
            ),
          )}
          <button type="button" className="pt-pg" aria-label="Siguiente" disabled={pag >= totalPag} onClick={() => setPagina(pag + 1)}>›</button>
        </div>
      </div>

      <p className="pt-nota">
        {ahora ? `Última actualización: ${ahora.toLocaleString('es-CO')} · ` : ''}se refresca sola cada 30 s. Exportar descarga todos los pedidos filtrados (no solo la página visible).
      </p>

      {/* ───────── Modal: detalle del pedido ───────── */}
      {filaDetalle && (() => {
        const f = filaDetalle;
        const cb = cobro(f);
        const pago = texto(f[C.pago]);
        const dom = texto(f[C.domi]);
        const sinDom = !dom || norm(dom) === 'sin asignar' || dom === '-';
        const tDom = sinDom ? '' : telDomi(dom);
        const tel = texto(f[C.tel]);
        const destino = texto(f[C.destino]);
        const nota = texto(f[C.nota]);
        return (
          <div className="pt-fondo" onClick={() => setDetalle(null)}>
            <div className="pt-modal" role="dialog" aria-modal="true" aria-labelledby="pt-det-t" onClick={(e) => e.stopPropagation()}>
              <div className="pt-modal-cab">
                <div>
                  <div className="pt-cod">{texto(f[C.num])}</div>
                  <h3 id="pt-det-t">{texto(f[C.cliente])}</h3>
                  <span className="pt-estado" data-t={tono(texto(f[C.estado]))} style={{ marginTop: 8 }}>{texto(f[C.estado])}</span>
                </div>
                <button type="button" className="pt-cerrar" onClick={() => setDetalle(null)} aria-label="Cerrar">×</button>
              </div>

              <div className="pt-modal-cuerpo">
                <section className="pt-bloque">
                  <h4>Artículos</h4>
                  <ul className="pt-lista">
                    {listaPrendas(texto(f[C.prenda])).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </section>

                <section className="pt-bloque">
                  <h4>Cobro</h4>
                  <div className="pt-dato"><span>Valor del pedido</span><span>{cop(cb.total)}</span></div>
                  <div className="pt-dato"><span>Valor del domicilio</span><span>{cop(cb.dom)}</span></div>
                  <div className="pt-total"><span>Total a cobrar</span><span>{cop(cb.aCobrar)}</span></div>
                  <div className="pt-dato"><span>Pago</span><span>{pago || '—'}</span></div>
                  {esEfectivo(pago) && <p className="pt-aviso-cobro">Pago en efectivo: el domiciliario cobra el total en mano.</p>}
                </section>

                <section className="pt-bloque">
                  <h4>Entrega</h4>
                  <div className="pt-dato">
                    <span>Fecha</span>
                    <span>{texto(f[C.entrega]) || '—'} {badgeEntrega(texto(f[C.entrega]))}</span>
                  </div>
                  {!sinValor(destino) && <div className="pt-dato"><span>Dirección</span><span>{destino}</span></div>}
                  <div className="pt-dato"><span>Domiciliario</span><span>{sinDom ? 'Sin asignar' : dom}</span></div>
                  {tDom && (
                    <div className="pt-dato"><span>Tel. domiciliario</span><span><a href={`tel:${tDom}`}>{tDom}</a></span></div>
                  )}
                </section>

                <section className="pt-bloque">
                  <h4>Cliente</h4>
                  <div className="pt-dato">
                    <span>Teléfono</span>
                    <span>{sinValor(tel) ? '—' : <a href={`tel:${tel}`}>{tel}</a>}</span>
                  </div>
                  {!sinValor(nota) && <div className="pt-dato"><span>Nota</span><span>{nota}</span></div>}
                </section>
              </div>

              <div className="pt-modal-pie">
                <a className="pt-btn verde" href={linkWhatsApp(f)} target="_blank" rel="noopener noreferrer">
                  <IcoWA /> Avisar por WhatsApp
                </a>
                <button type="button" className="pt-btn linea" onClick={() => abrirEditar(f)}><IcoEditar /> Editar</button>
                <button type="button" className="pt-btn linea" onClick={() => abrirBorrar(f)}><IcoBorrar /> Eliminar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────── Modal: crear / editar ───────── */}
      {form && (form.modo === 'crear' || filaEditar) && (
        <div className="pt-fondo" onClick={() => !guardando && setForm(null)}>
          <form
            key={form.modo === 'editar' ? form.num : 'nuevo'}
            className="pt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-form-t"
            onClick={(e) => e.stopPropagation()}
            onSubmit={enviar}
          >
            <div className="pt-modal-cab">
              <div>
                <h3 id="pt-form-t">{form.modo === 'editar' ? `Editar pedido ${form.num}` : 'Nuevo pedido'}</h3>
              </div>
              <button type="button" className="pt-cerrar" onClick={() => setForm(null)} disabled={guardando} aria-label="Cerrar">×</button>
            </div>
            <p className="pt-modal-sub">
              {form.modo === 'editar' ? 'Los cambios se guardan en la hoja de pedidos.' : 'Se guardará en la hoja de pedidos de tu joyería.'}
            </p>

            <div className="pt-form">
              {campos.map((c) => {
                const primera = typeof c.opciones?.[0] === 'string' ? c.opciones?.[0] : c.opciones?.[0]?.value;
                const inicial = form.modo === 'editar' ? valores[c.name] ?? '' : '';
                return (
                  <div key={c.name} className={c.completo ? 'completo' : undefined}>
                    <label htmlFor={`f-${c.name}`}>{c.label}</label>
                    {c.tipo === 'select' ? (
                      <select id={`f-${c.name}`} name={c.name} defaultValue={form.modo === 'editar' ? inicial : primera}>
                        {c.opciones?.map((o) => {
                          const v = typeof o === 'string' ? o : o.value;
                          const l = typeof o === 'string' ? o : o.label;
                          return <option key={v} value={v}>{l}</option>;
                        })}
                      </select>
                    ) : c.tipo === 'textarea' ? (
                      <textarea id={`f-${c.name}`} name={c.name} rows={3} maxLength={300} placeholder={c.placeholder} defaultValue={inicial} />
                    ) : (
                      <input
                        id={`f-${c.name}`}
                        name={c.name}
                        type={c.tipo}
                        required={c.requerido}
                        placeholder={c.placeholder}
                        defaultValue={inicial}
                        min={c.tipo === 'number' ? 0 : undefined}
                        inputMode={c.tipo === 'number' ? 'numeric' : c.name === 'telefono' ? 'tel' : undefined}
                        autoFocus={form.modo === 'crear' && c === campos[0]}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="pt-error" role="alert">{error}</p>}

            <div className="pt-modal-pie">
              <button type="button" className="pt-btn linea" onClick={() => setForm(null)} disabled={guardando}>Cancelar</button>
              <button type="submit" className="pt-btn dorado" disabled={guardando}>
                {guardando ? 'Guardando…' : form.modo === 'editar' ? 'Guardar cambios' : 'Guardar pedido'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────── Modal: confirmar eliminación ───────── */}
      {filaBorrar && (
        <div className="pt-fondo" onClick={() => !guardando && setBorrar(null)}>
          <div className="pt-modal chico" role="alertdialog" aria-modal="true" aria-labelledby="pt-del-t" onClick={(e) => e.stopPropagation()}>
            <div className="pt-modal-cab">
              <h3 id="pt-del-t">¿Eliminar el pedido {texto(filaBorrar[C.num])}?</h3>
            </div>
            <p className="pt-modal-sub" style={{ paddingBottom: 14 }}>
              Se borrará el pedido de {texto(filaBorrar[C.cliente])} ({texto(filaBorrar[C.prenda])}) de la hoja. Esta acción no se puede deshacer.
            </p>
            {error && <p className="pt-error" role="alert">{error}</p>}
            <div className="pt-modal-pie">
              <button type="button" className="pt-btn linea" onClick={() => setBorrar(null)} disabled={guardando}>Cancelar</button>
              <button type="button" className="pt-btn peligro" onClick={confirmarBorrado} disabled={guardando}>
                {guardando ? 'Eliminando…' : 'Eliminar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}