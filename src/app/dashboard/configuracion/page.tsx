// 📁 RUTA: src/app/dashboard/configuracion/page.tsx
export default function Configuracion() {
  return (
    <main className="d-cont simple">
      <div className="d-cab">
        <div>
          <h1>Configuración</h1>
          <p>Datos de la joyería, precios del oro y entregas.</p>
        </div>
        <button type="button" className="d-btn">GUARDAR CAMBIOS</button>
      </div>

      <section className="d-card">
        <h3>Datos de la joyería</h3>
        <div className="d-form">
          <div><label htmlFor="n">Nombre</label><input id="n" placeholder="Nombre comercial" /></div>
          <div><label htmlFor="nit">NIT</label><input id="nit" placeholder="000.000.000-0" /></div>
          <div><label htmlFor="t">Teléfono / WhatsApp</label><input id="t" placeholder="+57 300 000 0000" /></div>
          <div><label htmlFor="c">Correo de contacto</label><input id="c" type="email" placeholder="contacto@sudominio.com" /></div>
          <div><label htmlFor="d">Dirección</label><input id="d" placeholder="Ciudad, barrio y dirección" /></div>
          <div><label htmlFor="ig">Instagram</label><input id="ig" placeholder="@sutienda" /></div>
        </div>
      </section>

      <section className="d-card">
        <h3>Precio del gramo de oro (COP)</h3>
        <div className="d-form">
          <div><label htmlFor="p24">Oro 24K</label><input id="p24" inputMode="numeric" placeholder="0" /></div>
          <div><label htmlFor="p18">Oro 18K</label><input id="p18" inputMode="numeric" placeholder="0" /></div>
          <div><label htmlFor="p14">Oro 14K</label><input id="p14" inputMode="numeric" placeholder="0" /></div>
          <div><label htmlFor="mg">Margen sobre el precio (%)</label><input id="mg" inputMode="decimal" placeholder="0" /></div>
        </div>
      </section>

      <section className="d-card">
        <h3>Entregas y domicilios</h3>
        <div className="d-form">
          <div><label htmlFor="z">Costo de domicilio (COP)</label><input id="z" inputMode="numeric" placeholder="0" /></div>
          <div><label htmlFor="h">Horario de entregas</label><input id="h" placeholder="Ej.: Lun–Sáb 9:00–18:00" /></div>
          <div><label htmlFor="cb">Zonas de cobertura</label><input id="cb" placeholder="Ej.: Medellín, Envigado, Sabaneta" /></div>
          <div><label htmlFor="sg">Seguro por envío (%)</label><input id="sg" inputMode="decimal" placeholder="0" /></div>
        </div>
      </section>
    </main>
  );
}