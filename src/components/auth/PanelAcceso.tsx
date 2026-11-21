// 📁 RUTA: components/auth/PanelAcceso.tsx
'use client';

import { useState, type FormEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icono } from './iconos';

/**
 * MODO DEMO: mientras sea true, "Ingresar" y "Continuar con Apple" llevan
 * directo al dashboard, sin validar nada.
 * Cuando conectes la autenticación real, ponlo en false.
 */
const SIN_VALIDACION = true;

const RUTAS = {
  login: '/api/auth/login',
  registro: '/api/auth/registro',
  apple: '/api/auth/apple',
  recuperar: '/recuperar',
  destino: '/dashboard',
};

type Modo = 'acceso' | 'registro';

const NIVELES = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];

function fuerza(clave: string) {
  if (!clave) return 0;
  let p = 1;
  if (clave.length >= 8) p++;
  if (/[a-z]/.test(clave) && /[A-Z]/.test(clave)) p++;
  if (/\d/.test(clave)) p++;
  if (/[^A-Za-z0-9]/.test(clave)) p++;
  return Math.min(p, 5);
}

/* ── Iconos locales (SVG inline) ── */
const svg = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};
const IcoLlave = () => (<svg {...svg}><circle cx="7.5" cy="12" r="3.5" /><path d="M11 12h10M18 12v3M15 12v2" /></svg>);
const IcoFlecha = () => (<svg {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
const IcoCedula = () => (<svg {...svg}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.6 2-2.3 3-2.3s2.4.7 3 2.3M15 10h3M15 13h3" /></svg>);
const IcoExterno = () => (<svg {...svg} width={13} height={13}><path d="M7 17 17 7M9 7h8v8" /></svg>);
const IcoAuricular = () => (<svg {...svg} width={13} height={13}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>);
const IcoCandado = () => (<svg {...svg} width={12} height={12}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const IcoApple = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  etiqueta: string;
  final?: ReactNode;
};

function Campo({ id, etiqueta, final, ...input }: CampoProps) {
  return (
    <div className="jks-grupo">
      <label htmlFor={id} className="jks-etiqueta">{etiqueta}</label>
      <div className="jks-campo">
        <input id={id} className="jks-input" {...input} />
        {final}
      </div>
    </div>
  );
}

export default function PanelAcceso() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('acceso');
  const [verClave, setVerClave] = useState(false);
  const [mayus, setMayus] = useState(false);
  const [claveReg, setClaveReg] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoA, setCargandoA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const nivel = fuerza(claveReg);

  function cambiar(m: Modo) {
    setModo(m);
    setError(null);
    setOk(null);
    setVerClave(false);
  }

  function detectarMayus(e: KeyboardEvent<HTMLInputElement>) {
    setMayus(e.getModifierState('CapsLock'));
  }

  async function enviar(e: FormEvent<HTMLFormElement>, url: string, esRegistro: boolean) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setOk(null);

    // ── MODO DEMO: entra directo al dashboard, sin validar ──
    if (SIN_VALIDACION && !esRegistro) {
      setCargando(true);
      router.push(RUTAS.destino);
      return;
    }

    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries());

    if (esRegistro) {
      if (datos.clave !== datos.confirmar) return setError('Las claves no coinciden.');
      if (nivel < 3) return setError('Use una clave más segura: 8+ caracteres, mayúsculas, números y símbolos.');
    }

    setCargando(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No fue posible completar la solicitud.');

      if (esRegistro) {
        setOk('Solicitud recibida. Nuestro equipo validará sus datos y le contactará pronto.');
        form.reset();
        setClaveReg('');
      } else {
        router.push(json.redirect ?? RUTAS.destino);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intente nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  function ingresarApple() {
    setCargandoA(true);
    if (SIN_VALIDACION) {
      router.push(RUTAS.destino);
      return;
    }
    window.location.href = RUTAS.apple;
  }

  const botonOjo = (
    <button
      type="button"
      className="jks-ojo"
      onClick={() => setVerClave((v) => !v)}
      aria-label={verClave ? 'Ocultar clave' : 'Mostrar clave'}
    >
      <Icono nombre={verClave ? 'eyeOff' : 'eye'} />
    </button>
  );

  const mensajes = (
    <>
      {error && (<p className="jks-error" role="alert"><Icono nombre="alert" /> {error}</p>)}
      {ok && (<p className="jks-exito" role="status"><Icono nombre="shieldCheck" /> {ok}</p>)}
    </>
  );

  const apple = (
    <>
      <div className="jks-divisor"><span>O CONTINUAR CON</span></div>
      <div className="jks-sociales">
        <button type="button" className="jks-boton-apple" onClick={ingresarApple} disabled={cargandoA}>
          {cargandoA ? <span className="jks-spinner jks-spinner-claro" aria-hidden="true" /> : <IcoApple />}
          <span>{cargandoA ? 'Conectando…' : 'CONTINUAR CON APPLE'}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="jks-panel" key={modo}>
      <div className="jks-panel-marca">
        <span className="jks-mini-sello">JKS</span>
        <span className="jks-panel-marca-texto">
          PRIVATE BANKING &amp; CLUB
          <br />
          BÓVEDA DE ORO 18K
        </span>
      </div>

      {modo === 'acceso' ? (
        <>
          <header className="jks-panel-cab">
            <h2 className="jks-titulo-panel">Ingreso de Miembros</h2>
            <p className="jks-texto">
              Consulte su cartera de piezas en oro certificado y solicite retiros o adquisiciones directas.
            </p>
          </header>

          <form onSubmit={(e) => enviar(e, RUTAS.login, false)} className="jks-form">
            <Campo
              id="correo"
              name="correo"
              etiqueta="Cédula VIP o correo registrado"
              type="text"
              required={!SIN_VALIDACION}
              autoComplete="username"
              placeholder="socio.vip@karensprockel.com"
              final={<span className="jks-ico-campo"><IcoCedula /></span>}
            />
            <Campo
              id="clave"
              name="clave"
              etiqueta="Clave de bóveda"
              type={verClave ? 'text' : 'password'}
              required={!SIN_VALIDACION}
              autoComplete="current-password"
              placeholder="••••••••••••"
              onKeyUp={detectarMayus}
              onKeyDown={detectarMayus}
              final={botonOjo}
            />
            {mayus && (
              <p className="jks-aviso" role="status"><Icono nombre="alert" /> Bloq Mayús está activado.</p>
            )}

            <div className="jks-fila-opciones">
              <label className="jks-check">
                <input type="checkbox" name="recordar" defaultChecked />
                <span className="jks-check-caja"><Icono nombre="check" /></span>
                Recordar credencial
              </label>
              <a href={RUTAS.recuperar} className="jks-enlace">¿Olvidó su clave?</a>
            </div>

            {mensajes}

            <button type="submit" className="jks-boton-oro" disabled={cargando}>
              {cargando ? <span className="jks-spinner" aria-hidden="true" /> : <IcoLlave />}
              <span>{cargando ? 'VERIFICANDO…' : 'INGRESAR AHORA'}</span>
              {!cargando && <IcoFlecha />}
            </button>
          </form>

          {apple}

          <div className="jks-asesor">
            <button type="button" className="jks-asesor-enlace" onClick={() => cambiar('registro')}>
              SOLICITAR MEMBRESÍA Y ASESOR VIP <IcoExterno />
            </button>
            <span className="jks-asesor-sub"><IcoAuricular /> Atención Directa &amp; Concierge 24/7</span>
          </div>
        </>
      ) : (
        <>
          <header className="jks-panel-cab">
            <h2 className="jks-titulo-panel">Solicitar membresía</h2>
            <p className="jks-texto">Validaremos sus datos y le notificaremos por correo.</p>
          </header>

          <form onSubmit={(e) => enviar(e, RUTAS.registro, true)} className="jks-form">
            <Campo id="nombre" name="nombre" etiqueta="Nombre completo" type="text" required autoComplete="name" placeholder="Nombre y apellidos" />
            <Campo id="reg-correo" name="correo" etiqueta="Correo electrónico" type="email" required autoComplete="email" placeholder="correo@ejemplo.com" />
            <Campo id="telefono" name="telefono" etiqueta="Teléfono / WhatsApp" type="tel" required autoComplete="tel" placeholder="300 000 0000" />
            <Campo
              id="reg-clave" name="clave" etiqueta="Clave de bóveda"
              type={verClave ? 'text' : 'password'} required minLength={8}
              autoComplete="new-password" placeholder="Mínimo 8 caracteres"
              value={claveReg} onChange={(e) => setClaveReg(e.target.value)}
              final={botonOjo}
            />
            <Campo
              id="confirmar" name="confirmar" etiqueta="Confirmar clave"
              type={verClave ? 'text' : 'password'} required minLength={8}
              autoComplete="new-password" placeholder="Repita su clave"
            />

            <div className="jks-fuerza" data-nivel={nivel} aria-live="polite">
              <div className="jks-fuerza-barras" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (<i key={n} data-on={nivel >= n} />))}
              </div>
              <span>{claveReg ? `Seguridad: ${NIVELES[nivel]}` : 'Use mayúsculas, números y símbolos'}</span>
            </div>

            <label className="jks-check">
              <input type="checkbox" name="terminos" required />
              <span className="jks-check-caja"><Icono nombre="check" /></span>
              Acepto los términos y el tratamiento de mis datos personales.
            </label>

            {mensajes}

            <button type="submit" className="jks-boton-oro" disabled={cargando}>
              {cargando && <span className="jks-spinner" aria-hidden="true" />}
              <span>{cargando ? 'ENVIANDO…' : 'SOLICITAR MEMBRESÍA'}</span>
            </button>
          </form>

          {apple}

          <div className="jks-asesor">
            <button type="button" className="jks-asesor-enlace" onClick={() => cambiar('acceso')}>
              ¿YA TIENE ACCESO? VOLVER A INGRESAR
            </button>
          </div>
        </>
      )}

      <p className="jks-seguro">
        <IcoCandado /> ACCESO CIFRADO 256-BIT · BÓVEDA PROTEGIDA
      </p>
    </div>
  );
}