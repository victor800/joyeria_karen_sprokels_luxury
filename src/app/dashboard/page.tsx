// 📁 RUTA: src/app/dashboard/page.tsx
import Link from 'next/link';
import { Saludo } from '@/components/dashboard/Reloj';
import { PRECIOS_ORO, cop } from '@/lib/datos-dashboard';

const KPIS = [
  { t: 'Ventas de hoy', v: '$0' },
  { t: 'Ventas del mes', v: '$0' },
  { t: 'Pedidos activos', v: '0' },
  { t: 'Ticket promedio', v: '$0' },
  { t: 'Oro en bóveda', v: '0 g' },
  { t: 'Retiros pendientes', v: '0' },
  { t: 'Domicilios en ruta', v: '0' },
  { t: 'Stock bajo', v: '0' },
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const CATEGORIAS = ['Anillos', 'Cadenas', 'Aretes', 'Esclavas', 'Dijes'];
const ATENDER = [
  { t: 'Pedidos por despachar', href: '/dashboard/pedidos' },
  { t: 'Retiros de bóveda solicitados', href: '/dashboard/boveda' },
  { t: 'Prendas con stock bajo', href: '/dashboard/prendas' },
  { t: 'Domicilios sin asignar', href: '/dashboard/domiciliarios' },
];
const ACCIONES = [
  { t: 'Nueva venta', href: '/dashboard/pedidos', principal: true },
  { t: 'Nueva prenda', href: '/dashboard/prendas' },
  { t: 'Registrar custodia', href: '/dashboard/boveda' },
];

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

export default function Inicio() {
  return (
    <main>
      <section className="d-hero">
        <div className="d-hero-txt">
          <small>PANEL DE ADMINISTRACIÓN · JOYERÍA JKS</small>
          <h1>
            <Saludo />, <em>Karen.</em>
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
            {(Object.keys(PRECIOS_ORO) as Array<keyof typeof PRECIOS_ORO>).map((k) => (
              <span key={k}>
                <em>{k}</em>
                <strong>{PRECIOS_ORO[k] ? cop(PRECIOS_ORO[k] as number) : '—'}</strong>
              </span>
            ))}
          </div>
          <Link href="/dashboard/configuracion">Configurar precios →</Link>
        </div>
      </section>

      <div className="d-cont">
        <div className="d-kpis">
          {KPIS.map((k) => (
            <div key={k.t} className="d-card d-kpi">
              <small>{k.t}</small>
              <strong>{k.v}</strong>
              <span className="d-nada">Sin datos aún</span>
            </div>
          ))}
        </div>

        <div className="d-duo">
          <section className="d-card">
            <h3>Ventas de los últimos 7 días</h3>
            <div className="d-barras" role="img" aria-label="Sin ventas registradas">
              {DIAS.map((d) => (
                <div key={d}><i className="vacia" />{d}</div>
              ))}
            </div>
          </section>
          <section className="d-card">
            <h3>Ventas por categoría</h3>
            <ul className="d-cats">
              {CATEGORIAS.map((c) => (
                <li key={c}><span>{c}</span><b>0%</b><i><u /></i></li>
              ))}
            </ul>
          </section>
        </div>

        <div className="d-trio">
          <section className="d-card">
            <h3>Pedidos recientes</h3>
            <Vacio texto="Aún no hay pedidos." href="/dashboard/pedidos" accion="Crear el primero" />
          </section>
          <section className="d-card">
            <h3>Por atender</h3>
            <ul className="d-atender">
              {ATENDER.map((a) => (
                <li key={a.t}>
                  <Link href={a.href}><span>{a.t}</span><b>0</b></Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="d-card">
            <h3>Domiciliarios en turno</h3>
            <Vacio texto="Ningún domiciliario registrado." href="/dashboard/domiciliarios" accion="Agregar" />
          </section>
        </div>

        <div className="d-duo inv">
          <section className="d-card">
            <h3>Prendas más vendidas</h3>
            <Vacio texto="Se mostrarán cuando registre sus primeras ventas." />
          </section>
          <section className="d-card">
            <h3>Actividad reciente</h3>
            <Vacio texto="Aquí verá cada movimiento: ventas, retiros y entregas." />
          </section>
        </div>
      </div>
    </main>
  );
}