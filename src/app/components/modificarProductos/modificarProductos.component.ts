import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../button/button.component';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { GlobalService } from '../../services/global.service';
import { PopupSubcategoriaComponent } from '../popupSubcategoria/popupSubcategoria.component';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';

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
  coloresPorImagen?: ColoresImagen[];
}

@Component({
  selector: 'app-modificarProductos',
  imports: [CommonModule, FormsModule, ButtonComponent, CapitalizePipe, FormatoPrecioPipe, PopupSubcategoriaComponent, PopupConfirmComponent],
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
  filtroNombre = '';
  filtroPrecioMin: number | null = null;
  filtroPrecioMax: number | null = null;
  
  // Filtros mobile
  mostrarFiltrosMobile = false;
  
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

  // Colores para asignar a imágenes
  colores: Color[] = [];
  coloresPorImagen: ColoresImagen[] = [];
  imagenColorAbierta: number | null = null;

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
    this.cargarColores();
    
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

  cargarColores() {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => console.error('Error al cargar colores:', err)
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
      // Filtro por tipo
      if (this.filtroProducto && p.producto !== this.filtroProducto) {
        return false;
      }
      
      // Filtro por material
      if (this.filtroMaterial && p.material !== this.filtroMaterial) {
        return false;
      }
      
      // Filtro por nombre
      if (this.filtroNombre) {
        const nombreBuscado = this.filtroNombre.toLowerCase();
        if (!p.nombre.toLowerCase().includes(nombreBuscado)) {
          return false;
        }
      }
      
      // Filtro por precio mínimo
      if (this.filtroPrecioMin !== null && p.precio !== undefined) {
        if (p.precio < this.filtroPrecioMin) {
          return false;
        }
      }
      
      // Filtro por precio máximo
      if (this.filtroPrecioMax !== null && p.precio !== undefined) {
        if (p.precio > this.filtroPrecioMax) {
          return false;
        }
      }
      
      return true;
    });
  }

  limpiarFiltros() {
    this.filtroProducto = '';
    this.filtroMaterial = '';
    this.filtroNombre = '';
    this.filtroPrecioMin = null;
    this.filtroPrecioMax = null;
    this.materiales = [];
    this.aplicarFiltros();
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.filtroProducto || this.filtroMaterial || this.filtroNombre || 
              this.filtroPrecioMin !== null || this.filtroPrecioMax !== null);
  }

  abrirFiltrosMobile() {
    this.mostrarFiltrosMobile = true;
  }

  cerrarFiltrosMobile() {
    this.mostrarFiltrosMobile = false;
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
    
    // Cargar colores por imagen existentes
    this.coloresPorImagen = producto.coloresPorImagen ? JSON.parse(JSON.stringify(producto.coloresPorImagen)) : [];
    this.imagenColorAbierta = null;
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
    this.coloresPorImagen = [];
    this.imagenColorAbierta = null;
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

  // ==================== Colores por imagen ====================
  
  getMoldeSeleccionado(): Molde | null {
    const moldeNombre = this.editForm.moldeNombre;
    if (!moldeNombre) return null;
    return this.moldes.find(m => m.nombre === moldeNombre) || null;
  }

  getColoresPorCategoria(categoria: string): Color[] {
    return this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase());
  }

  trackByIndexOriginal(index: number, item: { url: string, indexOriginal: number }): number {
    return item.indexOriginal;
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

  imagenTieneColoresIdx(imgIdx: number): boolean {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    return !!(entry && entry.colores.length > 0);
  }

  limpiarColoresImagen(imgIdx: number) {
    this.coloresPorImagen = this.coloresPorImagen.filter(c => c.imagenIndex !== imgIdx);
  }

  getColoresDeImagen(imgIdx: number): ColorPorImagenCapa[] {
    const entry = this.coloresPorImagen.find(c => c.imagenIndex === imgIdx);
    return entry ? entry.colores : [];
  }

  getColoresImagenActualCarrusel(): ColorPorImagenCapa[] {
    const imgIdx = this.getIndiceImagenReal(this.imagenCarruselIndex);
    if (imgIdx === undefined || imgIdx === null || isNaN(imgIdx)) return [];
    return this.getColoresDeImagen(imgIdx);
  }

  imagenActualTieneColoresCarrusel(): boolean {
    return this.getColoresImagenActualCarrusel().length > 0;
  }

  // Obtener el índice real de la imagen visible para asignar colores
  getIndiceImagenReal(visibleIdx: number): number {
    const existentesVisibles = this.imagenesExistentesVisibles;
    const nuevasVisibles = this.imagenesNuevasVisibles;
    
    if (visibleIdx < existentesVisibles.length) {
      return existentesVisibles[visibleIdx].indexOriginal;
    } else {
      return existentesVisibles.length + nuevasVisibles[visibleIdx - existentesVisibles.length]?.indexOriginal;
    }
  }

  onImagenesSeleccionadas(event: any) {
    const files: FileList = event.target.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIndex = this.imagenesNuevas.length;
      this.imagenesNuevas.push(file);
      
      // Pre-asignar el slot en el preview para mantener el orden
      this.imagenesNuevasPreview.push('');
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesNuevasPreview[targetIndex] = e.target.result;
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

      // Agregar colores por imagen - recalcular índices basados en las imágenes finales
      // Crear mapa de índice original → índice final para imágenes existentes
      const mapaIndicesExistentes: Map<number, number> = new Map();
      let nuevoIdx = 0;
      this.imagenesExistentes.forEach((_, idx) => {
        if (!this.imagenesEliminadas.has(idx)) {
          mapaIndicesExistentes.set(idx, nuevoIdx);
          nuevoIdx++;
        }
      });
      // Para imágenes nuevas, el índice original era imagenesExistentes.length + indexNueva
      const mapaIndicesNuevas: Map<number, number> = new Map();
      this.imagenesNuevasPreview.forEach((_, idx) => {
        if (!this.imagenesNuevasEliminadas.has(idx)) {
          const idxOriginal = this.imagenesExistentes.length + idx;
          mapaIndicesNuevas.set(idxOriginal, nuevoIdx);
          nuevoIdx++;
        }
      });
      
      const coloresRemapeados = this.coloresPorImagen
        .filter(c => c.colores.length > 0)
        .map(c => {
          const nuevoIndex = mapaIndicesExistentes.get(c.imagenIndex) ?? mapaIndicesNuevas.get(c.imagenIndex);
          if (nuevoIndex === undefined) return null; // imagen fue eliminada
          return { ...c, imagenIndex: nuevoIndex };
        })
        .filter(c => c !== null);
      body.coloresPorImagen = coloresRemapeados;

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
