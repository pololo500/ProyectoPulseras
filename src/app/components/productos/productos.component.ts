import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { CarritoService, ColorPorCapa } from '../../services/carrito.service';
import { FavoritosService } from '../../services/favoritos.service';
import { PopupExitoComponent, ColorInfo } from '../popupExito/popupExito.component';

interface Color {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

interface Capa {
  nombre: string;
  volumen: number;
}

interface SvgAreaMapping {
  capaIndex: number;
  capaNombre: string;
  svgElementId: string;
}

interface Molde {
  _id: string;
  nombre: string;
  capas: Capa[];
  svgContent?: string;
  svgAreaMappings?: SvgAreaMapping[];
}

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  subcategorias?: string[];
  imagenUrl?: string;
  imagenesUrls?: string[];
  moldeNombre?: string;
  cantidad?: number;
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, PopupExitoComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  colores: Color[] = [];
  moldes: Molde[] = [];
  
  // Modal de detalle
  mostrarDetalle = false;
  productoDetalle: Producto | null = null;
  imagenActualIndex = 0;
  cantidadDetalle = 1;
  moldeDetalle: Molde | null = null;
  coloresPorCapaDetalle: (Color | null)[] = [];
  svgPreviewDetalle: SafeHtml | null = null;
  capaAbiertaDetalle: number | null = null;  // Índice de la capa abierta
  
  // Popup de selección de color por capas
  mostrarPopupColor = false;
  productoParaColor: Producto | null = null;
  cantidadParaColor = 1;
  moldeParaColor: Molde | null = null;
  coloresPorCapaPopup: (Color | null)[] = [];
  svgPreviewPopup: SafeHtml | null = null;
  capaAbiertaPopup: number | null = null;  // Índice de la capa abierta
  
  // Filtros
  filtroTipo: string = '';
  filtroMaterial: string = '';
  filtroNombre: string = '';
  filtroPrecioMin: number | null = null;
  filtroPrecioMax: number | null = null;
  
  // Opciones para los selects
  tiposUnicos: string[] = [];
  materialesUnicos: string[] = [];
  
  // Vista
  vistaGrid: boolean = true;
  
  // Query params para abrir producto específico
  private productoIdPendiente: string | null = null;

  // Popup de éxito
  mostrarPopupExito = false;
  mensajeExito = '';
  coloresExito: ColorInfo[] = [];

  constructor(
    private http: HttpClient, 
    private carritoService: CarritoService,
    private favoritosService: FavoritosService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Leer query params
    this.route.queryParams.subscribe(params => {
      if (params['tipo']) {
        this.filtroTipo = params['tipo'];
      }
      if (params['productoId']) {
        this.productoIdPendiente = params['productoId'];
      }
    });
    
    this.cargarDatos();
  }

  cargarDatos(): void {
    // Cargar productos, colores y moldes en paralelo
    forkJoin({
      productos: this.http.get<Producto[]>('http://localhost:5000/api/productos'),
      colores: this.http.get<Color[]>('http://localhost:5000/api/colores'),
      moldes: this.http.get<Molde[]>('http://localhost:5000/api/moldes')
    }).subscribe({
      next: (data) => {
        // Cargar colores
        this.colores = data.colores;
        
        // Cargar moldes
        this.moldes = data.moldes;
        
        // Cargar productos
        this.productos = data.productos.map(p => ({ ...p, cantidad: 1 }));
        this.productosFiltrados = [...this.productos];
        this.extraerFiltros();
        
        // Aplicar filtro si viene de query params
        if (this.filtroTipo) {
          this.aplicarFiltros();
        }
        
        // Abrir producto si viene de query params (ahora los moldes ya están cargados)
        if (this.productoIdPendiente) {
          const producto = this.productos.find(p => p._id === this.productoIdPendiente);
          if (producto) {
            setTimeout(() => {
              this.abrirDetalle(producto, new Event('click'));
            }, 100);
          }
          this.productoIdPendiente = null;
        }
      },
      error: (err) => console.error('Error al cargar datos:', err)
    });
  }

  cargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => console.error('Error al cargar colores:', err)
      });
  }

  cargarMoldes(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = data,
        error: (err) => console.error('Error al cargar moldes:', err)
      });
  }

  getMoldeByNombre(nombre: string): Molde | null {
    return this.moldes.find(m => m.nombre === nombre) || null;
  }

  cargarProductos(): void {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe({
        next: (data) => {
          // Inicializar cantidad en 1 para cada producto
          this.productos = data.map(p => ({ ...p, cantidad: 1 }));
          this.productosFiltrados = [...this.productos];
          this.extraerFiltros();
        },
        error: (err) => console.error('Error al cargar productos:', err)
      });
  }

  extraerFiltros(): void {
    // Obtener tipos únicos
    const tipos = new Set(this.productos.map(p => p.producto));
    this.tiposUnicos = Array.from(tipos).sort();
    
    // Obtener materiales únicos
    const materiales = new Set(this.productos.map(p => p.material));
    this.materialesUnicos = Array.from(materiales).sort();
  }

  aplicarFiltros(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      // Filtro por tipo
      if (this.filtroTipo && producto.producto !== this.filtroTipo) {
        return false;
      }
      
      // Filtro por material
      if (this.filtroMaterial && producto.material !== this.filtroMaterial) {
        return false;
      }
      
      // Filtro por nombre
      if (this.filtroNombre) {
        const nombreBuscado = this.filtroNombre.toLowerCase();
        if (!producto.nombre.toLowerCase().includes(nombreBuscado)) {
          return false;
        }
      }
      
      // Filtro por precio mínimo
      if (this.filtroPrecioMin !== null && producto.precio !== undefined) {
        if (producto.precio < this.filtroPrecioMin) {
          return false;
        }
      }
      
      // Filtro por precio máximo
      if (this.filtroPrecioMax !== null && producto.precio !== undefined) {
        if (producto.precio > this.filtroPrecioMax) {
          return false;
        }
      }
      
      return true;
    });
  }

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroMaterial = '';
    this.filtroNombre = '';
    this.filtroPrecioMin = null;
    this.filtroPrecioMax = null;
    this.productosFiltrados = [...this.productos];
  }

  getPrimeraImagen(producto: Producto): string {
    if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
      return producto.imagenesUrls[0];
    } else if (producto.imagenUrl) {
      return producto.imagenUrl;
    }
    return 'images/placeholder.png';
  }

  // Verificar si es producto de resina
  esResina(producto: Producto): boolean {
    return producto.material?.toLowerCase() === 'resina';
  }

  agregarAlCarrito(producto: Producto): void {
    const cantidad = producto.cantidad || 1;
    
    // Si es resina, abrir popup de detalle para seleccionar colores
    if (this.esResina(producto) && producto.moldeNombre) {
      this.abrirDetalle(producto, new Event('click'));
      this.cantidadDetalle = cantidad;
      return;
    }
    
    // Para otros materiales, agregar directamente
    this.carritoService.agregarProducto({
      _id: producto._id,
      nombre: producto.nombre,
      producto: producto.producto,
      material: producto.material,
      precio: producto.precio || 0,
      imagen: this.getPrimeraImagen(producto),
      moldeNombre: producto.moldeNombre
    }, cantidad);
    
    this.mostrarMensajeExito(`${cantidad} x ${producto.nombre} agregado al carrito`);
    producto.cantidad = 1;
  }

  // Seleccionar color para una capa en el popup
  seleccionarColorCapaPopup(capaIndex: number, color: Color): void {
    this.coloresPorCapaPopup[capaIndex] = color;
    this.actualizarSvgPreviewPopup();
  }

  // Toggle capa abierta en popup
  toggleCapaPopup(capaIndex: number): void {
    this.capaAbiertaPopup = this.capaAbiertaPopup === capaIndex ? null : capaIndex;
  }

  // Toggle capa abierta en detalle
  toggleCapaDetalle(capaIndex: number): void {
    this.capaAbiertaDetalle = this.capaAbiertaDetalle === capaIndex ? null : capaIndex;
  }

  // Obtener colores por categoría (polvo o translucido)
  getColoresPorCategoria(categoria: string): Color[] {
    return this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase());
  }

  // Manejar click en el SVG para seleccionar capa
  onSvgClickDetalle(event: MouseEvent): void {
    const target = event.target as Element;
    if (!this.moldeDetalle?.svgAreaMappings) return;
    
    // Buscar el elemento clickeado o su padre con ID
    let elemento: Element | null = target;
    let elementId: string | null = null;
    
    while (elemento && !elementId) {
      elementId = elemento.getAttribute('id');
      if (!elementId) {
        elemento = elemento.parentElement;
      }
    }
    
    if (elementId) {
      // Buscar a qué capa corresponde este elemento
      const mapping = this.moldeDetalle.svgAreaMappings.find(m => m.svgElementId === elementId);
      if (mapping) {
        this.toggleCapaDetalle(mapping.capaIndex);
      }
    }
  }

  onSvgClickPopup(event: MouseEvent): void {
    const target = event.target as Element;
    if (!this.moldeParaColor?.svgAreaMappings) return;
    
    let elemento: Element | null = target;
    let elementId: string | null = null;
    
    while (elemento && !elementId) {
      elementId = elemento.getAttribute('id');
      if (!elementId) {
        elemento = elemento.parentElement;
      }
    }
    
    if (elementId) {
      const mapping = this.moldeParaColor.svgAreaMappings.find(m => m.svgElementId === elementId);
      if (mapping) {
        this.toggleCapaPopup(mapping.capaIndex);
      }
    }
  }

  // Generar SVG con los colores seleccionados para el popup
  actualizarSvgPreviewPopup(): void {
    if (!this.moldeParaColor?.svgContent || !this.moldeParaColor?.svgAreaMappings) {
      this.svgPreviewPopup = null;
      return;
    }
    this.svgPreviewPopup = this.generarSvgConColores(
      this.moldeParaColor.svgContent,
      this.moldeParaColor.svgAreaMappings,
      this.coloresPorCapaPopup
    );
  }

  // Obtener SVG inicial (blanco con bordes negros)
  getSvgInicial(molde: Molde): SafeHtml | null {
    if (!molde?.svgContent || !molde?.svgAreaMappings) {
      return null;
    }
    // Generar SVG con colores vacíos (todos null = todos blancos)
    const coloresVacios: (Color | null)[] = new Array(molde.capas.length).fill(null);
    return this.generarSvgConColores(molde.svgContent, molde.svgAreaMappings, coloresVacios);
  }

  // Generar SVG con los colores seleccionados para el detalle
  actualizarSvgPreviewDetalle(): void {
    if (!this.moldeDetalle?.svgContent || !this.moldeDetalle?.svgAreaMappings) {
      this.svgPreviewDetalle = null;
      return;
    }
    this.svgPreviewDetalle = this.generarSvgConColores(
      this.moldeDetalle.svgContent,
      this.moldeDetalle.svgAreaMappings,
      this.coloresPorCapaDetalle
    );
  }

  // Función reutilizable para generar SVG con colores
  generarSvgConColores(svgContent: string, mappings: SvgAreaMapping[], colores: (Color | null)[]): SafeHtml {
    // Primero aplicar blanco con bordes negros a todos los elementos mapeados
    let svgConColores = this.aplicarEstiloBase(svgContent, mappings);
    
    // Luego aplicar los colores seleccionados
    mappings.forEach((mapping) => {
      const color = colores[mapping.capaIndex];
      if (color && mapping.svgElementId) {
        svgConColores = this.aplicarColorAElemento(svgConColores, mapping.svgElementId, color.rgb);
      }
    });
    
    return this.sanitizer.bypassSecurityTrustHtml(svgConColores);
  }

  // Aplicar estilo base: blanco con bordes negros a todos los elementos mapeados
  aplicarEstiloBase(svgContent: string, mappings: SvgAreaMapping[]): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    mappings.forEach((mapping) => {
      if (mapping.svgElementId) {
        const elemento = doc.getElementById(mapping.svgElementId);
        if (elemento) {
          this.aplicarEstiloBaseAElemento(elemento);
        }
      }
    });
    
    return new XMLSerializer().serializeToString(doc);
  }

  // Aplicar blanco con borde negro a un elemento y sus hijos
  aplicarEstiloBaseAElemento(elemento: Element): void {
    const tagName = elemento.tagName.toLowerCase();
    const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
    
    if (elementosConFill.includes(tagName)) {
      elemento.setAttribute('fill', '#FFFFFF');
      elemento.setAttribute('stroke', '#000000');
      elemento.setAttribute('stroke-width', '1');
    }
    
    // Aplicar a todos los hijos también
    const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
    hijos.forEach(hijo => {
      hijo.setAttribute('fill', '#FFFFFF');
      hijo.setAttribute('stroke', '#000000');
      hijo.setAttribute('stroke-width', '1');
    });
  }

  // Aplicar color a un elemento específico del SVG
  aplicarColorAElemento(svgString: string, elementId: string, color: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const elemento = doc.getElementById(elementId);
    
    if (elemento) {
      this.colorearElemento(elemento, color);
    }
    
    return new XMLSerializer().serializeToString(doc);
  }

  // Colorear un elemento y sus hijos (manteniendo bordes negros)
  colorearElemento(elemento: Element, color: string): void {
    const tagName = elemento.tagName.toLowerCase();
    const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
    
    if (elementosConFill.includes(tagName)) {
      elemento.setAttribute('fill', color);
      elemento.setAttribute('stroke', '#000000');
      elemento.setAttribute('stroke-width', '1');
      const style = elemento.getAttribute('style') || '';
      const nuevoStyle = style
        .replace(/fill\s*:\s*[^;]+;?/gi, '')
        .replace(/stroke\s*:\s*[^;]+;?/gi, '')
        .replace(/stroke-width\s*:\s*[^;]+;?/gi, '')
        + `fill: ${color}; stroke: #000000; stroke-width: 1;`;
      elemento.setAttribute('style', nuevoStyle);
    }
    
    // Aplicar a todos los hijos también
    const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
    hijos.forEach(hijo => {
      hijo.setAttribute('fill', color);
      hijo.setAttribute('stroke', '#000000');
      hijo.setAttribute('stroke-width', '1');
      const style = hijo.getAttribute('style') || '';
      const nuevoStyle = style
        .replace(/fill\s*:\s*[^;]+;?/gi, '')
        .replace(/stroke\s*:\s*[^;]+;?/gi, '')
        .replace(/stroke-width\s*:\s*[^;]+;?/gi, '')
        + `fill: ${color}; stroke: #000000; stroke-width: 1;`;
      hijo.setAttribute('style', nuevoStyle);
    });
  }

  // Verificar si el molde tiene SVG configurado
  moldeTieneSvg(molde: Molde | null): boolean {
    return !!(molde?.svgContent && molde?.svgAreaMappings && molde.svgAreaMappings.length > 0);
  }

  // Verificar si todas las capas tienen color seleccionado
  todasCapasConColorPopup(): boolean {
    if (!this.moldeParaColor) return false;
    return this.coloresPorCapaPopup.every(c => c !== null);
  }

  // Confirmar selección de colores desde popup
  confirmarColoresPopup(): void {
    if (!this.productoParaColor || !this.moldeParaColor) return;
    if (!this.todasCapasConColorPopup()) {
      return;
    }
    
    // Construir array de colores por capa
    const coloresPorCapa: ColorPorCapa[] = this.moldeParaColor.capas.map((capa, index) => {
      const color = this.coloresPorCapaPopup[index]!;
      return {
        capaIndex: index,
        capaNombre: capa.nombre,
        colorId: color._id,
        colorNombre: color.nombre,
        colorRgb: color.rgb
      };
    });
    
    this.carritoService.agregarProducto({
      _id: this.productoParaColor._id,
      nombre: this.productoParaColor.nombre,
      producto: this.productoParaColor.producto,
      material: this.productoParaColor.material,
      precio: this.productoParaColor.precio || 0,
      imagen: this.getPrimeraImagen(this.productoParaColor),
      moldeNombre: this.productoParaColor.moldeNombre,
      coloresPorCapa: coloresPorCapa
    }, this.cantidadParaColor);
    
    const nombreProducto = this.productoParaColor.nombre;
    const cantidad = this.cantidadParaColor;
    const coloresGuardados = [...coloresPorCapa];
    
    this.productoParaColor.cantidad = 1;
    this.cerrarPopupColor();
    
    this.mostrarMensajeExito(`${cantidad} x ${nombreProducto} agregado al carrito`, coloresGuardados);
  }

  cerrarPopupColor(): void {
    this.mostrarPopupColor = false;
    this.productoParaColor = null;
    this.cantidadParaColor = 1;
    this.moldeParaColor = null;
    this.coloresPorCapaPopup = [];
    this.svgPreviewPopup = null;
    this.capaAbiertaPopup = null;
  }

  toggleFavorito(producto: Producto): void {
    this.favoritosService.toggleFavorito({
      _id: producto._id,
      nombre: producto.nombre,
      producto: producto.producto,
      precio: producto.precio || 0,
      imagen: this.getPrimeraImagen(producto)
    });
  }

  esFavorito(productoId: string): boolean {
    return this.favoritosService.esFavorito(productoId);
  }

  incrementarCantidad(producto: Producto): void {
    producto.cantidad = (producto.cantidad || 1) + 1;
  }

  decrementarCantidad(producto: Producto): void {
    if ((producto.cantidad || 1) > 1) {
      producto.cantidad = (producto.cantidad || 1) - 1;
    }
  }

  cambiarVista(grid: boolean): void {
    this.vistaGrid = grid;
  }

  // Modal de detalle
  abrirDetalle(producto: Producto, event: Event): void {
    event.stopPropagation();
    this.productoDetalle = producto;
    this.imagenActualIndex = 0;
    this.cantidadDetalle = 1;
    
    // Cargar molde y preparar array de colores por capa
    if (this.esResina(producto) && producto.moldeNombre) {
      this.moldeDetalle = this.getMoldeByNombre(producto.moldeNombre);
      if (this.moldeDetalle) {
        this.coloresPorCapaDetalle = new Array(this.moldeDetalle.capas.length).fill(null);
        // Inicializar SVG en blanco con bordes negros
        if (this.moldeTieneSvg(this.moldeDetalle)) {
          this.svgPreviewDetalle = this.getSvgInicial(this.moldeDetalle);
        }
      }
    } else {
      this.moldeDetalle = null;
      this.coloresPorCapaDetalle = [];
    }
    
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.productoDetalle = null;
    this.imagenActualIndex = 0;
    this.moldeDetalle = null;
    this.coloresPorCapaDetalle = [];
    this.svgPreviewDetalle = null;
    this.capaAbiertaDetalle = null;
  }

  getImagenes(producto: Producto): string[] {
    if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
      return producto.imagenesUrls;
    } else if (producto.imagenUrl) {
      return [producto.imagenUrl];
    }
    return ['images/placeholder.png'];
  }

  imagenAnterior(): void {
    if (this.productoDetalle) {
      const imagenes = this.getImagenes(this.productoDetalle);
      this.imagenActualIndex = (this.imagenActualIndex - 1 + imagenes.length) % imagenes.length;
    }
  }

  imagenSiguiente(): void {
    if (this.productoDetalle) {
      const imagenes = this.getImagenes(this.productoDetalle);
      this.imagenActualIndex = (this.imagenActualIndex + 1) % imagenes.length;
    }
  }

  seleccionarImagen(index: number): void {
    this.imagenActualIndex = index;
  }

  incrementarCantidadDetalle(): void {
    this.cantidadDetalle++;
  }

  decrementarCantidadDetalle(): void {
    if (this.cantidadDetalle > 1) {
      this.cantidadDetalle--;
    }
  }

  // Seleccionar color para una capa en el modal de detalle
  seleccionarColorCapaDetalle(capaIndex: number, color: Color): void {
    this.coloresPorCapaDetalle[capaIndex] = color;
    this.actualizarSvgPreviewDetalle();
  }

  // Verificar si todas las capas tienen color seleccionado en detalle
  todasCapasConColorDetalle(): boolean {
    if (!this.moldeDetalle) return true; // No es resina
    return this.coloresPorCapaDetalle.every(c => c !== null);
  }

  agregarDesdeDetalle(): void {
    if (!this.productoDetalle) return;
    
    // Si es resina, verificar que todas las capas tengan color
    if (this.esResina(this.productoDetalle) && this.moldeDetalle) {
      if (!this.todasCapasConColorDetalle()) {
        return;
      }
      
      // Construir array de colores por capa
      const coloresPorCapa: ColorPorCapa[] = this.moldeDetalle.capas.map((capa, index) => {
        const color = this.coloresPorCapaDetalle[index]!;
        return {
          capaIndex: index,
          capaNombre: capa.nombre,
          colorId: color._id,
          colorNombre: color.nombre,
          colorRgb: color.rgb
        };
      });
      
      this.carritoService.agregarProducto({
        _id: this.productoDetalle._id,
        nombre: this.productoDetalle.nombre,
        producto: this.productoDetalle.producto,
        material: this.productoDetalle.material,
        precio: this.productoDetalle.precio || 0,
        imagen: this.getPrimeraImagen(this.productoDetalle),
        moldeNombre: this.productoDetalle.moldeNombre,
        coloresPorCapa: coloresPorCapa
      }, this.cantidadDetalle);
      
      const mensaje = `${this.cantidadDetalle} x ${this.productoDetalle.nombre} agregado al carrito`;
      const coloresGuardados = [...coloresPorCapa];
      this.cerrarDetalle();
      this.mostrarMensajeExito(mensaje, coloresGuardados);
    } else {
      // Producto sin resina
      this.carritoService.agregarProducto({
        _id: this.productoDetalle._id,
        nombre: this.productoDetalle.nombre,
        producto: this.productoDetalle.producto,
        material: this.productoDetalle.material,
        precio: this.productoDetalle.precio || 0,
        imagen: this.getPrimeraImagen(this.productoDetalle),
        moldeNombre: this.productoDetalle.moldeNombre
      }, this.cantidadDetalle);
      
      const mensaje = `${this.cantidadDetalle} x ${this.productoDetalle.nombre} agregado al carrito`;
      this.cerrarDetalle();
      this.mostrarMensajeExito(mensaje);
    }
  }

  toggleFavoritoDetalle(): void {
    if (this.productoDetalle) {
      this.toggleFavorito(this.productoDetalle);
    }
  }

  // Popup de éxito
  mostrarMensajeExito(mensaje: string, coloresPorCapa?: ColorPorCapa[]): void {
    this.mensajeExito = mensaje;
    // Convertir coloresPorCapa a ColorInfo si existe
    if (coloresPorCapa && coloresPorCapa.length > 0) {
      this.coloresExito = coloresPorCapa.map(c => ({
        capaNombre: c.capaNombre,
        colorNombre: c.colorNombre,
        colorRgb: c.colorRgb
      }));
    } else {
      this.coloresExito = [];
    }
    this.mostrarPopupExito = true;
  }

  cerrarPopupExito(): void {
    this.mostrarPopupExito = false;
    this.mensajeExito = '';
    this.coloresExito = [];
  }
}
