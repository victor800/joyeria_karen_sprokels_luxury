// 📁 RUTA: src/app/dashboard/configuracion/ConfiguracionForm.tsx
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Form = Record<string, string>;
type TabId = 'joyeria' | 'oro' | 'entregas';

const TABS: { id: TabId; label: string }[] = [
  { id: 'joyeria', label: 'Joyería' },
  { id: 'oro', label: 'Precio del oro' },
  { id: 'entregas', label: 'Entregas' },
];

/** Todo lo que cuenta para la barra de progreso */
const CAMPOS_UI: { id: string; label: string; tab: TabId }[] = [
  { id: 'nombre', label: 'Nombre', tab: 'joyeria' },
  { id: 'logo_url', label: 'Logo o foto', tab: 'joyeria' },
  { id: 'nit', label: 'NIT', tab: 'joyeria' },
  { id: 'telefono', label: 'Teléfono', tab: 'joyeria' },
  { id: 'correo', label: 'Correo', tab: 'joyeria' },
  { id: 'direccion', label: 'Dirección', tab: 'joyeria' },
  { id: 'instagram', label: 'Instagram', tab: 'joyeria' },
  { id: 'p24', label: 'Oro 24K', tab: 'oro' },
  { id: 'p18', label: 'Oro 18K', tab: 'oro' },
  { id: 'p14', label: 'Oro 14K', tab: 'oro' },
  { id: 'margen', label: 'Margen', tab: 'oro' },
  { id: 'domicilio', label: 'Domicilio', tab: 'entregas' },
  { id: 'horario', label: 'Horario', tab: 'entregas' },
  { id: 'cobertura', label: 'Cobertura', tab: 'entregas' },
  { id: 'seguro', label: 'Seguro', tab: 'entregas' },
];

/** Mínimo para que se habilite el enlace + QR */
const ESENCIALES = ['nombre', 'telefono'];

const VACIO: Form = Object.fromEntries(CAMPOS_UI.map((c) => [c.id, '']));
const DORADO = '#b08d3c';

export default function ConfiguracionForm({ inicial }: { inicial: Record<string, string> }) {
  const arranque: Form = { ...VACIO };
  for (const k of Object.keys(VACIO)) arranque[k] = inicial[k] ?? '';

  const [f, setF] = useState<Form>(arranque);
  const [base, setBase] = useState(JSON.stringify(arranque)); // última versión guardada
  const [tab, setTab] = useState<TabId>('joyeria');
  const cargando = false; // los datos ya llegan listos desde el servidor
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [url, setUrl] = useState(inicial.url_tienda ?? '');
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Generar el QR cuando hay URL
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1c1c1c', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  // ---------- Progreso ----------
  const lleno = (id: string) => (f[id] ?? '').trim() !== '';
  const total = CAMPOS_UI.length;
  const completos = CAMPOS_UI.filter((c) => lleno(c.id)).length;
  const faltan = CAMPOS_UI.filter((c) => !lleno(c.id));
  const pct = Math.round((completos / total) * 100);
  const progresoTab = (id: TabId) => {
    const lista = CAMPOS_UI.filter((c) => c.tab === id);
    return { ok: lista.filter((c) => lleno(c.id)).length, total: lista.length };
  };

  const sucio = JSON.stringify(f) !== base;
  const esencialesOk = ESENCIALES.every(lleno);

  // ---------- Acciones ----------
  const cambiar = (campo: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((prev) => ({ ...prev, [campo]: e.target.value }));
    if (estado === 'error') setEstado('idle');
  };

  async function guardar() {
    setEstado('guardando');
    setErrorMsg('');
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setBase(JSON.stringify(f));
      if (data.url_tienda) setUrl(data.url_tienda);
      setEstado('ok');
      setTimeout(() => setEstado('idle'), 2000);
    } catch (e) {
      setEstado('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error al guardar');
    }
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setEstado('error');
      setErrorMsg('Usa una imagen PNG, JPG o WEBP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEstado('error');
      setErrorMsg('La imagen pesa más de 2 MB');
      return;
    }
    setSubiendo(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/configuracion/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir');
      setF((prev) => ({ ...prev, logo_url: data.url }));
      setEstado('idle');
    } catch (err) {
      setEstado('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setSubiendo(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* sin permiso de portapapeles */
    }
  }

  function descargarQr() {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `qr-${url.split('/').pop() || 'tienda'}.png`;
    a.click();
  }

  // ---------- UI ----------
  const campo = (id: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={f[id] ?? ''} onChange={cambiar(id)} disabled={cargando} {...extra} />
    </div>
  );

  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>Configuración</h1>
          <p>Datos de la joyería, precios del oro y entregas.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {estado === 'error' && (
            <span role="alert" style={{ color: '#a12622', fontSize: 13 }}>{errorMsg}</span>
          )}
          <button
            type="button"
            className="d-btn"
            onClick={guardar}
            disabled={estado === 'guardando' || cargando}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 190 }}
          >
            {estado === 'guardando' && <span className="spin" aria-hidden />}
            {estado === 'ok' && <span aria-hidden>✓</span>}
            {estado === 'guardando' ? 'GUARDANDO' : estado === 'ok' ? 'GUARDADO' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>

      <style>{`
        .spin {
          width: 14px; height: 14px;
          border: 2px solid currentColor; border-top-color: transparent;
          border-radius: 50%; animation: giro .7s linear infinite;
        }
        @keyframes giro { to { transform: rotate(360deg); } }
        .cfg-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(128,128,128,.25); margin-bottom: 16px; overflow-x: auto; }
        .cfg-tab {
          background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
          padding: 10px 16px; font: inherit; color: inherit; opacity: .65; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .cfg-tab:hover { opacity: 1; }
        .cfg-tab[aria-selected="true"] { opacity: 1; border-bottom-color: ${DORADO}; font-weight: 600; }
        .cfg-badge { font-size: 11px; padding: 2px 7px; border-radius: 99px; background: rgba(128,128,128,.18); }
        .cfg-badge.ok { background: #e6f4ea; color: #1e6b34; }
        .cfg-chip {
          font: inherit; font-size: 12px; cursor: pointer; padding: 3px 10px; border-radius: 99px;
          border: 1px solid rgba(128,128,128,.35); background: transparent; color: inherit;
        }
        .cfg-chip:hover { border-color: ${DORADO}; color: ${DORADO}; }
        .cfg-btn2 {
          font: inherit; font-size: 13px; cursor: pointer; padding: 9px 16px; border-radius: 8px;
          border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit;
        }
        .cfg-btn2:hover { border-color: ${DORADO}; }
        .cfg-btn2.fill { background: #1c1c1c; color: #fff; border-color: #1c1c1c; }
      `}</style>

      {/* ---------- Barra de progreso ---------- */}
      <section className="d-card" aria-label="Progreso de la configuración">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Configuración completada</h3>
          <strong style={{ color: DORADO }}>{pct}%</strong>
        </div>
        <div
          role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          style={{ height: 8, borderRadius: 99, background: 'rgba(128,128,128,.2)', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: DORADO, transition: 'width .4s ease' }} />
        </div>
        <p style={{ fontSize: 13, opacity: .75, margin: '10px 0 0' }}>
          {faltan.length === 0
            ? '¡Todo listo! Tu tienda tiene todos los datos.'
            : `${completos} de ${total} datos listos. Te falta:`}
        </p>
        {faltan.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {faltan.map((c) => (
              <button key={c.id} type="button" className="cfg-chip" onClick={() => setTab(c.tab)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Pestañas ---------- */}
      <div className="cfg-tabs" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => {
          const p = progresoTab(t.id);
          return (
            <button
              key={t.id} type="button" role="tab" className="cfg-tab"
              aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className={`cfg-badge ${p.ok === p.total ? 'ok' : ''}`}>{p.ok}/{p.total}</span>
            </button>
          );
        })}
      </div>

      {tab === 'joyeria' && (
        <section className="d-card" role="tabpanel">
          <h3>Datos de la joyería</h3>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0 20px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 96, height: 96, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                border: '1px dashed rgba(128,128,128,.5)', display: 'grid', placeItems: 'center',
                fontSize: 12, opacity: f.logo_url ? 1 : .6, background: 'rgba(128,128,128,.08)',
              }}
            >
              {f.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logo_url} alt="Logo de la joyería" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'Sin logo'
              )}
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: 4 }}>Logo o foto de la joyería</strong>
              <span style={{ fontSize: 12, opacity: .7, display: 'block', marginBottom: 10 }}>
                PNG, JPG o WEBP · máximo 2 MB. Recuerda guardar los cambios.
              </span>
              <label className="cfg-btn2" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                {subiendo && <span className="spin" aria-hidden />}
                {subiendo ? 'Subiendo...' : f.logo_url ? 'Cambiar imagen' : 'Subir imagen'}
                <input
                  type="file" accept="image/png,image/jpeg,image/webp" hidden
                  onChange={subirLogo} disabled={subiendo || cargando}
                />
              </label>
              {f.logo_url && (
                <button
                  type="button" className="cfg-btn2" style={{ marginLeft: 8 }}
                  onClick={() => setF((p) => ({ ...p, logo_url: '' }))}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="d-form">
            {campo('nombre', 'Nombre', { placeholder: 'Nombre comercial' })}
            {campo('nit', 'NIT', { placeholder: '000.000.000-0' })}
            {campo('telefono', 'Teléfono / WhatsApp', { placeholder: '+57 300 000 0000' })}
            {campo('correo', 'Correo de contacto', { type: 'email', placeholder: 'contacto@sudominio.com' })}
            {campo('direccion', 'Dirección', { placeholder: 'Ciudad, barrio y dirección' })}
            {campo('instagram', 'Instagram', { placeholder: '@sutienda' })}
          </div>
        </section>
      )}

      {tab === 'oro' && (
        <section className="d-card" role="tabpanel">
          <h3>Precio del gramo de oro (COP)</h3>
          <div className="d-form">
            {campo('p24', 'Oro 24K', { inputMode: 'numeric', placeholder: '0' })}
            {campo('p18', 'Oro 18K', { inputMode: 'numeric', placeholder: '0' })}
            {campo('p14', 'Oro 14K', { inputMode: 'numeric', placeholder: '0' })}
            {campo('margen', 'Margen sobre el precio (%)', { inputMode: 'decimal', placeholder: '0' })}
          </div>
        </section>
      )}

      {tab === 'entregas' && (
        <section className="d-card" role="tabpanel">
          <h3>Entregas y domicilios</h3>
          <div className="d-form">
            {campo('domicilio', 'Costo de domicilio (COP)', { inputMode: 'numeric', placeholder: '0' })}
            {campo('horario', 'Horario de entregas', { placeholder: 'Ej.: Lun–Sáb 9:00–18:00' })}
            {campo('cobertura', 'Zonas de cobertura', { placeholder: 'Ej.: Medellín, Envigado, Sabaneta' })}
            {campo('seguro', 'Seguro por envío (%)', { inputMode: 'decimal', placeholder: '0' })}
          </div>
        </section>
      )}

      {/* ---------- Enlace + QR ---------- */}
      <section className="d-card" style={{ textAlign: 'center' }} aria-label="Enlace de la tienda">
        <h3>Tu tienda en línea</h3>

        {!esencialesOk || !url ? (
          <p style={{ opacity: .7, fontSize: 14, margin: '8px auto 0', maxWidth: 420 }}>
            Completa el <strong>nombre</strong> y el <strong>teléfono</strong> para generar
            el enlace y el código QR de tu tienda.
          </p>
        ) : (
          <div style={{ maxWidth: 380, margin: '0 auto' }}>
            <div
              style={{
                background: '#fff', borderRadius: 20, padding: 20, margin: '12px auto 16px',
                boxShadow: '0 6px 24px rgba(0,0,0,.10)', border: `1px solid ${DORADO}55`,
              }}
            >
              {f.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.logo_url} alt=""
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', marginBottom: 8 }}
                />
              )}
              <div style={{ color: '#1c1c1c', fontWeight: 600, marginBottom: 12 }}>{f.nombre}</div>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`Código QR de ${f.nombre}`} style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }} />
              ) : (
                <div style={{ height: 260, display: 'grid', placeItems: 'center', color: '#888' }}>Generando QR...</div>
              )}
            </div>

            <div
              style={{
                fontSize: 13, padding: '10px 12px', borderRadius: 8, wordBreak: 'break-all',
                background: 'rgba(128,128,128,.12)', marginBottom: 12,
              }}
            >
              {url}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="cfg-btn2 fill" onClick={descargarQr} disabled={!qr}>
                Descargar QR
              </button>
              <button type="button" className="cfg-btn2" onClick={copiar}>
                {copiado ? '✓ Copiado' : 'Copiar enlace'}
              </button>
            </div>

            {sucio && (
              <p style={{ fontSize: 12, color: DORADO, marginTop: 12 }}>
                Tienes cambios sin guardar. Guárdalos para que tu tienda se actualice.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}