/** Cada pestaña del Google Sheet y sus columnas (fila 1). El orden importa. */
export const HOJAS = {
  Productos: ['id', 'nombre', 'slug', 'descripcion', 'categoria', 'material', 'peso', 'precio', 'stock', 'fotos', 'activo', 'destacado', 'creadoEn'],
  Pedidos: ['id', 'fecha', 'clienteNombre', 'clienteTelefono', 'clienteEmail', 'tipoEntrega', 'direccion', 'items', 'envio', 'total', 'estado'],
  Configuracion: ['clave', 'valor'],
  Secciones: ['id', 'tipo', 'titulo', 'subtitulo', 'imagen', 'orden', 'activo'],
} as const;

export type NombreHoja = keyof typeof HOJAS;
