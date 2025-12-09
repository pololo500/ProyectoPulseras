# 🧪 Guía de Pruebas - Sistema de Stock con Variantes

## 🚀 Inicio Rápido

```bash
# Terminal 1: Iniciar Node/Express (si no está en background)
npm start  # o node server.js

# Terminal 2: Iniciar Angular dev server
cd d:\ProyectosAngular\ProyectoPulseras
ng serve --port 4200
```

Accede a: **http://localhost:4200**

---

## 📊 Flujo de Prueba Completo

### 1️⃣ Cargar Primer Producto con Variantes

**Pasos:**
1. Haz click en botón **➕ Cargar Stock**
2. Selecciona un **Producto** del dropdown
   - Recomendado: Pulsera de Resina (tiene molde con capas)
3. Se mostrarán automáticamente los campos de capa/color si es resina
4. **Agregar Primera Variante:**
   - Cantidad: Ingresa `5`
   - Selecciona colores para cada capa
   - Click en **➕ Agregar esta variante**
5. **Agregar Segunda Variante:**
   - Cantidad: Ingresa `3`
   - Selecciona diferentes colores
   - Click en **➕ Agregar esta variante**
6. Deberías ver "Variantes agregadas: 2"
7. Click en **Guardar en Stock**

**Resultado Esperado:**
- ✅ Aparece nueva card en grid
- ✅ Card muestra imagen y nombre del producto
- ✅ Cantidad total = 8 (5+3)
- ✅ Hay 2 variantes listadas con sus colores

---

### 2️⃣ Visualizar Producto Cargado

**La Card Muestra:**

```
┌─────────────────────────────────────┐
│ [IMG] Pulsera Resina     Total: 8 ✅ Ver
│                                      
│ ┌─ Variante 1 ──────────────────┐  
│ │ 🔵 Base: Rojo  🟡 Media: Azul │  
│ │ Cantidad: 5  [✏️ Editar] [🗑️]   │  
│ └────────────────────────────────┘  
│                                      
│ ┌─ Variante 2 ──────────────────┐  
│ │ 🟢 Base: Verde 🟣 Media: Morado│  
│ │ Cantidad: 3  [✏️ Editar] [🗑️]   │  
│ └────────────────────────────────┘  
│                                      
│ [💰 Vender] [➕ Agregar Variante]    │
└─────────────────────────────────────┘
```

---

### 3️⃣ Editar Cantidad de Variante

**Pasos:**
1. En la card del producto, haz click en **✏️ Editar** de una variante
2. Se abre modal "Editar Cantidad"
3. Cambia el valor (ej: 5 → 7)
4. Click en **Guardar**

**Resultado Esperado:**
- ✅ Modal se cierra
- ✅ Cantidad se actualiza en la variante
- ✅ Cantidad total se recalcula (ahora 10 si era 8+2)

---

### 4️⃣ Vender Producto

**Pasos:**
1. Click en **💰 Vender**
2. Modal muestra todas las variantes con sus colores
3. **Selecciona una variante** (click sobre ella)
4. **Rellena formulario:**
   - Cantidad a vender: `2`
   - Cliente: "Juan Pérez"
   - Método de Pago: "Tarjeta"
   - Precio: `150`
5. Click en **Confirmar Venta**

**Resultado Esperado:**
- ✅ Modal se cierra
- ✅ Cantidad de esa variante se reduce (5 → 3)
- ✅ Cantidad total se actualiza
- ✅ Registro creado en colección "ventas"

---

### 5️⃣ Eliminar Variante

**Pasos:**
1. En la card, click en **🗑️** de una variante
2. Modal pide confirmación
3. Click en **Confirmar**

**Resultado Esperado:**
- ✅ Variante desaparece de la lista
- ✅ Si era la última variante, desaparece toda la card
- ✅ Cantidad total se actualiza

---

### 6️⃣ Ver Detalles Completos

**Pasos:**
1. Click en botón **👁️ Ver** de una card
2. Modal muestra:
   - Imagen
   - Nombre y tipo de producto
   - Material
   - Lista completa de variantes con todos sus detalles
   - Cantidad total en stock

---

## 🔍 Verificaciones Técnicas

### API Endpoints Disponibles

```bash
# Cargar stock (POST)
curl -X POST http://localhost:5000/api/stock \
  -H "Content-Type: application/json" \
  -d '{
    "productoId": "123",
    "productoNombre": "Pulsera",
    "productoTipo": "pulsera",
    "material": "resina",
    "moldeId": "456",
    "moldeNombre": "Molde A",
    "variantes": [{
      "_id": "var-1",
      "cantidad": 5,
      "coloresPorCapa": [
        {"capaIndex": 0, "capaNombre": "Base", "colorId": "color1", ...}
      ]
    }]
  }'

# Actualizar cantidad de variante (PUT)
curl -X PUT http://localhost:5000/api/stock/stockId/variante/var-1/cantidad \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 10}'

# Vender variante (POST)
curl -X POST http://localhost:5000/api/stock/stockId/vender \
  -H "Content-Type: application/json" \
  -d '{
    "varianteId": "var-1",
    "cantidadVendida": 2,
    "cliente": "Juan",
    "metodoPago": "Efectivo",
    "precio": 100
  }'

# Eliminar variante (DELETE)
curl -X DELETE http://localhost:5000/api/stock/stockId/variante/var-1

# Obtener stock (GET)
curl http://localhost:5000/api/stock
```

---

## ⚠️ Problemas Comunes

### 1. "No hay productos cargados en dropdown"
**Causa**: API de productos no devuelve datos
**Solución**: Verificar que exista la colección "productos" en MongoDB

### 2. "No aparecen campos de color"
**Causa**: Producto seleccionado no es resina o no tiene molde
**Solución**: Seleccionar un producto tipo "Pulsera" con material "Resina"

### 3. "Error al guardar stock"
**Causa**: Variantes array está vacío
**Solución**: Agregar al menos una variante antes de guardar

### 4. "Cantidad no se actualiza después de vender"
**Causa**: Socket de WebSocket no refrescó datos
**Solución**: Actualizar página (F5) o esperar unos segundos

### 5. "Colores no se muestran en variantes"
**Causa**: `coloresPorCapa` array está vacío en DB
**Solución**: Crear nuevas variantes y seleccionar colores correctamente

---

## 📊 Datos de Prueba Recomendados

### MongoDB - Insertar Producto de Prueba

```javascript
db.productos.insertOne({
  producto: "pulsera",
  material: "resina",
  nombre: "Pulsera Resina 3 Capas",
  moldeNombre: "Molde Clasico",
  imagenesUrls: ["url-a-imagen.jpg"],
  precio: 200
})
```

### MongoDB - Insertar Molde de Prueba

```javascript
db.moldes.insertOne({
  nombre: "Molde Clasico",
  capas: [
    { nombre: "Base", volumen: 50 },
    { nombre: "Media", volumen: 30 },
    { nombre: "Top", volumen: 20 }
  ]
})
```

### MongoDB - Insertar Colores de Prueba

```javascript
db.colores.insertMany([
  { nombre: "Rojo", rgb: "#FF0000", categoria: "primario" },
  { nombre: "Azul", rgb: "#0000FF", categoria: "primario" },
  { nombre: "Verde", rgb: "#00FF00", categoria: "primario" },
  { nombre: "Amarillo", rgb: "#FFFF00", categoria: "primario" }
])
```

---

## ✅ Checklist de Validación

- [ ] Angular compila sin errores
- [ ] Stock page carga correctamente
- [ ] Puedo cargar un producto con 2+ variantes
- [ ] Las variantes se visualizan con sus colores
- [ ] Puedo editar cantidad de variante
- [ ] Puedo eliminar una variante
- [ ] Puedo seleccionar variante y vender
- [ ] Cantidad se actualiza después de venta
- [ ] Si vendo todo, la variante desaparece
- [ ] Si vendo todas las variantes, el producto desaparece

---

**Última actualización**: 2024-12-09
**Versión**: 1.0 - Lanzamiento Inicial
