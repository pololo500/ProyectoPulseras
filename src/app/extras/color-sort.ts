/**
 * Utilidades para ordenar colores.
 * - ordenarCromatico: ordena por escala cromática (hue HSL). Los colores acromáticos (grises, blancos, negros) van al final.
 * - ordenarAlfabetico: ordena por nombre de la A a la Z.
 */

function hexToHsl(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return [h, s, l];
}

/**
 * Ordena un array de objetos con propiedad `rgb` (hex) según la escala cromática.
 * Los colores acromáticos (saturación < 10%) van al final, ordenados por luminosidad.
 * Los cromáticos se ordenan por hue, luego saturación, luego luminosidad.
 * Retorna un nuevo array (no muta el original).
 */
export function ordenarCromatico<T extends { rgb: string }>(colores: T[]): T[] {
  return [...colores].sort((a, b) => {
    const [hA, sA, lA] = hexToHsl(a.rgb || '#000000');
    const [hB, sB, lB] = hexToHsl(b.rgb || '#000000');

    const acromaticA = sA < 0.1;
    const acromaticB = sB < 0.1;

    // Los acromáticos van al final
    if (acromaticA && !acromaticB) return 1;
    if (!acromaticA && acromaticB) return -1;

    // Ambos acromáticos: ordenar por luminosidad (oscuro → claro)
    if (acromaticA && acromaticB) return lA - lB;

    // Ambos cromáticos: ordenar por hue, luego saturación, luego luminosidad
    if (Math.abs(hA - hB) > 1) return hA - hB;
    if (Math.abs(sA - sB) > 0.05) return sB - sA;
    return lA - lB;
  });
}

/**
 * Ordena un array de objetos con propiedad `nombre` alfabéticamente (A → Z).
 * Retorna un nuevo array (no muta el original).
 */
export function ordenarAlfabetico<T extends { nombre: string }>(colores: T[]): T[] {
  return [...colores].sort((a, b) =>
    (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
  );
}
