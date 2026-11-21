export interface Producto {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  categoria: string;        // anillos, cadenas, aretes, pulseras...
  material: string;         // Oro 18k, Oro 14k, Oro blanco...
  peso: number;             // gramos
  precio: number;
  stock: number;
  fotos: string[];
  activo: boolean;
  destacado: boolean;
  creadoEn: string;
}

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: string;
  fecha: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  tipoEntrega: 'domicilio' | 'recogida';
  direccion: string;
  items: ItemPedido[];
  envio: number;
  total: number;
  estado: 'nuevo' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';
}

export interface Configuracion {
  logo: string;
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  ubicacion: string;        // enlace de Google Maps
  email: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
}

export interface Seccion {
  id: string;
  tipo: 'hero' | 'destacados' | 'categorias' | 'texto' | 'galeria';
  titulo: string;
  subtitulo: string;
  imagen: string;
  orden: number;
  activo: boolean;
}
