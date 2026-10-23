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

/** An icon of the catalog; its name for people is `icons:labels.<name>`. */
export interface IconCatalogEntry {
  name: keyof typeof Ionicons.glyphMap;
  group: IconCatalogGroup;
  keywords: string[];
}

/** The picker's group chips, in order — names in `icons:groups`. */
export const ICON_GROUPS: IconCatalogGroup[] = [
  'comida',
  'transporte',
  'hogar',
  'compras',
  'entretenimiento',
  'salud',
  'finanzas',
  'deportes',
  'familia',
  'viajes',
  'trabajo',
  'otros',
];

/** Curated catalog of Ionicons relevant to a finance app — every `name` is a
 * verified `Ionicons.glyphMap` key. Kept deliberately relevant rather than
 * dumping the full ~1,300-icon font: an icon irrelevant to a movement (a
 * brand logo, a weather glyph) is noise a picker for this shouldn't surface. */
export const ICON_CATALOG: IconCatalogEntry[] = [
  // Comida
  { name: 'cafe-outline', group: 'comida', keywords: ['cafe', 'coffee', 'bebida'] },
  {
    name: 'restaurant-outline',
    group: 'comida',
    keywords: ['comer', 'cena', 'comida'],
  },
  {
    name: 'fast-food-outline',
    group: 'comida',
    keywords: ['hamburguesa', 'fastfood'],
  },
  { name: 'pizza-outline', group: 'comida', keywords: ['pizza'] },
  {
    name: 'beer-outline',
    group: 'comida',
    keywords: ['bar', 'alcohol', 'cerveza'],
  },
  { name: 'wine-outline', group: 'comida', keywords: ['alcohol', 'bar', 'vino'] },
  {
    name: 'ice-cream-outline',
    group: 'comida',
    keywords: ['helado', 'dulce', 'postre'],
  },
  {
    name: 'nutrition-outline',
    group: 'comida',
    keywords: ['mercado', 'verduras', 'fruta'],
  },

  // Transporte
  { name: 'car-outline', group: 'transporte', keywords: ['carro', 'coche', 'uber'] },
  {
    name: 'car-sport-outline',
    group: 'transporte',
    keywords: ['carro', 'coche'],
  },
  {
    name: 'bus-outline',
    group: 'transporte',
    keywords: ['camion', 'transporte publico'],
  },
  { name: 'bicycle-outline', group: 'transporte', keywords: ['bici'] },
  { name: 'airplane-outline', group: 'transporte', keywords: ['avion', 'viaje'] },
  { name: 'train-outline', group: 'transporte', keywords: ['tren'] },
  { name: 'boat-outline', group: 'transporte', keywords: ['ferry', 'barco'] },
  { name: 'walk-outline', group: 'transporte', keywords: ['a pie'] },
  { name: 'subway-outline', group: 'transporte', keywords: ['subte', 'metro'] },
  {
    name: 'speedometer-outline',
    group: 'transporte',
    keywords: ['combustible', 'gas', 'gasolina'],
  },

  // Hogar
  { name: 'home-outline', group: 'hogar', keywords: ['casa', 'hogar', 'alquiler'] },
  { name: 'bed-outline', group: 'hogar', keywords: ['dormitorio', 'muebles'] },
  {
    name: 'construct-outline',
    group: 'hogar',
    keywords: ['reparacion', 'herramientas'],
  },
  { name: 'key-outline', group: 'hogar', keywords: ['cerradura', 'mudanza'] },
  { name: 'flash-outline', group: 'hogar', keywords: ['luz', 'cfe'] },
  { name: 'water-outline', group: 'hogar', keywords: ['recibo', 'agua'] },
  { name: 'flame-outline', group: 'hogar', keywords: ['estufa', 'gas'] },
  { name: 'wifi-outline', group: 'hogar', keywords: ['wifi', 'router'] },

  // Compras
  {
    name: 'cart-outline',
    group: 'compras',
    keywords: ['supermercado', 'despensa'],
  },
  { name: 'bag-outline', group: 'compras', keywords: ['tienda'] },
  { name: 'bag-handle-outline', group: 'compras', keywords: ['boutique', 'ropa'] },
  {
    name: 'pricetag-outline',
    group: 'compras',
    keywords: ['descuento', 'etiqueta'],
  },
  { name: 'pricetags-outline', group: 'compras', keywords: ['ofertas'] },
  { name: 'gift-outline', group: 'compras', keywords: ['obsequio', 'regalo'] },
  { name: 'shirt-outline', group: 'compras', keywords: ['ropa'] },
  { name: 'basket-outline', group: 'compras', keywords: ['canasta'] },

  // Entretenimiento
  {
    name: 'film-outline',
    group: 'entretenimiento',
    keywords: ['pelicula', 'streaming'],
  },
  {
    name: 'musical-notes-outline',
    group: 'entretenimiento',
    keywords: ['spotify', 'concierto'],
  },
  {
    name: 'game-controller-outline',
    group: 'entretenimiento',
    keywords: ['gaming', 'juegos'],
  },
  {
    name: 'tv-outline',
    group: 'entretenimiento',
    keywords: ['television', 'netflix'],
  },
  {
    name: 'ticket-outline',
    group: 'entretenimiento',
    keywords: ['entradas', 'evento'],
  },
  { name: 'headset-outline', group: 'entretenimiento', keywords: ['audifonos'] },
  { name: 'camera-outline', group: 'entretenimiento', keywords: ['camara'] },
  {
    name: 'color-palette-outline',
    group: 'entretenimiento',
    keywords: ['arte', 'manualidades'],
  },

  // Salud
  { name: 'medkit-outline', group: 'salud', keywords: ['medico', 'consulta'] },
  { name: 'fitness-outline', group: 'salud', keywords: ['ejercicio', 'gym'] },
  { name: 'heart-outline', group: 'salud', keywords: ['bienestar'] },
  { name: 'body-outline', group: 'salud', keywords: ['fisico'] },
  { name: 'bandage-outline', group: 'salud', keywords: ['medicina', 'curita'] },
  { name: 'pulse-outline', group: 'salud', keywords: ['pulso'] },
  { name: 'barbell-outline', group: 'salud', keywords: ['entrenamiento'] },

  // Finanzas
  { name: 'wallet-outline', group: 'finanzas', keywords: ['efectivo'] },
  { name: 'card-outline', group: 'finanzas', keywords: ['credito', 'debito'] },
  { name: 'cash-outline', group: 'finanzas', keywords: ['dinero'] },
  { name: 'business-outline', group: 'finanzas', keywords: ['empresa'] },
  {
    name: 'trending-up-outline',
    group: 'finanzas',
    keywords: ['ahorro', 'ganancia'],
  },
  {
    name: 'trending-down-outline',
    group: 'finanzas',
    keywords: ['gasto', 'perdida'],
  },
  {
    name: 'swap-horizontal-outline',
    group: 'finanzas',
    keywords: ['movimiento'],
  },
  {
    name: 'calculator-outline',
    group: 'finanzas',
    keywords: ['calculo', 'contabilidad'],
  },
  {
    name: 'receipt-outline',
    group: 'finanzas',
    keywords: ['factura', 'servicio'],
  },

  // Deportes
  { name: 'american-football-outline', group: 'deportes', keywords: [] },
  { name: 'basketball-outline', group: 'deportes', keywords: [] },
  { name: 'football-outline', group: 'deportes', keywords: ['soccer'] },
  { name: 'tennisball-outline', group: 'deportes', keywords: [] },
  { name: 'golf-outline', group: 'deportes', keywords: [] },
  { name: 'baseball-outline', group: 'deportes', keywords: [] },

  // Familia
  { name: 'paw-outline', group: 'familia', keywords: ['perro', 'gato'] },
  { name: 'people-outline', group: 'familia', keywords: ['grupo'] },
  { name: 'person-outline', group: 'familia', keywords: ['individual'] },
  { name: 'man-outline', group: 'familia', keywords: ['hombre'] },
  { name: 'woman-outline', group: 'familia', keywords: ['mujer'] },

  // Viajes
  { name: 'globe-outline', group: 'viajes', keywords: ['mundo', 'turismo'] },
  { name: 'compass-outline', group: 'viajes', keywords: ['explorar'] },
  { name: 'map-outline', group: 'viajes', keywords: ['ruta'] },
  {
    name: 'umbrella-outline',
    group: 'viajes',
    keywords: ['proteccion', 'paraguas'],
  },

  // Trabajo
  {
    name: 'briefcase-outline',
    group: 'trabajo',
    keywords: ['oficina', 'negocio'],
  },
  { name: 'call-outline', group: 'trabajo', keywords: ['llamada', 'plan'] },
  { name: 'phone-portrait-outline', group: 'trabajo', keywords: ['movil'] },
  { name: 'laptop-outline', group: 'trabajo', keywords: ['computadora'] },
  {
    name: 'school-outline',
    group: 'trabajo',
    keywords: ['educacion', 'colegiatura'],
  },
  { name: 'book-outline', group: 'trabajo', keywords: ['estudio'] },
  { name: 'library-outline', group: 'trabajo', keywords: ['biblioteca'] },
  {
    name: 'document-text-outline',
    group: 'trabajo',
    keywords: ['papeleo', 'tramite'],
  },

  // Otros
  { name: 'star-outline', group: 'otros', keywords: ['general'] },
  { name: 'sparkles-outline', group: 'otros', keywords: ['extra'] },
  { name: 'shield-checkmark-outline', group: 'otros', keywords: ['proteccion'] },
  {
    name: 'newspaper-outline',
    group: 'otros',
    keywords: ['noticias', 'revista'],
  },
  { name: 'hammer-outline', group: 'otros', keywords: ['herramienta'] },
  { name: 'cut-outline', group: 'otros', keywords: ['corte', 'estetica'] },
  {
    name: 'ellipsis-horizontal-circle-outline',
    group: 'otros',
    keywords: ['general'],
  },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Filters the catalog by a free-text query (label — `labelOf`, in the current language — or keywords) and/or a group chip. */
export function searchIconCatalog(
  query: string,
  group: IconCatalogGroup | null,
  labelOf: (entry: IconCatalogEntry) => string,
): IconCatalogEntry[] {
  const needle = normalize(query.trim());
  return ICON_CATALOG.filter((entry) => {
    if (group && entry.group !== group) return false;
    if (!needle) return true;
    return (
      normalize(labelOf(entry)).includes(needle) ||
      entry.keywords.some((k) => normalize(k).includes(needle))
    );
  });
}
