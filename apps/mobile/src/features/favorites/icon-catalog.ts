import { Ionicons } from '@expo/vector-icons';

export type IconCatalogGroup =
  | 'comida'
  | 'transporte'
  | 'hogar'
  | 'compras'
  | 'entretenimiento'
  | 'salud'
  | 'finanzas'
  | 'deportes'
  | 'familia'
  | 'viajes'
  | 'trabajo'
  | 'otros';

export interface IconCatalogEntry {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  group: IconCatalogGroup;
  keywords: string[];
}

export const ICON_GROUPS: { value: IconCatalogGroup; label: string }[] = [
  { value: 'comida', label: 'Comida' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'compras', label: 'Compras' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'salud', label: 'Salud' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'familia', label: 'Familia' },
  { value: 'viajes', label: 'Viajes' },
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'otros', label: 'Otros' },
];

/** Curated catalog of Ionicons relevant to a finance app — every `name` is a
 * verified `Ionicons.glyphMap` key. Kept deliberately relevant rather than
 * dumping the full ~1,300-icon font: an icon irrelevant to a movement (a
 * brand logo, a weather glyph) is noise a picker for this shouldn't surface. */
export const ICON_CATALOG: IconCatalogEntry[] = [
  // Comida
  { name: 'cafe-outline', label: 'Café', group: 'comida', keywords: ['cafe', 'coffee', 'bebida'] },
  { name: 'restaurant-outline', label: 'Restaurante', group: 'comida', keywords: ['comer', 'cena', 'comida'] },
  { name: 'fast-food-outline', label: 'Comida rápida', group: 'comida', keywords: ['hamburguesa', 'fastfood'] },
  { name: 'pizza-outline', label: 'Pizza', group: 'comida', keywords: ['pizza'] },
  { name: 'beer-outline', label: 'Cerveza', group: 'comida', keywords: ['bar', 'alcohol', 'cerveza'] },
  { name: 'wine-outline', label: 'Vino', group: 'comida', keywords: ['alcohol', 'bar', 'vino'] },
  { name: 'ice-cream-outline', label: 'Postre', group: 'comida', keywords: ['helado', 'dulce', 'postre'] },
  { name: 'nutrition-outline', label: 'Frutas y verduras', group: 'comida', keywords: ['mercado', 'verduras', 'fruta'] },

  // Transporte
  { name: 'car-outline', label: 'Auto', group: 'transporte', keywords: ['carro', 'coche', 'uber'] },
  { name: 'car-sport-outline', label: 'Auto deportivo', group: 'transporte', keywords: ['carro', 'coche'] },
  { name: 'bus-outline', label: 'Autobús', group: 'transporte', keywords: ['camion', 'transporte publico'] },
  { name: 'bicycle-outline', label: 'Bicicleta', group: 'transporte', keywords: ['bici'] },
  { name: 'airplane-outline', label: 'Vuelo', group: 'transporte', keywords: ['avion', 'viaje'] },
  { name: 'train-outline', label: 'Tren', group: 'transporte', keywords: ['tren'] },
  { name: 'boat-outline', label: 'Barco', group: 'transporte', keywords: ['ferry', 'barco'] },
  { name: 'walk-outline', label: 'Caminar', group: 'transporte', keywords: ['a pie'] },
  { name: 'subway-outline', label: 'Metro', group: 'transporte', keywords: ['subte', 'metro'] },
  { name: 'speedometer-outline', label: 'Gasolina', group: 'transporte', keywords: ['combustible', 'gas', 'gasolina'] },

  // Hogar
  { name: 'home-outline', label: 'Renta', group: 'hogar', keywords: ['casa', 'hogar', 'alquiler'] },
  { name: 'bed-outline', label: 'Recámara', group: 'hogar', keywords: ['dormitorio', 'muebles'] },
  { name: 'construct-outline', label: 'Mantenimiento', group: 'hogar', keywords: ['reparacion', 'herramientas'] },
  { name: 'key-outline', label: 'Llave', group: 'hogar', keywords: ['cerradura', 'mudanza'] },
  { name: 'flash-outline', label: 'Electricidad', group: 'hogar', keywords: ['luz', 'cfe'] },
  { name: 'water-outline', label: 'Agua', group: 'hogar', keywords: ['recibo', 'agua'] },
  { name: 'flame-outline', label: 'Gas', group: 'hogar', keywords: ['estufa', 'gas'] },
  { name: 'wifi-outline', label: 'Internet', group: 'hogar', keywords: ['wifi', 'router'] },

  // Compras
  { name: 'cart-outline', label: 'Súper', group: 'compras', keywords: ['supermercado', 'despensa'] },
  { name: 'bag-outline', label: 'Compras', group: 'compras', keywords: ['tienda'] },
  { name: 'bag-handle-outline', label: 'Ropa', group: 'compras', keywords: ['boutique', 'ropa'] },
  { name: 'pricetag-outline', label: 'Oferta', group: 'compras', keywords: ['descuento', 'etiqueta'] },
  { name: 'pricetags-outline', label: 'Rebajas', group: 'compras', keywords: ['ofertas'] },
  { name: 'gift-outline', label: 'Regalo', group: 'compras', keywords: ['obsequio', 'regalo'] },
  { name: 'shirt-outline', label: 'Vestimenta', group: 'compras', keywords: ['ropa'] },
  { name: 'basket-outline', label: 'Mercado', group: 'compras', keywords: ['canasta'] },

  // Entretenimiento
  { name: 'film-outline', label: 'Cine', group: 'entretenimiento', keywords: ['pelicula', 'streaming'] },
  { name: 'musical-notes-outline', label: 'Música', group: 'entretenimiento', keywords: ['spotify', 'concierto'] },
  { name: 'game-controller-outline', label: 'Videojuegos', group: 'entretenimiento', keywords: ['gaming', 'juegos'] },
  { name: 'tv-outline', label: 'Streaming', group: 'entretenimiento', keywords: ['television', 'netflix'] },
  { name: 'ticket-outline', label: 'Boletos', group: 'entretenimiento', keywords: ['entradas', 'evento'] },
  { name: 'headset-outline', label: 'Audio', group: 'entretenimiento', keywords: ['audifonos'] },
  { name: 'camera-outline', label: 'Fotografía', group: 'entretenimiento', keywords: ['camara'] },
  { name: 'color-palette-outline', label: 'Hobbies', group: 'entretenimiento', keywords: ['arte', 'manualidades'] },

  // Salud
  { name: 'medkit-outline', label: 'Doctor', group: 'salud', keywords: ['medico', 'consulta'] },
  { name: 'fitness-outline', label: 'Gimnasio', group: 'salud', keywords: ['ejercicio', 'gym'] },
  { name: 'heart-outline', label: 'Salud', group: 'salud', keywords: ['bienestar'] },
  { name: 'body-outline', label: 'Cuerpo', group: 'salud', keywords: ['fisico'] },
  { name: 'bandage-outline', label: 'Farmacia', group: 'salud', keywords: ['medicina', 'curita'] },
  { name: 'pulse-outline', label: 'Chequeo', group: 'salud', keywords: ['pulso'] },
  { name: 'barbell-outline', label: 'Pesas', group: 'salud', keywords: ['entrenamiento'] },

  // Finanzas
  { name: 'wallet-outline', label: 'Cartera', group: 'finanzas', keywords: ['efectivo'] },
  { name: 'card-outline', label: 'Tarjeta', group: 'finanzas', keywords: ['credito', 'debito'] },
  { name: 'cash-outline', label: 'Efectivo', group: 'finanzas', keywords: ['dinero'] },
  { name: 'business-outline', label: 'Banco', group: 'finanzas', keywords: ['empresa'] },
  { name: 'trending-up-outline', label: 'Inversión', group: 'finanzas', keywords: ['ahorro', 'ganancia'] },
  { name: 'trending-down-outline', label: 'Deuda', group: 'finanzas', keywords: ['gasto', 'perdida'] },
  { name: 'swap-horizontal-outline', label: 'Transferencia', group: 'finanzas', keywords: ['movimiento'] },
  { name: 'calculator-outline', label: 'Impuestos', group: 'finanzas', keywords: ['calculo', 'contabilidad'] },
  { name: 'receipt-outline', label: 'Recibo', group: 'finanzas', keywords: ['factura', 'servicio'] },

  // Deportes
  { name: 'american-football-outline', label: 'Fútbol americano', group: 'deportes', keywords: [] },
  { name: 'basketball-outline', label: 'Basquetbol', group: 'deportes', keywords: [] },
  { name: 'football-outline', label: 'Fútbol', group: 'deportes', keywords: ['soccer'] },
  { name: 'tennisball-outline', label: 'Tenis', group: 'deportes', keywords: [] },
  { name: 'golf-outline', label: 'Golf', group: 'deportes', keywords: [] },
  { name: 'baseball-outline', label: 'Béisbol', group: 'deportes', keywords: [] },

  // Familia
  { name: 'paw-outline', label: 'Mascota', group: 'familia', keywords: ['perro', 'gato'] },
  { name: 'people-outline', label: 'Familia', group: 'familia', keywords: ['grupo'] },
  { name: 'person-outline', label: 'Personal', group: 'familia', keywords: ['individual'] },
  { name: 'man-outline', label: 'Él', group: 'familia', keywords: ['hombre'] },
  { name: 'woman-outline', label: 'Ella', group: 'familia', keywords: ['mujer'] },

  // Viajes
  { name: 'globe-outline', label: 'Viaje', group: 'viajes', keywords: ['mundo', 'turismo'] },
  { name: 'compass-outline', label: 'Aventura', group: 'viajes', keywords: ['explorar'] },
  { name: 'map-outline', label: 'Mapa', group: 'viajes', keywords: ['ruta'] },
  { name: 'umbrella-outline', label: 'Seguro', group: 'viajes', keywords: ['proteccion', 'paraguas'] },

  // Trabajo
  { name: 'briefcase-outline', label: 'Trabajo', group: 'trabajo', keywords: ['oficina', 'negocio'] },
  { name: 'call-outline', label: 'Teléfono', group: 'trabajo', keywords: ['llamada', 'plan'] },
  { name: 'phone-portrait-outline', label: 'Celular', group: 'trabajo', keywords: ['movil'] },
  { name: 'laptop-outline', label: 'Laptop', group: 'trabajo', keywords: ['computadora'] },
  { name: 'school-outline', label: 'Escuela', group: 'trabajo', keywords: ['educacion', 'colegiatura'] },
  { name: 'book-outline', label: 'Libros', group: 'trabajo', keywords: ['estudio'] },
  { name: 'library-outline', label: 'Cursos', group: 'trabajo', keywords: ['biblioteca'] },
  { name: 'document-text-outline', label: 'Documentos', group: 'trabajo', keywords: ['papeleo', 'tramite'] },

  // Otros
  { name: 'star-outline', label: 'Favorito', group: 'otros', keywords: ['general'] },
  { name: 'sparkles-outline', label: 'Especial', group: 'otros', keywords: ['extra'] },
  { name: 'shield-checkmark-outline', label: 'Seguro', group: 'otros', keywords: ['proteccion'] },
  { name: 'newspaper-outline', label: 'Suscripción', group: 'otros', keywords: ['noticias', 'revista'] },
  { name: 'hammer-outline', label: 'Reparación', group: 'otros', keywords: ['herramienta'] },
  { name: 'cut-outline', label: 'Belleza', group: 'otros', keywords: ['corte', 'estetica'] },
  { name: 'ellipsis-horizontal-circle-outline', label: 'Otro', group: 'otros', keywords: ['general'] },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Filters the catalog by a free-text query (label/keywords) and/or a group chip. */
export function searchIconCatalog(query: string, group: IconCatalogGroup | null): IconCatalogEntry[] {
  const needle = normalize(query.trim());
  return ICON_CATALOG.filter((entry) => {
    if (group && entry.group !== group) return false;
    if (!needle) return true;
    return (
      normalize(entry.label).includes(needle) ||
      entry.keywords.some((k) => normalize(k).includes(needle))
    );
  });
}
