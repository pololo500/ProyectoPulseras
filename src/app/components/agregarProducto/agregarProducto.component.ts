import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';
import { PopupSubcategoriaComponent } from '../popupSubcategoria/popupSubcategoria.component';

interface Molde {
  _id: string;
  nombre: string;
  capas: { nombre: string; volumen: number }[];
}

interface Color {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

interface ColorPorImagenCapa {
  capaIndex: number;
  capaNombre: string;
  colorId: string;
  colorNombre: string;
  colorRgb: string;
  colorCategoria: string;
}

interface ColoresImagen {
  imagenIndex: number;
  colores: ColorPorImagenCapa[];
}

@Component({
    selector: 'app-agregarProducto',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent, CapitalizePipe, PopupSubcategoriaComponent],
    templateUrl: './agregarProducto.component.html',
    styleUrl: './agregarProducto.component.css'
})
export class AgregarProductoComponent implements OnInit {
  addProductForm: FormGroup;
  tiposProducto: string[] = [];
  materiales: string[] = [];
  moldes: Molde[] = [];
  
  // Para nuevos tipos/materiales
  mostrarInputNuevoProducto = false;
  mostrarInputNuevoMaterial = false;
  nuevoProductoNombre = '';
  nuevoMaterialNombre = '';
  
  // Para subcategorías
  subcategorias: string[] = [];
  subcategoriasSeleccionadas: string[] = [];
  mostrarDropdownSubcategorias = false;
  mostrarPopupSubcategoria = false;
  
  // Preview de imágenes (múltiples)
  imagenesPreview: string[] = [];
  archivosImagenes: File[] = [];
  
  // Carrusel de imágenes
  imagenCarruselIndex = 0;
  
  // Para resina
  esResina = false;

  // Colores para asignar a imágenes
  colores: Color[] = [];
  coloresPorImagen: ColoresImagen[] = [];
  imagenColorAbierta: number | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private globalService: GlobalService) {
    this.addProductForm = this.fb.group({
      producto: [''],
      material: [''],
      molde: [''],
      subcategorias: [[]],
      nombre: [''],
      descripcion: [''],
      precio: [''],
      imagenes: [[]]
    });
  }

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/agregarProducto");
    this.obtenerTiposProducto();
    this.cargarMoldes();
    this.cargarColores();
    
    this.addProductForm.get('producto')?.valueChanges.subscribe(producto => {
      if (producto === '__nuevo__') {
        this.mostrarInputNuevoProducto = true;
        this.materiales = [];
        this.addProductForm.get('material')?.setValue('');
        this.esResina = false;
        this.subcategorias = [];
        this.subcategoriasSeleccionadas = [];
      } else {
        this.mostrarInputNuevoProducto = false;
        this.nuevoProductoNombre = '';
        if (producto) {
          this.obtenerMateriales(producto);
        }
        this.subcategorias = [];
        this.subcategoriasSeleccionadas = [];
      }
    });
    
    this.addProductForm.get('material')?.valueChanges.subscribe(material => {
      if (material === '__nuevo__') {
        this.mostrarInputNuevoMaterial = true;
        this.esResina = false;
        this.subcategorias = [];
        this.subcategoriasSeleccionadas = [];
      } else {
        this.mostrarInputNuevoMaterial = false;
        this.nuevoMaterialNombre = '';
        // Verificar si es resina
        this.esResina = material?.toLowerCase() === 'resina';
        if (!this.esResina) {
          this.addProductForm.get('molde')?.setValue('');
        }
        // Cargar subcategorías cuando se selecciona material
        if (material && material !== '__nuevo__') {
          this.cargarSubcategorias();
        }
      }
    });
  }
  
  obtenerTiposProducto() {
    this.http.get<string[]>('http://localhost:5000/api/productos/tipos')
      .subscribe(data => {
        this.tiposProducto = data;
      });
  }

  obtenerMateriales(producto: string) {
    this.http.get<string[]>(`http://localhost:5000/api/productos/materiales/${producto}`)
      .subscribe(data => {
        this.materiales = data;
        this.addProductForm.get('material')?.setValue('');
        this.esResina = false;
      });
  }

  cargarMoldes() {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = data,
        error: (err) => console.error('Error al cargar moldes:', err)
      });
  }

  cargarColores() {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => console.error('Error al cargar colores:', err)
      });
  }

  cancelarNuevoProducto() {
    this.mostrarInputNuevoProducto = false;
    this.nuevoProductoNombre = '';
    this.addProductForm.get('producto')?.setValue('');
  }

  cancelarNuevoMaterial() {
    this.mostrarInputNuevoMaterial = false;
    this.nuevoMaterialNombre = '';
    this.addProductForm.get('material')?.setValue('');
    this.esResina = false;
  }

  onNuevoMaterialChange() {
    // Verificar si el nuevo material es "resina"
    this.esResina = this.nuevoMaterialNombre.toLowerCase() === 'resina';
    if (!this.esResina) {
      this.addProductForm.get('molde')?.setValue('');
    }
  }

  // Métodos para subcategorías
  cargarSubcategorias() {
    const producto = this.mostrarInputNuevoProducto ? this.nuevoProductoNombre.trim() : this.addProductForm.get('producto')?.value;
    const material = this.mostrarInputNuevoMaterial ? this.nuevoMaterialNombre.trim() : this.addProductForm.get('material')?.value;
    
    if (!producto || !material || producto === '__nuevo__' || material === '__nuevo__') {
      this.subcategorias = [];
      return;
    }
    
    this.http.get<string[]>(`http://localhost:5000/api/productos/subcategorias/${producto}/${material}`)
      .subscribe({
        next: (data) => this.subcategorias = data || [],
        error: (err) => {
          console.error('Error al cargar subcategorías:', err);
          this.subcategorias = [];
        }
      });
  }

  toggleDropdownSubcategorias() {
    this.mostrarDropdownSubcategorias = !this.mostrarDropdownSubcategorias;
  }

  toggleSubcategoria(subcategoria: string) {
    const index = this.subcategoriasSeleccionadas.indexOf(subcategoria);
    if (index > -1) {
      this.subcategoriasSeleccionadas.splice(index, 1);
    } else {
      this.subcategoriasSeleccionadas.push(subcategoria);
    }
    this.addProductForm.get('subcategorias')?.setValue([...this.subcategoriasSeleccionadas]);
  }

  isSubcategoriaSeleccionada(subcategoria: string): boolean {
    return this.subcategoriasSeleccionadas.includes(subcategoria);
  }

  eliminarSubcategoria(subcategoria: string) {
    const index = this.subcategoriasSeleccionadas.indexOf(subcategoria);
    if (index > -1) {
      this.subcategoriasSeleccionadas.splice(index, 1);
      this.addProductForm.get('subcategorias')?.setValue([...this.subcategoriasSeleccionadas]);
    }
  }

  abrirPopupSubcategoria() {
    this.mostrarPopupSubcategoria = true;
    this.mostrarDropdownSubcategorias = false;
  }

  cerrarPopupSubcategoria() {
    this.mostrarPopupSubcategoria = false;
  }

  onSubcategoriaGuardada(nombreSubcategoria: string) {
    const nombre = nombreSubcategoria.toLowerCase();
    if (!this.subcategorias.includes(nombre)) {
      this.subcategorias.push(nombre);
    }
    if (!this.subcategoriasSeleccionadas.includes(nombre)) {
      this.subcategoriasSeleccionadas.push(nombre);
      this.addProductForm.get('subcategorias')?.setValue([...this.subcategoriasSeleccionadas]);
    }
    this.mostrarPopupSubcategoria = false;
  }

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIndex = this.archivosImagenes.length;
      this.archivosImagenes.push(file);
      
      // Pre-asignar el slot en el preview para mantener el orden
      this.imagenesPreview.push('');
      
      // Crear preview de imagen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesPreview[targetIndex] = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    this.addProductForm.patchValue({ imagenes: this.archivosImagenes });
    // Limpiar el input para permitir seleccionar los mismos archivos de nuevo
    event.target.value = '';
  }

  eliminarImagen(index: number) {
    this.archivosImagenes.splice(index, 1);
    this.imagenesPreview.splice(index, 1);
    // Sincronizar coloresPorImagen
    this.coloresPorImagen = this.coloresPorImagen
      .filter(c => c.imagenIndex !== index)
      .map(c => ({
        ...c,
        imagenIndex: c.imagenIndex > index ? c.imagenIndex - 1 : c.imagenIndex
      }));
    if (this.imagenColorAbierta === index) {
      this.imagenColorAbierta = null;
    } else if (this.imagenColorAbierta !== null && this.imagenColorAbierta > index) {
      this.imagenColorAbierta--;
    }
    this.addProductForm.patchValue({ imagenes: this.archivosImagenes });
    // Ajustar índice del carrusel si es necesario
    if (this.imagenCarruselIndex >= this.imagenesPreview.length && this.imagenesPreview.length > 0) {
      this.imagenCarruselIndex = this.imagenesPreview.length - 1;
    } else if (this.imagenesPreview.length === 0) {
      this.imagenCarruselIndex = 0;
    }
  }

  // Métodos del carrusel
  get imagenActual(): string {
    return this.imagenesPreview[this.imagenCarruselIndex] || '';
  }

  anteriorImagen() {
    if (this.imagenCarruselIndex > 0) {
      this.imagenCarruselIndex--;
    }
  }

  siguienteImagen() {
    if (this.imagenCarruselIndex < this.imagenesPreview.length - 1) {
      this.imagenCarruselIndex++;
    }
  }

  irAImagen(index: number) {
    this.imagenCarruselIndex = index;
  }

  // Métodos para reordenar imágenes
  moverImagenIzquierda(index: number) {
    if (index > 0) {
      // Intercambiar en archivosImagenes
      [this.archivosImagenes[index - 1], this.archivosImagenes[index]] = 
        [this.archivosImagenes[index], this.archivosImagenes[index - 1]];
      // Intercambiar en imagenesPreview
      [this.imagenesPreview[index - 1], this.imagenesPreview[index]] = 
        [this.imagenesPreview[index], this.imagenesPreview[index - 1]];
      // Sincronizar coloresPorImagen
      this.coloresPorImagen = this.coloresPorImagen.map(c => {
        if (c.imagenIndex === index) return { ...c, imagenIndex: index - 1 };
        if (c.imagenIndex === index - 1) return { ...c, imagenIndex: index };
        return c;
      });
      // Actualizar el índice del carrusel si estamos viendo esta imagen
      if (this.imagenCarruselIndex === index) {
        this.imagenCarruselIndex = index - 1;
      } else if (this.imagenCarruselIndex === index - 1) {
        this.imagenCarruselIndex = index;
      }
    }
  }

  moverImagenDerecha(index: number) {
    if (index < this.imagenesPreview.length - 1) {
      // Intercambiar en archivosImagenes
      [this.archivosImagenes[index], this.archivosImagenes[index + 1]] = 
        [this.archivosImagenes[index + 1], this.archivosImagenes[index]];
      // Intercambiar en imagenesPreview
      [this.imagenesPreview[index], this.imagenesPreview[index + 1]] = 
        [this.imagenesPreview[index + 1], this.imagenesPreview[index]];
      // Sincronizar coloresPorImagen
      this.coloresPorImagen = this.coloresPorImagen.map(c => {
        if (c.imagenIndex === index) return { ...c, imagenIndex: index + 1 };
        if (c.imagenIndex === index + 1) return { ...c, imagenIndex: index };
        return c;
      });
      // Actualizar el índice del carrusel si estamos viendo esta imagen
      if (this.imagenCarruselIndex === index) {
        this.imagenCarruselIndex = index + 1;
      } else if (this.imagenCarruselIndex === index + 1) {
        this.imagenCarruselIndex = index;
      }
    }
  }

  eliminarImagenCarrusel() {
    this.eliminarImagen(this.imagenCarruselIndex);
  }

  // ==================== Colores por imagen ====================
  
  getMoldeSeleccionado(): Molde | null {
    const moldeNombre = this.addProductForm.get('molde')?.value;
    if (!moldeNombre) return null;
    return this.moldes.find(m => m.nombre === moldeNombre) || null;
  }

  getColoresPorCategoria(categoria: string): Color[] {
    return this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase());
  }

  toggleImagenColorAbierta(imgIdx: number) {
    this.imagenColorAbierta = this.imagenColorAbierta === imgIdx ? null : imgIdx;
  }

  getColoresImagenEntry(imgIdx: number): ColoresImagen {
    let entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    if (!entry) {
      entry = { imagenIndex: imgIdx, colores: [] };
      this.coloresPorImagen.push(entry);
    }
    return entry;
  }

  asignarColorImagen(imgIdx: number, capaIdx: number, color: Color) {
    const entry = this.getColoresImagenEntry(imgIdx);
    const molde = this.getMoldeSeleccionado();
    const capaNombre = molde?.capas[capaIdx]?.nombre || '';
    
    const existing = entry.colores.findIndex(c => c.capaIndex === capaIdx);
    const colorData: ColorPorImagenCapa = {
      capaIndex: capaIdx,
      capaNombre: capaNombre,
      colorId: color._id,
      colorNombre: color.nombre,
      colorRgb: color.rgb,
      colorCategoria: color.categoria
    };
    
    if (existing >= 0) {
      entry.colores[existing] = colorData;
    } else {
      entry.colores.push(colorData);
    }
  }

  quitarColorImagen(imgIdx: number, capaIdx: number) {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    if (entry) {
      entry.colores = entry.colores.filter(c => c.capaIndex !== capaIdx);
    }
  }

  getColorAsignado(imgIdx: number, capaIdx: number): ColorPorImagenCapa | null {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    if (!entry) return null;
    return entry.colores.find(c => c.capaIndex === capaIdx) || null;
  }

  imagenTieneColores(imgIdx: number): boolean {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    return !!(entry && entry.colores.length > 0);
  }

  getColoresDeImagen(imgIdx: number): ColorPorImagenCapa[] {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    return entry ? entry.colores : [];
  }

  limpiarColoresImagen(imgIdx: number) {
    this.coloresPorImagen = this.coloresPorImagen.filter(c => c.imagenIndex !== imgIdx);
  }

  submit() {
    const formValue = this.addProductForm.value;

    // Determinar el tipo de producto a usar
    const productoFinal = formValue.producto === '__nuevo__' ? this.nuevoProductoNombre.trim() : formValue.producto;
    // Determinar el material a usar
    const materialFinal = formValue.material === '__nuevo__' ? this.nuevoMaterialNombre.trim() : formValue.material;

    if (this.archivosImagenes.length === 0) {
      console.error('No hay archivos seleccionados');
      return;
    }

    if (!productoFinal || !materialFinal) {
      console.error('Producto y material son requeridos');
      return;
    }

    // Validar molde si es resina
    if (this.esResina && !formValue.molde) {
      console.error('Molde es requerido para productos de resina');
      return;
    }

    // Subir todas las imágenes a Cloudinary
    const uploadPromises = this.archivosImagenes.map(file => {
      const imageData = new FormData();
      imageData.append('file', file);
      imageData.append('upload_preset', 'unsigned_upload');
      imageData.append('cloud_name', 'dkbkgyvw7');
      
      return this.http.post<any>('https://api.cloudinary.com/v1_1/dkbkgyvw7/image/upload', imageData).toPromise();
    });

    Promise.all(uploadPromises)
      .then((responses) => {
        const imagenesUrls = responses.map(r => r.secure_url);
        
        const body: any = {
          producto: productoFinal,
          material: materialFinal,
          nombre: formValue.nombre,
          descripcion: formValue.descripcion,
          precio: parseFloat(formValue.precio),
          imagenesUrls: imagenesUrls,
          subcategorias: this.subcategoriasSeleccionadas
        };
        
        // Agregar nombre del molde si es resina (el nombre es único)
        if (this.esResina && formValue.molde) {
          body.moldeNombre = formValue.molde;
        }

        // Agregar colores por imagen si hay asignaciones
        const coloresConDatos = this.coloresPorImagen.filter(c => c.colores.length > 0);
        if (coloresConDatos.length > 0) {
          body.coloresPorImagen = coloresConDatos;
        }

        this.http.post('http://localhost:5000/api/productos', body)
          .subscribe({
            next: (res) => {
              this.addProductForm.reset();
              this.mostrarInputNuevoProducto = false;
              this.mostrarInputNuevoMaterial = false;
              this.nuevoProductoNombre = '';
              this.nuevoMaterialNombre = '';
              this.imagenesPreview = [];
              this.archivosImagenes = [];
              this.imagenCarruselIndex = 0;
              this.esResina = false;
              this.subcategoriasSeleccionadas = [];
              this.mostrarDropdownSubcategorias = false;
              this.coloresPorImagen = [];
              this.imagenColorAbierta = null;
              this.cargarSubcategorias();
              // Recargar tipos de producto por si se agregó uno nuevo
              this.obtenerTiposProducto();
            },
            error: (err) => {
              console.error('Error al guardar producto:', err);
            }
          });
      })
      .catch((err) => {
        console.error('Error al subir imágenes:', err);
      });
  }
}