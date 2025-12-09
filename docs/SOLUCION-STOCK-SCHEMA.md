# Solución al Problema del Esquema de Stock en MongoDB

## Problema Identificado
La base de datos tiene documentos guardados con un esquema incorrecto que no incluye todos los campos necesarios del modelo Stock.

## Solución

### Opción 1: Limpiar la colección existente (Recomendado para desarrollo)

Conecta a MongoDB y ejecuta:

```javascript
// Eliminar todos los documentos de la colección stocks
db.stocks.deleteMany({})

// O si la colección se llama diferente:
db.getCollectionNames()  // Ver nombres de colecciones
// Luego eliminar la colección incorrecta
```

### Opción 2: Migrar datos existentes

Si tienes datos importantes que deseas conservar:

```javascript
// 1. Ver la estructura actual
db.stocks.findOne()

// 2. Actualizar documentos existentes agregando campos faltantes
db.stocks.updateMany(
  {},
  {
    $set: {
      productoNombre: "Nombre por defecto",
      productoTipo: "pulsera",
      cantidad: 1,
      fechaCreacion: new Date()
    }
  }
)
```

### Opción 3: Eliminar y recrear la colección

```javascript
// Eliminar la colección completamente
db.stocks.drop()
```

## Cambios Realizados en el Código

### 1. server.js
- ✅ Agregado `collection: 'stocks'` para forzar el nombre de la colección
- ✅ Campos marcados como `required: true` para validación
- ✅ Logs detallados en el endpoint POST para debugging
- ✅ Validación de campos requeridos antes de guardar

### 2. stock.component.ts
- ✅ Logs para ver qué datos se están enviando
- ✅ Mejor manejo de errores con mensajes descriptivos

## Verificación

Después de limpiar la base de datos, verifica que funcione:

1. Reinicia el servidor Node.js:
   ```bash
   # Detener el servidor (Ctrl+C)
   node server.js
   ```

2. Desde el componente Stock, intenta agregar un nuevo producto

3. Verifica en MongoDB que se guardó correctamente:
   ```javascript
   db.stocks.find().pretty()
   ```

4. Deberías ver algo como:
   ```json
   {
     "_id": ObjectId("..."),
     "productoId": "65f8a...",
     "productoNombre": "Pulsera Arcoíris",
     "productoTipo": "pulsera",
     "material": "resina",
     "cantidad": 5,
     "moldeId": "65f8b...",
     "moldeNombre": "Molde Redondo",
     "coloresPorCapa": [
       {
         "capaIndex": 0,
         "capaNombre": "Base",
         "colorId": "65f8c...",
         "colorNombre": "Azul Translúcido",
         "colorRgb": "#3498db"
       }
     ],
     "detallesDiseno": "Con brillos dorados",
     "imagenUrl": "https://...",
     "fechaCreacion": ISODate("2025-12-09T...")
   }
   ```

## Conexión a MongoDB Atlas

Para conectarte y limpiar la colección:

1. Usando MongoDB Compass:
   - Abre MongoDB Compass
   - Conecta usando: `mongodb+srv://marronemicaela:Abril2004@clusterm.dwtrhrc.mongodb.net/`
   - Selecciona la base de datos `LMPulserasDB`
   - Busca la colección `stocks` (o el nombre que tenga)
   - Click derecho → Delete Collection o Delete Documents

2. Usando MongoDB Shell:
   ```bash
   mongosh "mongodb+srv://marronemicaela:Abril2004@clusterm.dwtrhrc.mongodb.net/LMPulserasDB"
   ```
   Luego:
   ```javascript
   use LMPulserasDB
   db.stocks.deleteMany({})
   ```

## Notas Importantes

- ⚠️ Asegúrate de respaldar cualquier dato importante antes de eliminar
- ✅ Después de limpiar, reinicia el servidor Node.js
- ✅ Los logs en consola te ayudarán a identificar problemas
- ✅ La colección se creará automáticamente con el esquema correcto al agregar el primer producto
