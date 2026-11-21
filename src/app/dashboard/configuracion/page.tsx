// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Form = Record<string, string>;

const VACIO: Form = {
  nombre: '', nit: '', telefono: '', correo: '', direccion: '', instagram: '',
  p24: '', p18: '', p14: '', margen: '',
  domicilio: '', horario: '', cobertura: '', seguro: '',
};

export default function Configuracion() {
  const [f, setF] = useState<Form>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Cargar lo que ya está guardado en la hoja
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/configuracion', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar');
        setF((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(prev)) next[k] = data[k] ?? '';
          return next;
        });
      } catch (e) {
        setMsg({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error al cargar' });
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const cambiar = (campo: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((prev) => ({ ...prev, [campo]: e.target.value }));
    setMsg(null);
  };

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setMsg({ tipo: 'ok', texto: '✅ Datos guardados con éxito' });
    } catch (e) {
      setMsg({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  }

  const campo = (id: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={f[id]} onChange={cambiar(id)} disabled={cargando} {...extra} />
    </div>
  );

  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>Configuración</h1>
          <p>Datos de la joyería, precios del oro y entregas.</p>
        </div>
        <button type="button" className="d-btn" onClick={guardar} disabled={guardando || cargando}>
          {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

      {msg && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.tipo === 'ok' ? '#e6f4ea' : '#fdecea',
            color: msg.tipo === 'ok' ? '#1e6b34' : '#a12622',
          }}
        >
          {msg.texto}
        </div>
      )}

      <section className="d-card">
        <h3>Datos de la joyería</h3>
        <div className="d-form">
          {campo('nombre', 'Nombre', { placeholder: 'Nombre comercial' })}
          {campo('nit', 'NIT', { placeholder: '000.000.000-0' })}
          {campo('telefono', 'Teléfono / WhatsApp', { placeholder: '+57 300 000 0000' })}
          {campo('correo', 'Correo de contacto', { type: 'email', placeholder: 'contacto@sudominio.com' })}
          {campo('direccion', 'Dirección', { placeholder: 'Ciudad, barrio y dirección' })}
          {campo('instagram', 'Instagram', { placeholder: '@sutienda' })}
        </div>
      </section>

      <section className="d-card">
        <h3>Precio del gramo de oro (COP)</h3>
        <div className="d-form">
          {campo('p24', 'Oro 24K', { inputMode: 'numeric', placeholder: '0' })}
          {campo('p18', 'Oro 18K', { inputMode: 'numeric', placeholder: '0' })}
          {campo('p14', 'Oro 14K', { inputMode: 'numeric', placeholder: '0' })}
          {campo('margen', 'Margen sobre el precio (%)', { inputMode: 'decimal', placeholder: '0' })}
        </div>
      </section>

      <section className="d-card">
        <h3>Entregas y domicilios</h3>
        <div className="d-form">
          {campo('domicilio', 'Costo de domicilio (COP)', { inputMode: 'numeric', placeholder: '0' })}
          {campo('horario', 'Horario de entregas', { placeholder: 'Ej.: Lun–Sáb 9:00–18:00' })}
          {campo('cobertura', 'Zonas de cobertura', { placeholder: 'Ej.: Medellín, Envigado, Sabaneta' })}
          {campo('seguro', 'Seguro por envío (%)', { inputMode: 'decimal', placeholder: '0' })}
        </div>
      </section>
    </main>
  );
}