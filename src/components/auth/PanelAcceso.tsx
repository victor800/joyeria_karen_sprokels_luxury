// 📁 RUTA: src/components/auth/PanelAcceso.tsx   (REEMPLAZA TODO EL ARCHIVO)
'use client';

import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRedirectResult, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut,
  type AuthProvider, type User,
} from 'firebase/auth';
import { getClientAuth, proveedorApple, proveedorGoogle } from '@/lib/firebase/client';
import { Icono } from './iconos';

/**
 * Acceso real con Firebase (correo y clave, Google o Apple).
 * Firebase confirma quién es la persona; luego /api/auth/session revisa que el correo esté en ADMIN_EMAILS
 * y crea la cookie que protege /dashboard (ver src/proxy.ts).
 */
const RUTAS = {
  sesion: '/api/auth/session',
  registro: '/api/auth/registro',
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

/** Primer nombre para el saludo: displayName de Google/Apple, o la parte del correo antes de la @ */
function nombreDe(user: User): string {
  const crudo = user.displayName?.trim() || user.email?.split('@')[0] || '';
  const primero = crudo.split(/[\s._-]+/)[0] ?? '';
  return primero ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : '';
}

/** Mensajes de Firebase en español */
function mensajeError(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Correo o clave incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espere unos minutos o restablezca su clave.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revise su internet e intente de nuevo.';
    case 'auth/account-exists-with-different-credential':
      return 'Este correo ya entra con otro método. Use el mismo con el que se registró.';
    case 'auth/operation-not-allowed':
      return 'Este método de acceso no está activado en Firebase.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null; // la persona cerró la ventana: no es un error
    default:
      return err instanceof Error && err.message && !code ? err.message : 'No fue posible iniciar sesión. Intente nuevamente.';
  }
}

/* ── Iconos locales (SVG inline) ── */
const svg = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};
const IcoLlave = () => (<svg {...svg}><circle cx="7.5" cy="12" r="3.5" /><path d="M11 12h10M18 12v3M15 12v2" /></svg>);
const IcoFlecha = () => (<svg {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
const IcoCorreo = () => (<svg {...svg}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
const IcoExterno = () => (<svg {...svg} width={13} height={13}><path d="M7 17 17 7M9 7h8v8" /></svg>);
const IcoAuricular = () => (<svg {...svg} width={13} height={13}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>);
const IcoCandado = () => (<svg {...svg} width={12} height={12}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const IcoApple = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);
const IcoGoogle = () => (
  <svg width={16} height={16} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  etiqueta: string;
  final?: ReactNode;
  ref?: Ref<HTMLInputElement>;   // React 19: ref llega como prop normal
};

function Campo({ id, etiqueta, final, ref, ...input }: CampoProps) {
  return (
    <div className="jks-grupo">
      <label htmlFor={id} className="jks-etiqueta">{etiqueta}</label>
      <div className="jks-campo">
        <input ref={ref} id={id} className="jks-input" {...input} />
        {final}
      </div>
    </div>
  );
}

type Cargando = null | 'clave' | 'google' | 'apple' | 'registro';

export default function PanelAcceso() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('acceso');
  const [verClave, setVerClave] = useState(false);
  const [mayus, setMayus] = useState(false);
  const [claveReg, setClaveReg] = useState('');
  const [cargando, setCargando] = useState<Cargando>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bienvenida, setBienvenida] = useState<string | null>(null); // nombre para el saludo tras entrar
  const correoRef = useRef<HTMLInputElement>(null);
  const recordarRef = useRef<HTMLInputElement>(null);

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

  /** A dónde volver después de entrar (ej. /login?volver=/dashboard/pedidos) */
  function destino() {
    const v = new URLSearchParams(window.location.search).get('volver') ?? '';
    return /^\/(dashboard|admin)(\/|$|\?)/.test(v) ? v : RUTAS.destino;
  }

  /** Firebase ya confirmó a la persona → el servidor revisa ADMIN_EMAILS y crea la cookie del panel */
  async function crearSesion(user: User) {
    const nombre = nombreDe(user); // se toma antes de cerrar la sesión de Firebase en el navegador
    const idToken = await user.getIdToken(true);
    const res = await fetch(RUTAS.sesion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, recordar: recordarRef.current?.checked ?? true }),
    });
    const json = await res.json().catch(() => ({}));
    // La cookie del servidor es la que manda; la sesión del navegador ya no se necesita
    await signOut(getClientAuth()).catch(() => {});
    if (!res.ok) throw new Error(json.error ?? 'No fue posible iniciar sesión.');

    // Acceso correcto: saludo breve con el nombre y luego al panel
    setBienvenida(nombre);
    await new Promise((r) => setTimeout(r, 1800));
    router.replace(destino());
    router.refresh();
  }

  /* Si se usó el método de redirección (Safari bloqueó la ventana), aquí se recibe el resultado */
  useEffect(() => {
    let vivo = true;
    getRedirectResult(getClientAuth())
      .then(async (r) => {
        if (!r?.user || !vivo) return;
        setCargando('google');
        await crearSesion(r.user);
      })
      .catch((err) => { if (vivo) setError(mensajeError(err)); })
      .finally(() => { if (vivo) setCargando(null); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ingresarCon(cual: 'google' | 'apple') {
    if (cargando) return;
    setError(null);
    setOk(null);
    setCargando(cual);
    const proveedor: AuthProvider = cual === 'google' ? proveedorGoogle : proveedorApple;
    try {
      const r = await signInWithPopup(getClientAuth(), proveedor);
      await crearSesion(r.user);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // iPhone / navegador que bloquea ventanas: se usa redirección completa
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(getClientAuth(), proveedor);
        return;
      }
      setError(mensajeError(err));
      setCargando(null);
    }
  }

  async function ingresarClave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setOk(null);
    const datos = new FormData(e.currentTarget);
    const correo = String(datos.get('correo') ?? '').trim();
    const clave = String(datos.get('clave') ?? '');
    if (!correo || !clave) return setError('Escriba su correo y su clave.');

    setCargando('clave');
    try {
      const r = await signInWithEmailAndPassword(getClientAuth(), correo, clave);
      await crearSesion(r.user);
    } catch (err) {
      setError(mensajeError(err));
      setCargando(null);
    }
  }

  async function recuperarClave() {
    setError(null);
    setOk(null);
    const correo = correoRef.current?.value.trim() ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      correoRef.current?.focus();
      return setError('Escriba su correo arriba y vuelva a tocar "¿Olvidó su clave?".');
    }
    try {
      await sendPasswordResetEmail(getClientAuth(), correo);
    } catch { /* por seguridad no se revela si el correo existe */ }
    setOk(`Si ${correo} tiene acceso, le enviamos un enlace para crear una clave nueva.`);
  }

  async function solicitarMembresia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setOk(null);
    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(form).entries());
    if (datos.clave !== datos.confirmar) return setError('Las claves no coinciden.');
    if (nivel < 3) return setError('Use una clave más segura: 8+ caracteres, mayúsculas, números y símbolos.');

    setCargando('registro');
    try {
      const res = await fetch(RUTAS.registro, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No fue posible completar la solicitud.');
      setOk('Solicitud recibida. Nuestro equipo validará sus datos y le contactará pronto.');
      form.reset();
      setClaveReg('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intente nuevamente.');
    } finally {
      setCargando(null);
    }
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

  const sociales = (
    <>
      <div className="jks-divisor"><span>O CONTINUAR CON</span></div>
      <div className="jks-sociales" style={{ display: 'grid', gap: 10 }}>
        <button type="button" className="jks-boton-apple jks-boton-google" onClick={() => ingresarCon('google')} disabled={!!cargando}>
          {cargando === 'google' ? <span className="jks-spinner" aria-hidden="true" /> : <IcoGoogle />}
          <span>{cargando === 'google' ? 'Conectando…' : 'CONTINUAR CON GOOGLE'}</span>
        </button>
        <button type="button" className="jks-boton-apple" onClick={() => ingresarCon('apple')} disabled={!!cargando}>
          {cargando === 'apple' ? <span className="jks-spinner jks-spinner-claro" aria-hidden="true" /> : <IcoApple />}
          <span>{cargando === 'apple' ? 'Conectando…' : 'CONTINUAR CON APPLE'}</span>
        </button>
      </div>
    </>
  );

  
  if (bienvenida !== null) {
    return (
      <div className="jks-panel" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '56px 0' }}>
        <span className="jks-spinner" aria-hidden="true" style={{ margin: '0 auto 22px', display: 'block' }} />
        <h2 className="jks-titulo-panel">Bienvenido(a){bienvenida ? `, ${bienvenida}` : ''}</h2>
        <p className="jks-texto">Abriendo su bóveda…</p>
      </div>
    );
  }

  return (
    <div className="jks-panel" key={modo}>
      {/* Botón de Google: blanco, como pide Google en su guía de marca */}
      <style>{`
        .jks-boton-google { background: #fff !important; color: #1f1f1f !important; border-color: #dadce0 !important; }
        .jks-boton-google:hover:not(:disabled) { background: #f6f7f8 !important; }
      `}</style>

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

          <form onSubmit={ingresarClave} className="jks-form" noValidate>
            <Campo
              ref={correoRef}
              id="correo"
              name="correo"
              etiqueta="Correo registrado"
              type="email"
              inputMode="email"
              required
              autoComplete="username"
              placeholder="socio.vip@karensprockel.com"
              final={<span className="jks-ico-campo"><IcoCorreo /></span>}
            />
            <Campo
              id="clave"
              name="clave"
              etiqueta="Clave de bóveda"
              type={verClave ? 'text' : 'password'}
              required
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
                <input ref={recordarRef} type="checkbox" name="recordar" defaultChecked />
                <span className="jks-check-caja"><Icono nombre="check" /></span>
                Recordar credencial
              </label>
              <button type="button" className="jks-enlace" onClick={recuperarClave}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}>
                ¿Olvidó su clave?
              </button>
            </div>

            {mensajes}

            <button type="submit" className="jks-boton-oro" disabled={!!cargando}>
              {cargando === 'clave' ? <span className="jks-spinner" aria-hidden="true" /> : <IcoLlave />}
              <span>{cargando === 'clave' ? 'VERIFICANDO…' : 'INGRESAR AHORA'}</span>
              {cargando !== 'clave' && <IcoFlecha />}
            </button>
          </form>

          {sociales}

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

          <form onSubmit={solicitarMembresia} className="jks-form">
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

            <button type="submit" className="jks-boton-oro" disabled={!!cargando}>
              {cargando === 'registro' && <span className="jks-spinner" aria-hidden="true" />}
              <span>{cargando === 'registro' ? 'ENVIANDO…' : 'SOLICITAR MEMBRESÍA'}</span>
            </button>
          </form>

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