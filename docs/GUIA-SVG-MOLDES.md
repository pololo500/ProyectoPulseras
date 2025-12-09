# Guía para Crear SVGs de Moldes

## 📋 Resumen

Este documento explica cómo crear y configurar SVGs para que se muestren en el selector de colores de los productos de resina.

## 🎯 Requisitos del SVG

### 1. Estructura Básica

El SVG debe tener un `viewBox` definido y cada área coloreable debe tener un **ID único**:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path id="capa-base" d="..." fill="#cccccc" />
  <path id="capa-relleno" d="..." fill="#aaaaaa" />
  <path id="capa-tapa" d="..." fill="#888888" />
</svg>
```

### 2. Reglas para los IDs

- **Cada capa del molde debe corresponder a un elemento con ID en el SVG**
- Los IDs deben ser **descriptivos**: `capa-base`, `layer-relleno`, `area-tapa`
- No uses espacios ni caracteres especiales en los IDs
- Los IDs deben ser **únicos** dentro del SVG

### 3. Elementos Soportados

Los siguientes elementos SVG pueden ser coloreados:
- `<path>`
- `<rect>`
- `<circle>`
- `<ellipse>`
- `<polygon>`
- `<polyline>`
- `<g>` (grupos - colorea todos los elementos internos)

## 📐 Ejemplos de SVG

### Molde Corazón (3 capas)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Capa Base (externa) -->
  <path id="capa-base" 
        d="M50 88 C20 60, 10 40, 10 30 C10 15, 25 10, 35 10 C45 10, 50 20, 50 25 C50 20, 55 10, 65 10 C75 10, 90 15, 90 30 C90 40, 80 60, 50 88 Z"
        fill="#cccccc" />
  
  <!-- Capa Relleno (intermedia) -->
  <path id="capa-relleno" 
        d="M50 78 C25 55, 18 40, 18 32 C18 20, 30 16, 38 16 C46 16, 50 24, 50 28 C50 24, 54 16, 62 16 C70 16, 82 20, 82 32 C82 40, 75 55, 50 78 Z"
        fill="#aaaaaa" />
  
  <!-- Capa Tapa (interna) -->
  <path id="capa-tapa" 
        d="M50 65 C32 50, 28 42, 28 36 C28 28, 36 25, 42 25 C47 25, 50 30, 50 33 C50 30, 53 25, 58 25 C64 25, 72 28, 72 36 C72 42, 68 50, 50 65 Z"
        fill="#888888" />
</svg>
```

### Molde Estrella (2 capas)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Capa Base -->
  <polygon id="layer-base" 
           points="50,5 61,40 97,40 68,62 79,97 50,75 21,97 32,62 3,40 39,40"
           fill="#cccccc" />
  
  <!-- Capa Superior -->
  <polygon id="layer-superior" 
           points="50,18 57,42 82,42 62,56 69,80 50,66 31,80 38,56 18,42 43,42"
           fill="#888888" />
</svg>
```

### Molde Círculo (1 capa)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle id="capa-unica" cx="50" cy="50" r="45" fill="#cccccc" />
</svg>
```

## 🔧 Cómo Crear un SVG

### Opción 1: Usando un Editor de Diseño

1. **Inkscape** (Gratuito):
   - Crea tu diseño
   - Selecciona cada forma
   - Ve a `Objeto > Propiedades del objeto`
   - Asigna un ID único a cada forma
   - Guarda como SVG

2. **Adobe Illustrator**:
   - Crea tu diseño con capas separadas
   - Nombra cada capa (el nombre se convierte en ID)
   - Exporta como SVG

3. **Figma**:
   - Crea tu diseño
   - Nombra cada elemento en el panel de capas
   - Exporta como SVG

### Opción 2: Manualmente

1. Crea un archivo `.svg` con un editor de texto
2. Define el `viewBox`
3. Agrega elementos con IDs únicos
4. Usa colores placeholder (grises) - serán reemplazados dinámicamente

## 📤 Cómo Subir el SVG

1. Ve a **Inicio Administrador** > **Gestionar SVGs**
2. Selecciona el molde al que quieres asignar el SVG
3. Haz clic en **Cargar SVG** y selecciona tu archivo `.svg`
4. El sistema detectará automáticamente los IDs de los elementos
5. **Asigna cada capa del molde a un elemento del SVG**:
   - Ejemplo: Capa "Base" → Elemento `capa-base`
   - Ejemplo: Capa "Relleno" → Elemento `capa-relleno`
6. Verifica en la vista previa que los colores se aplican correctamente
7. Haz clic en **Guardar SVG**

## ⚠️ Errores Comunes

### El SVG no se colorea correctamente

- **Problema**: Estilos inline de `fill` en el SVG
- **Solución**: Remueve `style="fill:#color"` y usa solo el atributo `fill="#color"`

### No se detectan los elementos

- **Problema**: Los elementos no tienen ID
- **Solución**: Agrega `id="nombre-unico"` a cada elemento coloreable

### El SVG se ve muy pequeño/grande

- **Problema**: Falta `viewBox` o dimensiones incorrectas
- **Solución**: Agrega `viewBox="0 0 100 100"` (ajusta según tu diseño)

### Los grupos `<g>` no funcionan

- **Problema**: El grupo tiene ID pero los elementos internos no se colorean
- **Solución**: Asegúrate de que los elementos internos (`<path>`, etc.) no tengan estilos de fill que sobrescriban

## 💡 Tips

1. **Usa viewBox cuadrado** (ej: `0 0 100 100`) para mejor escalado
2. **Colores grises placeholder** hacen más fácil ver la estructura
3. **Prueba el SVG** en el navegador antes de subirlo
4. **Las capas se superponen** - la última capa definida estará arriba
5. **Mantén los SVGs simples** para mejor rendimiento

## 📁 Archivos de Ejemplo

En la carpeta `ejemplos-json/` encontrarás:
- `ejemplo-svg-corazon.svg` - Corazón con 3 capas
- `ejemplo-svg-estrella.svg` - Estrella con 2 capas
- `ejemplo-svg-circulo.svg` - Círculo con 1 capa

¡Usa estos como referencia para crear tus propios SVGs!
