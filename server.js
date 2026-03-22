const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const crypto = require('crypto');


const app = express();
const port = 5000;

cloudinary.config({
    cloud_name: 'dkbkgyvw7',
    api_key: '565626317237195',
    api_secret: 'sv_Xhvu1QVeh2YgoGc0Wes98SbI',
  });

// Middleware
app.use(cors()); // Permite conexiones desde Angular
app.use(express.json()); // Para procesar JSON en las peticiones

// Conectar a MongoDB Atlas
mongoose.connect('mongodb+srv://marronemicaela:Abril2004@clusterm.dwtrhrc.mongodb.net/LMPulserasDB?retryWrites=true&w=majority&appName=ClusterM')
.then(async () => {
    console.log('Conectado a MongoDB Atlas');
    await migrarDatosLegacy();
})
.catch(err => {});

// Migración: convertir pedidos y ventas legacy al formato items[]
async function migrarDatosLegacy() {
    try {
        const db = mongoose.connection.db;

        // Migrar pedidos legacy (tienen productoId en raíz y no tienen items)
        const pedidosLegacy = await db.collection('pedidos').find({
            productoId: { $exists: true },
            $or: [{ items: { $exists: false } }, { items: { $size: 0 } }]
        }).toArray();

        for (const pedido of pedidosLegacy) {
            const item = {
                productoId: pedido.productoId || '',
                productoNombre: pedido.productoNombre || '',
                productoTipo: pedido.productoTipo || '',
                material: pedido.material || '',
                cantidad: pedido.cantidad || 1,
                precio: pedido.precio || 0,
                estado: pedido.estado || 'A confirmar',
                moldeId: pedido.moldeId || '',
                moldeNombre: pedido.moldeNombre || '',
                coloresPorCapa: pedido.coloresPorCapa || []
            };

            await db.collection('pedidos').updateOne(
                { _id: pedido._id },
                {
                    $set: { items: [item] },
                    $unset: {
                        productoId: '', productoNombre: '', productoTipo: '',
                        material: '', moldeId: '', moldeNombre: '',
                        coloresPorCapa: '', cantidad: '', precio: ''
                    }
                }
            );
        }

        if (pedidosLegacy.length > 0) {
            {}
        }

        // Migrar ventas legacy (tienen productoNombre en raíz y no tienen items)
        const ventasLegacy = await db.collection('ventas').find({
            productoNombre: { $exists: true },
            $or: [{ items: { $exists: false } }, { items: { $size: 0 } }]
        }).toArray();

        for (const venta of ventasLegacy) {
            const item = {
                productoId: '',
                productoNombre: venta.productoNombre || '',
                productoTipo: venta.productoTipo || '',
                material: venta.material || '',
                cantidad: venta.cantidad || 1,
                precio: venta.precio || 0,
                estado: venta.estado || 'Entregado',
                coloresPorCapa: venta.coloresPorCapa || []
            };

            await db.collection('ventas').updateOne(
                { _id: venta._id },
                {
                    $set: { items: [item] },
                    $unset: {
                        productoNombre: '', productoTipo: '',
                        material: '', cantidad: '', precio: '',
                        coloresPorCapa: ''
                    }
                }
            );
        }

        if (ventasLegacy.length > 0) {
            {}
        }
    } catch (error) {
        {}
    }
}


// Esquema para colores por capa en el carrito
const ColorCapaCarritoSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    colorId: String,
    colorNombre: String,
    colorRgb: String
}, { _id: false });

// Esquema para items del carrito
const ItemCarritoSchema = new mongoose.Schema({
    _id: String,
    nombre: String,
    producto: String,
    material: String,
    precio: Number,
    imagen: String,
    cantidad: Number,
    moldeId: String,
    moldeNombre: String,
    coloresPorCapa: [ColorCapaCarritoSchema],
    esStock: Boolean,
    stockVarianteId: String
}, { _id: false });

// Esquema para items de favoritos
const ItemFavoritoSchema = new mongoose.Schema({
    _id: String,
    nombre: String,
    producto: String,
    precio: Number,
    imagen: String
}, { _id: false });

// Esquemas
const UsuarioSchema = new mongoose.Schema({
    email: String,
    password: String,
    nombre: String,
    telefono: String,  // opcional
    tipoUsuario: String,  // 'Administrador' o 'Cliente'
    carrito: [ItemCarritoSchema],  // Carrito de compras del usuario
    favoritos: [ItemFavoritoSchema]  // Productos favoritos del usuario
}, { versionKey: false });
  
const Usuario = mongoose.model('Usuario', UsuarioSchema);
module.exports = Usuario;

// Esquema para Moldes (Calculadora de Resina)
const CapaSchema = new mongoose.Schema({
    nombre: String,
    volumen: Number
}, { _id: false });

// Esquema para mapeo de capas a elementos SVG
const SvgAreaMappingSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    svgElementId: String  // ID del elemento en el SVG
}, { _id: false });

const MoldeSchema = new mongoose.Schema({
    nombre: String,
    capas: [CapaSchema],
    svgContent: String,  // Contenido SVG como string
    svgAreaMappings: [SvgAreaMappingSchema]  // Mapeo de capas a áreas del SVG
}, { versionKey: false });

const Molde = mongoose.model('Molde', MoldeSchema);

// Esquema para Colores (Calculadora de Resina)
const ColorSchema = new mongoose.Schema({
    nombre: String,
    rgb: String,
    categoria: String // 'translucido' o 'polvo'
}, { versionKey: false });

const Color = mongoose.model('Color', ColorSchema);

// Esquema para Colores de Hilo Encerado
const ColorHiloSchema = new mongoose.Schema({
    nombre: String,
    rgb: String
}, { versionKey: false });

const ColorHilo = mongoose.model('ColorHilo', ColorHiloSchema);

// Esquema para Moldes de Hilo Encerado (misma estructura que Molde pero colección separada)
const MoldeHiloSchema = new mongoose.Schema({
    nombre: String,
    capas: [CapaSchema],
    svgContent: String,
    svgAreaMappings: [SvgAreaMappingSchema]
}, { versionKey: false });

const MoldeHilo = mongoose.model('MoldeHilo', MoldeHiloSchema);

// Esquema para colores asignados por imagen (para productos de resina)
const ColorPorImagenCapaSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    colorId: String,
    colorNombre: String,
    colorRgb: String,
    colorCategoria: String
}, { _id: false });

const ColoresImagenSchema = new mongoose.Schema({
    imagenIndex: Number,
    colores: [ColorPorImagenCapaSchema]
}, { _id: false });

// Esquema para Productos (colección unificada)
const ProductoSchema = new mongoose.Schema({
    producto: String,  // tipo de producto (pulsera, llavero, etc)
    material: String,
    nombre: String,
    descripcion: String,
    precio: Number,
    imagenesUrls: [String],  // array de URLs de imágenes
    subcategorias: [String],  // array de subcategorías
    moldeNombre: String,  // Nombre del molde (para productos de resina) - es único
    coloresPorImagen: [ColoresImagenSchema]  // colores asignados a cada imagen (resina)
}, { versionKey: false });

const Producto = mongoose.model('Producto', ProductoSchema);

// Esquema para Compras
const CompraSchema = new mongoose.Schema({
    producto: String,
    cantidad: Number,
    costoUnidad: Number,
    costoTotal: Number,
    lugar: String,
    fechaCompra: String,
    cantidadIndividual: Number,
    costoIndividual: Number
}, { versionKey: false });

const Compra = mongoose.model('Compra', CompraSchema);

// Esquema para Pedidos
const ColorCapaPedidoSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    colorId: String,
    colorNombre: String,
    colorRgb: String
}, { _id: false });

// Schema para items dentro de un pedido
const ItemPedidoSchema = new mongoose.Schema({
    productoId: String,
    productoNombre: String,
    productoTipo: String,
    material: String,
    cantidad: Number,
    precio: Number,
    estado: String, // Estado individual del item: 'A confirmar', 'Por hacer', 'En produccion', 'Armar', 'A entregar'
    moldeId: String,
    moldeNombre: String,
    coloresPorCapa: [ColorCapaPedidoSchema],
    esStock: Boolean,
    stockVarianteId: String
}, { _id: false });

const PedidoSchema = new mongoose.Schema({
    cliente: String,
    items: [ItemPedidoSchema],
    fecha: String,
    estado: String, // 'A entregar', 'Armar', 'En produccion', 'Por hacer', 'A confirmar'
    metodoPago: String, // 'Efectivo', 'Transferencia'
    pagado: Boolean,
    nota: String
}, { versionKey: false });

const Pedido = mongoose.model('Pedido', PedidoSchema);

// Esquema para Ventas (historial)
const VentaSchema = new mongoose.Schema({
    cliente: String,
    items: [ItemPedidoSchema],
    metodoPago: String,
    fechaPedido: String,
    fechaVenta: String,
    estado: String, // 'Entregado' o 'Cancelado'
    nota: String
}, { versionKey: false });

const Venta = mongoose.model('Venta', VentaSchema);

// Esquema para Memoria de Calculadora
const ColorCapaSchema = new mongoose.Schema({
    colorId: String,
    colorNombre: String,
    colorRgb: String,
    fase: Number,
    volumen: Number,
    nota: String
}, { _id: false });

const CapaProductoSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    volumenTotal: Number,
    colores: [ColorCapaSchema]
}, { _id: false });

const ProductoMemoriaSchema = new mongoose.Schema({
    id: Number,
    moldeId: String,
    moldeNombre: String,
    cantidad: Number,
    capas: [CapaProductoSchema]
}, { _id: false });

const CalculadoraMemoriaSchema = new mongoose.Schema({
    nombre: { type: String, default: 'calculadora_principal' },
    productos: [ProductoMemoriaSchema],
    contadorId: { type: Number, default: 1 },
    fechaActualizacion: { type: Date, default: Date.now }
}, { versionKey: false });

const CalculadoraMemoria = mongoose.model('CalculadoraMemoria', CalculadoraMemoriaSchema);

// Esquema para Stock (inventario de productos terminados)
const ColorCapaStockSchema = new mongoose.Schema({
    capaIndex: Number,
    capaNombre: String,
    colorId: String,
    colorNombre: String,
    colorRgb: String
}, { _id: false });

// Esquema para variantes de color (cada una con sus propios colores y cantidad)
const VarianteStockSchema = new mongoose.Schema({
    _id: String,  // ID único para la variante (ej: "var-1")
    coloresPorCapa: [ColorCapaStockSchema],  // Colores específicos de esta variante
    cantidad: { type: Number, required: true, min: 0 },  // Cantidad de esta variante
    detallesDiseno: String,  // Detalles específicos de esta variante
    fechaAgriego: { type: Date, default: Date.now }
}, { _id: false });

const StockSchema = new mongoose.Schema({
    productoId: { type: String, required: true },  // ID del producto base
    productoNombre: { type: String, required: true },
    productoTipo: { type: String, required: true },  // pulsera, llavero, etc
    material: { type: String, required: true },
    moldeId: String,
    moldeNombre: String,
    imagenUrl: String,  // Imagen del producto terminado
    variantes: [VarianteStockSchema],  // Array de variantes con colores y cantidades
    fechaCreacion: { type: Date, default: Date.now },
    ultimaActualizacion: { type: Date, default: Date.now }
}, { 
    versionKey: false,
    collection: 'stocks',  // Nombre explícito de la colección
    strict: 'throw' // Prohibir campos no definidos y lanzar error
});

const Stock = mongoose.model('Stock', StockSchema, 'stocks');

// Definir un modelo de ejemplo para las pulseras
/*const PulseraSchema = new mongoose.Schema({
    producto: String,
    material: String,
    nombre: String,
    mostacillas: [String],
    dijes: [String],
    descripcion: String,
    precio: Number,
    imagenUrl: String
}, {
    versionKey: false // 👈 esto desactiva __v
});
const Pulsera = mongoose.model('Pulsera', PulseraSchema);
module.exports = mongoose.model('Pulsera', PulseraSchema);

// Obtener todas las pulseras
app.get('/api/pulseras', async (req, res) => {
    try {
        const pulseras = await Pulsera.find();
        res.json(pulseras);
    } catch (err) {
        res.status(500).send('Error al obtener productos');
    }
});*/

/*app.post('/api/upload', upload.single('imagen'), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        res.json({ imageUrl: result.secure_url });
    } catch (error) {
        {}
        res.status(500).send('Error al subir la imagen');
    }
});*/

// Ruta para subir imagen + guardar la pulsera
/*app.post('/api/pulseras', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, dijes } = req.body;

        const subida = await cloudinary.uploader.upload(req.file.path);
        fs.unlinkSync(req.file.path); // Eliminar archivo local después de subir
        const nuevaPulsera = new Pulsera({
            nombre,
            dijes: JSON.parse(dijes), // asegurate que venga como array si usás FormData
            imagenUrl: subida.secure_url,
        });

        const guardada = await nuevaPulsera.save();
        res.status(201).json(guardada);
    } catch (error) {
        {}
        res.status(500).json({ message: 'Error al guardar la pulsera', error });
    }
});*/


// Obtener nombres de colecciones
app.get('/api/colecciones', async (req, res) => {
    try {
        const colecciones = await mongoose.connection.db.listCollections().toArray();
        const nombres = colecciones.map(c => c.name);
        res.json(nombres);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener colecciones' });
    }
});


// Obtener materiales únicos de una colección
app.get('/api/:coleccion/materiales', async (req, res) => {
    const { coleccion } = req.params;
  
    try {
        const modelo = mongoose.connection.collection(coleccion);
        const materiales = await modelo.distinct('material'); // devuelve array de materiales únicos
        res.json(materiales);
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error al obtener materiales' });
    }
});

function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

// Login - Unificado para Usuarios (Clientes y Administradores)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(401).json({ success: false, error: 'emailIncorrecto' });
        }
    
        const hashedPassword = hashPassword(password);
        if (usuario.password !== hashedPassword) {
            return res.status(401).json({ success: false, error: 'contraseñaIncorrecta' });
        }
  
        res.status(200).json({ 
            success: true, 
            tipoUsuario: usuario.tipoUsuario,
            nombre: usuario.nombre
        });
    } catch (error) {
        {}
        res.status(500).json({ success: false, error: 'serverError' });
    }
});

// Registrar nuevo usuario (siempre como Cliente)
app.post('/api/usuarios/registro', async (req, res) => {
    const { email, password, nombre, telefono } = req.body;
  
    try {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'emailInvalido' });
        }
        
        // Verificar si ya existe
        const existente = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (existente) {
            return res.status(400).json({ success: false, error: 'usuarioExistente' });
        }
        
        const hashedPassword = hashPassword(password);
        const nuevoUsuario = new Usuario({
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            nombre,
            telefono: telefono || '',
            tipoUsuario: 'Cliente'  // Siempre cliente desde registro público
        });
        
        await nuevoUsuario.save();
        res.status(201).json({ success: true, mensaje: 'Usuario registrado' });
    } catch (error) {
        {}
        res.status(500).json({ success: false, error: 'serverError' });
    }
});

// Obtener datos de usuario por email
app.get('/api/usuarios/:email', async (req, res) => {
    const { email } = req.params;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.status(200).json({
            email: usuario.email,
            nombre: usuario.nombre,
            telefono: usuario.telefono || ''
        });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Actualizar datos del usuario (nombre, teléfono)
app.put('/api/usuarios/:email/datos', async (req, res) => {
    const { email } = req.params;
    const { nombre, telefono } = req.body;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        usuario.nombre = nombre;
        usuario.telefono = telefono || '';
        await usuario.save();
        
        res.status(200).json({ success: true, mensaje: 'Datos actualizados' });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Cambiar contraseña del usuario
app.put('/api/usuarios/:email/password', async (req, res) => {
    const { email } = req.params;
    const { passwordActual, passwordNuevo } = req.body;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña actual
        const hashedActual = hashPassword(passwordActual);
        if (usuario.password !== hashedActual) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }
        
        // Actualizar contraseña
        usuario.password = hashPassword(passwordNuevo);
        await usuario.save();
        
        res.status(200).json({ success: true, mensaje: 'Contraseña actualizada' });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Obtener carrito del usuario
app.get('/api/usuarios/:email/carrito', async (req, res) => {
    const { email } = req.params;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.status(200).json({ carrito: usuario.carrito || [] });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Actualizar carrito del usuario
app.put('/api/usuarios/:email/carrito', async (req, res) => {
    const { email } = req.params;
    const { carrito } = req.body;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        usuario.carrito = carrito || [];
        await usuario.save();
        
        res.status(200).json({ success: true, mensaje: 'Carrito actualizado' });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Obtener favoritos del usuario
app.get('/api/usuarios/:email/favoritos', async (req, res) => {
    const { email } = req.params;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.status(200).json({ favoritos: usuario.favoritos || [] });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Actualizar favoritos del usuario
app.put('/api/usuarios/:email/favoritos', async (req, res) => {
    const { email } = req.params;
    const { favoritos } = req.body;
    
    try {
        const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        usuario.favoritos = favoritos || [];
        await usuario.save();
        
        res.status(200).json({ success: true, mensaje: 'Favoritos actualizados' });
    } catch (error) {
        {}
        res.status(500).json({ error: 'Error del servidor' });
    }
});


// ==================== MOLDES ====================
app.get('/api/moldes', async (req, res) => {
    try {
        const moldes = await Molde.find();
        res.status(200).json(moldes);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener moldes' });
    }
});

app.post('/api/moldes', async (req, res) => {
    const datos = req.body;
    try {
        const nuevoMolde = new Molde(datos);
        const result = await nuevoMolde.save();
        res.status(201).json({ mensaje: 'Molde guardado', id: result._id, molde: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar molde' });
    }
});

app.delete('/api/moldes/:id', async (req, res) => {
    try {
        const result = await Molde.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Molde no encontrado' });
        res.status(200).json({ mensaje: 'Molde eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar molde' });
    }
});

// Actualizar molde (para agregar/modificar SVG)
app.put('/api/moldes/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await Molde.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Molde no encontrado' });
        res.status(200).json({ mensaje: 'Molde actualizado', molde: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar molde' });
    }
});

// Importar moldes desde JSON (bulk)
app.post('/api/moldes/importar', async (req, res) => {
    const { moldes } = req.body;
    try {
        if (!Array.isArray(moldes) || moldes.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de moldes' });
        }
        const resultado = await Molde.insertMany(moldes);
        res.status(201).json({ mensaje: `${resultado.length} moldes importados`, moldes: resultado });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al importar moldes' });
    }
});


// ==================== COLORES ====================
app.get('/api/colores', async (req, res) => {
    try {
        const colores = await Color.find();
        res.status(200).json(colores);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener colores' });
    }
});

app.post('/api/colores', async (req, res) => {
    const datos = req.body;
    try {
        const nuevoColor = new Color(datos);
        const result = await nuevoColor.save();
        res.status(201).json({ mensaje: 'Color guardado', id: result._id, color: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar color' });
    }
});

app.delete('/api/colores/:id', async (req, res) => {
    try {
        const result = await Color.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Color no encontrado' });
        res.status(200).json({ mensaje: 'Color eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar color' });
    }
});

// Actualizar color
app.put('/api/colores/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await Color.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Color no encontrado' });
        res.status(200).json({ mensaje: 'Color actualizado', color: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar color' });
    }
});

// Importar colores desde JSON (bulk)
app.post('/api/colores/importar', async (req, res) => {
    const { colores } = req.body;
    try {
        if (!Array.isArray(colores) || colores.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de colores' });
        }
        const resultado = await Color.insertMany(colores);
        res.status(201).json({ mensaje: `${resultado.length} colores importados`, colores: resultado });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al importar colores' });
    }
});


// ==================== COLORES HILO ENCERADO ====================
app.get('/api/colores-hilo', async (req, res) => {
    try {
        const colores = await ColorHilo.find();
        res.status(200).json(colores);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener colores de hilo' });
    }
});

app.post('/api/colores-hilo', async (req, res) => {
    const datos = req.body;
    try {
        const nuevoColor = new ColorHilo(datos);
        const result = await nuevoColor.save();
        res.status(201).json({ mensaje: 'Color de hilo guardado', id: result._id, color: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar color de hilo' });
    }
});

app.delete('/api/colores-hilo/:id', async (req, res) => {
    try {
        const result = await ColorHilo.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Color de hilo no encontrado' });
        res.status(200).json({ mensaje: 'Color de hilo eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar color de hilo' });
    }
});

app.put('/api/colores-hilo/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await ColorHilo.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Color de hilo no encontrado' });
        res.status(200).json({ mensaje: 'Color de hilo actualizado', color: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar color de hilo' });
    }
});

app.post('/api/colores-hilo/importar', async (req, res) => {
    const { colores } = req.body;
    try {
        if (!Array.isArray(colores) || colores.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de colores' });
        }
        const resultado = await ColorHilo.insertMany(colores);
        res.status(201).json({ mensaje: `${resultado.length} colores de hilo importados`, colores: resultado });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al importar colores de hilo' });
    }
});


// ==================== MOLDES HILO ENCERADO ====================
app.get('/api/moldes-hilo', async (req, res) => {
    try {
        const moldes = await MoldeHilo.find();
        res.status(200).json(moldes);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener moldes de hilo' });
    }
});

app.post('/api/moldes-hilo', async (req, res) => {
    const datos = req.body;
    try {
        const nuevoMolde = new MoldeHilo(datos);
        const result = await nuevoMolde.save();
        res.status(201).json({ mensaje: 'Molde de hilo guardado', id: result._id, molde: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar molde de hilo' });
    }
});

app.delete('/api/moldes-hilo/:id', async (req, res) => {
    try {
        const result = await MoldeHilo.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Molde de hilo no encontrado' });
        res.status(200).json({ mensaje: 'Molde de hilo eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar molde de hilo' });
    }
});

app.put('/api/moldes-hilo/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await MoldeHilo.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Molde de hilo no encontrado' });
        res.status(200).json({ mensaje: 'Molde de hilo actualizado', molde: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar molde de hilo' });
    }
});

app.post('/api/moldes-hilo/importar', async (req, res) => {
    const { moldes } = req.body;
    try {
        if (!Array.isArray(moldes) || moldes.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de moldes' });
        }
        const resultado = await MoldeHilo.insertMany(moldes);
        res.status(201).json({ mensaje: `${resultado.length} moldes de hilo importados`, moldes: resultado });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al importar moldes de hilo' });
    }
});


// ==================== PRODUCTOS (colección unificada) ====================
// Obtener tipos de producto únicos
app.get('/api/productos/tipos', async (req, res) => {
    try {
        const tipos = await Producto.distinct('producto');
        res.status(200).json(tipos);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener tipos de producto' });
    }
});

// Obtener materiales únicos por tipo de producto
app.get('/api/productos/materiales/:tipo', async (req, res) => {
    const { tipo } = req.params;
    try {
        const materiales = await Producto.distinct('material', { producto: tipo });
        res.status(200).json(materiales);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener materiales' });
    }
});

// Obtener subcategorías únicas por producto y material
app.get('/api/productos/subcategorias/:producto/:material', async (req, res) => {
    const { producto, material } = req.params;
    try {
        const productos = await Producto.find({ producto, material });
        // Extraer todas las subcategorías y eliminar duplicados
        const subcategorias = [...new Set(productos.flatMap(p => p.subcategorias || []))];
        res.status(200).json(subcategorias);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener subcategorías' });
    }
});

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.status(200).json(productos);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
});

// Crear nuevo producto
app.post('/api/productos', async (req, res) => {
    const datos = req.body;
    try {
        if (datos.coloresPorImagen) {
            {});
        }
        const nuevoProducto = new Producto(datos);
        const result = await nuevoProducto.save();
        if (result.coloresPorImagen && result.coloresPorImagen.length > 0) {
            {}
        }
        res.status(201).json({ mensaje: 'Producto guardado', id: result._id, producto: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar producto' });
    }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
    const datos = req.body;
    try {
        if (datos.coloresPorImagen) {
            {});
        }
        const result = await Producto.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        if (result.coloresPorImagen && result.coloresPorImagen.length > 0) {
            {}
        }
        res.status(200).json({ mensaje: 'Producto actualizado', producto: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar producto' });
    }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const result = await Producto.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.status(200).json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar producto' });
    }
});

// Obtener productos por tipo y material
app.get('/api/productos/por-tipo/:tipo', async (req, res) => {
    const { tipo } = req.params;
    const { material } = req.query;
    try {
        const query = { producto: tipo };
        if (material) query.material = material;
        const productos = await Producto.find(query);
        res.status(200).json(productos);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
});


// ==================== PEDIDOS ====================
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ fecha: -1 });
        res.status(200).json(pedidos);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
});

app.post('/api/pedidos', async (req, res) => {
    const datos = req.body;
    try {
        const nuevoPedido = new Pedido(datos);
        const result = await nuevoPedido.save();

        // Descontar stock para items que vienen de stock disponible
        if (datos.items && datos.items.length > 0) {
            const itemsDeStock = datos.items.filter(item => item.esStock && item.stockVarianteId);
            for (const item of itemsDeStock) {
                try {
                    // Buscar el documento de stock que contiene esta variante
                    const stockDoc = await Stock.findOne({
                        productoId: item.productoId,
                        'variantes._id': item.stockVarianteId
                    });
                    if (stockDoc) {
                        const variante = stockDoc.variantes.find(v => v._id === item.stockVarianteId);
                        if (variante) {
                            variante.cantidad = Math.max(0, variante.cantidad - item.cantidad);
                            {}

                            // Si la variante llega a 0, eliminarla
                            if (variante.cantidad === 0) {
                                stockDoc.variantes = stockDoc.variantes.filter(v => v._id !== item.stockVarianteId);
                                {}`);
                            }

                            // Si no quedan variantes, eliminar el documento de stock completo
                            if (stockDoc.variantes.length === 0) {
                                await Stock.findByIdAndDelete(stockDoc._id);
                                {}`);
                            } else {
                                stockDoc.ultimaActualizacion = new Date();
                                await stockDoc.save();
                            }
                        }
                    }
                } catch (stockError) {
                    {}
                    // No fallar el pedido por error de stock
                }
            }
        }

        res.status(201).json({ mensaje: 'Pedido guardado', id: result._id, pedido: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar pedido' });
    }
});

app.put('/api/pedidos/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await Pedido.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        res.status(200).json({ mensaje: 'Pedido actualizado', pedido: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar pedido' });
    }
});

app.delete('/api/pedidos/:id', async (req, res) => {
    try {
        const result = await Pedido.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        res.status(200).json({ mensaje: 'Pedido eliminado' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar pedido' });
    }
});


// ==================== VENTAS ====================
app.get('/api/ventas', async (req, res) => {
    try {
        const ventas = await Venta.find().sort({ fechaVenta: -1 });
        res.status(200).json(ventas);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener ventas' });
    }
});

app.post('/api/ventas', async (req, res) => {
    const datos = req.body;
    try {
        const nuevaVenta = new Venta(datos);
        const result = await nuevaVenta.save();
        res.status(201).json({ mensaje: 'Venta guardada', id: result._id, venta: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar venta' });
    }
});

app.delete('/api/ventas/:id', async (req, res) => {
    try {
        const result = await Venta.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Venta no encontrada' });
        res.status(200).json({ mensaje: 'Venta eliminada' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar venta' });
    }
});


// ==================== CALCULADORA MEMORIA ====================
app.get('/api/calculadora-memoria', async (req, res) => {
    try {
        const memoria = await CalculadoraMemoria.findOne({ nombre: 'calculadora_principal' });
        res.status(200).json(memoria || { productos: [], contadorId: 1 });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener memoria' });
    }
});

app.post('/api/calculadora-memoria', async (req, res) => {
    const { productos, contadorId } = req.body;
    try {
        const memoria = await CalculadoraMemoria.findOneAndUpdate(
            { nombre: 'calculadora_principal' },
            { productos, contadorId, fechaActualizacion: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ mensaje: 'Memoria guardada', memoria });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar memoria' });
    }
});

app.delete('/api/calculadora-memoria', async (req, res) => {
    try {
        await CalculadoraMemoria.findOneAndUpdate(
            { nombre: 'calculadora_principal' },
            { productos: [], contadorId: 1, fechaActualizacion: new Date() },
            { upsert: true }
        );
        res.status(200).json({ mensaje: 'Memoria limpiada' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al limpiar memoria' });
    }
});


// ==================== COMPRAS ====================
// Obtener lugares únicos
app.get('/api/compras/lugares', async (req, res) => {
    try {
        const lugares = await Compra.distinct('lugar');
        res.status(200).json(lugares);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener lugares' });
    }
});

// Importar compras desde JSON (bulk)
app.post('/api/compras/importar', async (req, res) => {
    const { compras } = req.body;
    try {
        if (!Array.isArray(compras) || compras.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de compras' });
        }
        const resultado = await Compra.insertMany(compras);
        res.status(201).json({ mensaje: `${resultado.length} compras importadas`, cantidad: resultado.length });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al importar compras' });
    }
});

// Obtener todas las compras
app.get('/api/compras', async (req, res) => {
    try {
        const compras = await Compra.find().sort({ fechaCompra: -1 });
        res.status(200).json(compras);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener compras' });
    }
});

// Crear nueva compra
app.post('/api/compras', async (req, res) => {
    const datos = req.body;
    try {
        const nuevaCompra = new Compra(datos);
        const result = await nuevaCompra.save();
        res.status(201).json({ mensaje: 'Compra guardada', id: result._id, compra: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar compra' });
    }
});

// Actualizar compra
app.put('/api/compras/:id', async (req, res) => {
    const datos = req.body;
    try {
        const result = await Compra.findByIdAndUpdate(req.params.id, datos, { new: true });
        if (!result) return res.status(404).json({ mensaje: 'Compra no encontrada' });
        res.status(200).json({ mensaje: 'Compra actualizada', compra: result });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar compra' });
    }
});

// Eliminar compra
app.delete('/api/compras/:id', async (req, res) => {
    try {
        const result = await Compra.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ mensaje: 'Compra no encontrada' });
        res.status(200).json({ mensaje: 'Compra eliminada' });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar compra' });
    }
});




// ==================== RUTAS STOCK ====================

// Obtener todos los productos en stock
app.get('/api/stock', async (req, res) => {
    try {
        const stock = await Stock.find().sort({ fechaCreacion: -1 });

        // Limpiar variantes con cantidad 0 y documentos vacíos
        for (const item of stock) {
            const antes = item.variantes.length;
            item.variantes = item.variantes.filter(v => v.cantidad > 0);
            if (item.variantes.length === 0) {
                await Stock.findByIdAndDelete(item._id);
            } else if (item.variantes.length !== antes) {
                item.ultimaActualizacion = new Date();
                await item.save();
            }
        }

        // Re-obtener stock limpio
        const stockLimpio = await Stock.find().sort({ fechaCreacion: -1 });
        res.status(200).json(stockLimpio);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener stock' });
    }
});

// Obtener stock por productoId (para mostrar disponibilidad en la tienda)
app.get('/api/stock/producto/:productoId', async (req, res) => {
    try {
        const items = await Stock.find({ productoId: req.params.productoId });
        // Filtrar solo variantes con cantidad > 0
        const itemsConStock = items.map(item => {
            const obj = item.toObject();
            obj.variantes = obj.variantes.filter(v => v.cantidad > 0);
            return obj;
        }).filter(item => item.variantes.length > 0);
        res.status(200).json(itemsConStock);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener stock por producto' });
    }
});

// Obtener un item de stock por ID
app.get('/api/stock/:id', async (req, res) => {
    try {
        const item = await Stock.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ mensaje: 'Item no encontrado' });
        }
        res.status(200).json(item);
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener item' });
    }
});

// Agregar nuevo producto al stock (ahora con variantes)
app.post('/api/stock', async (req, res) => {
    try {
        {}
        
        // Validar campos requeridos
        const { productoId, productoNombre, productoTipo, material, variantes } = req.body;
        if (!productoId || !productoNombre || !productoTipo || !material || !variantes || variantes.length === 0) {
            return res.status(400).json({ 
                mensaje: 'Faltan campos requeridos. Se requiere al menos una variante.',
                recibido: req.body
            });
        }

        const nuevoStock = new Stock(req.body);
        await nuevoStock.validate(); // Forzar validación antes de guardar
        await nuevoStock.save();
        {}
        res.status(201).json({ mensaje: 'Producto agregado al stock', stock: nuevoStock });
    } catch (error) {
        {}
        const status = error.name === 'ValidationError' ? 400 : 500;
        res.status(status).json({ 
            mensaje: 'Error al agregar al stock',
            error: error.message,
            detalles: error.errors || undefined,
            recibido: req.body
        });
    }
});

// Agregar una nueva variante a un stock existente
app.post('/api/stock/:id/variante', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);
        if (!stock) {
            return res.status(404).json({ mensaje: 'Item de stock no encontrado' });
        }

        const nuevaVariante = req.body;
        if (!nuevaVariante._id) {
            nuevaVariante._id = `var-${Date.now()}`;
        }
        if (!nuevaVariante.cantidad || nuevaVariante.cantidad < 1) {
            return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' });
        }

        stock.variantes.push(nuevaVariante);
        stock.ultimaActualizacion = new Date();
        await stock.save();

        {}
        res.status(201).json({ mensaje: 'Variante agregada', stock });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al agregar variante' });
    }
});

// Actualizar cantidad de una variante específica
app.put('/api/stock/:id/variante/:varianteId/cantidad', async (req, res) => {
    try {
        const { cantidad } = req.body;
        const stock = await Stock.findById(req.params.id);
        
        if (!stock) {
            return res.status(404).json({ mensaje: 'Item no encontrado' });
        }
        
        const variante = stock.variantes.find(v => v._id === req.params.varianteId);
        if (!variante) {
            return res.status(404).json({ mensaje: 'Variante no encontrada' });
        }
        
        variante.cantidad = cantidad;

        // Si la cantidad es 0, eliminar la variante
        if (cantidad === 0) {
            stock.variantes = stock.variantes.filter(v => v._id !== req.params.varianteId);
        }

        // Si no quedan variantes, eliminar el documento completo
        if (stock.variantes.length === 0) {
            await Stock.findByIdAndDelete(req.params.id);
            return res.status(200).json({ mensaje: 'Producto eliminado del stock (sin variantes)' });
        }

        stock.ultimaActualizacion = new Date();
        await stock.save();
        
        res.status(200).json({ mensaje: 'Cantidad actualizada', stock });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al actualizar cantidad' });
    }
});

// Eliminar una variante específica del stock
app.delete('/api/stock/:id/variante/:varianteId', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);
        
        if (!stock) {
            return res.status(404).json({ mensaje: 'Item no encontrado' });
        }
        
        // Buscar y eliminar la variante
        stock.variantes = stock.variantes.filter(v => v._id !== req.params.varianteId);
        
        // Si no quedan variantes, eliminar todo el producto
        if (stock.variantes.length === 0) {
            await Stock.findByIdAndDelete(req.params.id);
            return res.status(200).json({ mensaje: 'Producto eliminado completamente (sin variantes)' });
        }
        
        stock.ultimaActualizacion = new Date();
        await stock.save();
        res.status(200).json({ mensaje: 'Variante eliminada', stock });
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al eliminar variante' });
    }
});

// Vender producto desde stock (crea una venta y reduce una variante específica)
app.post('/api/stock/:id/vender', async (req, res) => {
    try {
        const { cantidadVendida, cliente, metodoPago, precio, varianteId } = req.body;
        const stock = await Stock.findById(req.params.id);
        
        if (!stock) {
            return res.status(404).json({ mensaje: 'Item no encontrado en stock' });
        }
        
        // Buscar la variante específica
        const variante = stock.variantes.find(v => v._id === varianteId);
        if (!variante) {
            return res.status(404).json({ mensaje: 'Variante no encontrada' });
        }
        
        if (variante.cantidad < cantidadVendida) {
            return res.status(400).json({ mensaje: 'Cantidad insuficiente en esta variante' });
        }
        
        // Construir detalles del diseño de la variante vendida
        let notaVenta = '';
        if (variante.coloresPorCapa && variante.coloresPorCapa.length > 0) {
            notaVenta += 'Colores: ' + variante.coloresPorCapa.map(c => `${c.capaNombre}: ${c.colorNombre}`).join(', ');
        }
        if (variante.detallesDiseno) {
            notaVenta += (notaVenta ? ' | ' : '') + `Diseño: ${variante.detallesDiseno}`;
        }
        
        // Crear la venta
        const nuevaVenta = new Venta({
            cliente: cliente || 'Cliente general',
            productoNombre: stock.productoNombre,
            productoTipo: stock.productoTipo,
            material: stock.material,
            cantidad: cantidadVendida,
            precio: precio || 0,
            metodoPago: metodoPago || 'Efectivo',
            fechaVenta: new Date().toISOString(),
            estado: 'Entregado',
            nota: notaVenta
        });
        
        await nuevaVenta.save();
        
        // Actualizar o eliminar la variante
        variante.cantidad -= cantidadVendida;
        
        // Si la variante se agota, eliminarla
        if (variante.cantidad === 0) {
            stock.variantes = stock.variantes.filter(v => v._id !== varianteId);
        }
        
        // Si no quedan variantes, eliminar todo el producto
        if (stock.variantes.length === 0) {
            await Stock.findByIdAndDelete(req.params.id);
            return res.status(200).json({ 
                mensaje: 'Venta registrada y producto agotado completamente del stock', 
                venta: nuevaVenta 
            });
        } else {
            stock.ultimaActualizacion = new Date();
            await stock.save();
            return res.status(200).json({ 
                mensaje: 'Venta registrada', 
                venta: nuevaVenta, 
                stock 
            });
        }
    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al procesar venta' });
    }
});

// ==================== RUTAS GENÉRICAS POR COLECCIÓN ====================

// Agregar producto a la colección correspondiente (uso legacy)
app.post('/api/:coleccion', async (req, res) => {
    const { coleccion } = req.params;
    const datos = req.body;

    // Evitar colisión con el endpoint específico de Stock
    if (coleccion.toLowerCase() === 'stock') {
        return res.status(404).json({ mensaje: 'Endpoint no válido. Use /api/stock' });
    }
    
    try {
        const schema = new mongoose.Schema({
            material: String,
            nombre: String,
            descripcion: String,
            cant: Number,
            precio: Number,
            imagenUrl: String
        }, { versionKey: false });

        const ModeloDinamico = mongoose.models[coleccion] || mongoose.model(coleccion, schema, coleccion);

        const nuevoProducto = new ModeloDinamico(datos);
        const result = await nuevoProducto.save();

        res.status(201).json({ mensaje: 'Producto guardado', id: result._id });

    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al guardar producto' });
    }
});

// Obtener productos según colección para carrusel inicio (uso legacy)
app.get('/api/:coleccion', async (req, res) => {
    const { coleccion } = req.params;

    // Evitar colisión con el endpoint específico de Stock
    if (coleccion.toLowerCase() === 'stock') {
        return res.status(404).json({ mensaje: 'Endpoint no válido. Use /api/stock' });
    }

    try {
        const schema = new mongoose.Schema({
            material: String,
            nombre: String,
            descripcion: String,
            cant: Number,
            precio: Number,
            imagenUrl: String
        }, { versionKey: false });

        const ModeloDinamico = mongoose.models[coleccion] || mongoose.model(coleccion, schema, coleccion);

        const productos = await ModeloDinamico.find();
        res.status(200).json(productos);

    } catch (error) {
        {}
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
console.log('✅ Cloudinary configurado correctamente con:');
console.log('🔸 Cloud Name:', cloudinary.config().cloud_name);