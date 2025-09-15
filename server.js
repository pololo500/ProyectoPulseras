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
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch(err => console.error('Error al conectar a MongoDB:', err));


// Esquemas
const AdminSchema = new mongoose.Schema({
    dni: String,
    password: String
}, { versionKey: false });
  
const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;

const DijeSchema = new mongoose.Schema({
    nombre: String,
    categoria: [String],
    color: String,
    precio: Number,
    imagenUrl: String
}, { versionKey: false });

const Dijes = mongoose.model('Dijes', DijeSchema);
module.exports = Dijes;

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
        console.error(error);
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
        console.error('❌ Error al guardar pulsera:', error);
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
        console.error('Error al obtener colecciones:', error);
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
        console.error('Error obteniendo materiales:', error);
        res.status(500).json({ error: 'Error al obtener materiales' });
    }
});

function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

// Login
app.post('/api/admins', async (req, res) => {
    const { dni, password } = req.body;
  
    try {
        const admin = await Admin.findOne({ dni: dni.toString() });
        if (!admin) {
            return res.status(401).json({ success: false, error: 'dniIncorrecto' });
        }
    
        const hashedPassword = hashPassword(password);
        if (admin.password !== hashedPassword) {
            return res.status(401).json({ success: false, error: 'contraseñaIncorrecta' });
        }
  
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'serverError' });
    }
});


// Agregar dije a la colección
app.post('/api/dijes', async (req, res) => {
    const datos = req.body;

    try {
        const nuevoDije = new Dijes(datos);
        const result = await nuevoDije.save();
    
        res.status(201).json({ mensaje: 'Dije guardado', id: result._id });
    
    } catch (error) {
        console.error('Error al guardar dije:', error);
        res.status(500).json({ mensaje: 'Error al guardar dije' });
    }
});


// Agregar producto a la colección correspondiente
app.post('/api/:coleccion', async (req, res) => {
    const { coleccion } = req.params;
    const datos = req.body;

    if (coleccion.toLowerCase() === 'dijes') {
        res.status(400).json({ mensaje: 'Utilice el endpoint correcto', id: result._id });
    }
    
    try {
        /*const ModeloDinamico = mongoose.model(coleccion, new mongoose.Schema({
            material: String,
            nombre: String,
            mostacillas: [String],
            dijes: [String],
            descripcion: String,
            cant: Number,
            precio: Number,
            imagenUrl: String
        }, 
        { versionKey: false }));*/

        const schema = new mongoose.Schema({
            material: String,
            nombre: String,
            mostacillas: [String],
            dijes: [String],
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
        console.error('Error al guardar producto:', error);
        res.status(500).json({ mensaje: 'Error al guardar producto' });
    }
});


// Obtener productos segun coleccion para carrusel inicio
app.get('/api/:coleccion', async (req, res) => {
    const { coleccion } = req.params;

    try {
        const schema = new mongoose.Schema({
            material: String,
            nombre: String,
            mostacillas: [String],
            dijes: [String],
            descripcion: String,
            cant: Number,
            precio: Number,
            imagenUrl: String
        }, { versionKey: false });

        const ModeloDinamico = mongoose.models[coleccion] || mongoose.model(coleccion, schema, coleccion);


        const productos = await ModeloDinamico.find();
        res.status(200).json(productos);

    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
});


// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
console.log('✅ Cloudinary configurado correctamente con:');
console.log('🔸 Cloud Name:', cloudinary.config().cloud_name);