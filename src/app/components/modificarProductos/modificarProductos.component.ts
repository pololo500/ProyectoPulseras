import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../button/button.component';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';
import { PopupSubcategoriaComponent } from '../popupSubcategoria/popupSubcategoria.component';

interface Molde {
  _id: string;
  nombre: string;
  capas: { nombre: string; volumen: number }[];
}

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl?: string;
  imagenesUrls?: string[];
  subcategorias?: string[];
  moldeId?: string;
  moldeNombre?: string;
}

@Component({
  selector: 'app-modificarProductos',
  imports: [CommonModule, FormsModule, ButtonComponent, CapitalizePipe, PopupSubcategoriaComponent],
  templateUrl: './modificarProductos.component.html',
  styleUrl: './modificarProductos.component.css'
})
export class ModificarProductosComponent implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  tiposProducto: string[] = [];
  materiales: string[] = [];
  moldes: Molde[] = [];
  
  // Filtros
  filtroProducto = '';
  filtroMaterial = '';
  
  // Edición
  productoEditando: Producto | null = null;
  editForm = {
    producto: '',
    material: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    moldeNombre: ''
  };
  
  // Subcategorías
  subcategoriasDisponibles: string[] = [];
  subcategoriasSeleccionadas: string[] = [];
  mostrarDropdownSubcategorias = false;
  mostrarPopupSubcategoria = false;
  
  // Resina
  esResina = false;
  
  // Imágenes múltiples
  imagenesExistentes: string[] = [];
  imagenesEliminadas: Set<number> = new Set(); // Índices de imágenes marcadas para eliminar
  imagenesNuevas: File[] = [];
  imagenesNuevasPreview: string[] = [];
  imagenesNuevasEliminadas: Set<number> = new Set(); // Índices de imágenes nuevas marcadas para eliminar
  imagenCarruselIndex: number = 0;
  
  // Popup confirmación eliminar
  mostrarPopupEliminar = false;
  productoAEliminar: Producto | null = null;

  constructor(
    private http: HttpClient, 
    private globalService: GlobalService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/modificarProductos");
    this.cargarProductos();
    this.cargarTiposProducto();
    this.cargarMoldes();
    
    // Leer queryParams para aplicar filtro inicial
    this.route.queryParams.subscribe(params => {
      if (params['filtroProducto']) {
        this.filtroProducto = params['filtroProducto'];
        this.cargarMateriales(this.filtroProducto);
        this.aplicarFiltros();
      }
    });
  }

  cargarProductos() {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe(data => {
        this.productos = data;
        this.aplicarFiltros();
      });
  }

  cargarTiposProducto() {
    this.http.get<string[]>('http://localhost:5000/api/productos/tipos')
      .subscribe(data => {
        this.tiposProducto = data;
      });
  }

  cargarMoldes() {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = data,
        error: (err) => console.error('Error al cargar moldes:', err)
      });
  }

  cargarMateriales(producto: string) {
    if (producto) {
      this.http.get<string[]>(`http://localhost:5000/api/productos/materiales/${producto}`)
        .subscribe(data => {
          this.materiales = data;
        });
    } else {
      this.materiales = [];
    }
  }

  onFiltroProductoChange() {
    this.filtroMaterial = '';
    this.cargarMateriales(this.filtroProducto);
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.productosFiltrados = this.productos.filter(p => {
      const coincideProducto = !this.filtroProducto || p.producto === this.filtroProducto;
      const coincideMaterial = !this.filtroMaterial || p.material === this.filtroMaterial;
      return coincideProducto && coincideMaterial;
    });
  }

  limpiarFiltros() {
    this.filtroProducto = '';
    this.filtroMaterial = '';
    this.materiales = [];
    this.aplicarFiltros();
  }

  // Helper para obtener imágenes de un producto (compatibilidad con imagenUrl e imagenesUrls)
  getImagenesProducto(producto: Producto): string[] {
    if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
      return producto.imagenesUrls;
    } else if (producto.imagenUrl) {
      return [producto.imagenUrl];
    }
    return [];
  }

  getPrimeraImagen(producto: Producto): string {
    const imagenes = this.getImagenesProducto(producto);
    return imagenes.length > 0 ? imagenes[0] : '';
  }

  // Edición
  editarProducto(producto: Producto) {
    this.productoEditando = producto;
    this.editForm = {
      producto: producto.producto,
      material: producto.material,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      moldeNombre: producto.moldeNombre || ''
    };
    // Cargar imágenes existentes
    this.imagenesExistentes = [...this.getImagenesProducto(producto)];
    this.imagenesEliminadas = new Set();
    this.imagenesNuevas = [];
    this.imagenesNuevasPreview = [];
    this.imagenesNuevasEliminadas = new Set();
    this.imagenCarruselIndex = 0;
    
    // Cargar subcategorías
    this.subcategoriasSeleccionadas = [...(producto.subcategorias || [])];
    this.cargarSubcategoriasDisponibles();
    
    // Verificar si es resina
    this.esResina = producto.material?.toLowerCase() === 'resina';
  }

  cancelarEdicion() {
    this.productoEditando = null;
    this.imagenesExistentes = [];
    this.imagenesEliminadas = new Set();
    this.imagenesNuevas = [];
    this.imagenesNuevasPreview = [];
    this.imagenesNuevasEliminadas = new Set();
    this.imagenCarruselIndex = 0;
    this.subcategoriasSeleccionadas = [];
    this.subcategoriasDisponibles = [];
    this.mostrarDropdownSubcategorias = false;
    this.esResina = false;
  }

  // Subcategorías
  cargarSubcategoriasDisponibles() {
    const producto = this.editForm.producto;
    const material = this.editForm.material;
    
    if (!producto || !material) {
      this.subcategoriasDisponibles = [];
      return;
    }
    
    this.http.get<string[]>(`http://localhost:5000/api/productos/subcategorias/${producto}/${material}`)
      .subscribe({
        next: (data) => this.subcategoriasDisponibles = data || [],
        error: (err) => {
          console.error('Error al cargar subcategorías:', err);
          this.subcategoriasDisponibles = [];
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
  }

  isSubcategoriaSeleccionada(subcategoria: string): boolean {
    return this.subcategoriasSeleccionadas.includes(subcategoria);
  }

  eliminarSubcategoria(subcategoria: string) {
    const index = this.subcategoriasSeleccionadas.indexOf(subcategoria);
    if (index > -1) {
      this.subcategoriasSeleccionadas.splice(index, 1);
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
    if (!this.subcategoriasDisponibles.includes(nombre)) {
      this.subcategoriasDisponibles.push(nombre);
    }
    if (!this.subcategoriasSeleccionadas.includes(nombre)) {
      this.subcategoriasSeleccionadas.push(nombre);
    }
    this.mostrarPopupSubcategoria = false;
  }

  onMaterialChange() {
    this.esResina = this.editForm.material?.toLowerCase() === 'resina';
    if (!this.esResina) {
      this.editForm.moldeNombre = '';
    }
    this.cargarSubcategoriasDisponibles();
  }

  // Carrusel - obtener imágenes visibles (no marcadas para eliminar)
  get imagenesExistentesVisibles(): { url: string, indexOriginal: number }[] {
    return this.imagenesExistentes
      .map((url, index) => ({ url, indexOriginal: index }))
      .filter(img => !this.imagenesEliminadas.has(img.indexOriginal));
  }

  get imagenesNuevasVisibles(): { url: string, indexOriginal: number }[] {
    return this.imagenesNuevasPreview
      .map((url, index) => ({ url, indexOriginal: index }))
      .filter(img => !this.imagenesNuevasEliminadas.has(img.indexOriginal));
  }

  get totalImagenes(): number {
    return this.imagenesExistentesVisibles.length + this.imagenesNuevasVisibles.length;
  }

  get imagenActual(): string {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    
    if (this.imagenCarruselIndex < existentesVisibles.length) {
      return existentesVisibles[this.imagenCarruselIndex].url;
    } else {
      const indexNueva = this.imagenCarruselIndex - existentesVisibles.length;
      return nuevasVisibles[indexNueva]?.url || '';
    }
  }

  get esImagenNueva(): boolean {
    return this.imagenCarruselIndex >= this.imagenesExistentesVisibles.length;
  }

  get imagenActualMarcadaEliminar(): boolean {
    return false; // Las imágenes visibles nunca están marcadas (ya se filtran)
  }

  anteriorImagen() {
    if (this.imagenCarruselIndex > 0) {
      this.imagenCarruselIndex--;
    }
  }

  siguienteImagen() {
    if (this.imagenCarruselIndex < this.totalImagenes - 1) {
      this.imagenCarruselIndex++;
    }
  }

  eliminarImagenActual() {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    
    if (this.imagenCarruselIndex < existentesVisibles.length) {
      // Marcar imagen existente para eliminar
      const indexOriginal = existentesVisibles[this.imagenCarruselIndex].indexOriginal;
      this.imagenesEliminadas.add(indexOriginal);
    } else {
      // Marcar imagen nueva para eliminar
      const indexNueva = this.imagenCarruselIndex - existentesVisibles.length;
      const indexOriginal = nuevasVisibles[indexNueva].indexOriginal;
      this.imagenesNuevasEliminadas.add(indexOriginal);
    }
    
    // Ajustar índice si es necesario
    if (this.imagenCarruselIndex >= this.totalImagenes && this.totalImagenes > 0) {
      this.imagenCarruselIndex = this.totalImagenes - 1;
    } else if (this.totalImagenes === 0) {
      this.imagenCarruselIndex = 0;
    }
  }

  // Métodos para reordenar imágenes
  moverImagenIzquierda() {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    
    if (this.imagenCarruselIndex === 0) return;
    
    // Caso 1: Estamos en imágenes existentes
    if (this.imagenCarruselIndex < existentesVisibles.length) {
      const indexActual = existentesVisibles[this.imagenCarruselIndex].indexOriginal;
      const indexAnterior = existentesVisibles[this.imagenCarruselIndex - 1].indexOriginal;
      // Intercambiar en el array de imágenes existentes
      [this.imagenesExistentes[indexAnterior], this.imagenesExistentes[indexActual]] = 
        [this.imagenesExistentes[indexActual], this.imagenesExistentes[indexAnterior]];
      this.imagenCarruselIndex--;
    } 
    // Caso 2: Primera imagen nueva, intercambiar con última existente
    else if (this.imagenCarruselIndex === existentesVisibles.length && existentesVisibles.length > 0) {
      // No podemos intercambiar entre existentes y nuevas fácilmente
      // Solo permitimos mover dentro del mismo grupo
      return;
    }
    // Caso 3: Estamos en imágenes nuevas
    else {
      const indexNueva = this.imagenCarruselIndex - existentesVisibles.length;
      if (indexNueva > 0) {
        const indexActual = nuevasVisibles[indexNueva].indexOriginal;
        const indexAnterior = nuevasVisibles[indexNueva - 1].indexOriginal;
        // Intercambiar en el array de imágenes nuevas
        [this.imagenesNuevas[indexAnterior], this.imagenesNuevas[indexActual]] = 
          [this.imagenesNuevas[indexActual], this.imagenesNuevas[indexAnterior]];
        [this.imagenesNuevasPreview[indexAnterior], this.imagenesNuevasPreview[indexActual]] = 
          [this.imagenesNuevasPreview[indexActual], this.imagenesNuevasPreview[indexAnterior]];
        this.imagenCarruselIndex--;
      }
    }
  }

  moverImagenDerecha() {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    
    if (this.imagenCarruselIndex >= this.totalImagenes - 1) return;
    
    // Caso 1: Estamos en imágenes existentes
    if (this.imagenCarruselIndex < existentesVisibles.length - 1) {
      const indexActual = existentesVisibles[this.imagenCarruselIndex].indexOriginal;
      const indexSiguiente = existentesVisibles[this.imagenCarruselIndex + 1].indexOriginal;
      // Intercambiar en el array de imágenes existentes
      [this.imagenesExistentes[indexActual], this.imagenesExistentes[indexSiguiente]] = 
        [this.imagenesExistentes[indexSiguiente], this.imagenesExistentes[indexActual]];
      this.imagenCarruselIndex++;
    }
    // Caso 2: Última imagen existente, no podemos intercambiar con nuevas
    else if (this.imagenCarruselIndex === existentesVisibles.length - 1 && nuevasVisibles.length > 0) {
      // No permitimos intercambiar entre existentes y nuevas
      return;
    }
    // Caso 3: Estamos en imágenes nuevas
    else if (this.imagenCarruselIndex >= existentesVisibles.length) {
      const indexNueva = this.imagenCarruselIndex - existentesVisibles.length;
      if (indexNueva < nuevasVisibles.length - 1) {
        const indexActual = nuevasVisibles[indexNueva].indexOriginal;
        const indexSiguiente = nuevasVisibles[indexNueva + 1].indexOriginal;
        // Intercambiar en el array de imágenes nuevas
        [this.imagenesNuevas[indexActual], this.imagenesNuevas[indexSiguiente]] = 
          [this.imagenesNuevas[indexSiguiente], this.imagenesNuevas[indexActual]];
        [this.imagenesNuevasPreview[indexActual], this.imagenesNuevasPreview[indexSiguiente]] = 
          [this.imagenesNuevasPreview[indexSiguiente], this.imagenesNuevasPreview[indexActual]];
        this.imagenCarruselIndex++;
      }
    }
  }

  get puedeIzquierda(): boolean {
    const existentesVisibles = this.imagenesExistentesVisibles;
    if (this.imagenCarruselIndex === 0) return false;
    // Si estamos en la primera imagen nueva, no podemos mover hacia atrás (no mezclamos grupos)
    if (this.imagenCarruselIndex === existentesVisibles.length && existentesVisibles.length > 0) return false;
    return true;
  }

  get puedeDerecha(): boolean {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    if (this.imagenCarruselIndex >= this.totalImagenes - 1) return false;
    // Si estamos en la última imagen existente y hay nuevas, no podemos mover hacia adelante (no mezclamos grupos)
    if (this.imagenCarruselIndex === existentesVisibles.length - 1 && nuevasVisibles.length > 0) return false;
    return true;
  }

  restaurarImagenActual() {
    // Método para restaurar una imagen marcada (por si se quiere agregar en el futuro)
  }

  onImagenesSeleccionadas(event: any) {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.imagenesNuevas.push(file);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesNuevasPreview.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
    
    event.target.value = '';
  }

  guardarCambios() {
    if (!this.productoEditando) return;

    // Filtrar imágenes existentes (quitar las marcadas para eliminar)
    const imagenesExistentesFinal = this.imagenesExistentes
      .filter((_, index) => !this.imagenesEliminadas.has(index));
    
    // Filtrar imágenes nuevas (quitar las marcadas para eliminar)
    const imagenesNuevasFinal = this.imagenesNuevas
      .filter((_, index) => !this.imagenesNuevasEliminadas.has(index));

    const guardar = (imagenesUrls: string[]) => {
      const body: any = {
        producto: this.editForm.producto,
        material: this.editForm.material,
        nombre: this.editForm.nombre,
        descripcion: this.editForm.descripcion,
        precio: this.editForm.precio,
        imagenesUrls: imagenesUrls,
        subcategorias: this.subcategoriasSeleccionadas
      };
      
      // Agregar nombre del molde si es resina (el nombre es único)
      if (this.esResina && this.editForm.moldeNombre) {
        body.moldeNombre = this.editForm.moldeNombre;
      } else {
        body.moldeNombre = '';
      }

      this.http.put(`http://localhost:5000/api/productos/${this.productoEditando!._id}`, body)
        .subscribe({
          next: () => {
            this.cargarProductos();
            this.cargarTiposProducto();
            this.cancelarEdicion();
          },
          error: (err) => {
            console.error('Error al actualizar producto:', err);
          }
        });
    };

    if (imagenesNuevasFinal.length > 0) {
      // Subir nuevas imágenes
      const uploadPromises = imagenesNuevasFinal.map(file => {
        const imageData = new FormData();
        imageData.append('file', file);
        imageData.append('upload_preset', 'unsigned_upload');
        imageData.append('cloud_name', 'dkbkgyvw7');
        return this.http.post<any>('https://api.cloudinary.com/v1_1/dkbkgyvw7/image/upload', imageData).toPromise();
      });

      Promise.all(uploadPromises)
        .then((responses) => {
          const nuevasUrls = responses.map(r => r.secure_url);
          const todasLasImagenes = [...imagenesExistentesFinal, ...nuevasUrls];
          guardar(todasLasImagenes);
        })
        .catch((err) => {
          console.error('Error al subir imágenes:', err);
        });
    } else {
      guardar(imagenesExistentesFinal);
    }
  }

  // Eliminar
  confirmarEliminar(producto: Producto) {
    this.productoAEliminar = producto;
    this.mostrarPopupEliminar = true;
  }

  cancelarEliminar() {
    this.productoAEliminar = null;
    this.mostrarPopupEliminar = false;
  }

  eliminarProducto() {
    if (!this.productoAEliminar) return;

    this.http.delete(`http://localhost:5000/api/productos/${this.productoAEliminar._id}`)
      .subscribe({
        next: () => {
          this.cargarProductos();
          this.cargarTiposProducto();
          this.cancelarEliminar();
        },
        error: (err) => {
          console.error('Error al eliminar producto:', err);
        }
      });
  }
}
