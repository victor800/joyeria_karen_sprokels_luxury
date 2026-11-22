// Estilos del módulo, inyectados con <style>: no dependen del bundler, de CSS Modules ni de Tailwind.
// Todas las clases llevan el prefijo "dm-" para no chocar con tu CSS global.
const CSS = `
/* ───────── Página ───────── */
.pagina { padding: 32px 28px 40px; }
.cabecera { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.titulo { margin: 0; font-size: 28px; font-weight: 400; line-height: 1.15; color: #16281d; }
.sub { margin: 4px 0 0; font-size: 12.5px; color: #6b766d; }

/* ───────── Botones ───────── */
.btnOro {
  display: inline-flex; align-items: center; justify-content: center;
  height: 34px; padding: 0 18px; border: 0; border-radius: 999px;
  background: linear-gradient(180deg, #d9b655 0%, #bf9a3f 100%);
  color: #1c1a10; font-family: inherit; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; cursor: pointer;
  box-shadow: 0 1px 2px rgba(120, 90, 20, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: filter 0.15s;
}
.btnOro:hover { filter: brightness(1.06); }
.btnOro:disabled { opacity: 0.55; cursor: default; }

.btnPeligro {
  display: inline-flex; align-items: center; justify-content: center;
  height: 34px; padding: 0 18px; border: 0; border-radius: 999px;
  background: #b8382d; color: #fff; font-family: inherit; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
}
.btnPeligro:hover { filter: brightness(1.08); }
.btnPeligro:disabled { opacity: 0.55; cursor: default; }

.btnGhost {
  height: 34px; padding: 0 18px; border: 1px solid #e3ddd0; border-radius: 999px;
  background: transparent; color: #4d5a51; font-family: inherit; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
}
.btnGhost:hover { background: #f4f0e6; }

.btnExportar {
  height: 30px; padding: 0 16px; border: 1px solid #e3ddd0; border-radius: 999px;
  background: transparent; color: #b8963e; font-family: inherit; font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
}
.btnExportar:hover { background: #f4f0e6; }
.btnExportar:disabled { opacity: 0.5; cursor: default; background: transparent; }

/* Botones de ícono (editar / eliminar) */
.acciones { display: flex; align-items: center; gap: 6px; }
.btnIcono {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; min-width: 32px; padding: 0 8px; border: 1px solid transparent; border-radius: 10px;
  background: transparent; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btnIcono svg { flex: none; }
.btnIconoTxt { padding: 0 14px; border-color: #e3ddd0; background: #f4f0e6; }
.icoEditar { color: #8a6a16; }
.icoEditar:hover { background: #f6ecd0; }
.icoEliminar { color: #c0392b; }
.icoEliminar:hover { background: #f7e4e1; }

/* ───────── Tarjeta + barra ───────── */
.tarjeta {
  overflow: hidden; border: 1px solid #e3ddd0; border-radius: 18px;
  background: #faf7f0; box-shadow: 0 8px 30px rgba(60, 50, 20, 0.06);
}
.barra { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 12px 15px; }
.barraDer { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.contador { font-size: 11px; color: #6b766d; white-space: nowrap; }

/* ───────── Campos ───────── */
.campo {
  width: 100%; height: 36px; padding: 0 14px; border: 1px solid #e3ddd0; border-radius: 999px;
  background: #f4f0e6; color: #16281d; font-family: inherit; font-size: 13px;
  outline: none; box-sizing: border-box;
}
.campo::placeholder { color: #8a938c; }
.campo:focus { border-color: #c9a64a; box-shadow: 0 0 0 3px rgba(201, 166, 74, 0.22); }
.campo:disabled { opacity: 0.55; cursor: not-allowed; }
.soloLectura { opacity: 0.7; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.placa { text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; }
.buscar { width: 272px; max-width: 100%; height: 32px; font-size: 12px; }
.filtro { width: auto; height: 32px; font-size: 12px; }

/* ───────── Tabla (escritorio) ───────── */
.movil { display: none; }
.scroll { overflow-x: auto; }
.tabla { width: 100%; border-collapse: collapse; font-size: 13px; color: #16281d; }
.tabla th {
  padding: 11px 15px; border-top: 1px solid #e8e2d4; border-bottom: 1px solid #e8e2d4;
  background: #f3efe5; text-align: left; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: #6c786f; white-space: nowrap;
}
.tabla td { padding: 11px 15px; border-bottom: 1px solid #ece6d9; vertical-align: middle; }
.tabla tbody tr:hover td { background: #f6f2e8; }
.tabla tbody tr:last-child td { border-bottom: 0; }

.celdaNombre { display: flex; align-items: center; gap: 12px; }
.nombreBox { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.nombre { font-weight: 600; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #6b766d; }
.localNombre { display: block; font-size: 12px; }

.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 38px; height: 38px; padding: 0; border: 1px solid #e3ddd0; border-radius: 50%;
  background: #efe7d0; color: #8a6a16; font-family: inherit; font-size: 12px; font-weight: 700; overflow: hidden;
}
button.avatar { cursor: pointer; }
.avatarImg { width: 100%; height: 100%; object-fit: cover; display: block; }

.veh { display: flex; align-items: center; gap: 10px; }
.vehTipo { font-size: 13px; }
.placaChip {
  display: inline-block; margin-left: 8px; padding: 2px 8px; border: 1.5px solid #16281d; border-radius: 6px;
  background: #fff; color: #16281d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
}
.miniFoto {
  flex: none; width: 34px; height: 34px; padding: 0; border: 1px solid #e3ddd0; border-radius: 8px;
  background: #f4f0e6; overflow: hidden; cursor: pointer;
}
.miniFoto img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Estados */
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.punto { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.creado { background: #e4ebf3; color: #3b5b7a; }
.disponible { background: #e3efe6; color: #2f6b47; }
.en_ruta { background: #f6ecd0; color: #8a6a16; }
.en_pausa { background: #ebe5f4; color: #5b4a8a; }
.offline { background: #ece9e1; color: #6b6b62; }
.suspendido { background: #f7e4e1; color: #a23b32; }

.vacio { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 44px 16px; text-align: center; font-size: 12px; color: #6f7a72; }
.vacio svg { margin-bottom: 8px; }

/* ───────── Lista de tarjetas (móvil) ───────── */
.lista { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 10px; list-style: none; }
.item { overflow: hidden; border: 1px solid #e8e2d4; border-radius: 16px; background: #fff; transition: box-shadow 0.2s, border-color 0.2s; }
.itemAbierto { border-color: #dccfae; box-shadow: 0 6px 18px rgba(60, 50, 20, 0.08); }
.itemCab {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 0;
  background: transparent; color: #16281d; font-family: inherit; text-align: left; cursor: pointer;
}
.itemTxt { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
.itemNombre { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.itemSub { font-size: 11.5px; color: #6b766d; }
.chev { flex: none; color: #8a938c; transition: transform 0.25s; }
.itemAbierto .chev { transform: rotate(180deg); }
.panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s ease; }
.itemAbierto .panel { grid-template-rows: 1fr; }
.panelInt { min-height: 0; overflow: hidden; }
.panelCont { padding: 14px; border-top: 1px solid #f0ebdf; }
.detalles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 0; }
.detalles dt { margin: 0 0 2px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6c786f; }
.detalles dd { margin: 0; font-size: 13px; color: #16281d; }
.detalles .placaChip { margin-left: 0; }
.fotosPanel { display: flex; gap: 14px; margin-top: 14px; }
.fotoItem { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; color: #6b766d; }
.fotosPanel .miniFoto { width: 64px; height: 64px; border-radius: 12px; }
.panelAcciones { display: flex; gap: 8px; margin-top: 14px; }

/* ───────── Popup ───────── */
.fondo {
  position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(9, 32, 22, 0.55); backdrop-filter: blur(3px);
  animation: dm-aparecer 0.15s ease-out;
}
.modal {
  width: 100%; max-width: 540px; max-height: calc(100vh - 40px); overflow: auto;
  border: 1px solid #e3ddd0; border-radius: 20px; background: #faf7f0;
  box-shadow: 0 30px 80px rgba(5, 20, 12, 0.35); animation: dm-subir 0.18s ease-out;
}
.modalChico { max-width: 400px; }
.modalCab { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 22px 24px 0; }
.modalTitulo { margin: 0; font-size: 22px; font-weight: 400; line-height: 1.2; color: #16281d; }
.modalSub { margin: 4px 0 0; font-size: 12px; color: #6b766d; }
.cerrar {
  display: flex; align-items: center; justify-content: center; flex: none;
  width: 30px; height: 30px; padding: 0; border: 1px solid #e3ddd0; border-radius: 50%;
  background: #f4f0e6; color: #16281d; font-size: 13px; line-height: 1; cursor: pointer;
}
.cerrar:hover { background: #ece6d6; }

.modalCuerpo { padding: 18px 24px 6px; }
.rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.completo { grid-column: 1 / -1; }
.etiqueta { display: block; margin: 0 0 6px 2px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6c786f; }
.error { margin: 5px 0 0 12px; font-size: 11px; color: #a23b32; }
.ayuda { margin: 5px 0 0 12px; font-size: 11px; color: #6b766d; }
.errorCaja { margin: 14px 0 0; padding: 9px 12px; border-radius: 10px; background: #f7e4e1; color: #a23b32; font-size: 12px; }
.texto { margin: 0; font-size: 13px; line-height: 1.5; color: #3d4a41; }
.modalPie {
  position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 12px; padding: 14px 24px 20px; border-top: 1px solid #ece6d9; background: #faf7f0;
}
.fotoGrande { display: block; width: 100%; border-radius: 14px; }

/* Selector de fotos del formulario */
.fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.foto { position: relative; }
.fotoBtn {
  display: block; width: 100%; aspect-ratio: 4 / 3; padding: 0; border: 1.5px dashed #d3c9b2; border-radius: 16px;
  background: #f4f0e6; color: #8a6a16; overflow: hidden; cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.fotoBtn:hover { background: #eee8d8; border-color: #c9a64a; }
.fotoImg { display: block; width: 100%; height: 100%; object-fit: cover; }
.fotoVacia { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 100%; font-size: 11px; font-weight: 600; }
.fotoQuitar {
  position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%;
  background: rgba(22, 40, 29, 0.75); color: #fff; font-size: 11px; cursor: pointer;
}
.cargandoFoto { margin: 5px 0 0 12px; font-size: 11px; color: #8a6a16; }

@keyframes dm-aparecer { from { opacity: 0; } to { opacity: 1; } }
@keyframes dm-subir { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes dm-hoja { from { transform: translateY(100%); } to { transform: none; } }

/* ───────── Móvil ───────── */
@media (max-width: 720px) {
  .escritorio { display: none; }
  .movil { display: block; }
  .buscar { flex: 1 1 100%; width: 100%; height: 40px; font-size: 16px; }
  .filtro { flex: 1 1 auto; height: 40px; font-size: 16px; }
  .barraDer { width: 100%; margin-left: 0; justify-content: space-between; }
}

@media (max-width: 560px) {
  .pagina { padding: 20px 14px 32px; }
  .cabecera .btnOro { width: 100%; height: 40px; }
  .rejilla { grid-template-columns: 1fr; }
  .campo { height: 42px; font-size: 16px; }

  /* El popup se abre como hoja desde abajo */
  .fondo { align-items: flex-end; padding: 0; }
  .modal, .modalChico {
    max-width: 100%; max-height: 92vh; border-bottom: 0; border-radius: 22px 22px 0 0;
    animation: dm-hoja 0.24s ease-out;
  }
  .modalCab { padding: 18px 18px 0; }
  .modalCuerpo { padding: 16px 18px 6px; }
  .modalPie { padding: 14px 18px calc(18px + env(safe-area-inset-bottom)); }
  .modalPie .btnOro, .modalPie .btnGhost, .modalPie .btnPeligro { flex: 1; height: 40px; }
}
`;

// Agrega el prefijo "dm-" a todas las clases (.pagina -> .dm-pagina)
const CSS_FINAL = CSS.replace(/\.([a-zA-Z_][\w-]*)/g, '.dm-$1');

/** s.pagina -> "dm-pagina" */
export const s = new Proxy({} as Record<string, string>, {
  get: (_t, k) => `dm-${String(k)}`,
});

export function Estilos() {
  return <style dangerouslySetInnerHTML={{ __html: CSS_FINAL }} />;
}