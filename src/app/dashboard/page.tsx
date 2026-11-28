// 📁 RUTA: src/app/dashboard/page.tsx   (REEMPLAZA TODO EL ARCHIVO)
import Link from 'next/link';
import { SaludoUsuario } from '@/components/dashboard/SaludoUsuario';
import { PedidosRecientes, ActividadReciente } from '@/components/dashboard/TarjetasDashboard';
import GraficoVentas from '@/components/dashboard/GraficoVentas';
import { cop } from '@/lib/datos-dashboard';
import { obtenerResumen } from '@/lib/resumen-dashboard';

// Se calcula en cada visita (con caché de 30 s dentro de obtenerResumen)
export const dynamic = 'force-dynamic';

const CATEGORIAS_VACIAS = ['Anillos', 'Cadenas', 'Aretes', 'Esclavas', 'Dijes'];
const ACCIONES = [
  { t: 'Nueva venta', href: '/dashboard/pedidos', principal: true },
  { t: 'Nueva prenda', href: '/dashboard/prendas' },
  { t: 'Registrar custodia', href: '/dashboard/boveda' },
];

const dinero = (n: number) => (n > 0 ? cop(n) : '$0');
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Vacio({ texto, href, accion }: { texto: string; href?: string; accion?: string }) {
  return (
    <div className="d-vacio">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
        <path d="M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6" />
      </svg>
      <p>{texto}</p>
      {href && accion && <Link href={href}>{accion.toUpperCase()} →</Link>}
    </div>
  );
}

export default async function Inicio() {
  const r = await obtenerResumen();
  const k = r.kpis;
  // Fecha de hoy en Bogotá (AAAA-MM-DD) para rotular los días del gráfico
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

  const KPIS = [
    { t: 'Ventas de hoy', v: dinero(k.ventasHoy), sub: plural(k.pedidosHoy, 'pedido', 'pedidos'), href: '/dashboard/hans' },
    { t: 'Ventas del mes', v: dinero(k.ventasMes), sub: plural(k.pedidosMes, 'pedido', 'pedidos'), href: '/dashboard/hans' },
    { t: 'Pedidos activos', v: String(k.activos), sub: `${k.porDespachar} por despachar`, href: '/dashboard/hans' },
    { t: 'Ticket promedio', v: dinero(k.ticket), sub: 'Promedio del mes' },
    { t: 'Oro en bóveda', v: '—', sub: 'Sin conectar aún', href: '/dashboard/boveda' },
    { t: 'Retiros pendientes', v: '—', sub: 'Sin conectar aún', href: '/dashboard/boveda' },
    { t: 'Domicilios en ruta', v: String(k.enRuta), sub: plural(r.domiciliarios.length, 'domiciliario', 'domiciliarios'), href: '/dashboard/domiciliarios' },
    { t: 'Stock bajo', v: String(k.stockBajo), sub: 'Quedan 1 o menos unidades', href: '/dashboard/prendas' },
  ];

  const ATENDER = [
    { t: 'Pedidos por despachar', href: '/dashboard/hans', n: String(k.porDespachar) },
    { t: 'Retiros de bóveda solicitados', href: '/dashboard/boveda', n: '—' },
    { t: 'Prendas y artículos con stock bajo', href: '/dashboard/prendas', n: String(k.stockBajo) },
    { t: 'Domicilios sin asignar', href: '/dashboard/hans', n: String(k.sinAsignar) },
  ];

  const categorias = r.categorias.length
    ? r.categorias
    : CATEGORIAS_VACIAS.map((nombre) => ({ nombre, n: 0, pct: 0 }));

  const oro = r.oro
    ? [
        { k: '24K', v: r.oro.k24 },
        { k: '18K', v: r.oro.k18 },
      ]
    : [];

  return (
    <main>
      <section className="d-hero">
        <div className="d-hero-txt">
          <small>PANEL DE ADMINISTRACIÓN · JOYERÍA JKS</small>
          <h1>
            <SaludoUsuario />
          </h1>
          <p>Aquí está el pulso de su joyería: ventas, pedidos, bóveda y domicilios.</p>
          <div className="d-acciones">
            {ACCIONES.map((a) => (
              <Link key={a.t} href={a.href} className={`d-btn${a.principal ? '' : ' linea'}`}>
                {a.t.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        <div className="d-precios" aria-label="Precio del oro por gramo">
          <small>PRECIO DEL GRAMO DE ORO</small>
          <div>
            {oro.map((o) => (
              <span key={o.k}>
                <em>{o.k}</em>
                <strong>{o.v ? cop(o.v) : '—'}</strong>
              </span>
            ))}
          </div>
          <Link href="/dashboard/configuracion">Configurar precios →</Link>
        </div>
      </section>

      <div className="d-cont">
        {r.fallos.length > 0 && (
          <p className="d-aviso" role="status">
            No se pudo leer: {r.fallos.join(', ')}. Los números de abajo pueden estar incompletos.
          </p>
        )}

        <div className="d-kpis">
          {KPIS.map((x) => {
            const cuerpo = (
              <>
                <small>{x.t}</small>
                <strong>{x.v}</strong>
                <span className="d-nada">{x.sub}</span>
              </>
            );
            // Las tarjetas con destino son clicables
            return x.href ? (
              <Link key={x.t} href={x.href} className="d-card d-kpi" style={{ textDecoration: 'none', color: 'inherit' }}>
                {cuerpo}
              </Link>
            ) : (
              <div key={x.t} className="d-card d-kpi">{cuerpo}</div>
            );
          })}
        </div>

        <div className="d-duo">
          <section className="d-card">
            <GraficoVentas datos={r.semana.map((d) => ({ letra: d.letra, total: d.total }))} hoy={hoy} />
          </section>
          <section className="d-card">
            <h3>Catálogo por categoría</h3>
            <ul className="d-cats">
              {categorias.map((c) => (
                <li key={c.nombre} title={`${c.nombre}: ${plural(c.n, 'prenda', 'prendas')} (${c.pct}%)`}>
                  <span>{c.nombre} <small className="gr-n">· {c.n}</small></span>
                  <b>{c.pct}%</b>
                  <i><u style={{ width: `${c.pct}%` }} /></i>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="d-trio">
          {/* Con búsqueda, filtro por estado, paginación y exportar CSV */}
          <PedidosRecientes pedidos={r.recientes} />
          <section className="d-card">
            <h3>Por atender</h3>
            <ul className="d-atender">
              {ATENDER.map((a) => (
                <li key={a.t}>
                  <Link href={a.href}><span>{a.t}</span><b>{a.n}</b></Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="d-card">
            <h3>Domiciliarios en turno</h3>
            {r.domiciliarios.length === 0 ? (
              <Vacio texto="Ningún domiciliario en ruta ahora." href="/dashboard/domiciliarios" accion="Ver domiciliarios" />
            ) : (
              <ul className="d-feed">
                {r.domiciliarios.map((d) => (
                  <li key={d.nombre}>
                    <span className="d-l-main">
                      <b>{d.nombre}</b>
                      {d.telefono && <small>{d.telefono}</small>}
                    </span>
                    <span className="d-l-der"><b>{plural(d.pedidos, 'entrega', 'entregas')}</b><small>en ruta</small></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="d-duo inv">
          <section className="d-card">
            <h3>Prendas más vendidas</h3>
            <Vacio texto="Se mostrarán cuando los pedidos registren qué prendas se vendieron." />
          </section>
          <ActividadReciente actividad={r.actividad} />
        </div>
      </div>
    </main>
  );
}