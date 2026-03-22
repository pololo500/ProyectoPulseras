import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { ordenarCromatico, ordenarAlfabetico } from '../../extras/color-sort';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { CarritoService, ColorPorCapa } from '../../services/carrito.service';
import { FavoritosService, ItemFavorito } from '../../services/favoritos.service';
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
  coloresPorImagen?: {
    imagenIndex: number;
    colores: {
      capaIndex: number;
      capaNombre: string;
      colorId: string;
      colorNombre: string;
      colorRgb: string;
      colorCategoria: string;
    }[];
  }[];
}

interface ColorCapaStock {
  capaIndex: number;
  capaNombre: string;
  colorId: string;
  colorNombre: string;
  colorRgb: string;
}

interface StockVariante {
  _id: string;
  coloresPorCapa: ColorCapaStock[];
  cantidad: number;
  detallesDiseno?: string;
}

interface StockItem {
  _id: string;
  productoId: string;
  productoNombre: string;
  productoTipo: string;
  material: string;
  moldeId?: string;
  moldeNombre?: string;
  imagenUrl?: string;
  variantes: StockVariante[];
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CapitalizePipe, FormatoPrecioPipe, PopupExitoComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  colores: Color[] = [];
  coloresHilo: Color[] = [];
  moldes: Molde[] = [];
  moldesHilo: Molde[] = [];
  
  // Modal de detalle
  mostrarDetalle = false;
  productoDetalle: Producto | null = null;
  imagenActualIndex = 0;
  cantidadDetalle = 1;
  moldeDetalle: Molde | null = null;
  coloresPorCapaDetalle: (Color | null)[] = [];
  svgPreviewDetalle: SafeHtml | null = null;
  capaAbiertaDetalle: number | null = null;  // Índice de la capa abierta
  categoriaAbiertaDetalle: string | null = null;  // Categoría de color abierta dentro de la capa
  
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
  
  // Filtros mobile
  mostrarFiltrosMobile = false;
  
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

  // Lightbox de imágenes
  mostrarLightbox = false;
  imagenLightboxIndex = 0;

  // Popup de Login/Registro para favoritos
  mostrarPopupLoginFavoritos = false;
  modoLoginFavoritos: 'login' | 'registro' = 'login';
  popupLoginError = '';

  // Stock disponible
  stockPorProducto: Map<string, { items: StockItem[], totalUnidades: number }> = new Map();
  mostrarPopupStock = false;
  stockDetalleItems: StockItem[] = [];
  cantidadStockSeleccionada: Map<string, number> = new Map(); // varianteId -> cantidad seleccionada
  
  // Formulario de login
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]),
    password: new FormControl('', Validators.required),
  });
  
  // Formulario de registro
  registroForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]),
    nombre: new FormControl('', Validators.required),
    telefono: new FormControl('', [Validators.pattern('^[ \\-\\+\\(\\)]*(?:\\d[ \\-\\+\\(\\)]*){10}$')]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarPassword: new FormControl('', Validators.required),
  });

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
    // Cargar productos, colores, coloresHilo, moldes, moldesHilo y stock en paralelo
    forkJoin({
      productos: this.http.get<Producto[]>('http://localhost:5000/api/productos'),
      colores: this.http.get<Color[]>('http://localhost:5000/api/colores'),
      coloresHilo: this.http.get<Color[]>('http://localhost:5000/api/colores-hilo'),
      moldes: this.http.get<Molde[]>('http://localhost:5000/api/moldes'),
      moldesHilo: this.http.get<Molde[]>('http://localhost:5000/api/moldes-hilo'),
      stock: this.http.get<StockItem[]>('http://localhost:5000/api/stock')
    }).subscribe({
      next: (data) => {
        // Cargar colores
        this.colores = data.colores;
        this.coloresHilo = ordenarCromatico(data.coloresHilo);
        
        // Cargar moldes
        this.moldes = ordenarAlfabetico(data.moldes);
        this.moldesHilo = ordenarAlfabetico(data.moldesHilo);
        
        // Cargar productos
        this.productos = data.productos.map(p => ({ ...p, cantidad: 1 }));
        this.productosFiltrados = [...this.productos];
        this.extraerFiltros();

        // Procesar stock: agrupar por productoId y filtrar variantes con cantidad > 0
        this.stockPorProducto.clear();
        data.stock.forEach(item => {
          const variantesDisponibles = item.variantes.filter(v => v.cantidad > 0);
          if (variantesDisponibles.length > 0) {
            const itemFiltrado = { ...item, variantes: variantesDisponibles };
            const existing = this.stockPorProducto.get(item.productoId);
            if (existing) {
              existing.items.push(itemFiltrado);
              existing.totalUnidades += variantesDisponibles.reduce((sum, v) => sum + v.cantidad, 0);
            } else {
              this.stockPorProducto.set(item.productoId, {
                items: [itemFiltrado],
                totalUnidades: variantesDisponibles.reduce((sum, v) => sum + v.cantidad, 0)
              });
            }
          }
        });
        
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
      error: (err) => {}
    });
  }

  cargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => {}
      });
  }

  cargarMoldes(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = ordenarAlfabetico(data),
        error: (err) => {}
      });
  }

  getMoldeByNombre(nombre: string): Molde | null {
    return this.moldes.find(m => m.nombre === nombre) || null;
  }

  getMoldeHiloByNombre(nombre: string): Molde | null {
    return this.moldesHilo.find(m => m.nombre === nombre) || null;
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
        error: (err) => {}
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

  // Verificar si es producto de hilo encerado
  esHiloEncerado(producto: Producto): boolean {
    return producto.material?.toLowerCase() === 'hilo encerado';
  }

  // Verificar si el producto requiere selección de colores (resina o hilo encerado)
  requiereColores(producto: Producto): boolean {
    return this.esResina(producto) || this.esHiloEncerado(producto);
  }

  // Obtener colores según material del producto
  getColoresParaProducto(producto: Producto | null): Color[] {
    if (!producto) return this.colores;
    if (this.esHiloEncerado(producto)) return this.coloresHilo;
    return this.colores;
  }

  // Obtener capas para el detalle (de molde para resina, de moldeHilo para hilo encerado)
  getCapasDetalle(): { nombre: string; volumen: number }[] {
    if (this.productoDetalle && this.esHiloEncerado(this.productoDetalle)) {
      return this.moldeDetalle?.capas || [];
    }
    return this.moldeDetalle?.capas || [];
  }

  agregarAlCarrito(producto: Producto): void {
    const cantidad = producto.cantidad || 1;
    
    // Si requiere colores, abrir popup de detalle para seleccionar colores
    if ((this.esResina(producto) && producto.moldeNombre) || (this.esHiloEncerado(producto) && producto.moldeNombre)) {
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
    if (this.capaAbiertaDetalle === capaIndex) {
      this.capaAbiertaDetalle = null;
      this.categoriaAbiertaDetalle = null;
    } else {
      this.capaAbiertaDetalle = capaIndex;
      this.categoriaAbiertaDetalle = null;
    }
  }

  // Toggle categoría de color abierta dentro de una capa
  toggleCategoriaDetalle(categoria: string): void {
    this.categoriaAbiertaDetalle = this.categoriaAbiertaDetalle === categoria ? null : categoria;
  }

  // Obtener colores por categoría (polvo o translucido) - usa el producto actual para determinar set de colores
  getColoresPorCategoria(categoria: string): Color[] {
    return ordenarCromatico(this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase()));
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Assure global defs
    this.ensureGlobalDefs(doc);

    // Apply base style
    this.aplicarEstiloBaseEnDoc(doc, mappings);

    // Apply colors
    mappings.forEach((mapping) => {
      const color = colores[mapping.capaIndex];
      if (color && mapping.svgElementId) {
        this.aplicarColorEnDoc(doc, mapping.svgElementId, color);
      }
    });

    const serialized = new XMLSerializer().serializeToString(doc);
    return this.sanitizer.bypassSecurityTrustHtml(serialized);
  }

  ensureGlobalDefs(doc: Document): void {
    const svg = doc.querySelector('svg');
    if (!svg) return;
    
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    
    // Gradiente para efecto brillo/translucido (shine)
    if (!doc.getElementById('grad-shine')) {
      const gradShine = doc.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradShine.setAttribute('id', 'grad-shine');
      gradShine.setAttribute('x1', '0%');
      gradShine.setAttribute('y1', '0%');
      gradShine.setAttribute('x2', '100%');
      gradShine.setAttribute('y2', '100%');
      
      const stops = [
        { offset: '0%', color: 'white', opacity: '0.5' },
        { offset: '40%', color: 'white', opacity: '0' },
        { offset: '60%', color: 'white', opacity: '0' },
        { offset: '100%', color: 'white', opacity: '0.3' }
      ];
      
      stops.forEach(s => {
        const stop = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', s.offset);
        stop.setAttribute('stop-color', s.color);
        stop.setAttribute('stop-opacity', s.opacity);
        gradShine.appendChild(stop);
      });
      
      defs.appendChild(gradShine);
    }

    // Gradiente para efecto polvo (dust)
    if (!doc.getElementById('grad-dust')) {
      const gradDust = doc.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradDust.setAttribute('id', 'grad-dust');
      gradDust.setAttribute('x1', '0%');
      gradDust.setAttribute('y1', '0%');
      gradDust.setAttribute('x2', '100%');
      gradDust.setAttribute('y2', '100%');
      
      const stops = [
         { offset: '0%', color: 'white', opacity: '0.4' },
         { offset: '50%', color: 'white', opacity: '0' },
         { offset: '100%', color: 'white', opacity: '0.4' }
      ];
      
      stops.forEach(s => {
        const stop = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', s.offset);
        stop.setAttribute('stop-color', s.color);
        stop.setAttribute('stop-opacity', s.opacity);
        gradDust.appendChild(stop);
      });
      
      defs.appendChild(gradDust);
    }
  }

  aplicarEstiloBaseEnDoc(doc: Document, mappings: SvgAreaMapping[]): void {
     mappings.forEach((mapping) => {
      if (mapping.svgElementId) {
        const elemento = doc.getElementById(mapping.svgElementId);
        if (elemento) {
          this.aplicarEstiloBaseAElemento(elemento);
        }
      }
    });
  }

  aplicarColorEnDoc(doc: Document, elementId: string, color: Color): void {
      const elemento = doc.getElementById(elementId);
      if (elemento) {
          this.colorearElementoEnDoc(doc, elemento, color);
      }
  }

  colorearElementoEnDoc(doc: Document, elemento: Element, color: Color): void {
      let fillValue = color.rgb;
      let strokeValue = '#000000';
      
      // Manejo de efectos
      if (color.categoria === 'translucido' || color.categoria === 'polvo') {
          const defs = doc.querySelector('defs')!;
          
          let patternId = '';
          let gradRef = '';
          let baseOpacity = '1';

          if (color.categoria === 'translucido') {
              patternId = `pat-trans-${color._id}`;
              gradRef = 'grad-shine';
              baseOpacity = '0.6';
          } else if (color.categoria === 'polvo') {
              patternId = `pat-dust-${color._id}`;
              gradRef = 'grad-dust';
          }

          if (!doc.getElementById(patternId)) {
              const pattern = doc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
              pattern.setAttribute('id', patternId);
              pattern.setAttribute('patternUnits', 'objectBoundingBox');
              pattern.setAttribute('width', '1');
              pattern.setAttribute('height', '1');
              pattern.setAttribute('viewBox', '0 0 1 1');
              pattern.setAttribute('preserveAspectRatio', 'none');

              const rectBase = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rectBase.setAttribute('width', '1');
              rectBase.setAttribute('height', '1');
              rectBase.setAttribute('fill', color.rgb);
              if (baseOpacity !== '1') {
                   rectBase.setAttribute('fill-opacity', baseOpacity);
              }
              
              const rectOverlay = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rectOverlay.setAttribute('width', '1');
              rectOverlay.setAttribute('height', '1');
              rectOverlay.setAttribute('fill', `url(#${gradRef})`);
              
              pattern.appendChild(rectBase);
              pattern.appendChild(rectOverlay);
              defs.appendChild(pattern);
          }
          fillValue = `url(#${patternId})`;
      }

      const applyStyle = (el: Element) => {
          el.setAttribute('fill', fillValue);
          el.setAttribute('stroke', strokeValue);
          el.setAttribute('stroke-width', '1');
          
          // Limpiar estilos inline
          let style = el.getAttribute('style') || '';
          style = style.replace(/(fill|stroke|stroke-width)\s*:\s*[^;]+;?/gi, '');
          style += `fill: ${fillValue}; stroke: ${strokeValue}; stroke-width: 1;`;
          el.setAttribute('style', style);
      };

      const tagName = elemento.tagName.toLowerCase();
      const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];

      if (elementosConFill.includes(tagName)) {
        applyStyle(elemento);
      }
      
      const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
      hijos.forEach(hijo => applyStyle(hijo));
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
    const itemFavorito: ItemFavorito = {
      _id: producto._id,
      nombre: producto.nombre,
      producto: producto.producto,
      precio: producto.precio || 0,
      imagen: this.getPrimeraImagen(producto)
    };

    // Verificar si el usuario está logueado
    if (!this.favoritosService.isLoggedIn()) {
      // Si ya es favorito (guardado localmente), permitir quitarlo
      if (this.favoritosService.esFavorito(producto._id)) {
        this.favoritosService.toggleFavorito(itemFavorito);
        return;
      }
      // Si no está logueado, guardar producto pendiente y mostrar popup de login
      this.favoritosService.setProductoPendiente(itemFavorito);
      this.mostrarPopupLoginFavoritos = true;
      this.modoLoginFavoritos = 'login';
      this.popupLoginError = '';
      return;
    }

    // Si está logueado, toggle normal
    this.favoritosService.toggleFavorito(itemFavorito);
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
    this.cantidadDetalle = producto.cantidad || 1;
    
    // Cargar molde y preparar array de colores por capa
    if (this.esResina(producto) && producto.moldeNombre) {
      this.moldeDetalle = this.getMoldeByNombre(producto.moldeNombre);
      if (this.moldeDetalle) {
        this.coloresPorCapaDetalle = new Array(this.moldeDetalle.capas.length).fill(null);
        if (this.moldeTieneSvg(this.moldeDetalle)) {
          this.svgPreviewDetalle = this.getSvgInicial(this.moldeDetalle);
        }
      }
    } else if (this.esHiloEncerado(producto) && producto.moldeNombre) {
      // Hilo encerado: buscar molde en moldesHilo
      this.moldeDetalle = this.getMoldeHiloByNombre(producto.moldeNombre);
      if (this.moldeDetalle) {
        this.coloresPorCapaDetalle = new Array(this.moldeDetalle.capas.length).fill(null);
        if (this.moldeTieneSvg(this.moldeDetalle)) {
          this.svgPreviewDetalle = this.getSvgInicial(this.moldeDetalle);
        }
      } else {
        this.coloresPorCapaDetalle = [];
      }
    } else if (this.esHiloEncerado(producto)) {
      // Hilo encerado sin molde asignado
      this.moldeDetalle = null;
      this.coloresPorCapaDetalle = [];
      this.svgPreviewDetalle = null;
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
    this.categoriaAbiertaDetalle = null;
    this.mostrarLightbox = false;
    this.imagenLightboxIndex = 0;
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

  // Métodos del Lightbox
  abrirLightbox(index: number): void {
    this.imagenLightboxIndex = index;
    this.mostrarLightbox = true;
  }

  cerrarLightbox(): void {
    this.mostrarLightbox = false;
  }

  lightboxAnterior(): void {
    if (this.productoDetalle) {
      const imagenes = this.getImagenes(this.productoDetalle);
      this.imagenLightboxIndex = (this.imagenLightboxIndex - 1 + imagenes.length) % imagenes.length;
    }
  }

  lightboxSiguiente(): void {
    if (this.productoDetalle) {
      const imagenes = this.getImagenes(this.productoDetalle);
      this.imagenLightboxIndex = (this.imagenLightboxIndex + 1) % imagenes.length;
    }
  }

  seleccionarImagenLightbox(index: number): void {
    this.imagenLightboxIndex = index;
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
    // Actualizar SVG para productos con molde que tiene SVG
    if (this.productoDetalle && this.moldeTieneSvg(this.moldeDetalle)) {
      this.actualizarSvgPreviewDetalle();
    }
    // Cerrar el accordion después de seleccionar el color
    this.categoriaAbiertaDetalle = null;
    this.capaAbiertaDetalle = null;
  }

  // Verificar si la imagen actual tiene colores asignados
  imagenActualTieneColores(): boolean {
    if (!this.productoDetalle?.coloresPorImagen) return false;
    const entry = this.productoDetalle.coloresPorImagen.find(c => c.imagenIndex === this.imagenActualIndex);
    return !!(entry && entry.colores.length > 0);
  }

  // Aplicar los colores asignados a la foto actual
  aplicarColoresDeFoto(): void {
    if (!this.productoDetalle?.coloresPorImagen) return;
    if (!this.moldeDetalle && !this.esHiloEncerado(this.productoDetalle)) return;
    
    const entry = this.productoDetalle.coloresPorImagen.find(c => c.imagenIndex === this.imagenActualIndex);
    if (!entry || entry.colores.length === 0) return;
    
    // Para cada color asignado a la imagen, buscar el color completo y asignarlo
    entry.colores.forEach(colorData => {
      const colorCompleto = this.colores.find(c => c._id === colorData.colorId) || this.coloresHilo.find(c => c._id === colorData.colorId);
      if (colorCompleto && colorData.capaIndex < this.coloresPorCapaDetalle.length) {
        this.coloresPorCapaDetalle[colorData.capaIndex] = colorCompleto;
      }
    });
    
    if (this.productoDetalle && this.moldeTieneSvg(this.moldeDetalle)) {
      this.actualizarSvgPreviewDetalle();
    }
  }

  // Verificar si todas las capas tienen color seleccionado en detalle
  todasCapasConColorDetalle(): boolean {
    if (this.coloresPorCapaDetalle.length === 0) return true;
    return this.coloresPorCapaDetalle.every(c => c !== null);
  }

  agregarDesdeDetalle(): void {
    if (!this.productoDetalle) return;
    
    // Si requiere colores (resina o hilo encerado), verificar que todas las capas tengan color
    const capas = this.getCapasDetalle();
    if (this.requiereColores(this.productoDetalle) && capas.length > 0) {
      if (!this.todasCapasConColorDetalle()) {
        return;
      }
      
      // Construir array de colores por capa
      const coloresPorCapa: ColorPorCapa[] = capas.map((capa, index) => {
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
      // Producto sin colores
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

  // Filtros mobile
  abrirFiltrosMobile(): void {
    this.mostrarFiltrosMobile = true;
  }

  cerrarFiltrosMobile(): void {
    this.mostrarFiltrosMobile = false;
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.filtroTipo || this.filtroMaterial || this.filtroNombre || 
              this.filtroPrecioMin !== null || this.filtroPrecioMax !== null);
  }

  // ========== STOCK DISPONIBLE ==========

  productoTieneStock(productoId: string): boolean {
    const stock = this.stockPorProducto.get(productoId);
    return !!(stock && stock.totalUnidades > 0);
  }

  getStockTotal(productoId: string): number {
    const stock = this.stockPorProducto.get(productoId);
    return stock ? stock.totalUnidades : 0;
  }

  abrirPopupStock(): void {
    if (!this.productoDetalle) return;
    const stock = this.stockPorProducto.get(this.productoDetalle._id);
    if (!stock) return;
    this.stockDetalleItems = stock.items;
    this.cantidadStockSeleccionada.clear();
    // Inicializar cantidad en 1 para cada variante
    stock.items.forEach(item => {
      item.variantes.forEach(v => {
        this.cantidadStockSeleccionada.set(v._id, 1);
      });
    });
    this.mostrarPopupStock = true;
  }

  cerrarPopupStock(): void {
    this.mostrarPopupStock = false;
    this.stockDetalleItems = [];
    this.cantidadStockSeleccionada.clear();
  }

  generarSvgParaVariante(variante: StockVariante, moldeNombre?: string): SafeHtml | null {
    if (!moldeNombre) return null;
    const molde = this.getMoldeByNombre(moldeNombre) || this.getMoldeHiloByNombre(moldeNombre);
    if (!molde?.svgContent || !molde?.svgAreaMappings) return null;
    
    // Construir array de colores a partir de la variante
    const coloresArray: (Color | null)[] = new Array(molde.capas.length).fill(null);
    variante.coloresPorCapa.forEach(cc => {
      if (cc.capaIndex < coloresArray.length) {
        // Crear un objeto Color compatible
        coloresArray[cc.capaIndex] = {
          _id: cc.colorId,
          nombre: cc.colorNombre,
          rgb: cc.colorRgb,
          categoria: this.colores.find(c => c._id === cc.colorId)?.categoria || this.coloresHilo.find(c => c._id === cc.colorId)?.categoria || ''
        };
      }
    });
    
    return this.generarSvgConColores(molde.svgContent, molde.svgAreaMappings, coloresArray);
  }

  getImagenParaVariante(variante: StockVariante, stockItem: StockItem): string | null {
    if (!this.productoDetalle?.coloresPorImagen || !this.productoDetalle?.imagenesUrls) return stockItem.imagenUrl || null;
    
    // Buscar una imagen que tenga exactamente los mismos colores que la variante
    for (const entry of this.productoDetalle.coloresPorImagen) {
      if (entry.colores.length === 0) continue;
      const match = variante.coloresPorCapa.every(vc => 
        entry.colores.some(ec => ec.capaIndex === vc.capaIndex && ec.colorId === vc.colorId)
      ) && entry.colores.every(ec =>
        variante.coloresPorCapa.some(vc => vc.capaIndex === ec.capaIndex && vc.colorId === ec.colorId)
      );
      if (match && this.productoDetalle.imagenesUrls[entry.imagenIndex]) {
        return this.productoDetalle.imagenesUrls[entry.imagenIndex];
      }
    }
    
    return stockItem.imagenUrl || null;
  }

  incrementarCantidadStock(varianteId: string, max: number): void {
    const actual = this.cantidadStockSeleccionada.get(varianteId) || 1;
    if (actual < max) {
      this.cantidadStockSeleccionada.set(varianteId, actual + 1);
    }
  }

  decrementarCantidadStock(varianteId: string): void {
    const actual = this.cantidadStockSeleccionada.get(varianteId) || 1;
    if (actual > 1) {
      this.cantidadStockSeleccionada.set(varianteId, actual - 1);
    }
  }

  getCantidadStock(varianteId: string): number {
    return this.cantidadStockSeleccionada.get(varianteId) || 1;
  }

  comprarDesdeStock(variante: StockVariante, stockItem: StockItem): void {
    if (!this.productoDetalle) return;
    const cantidad = this.cantidadStockSeleccionada.get(variante._id) || 1;

    // Construir coloresPorCapa para el carrito
    const coloresPorCapa: ColorPorCapa[] = variante.coloresPorCapa.map(cc => ({
      capaIndex: cc.capaIndex,
      capaNombre: cc.capaNombre,
      colorId: cc.colorId,
      colorNombre: cc.colorNombre,
      colorRgb: cc.colorRgb
    }));

    this.carritoService.agregarProducto({
      _id: this.productoDetalle._id,
      nombre: this.productoDetalle.nombre,
      producto: this.productoDetalle.producto,
      material: this.productoDetalle.material,
      precio: this.productoDetalle.precio || 0,
      imagen: this.getImagenParaVariante(variante, stockItem) || this.getPrimeraImagen(this.productoDetalle),
      moldeNombre: this.productoDetalle.moldeNombre,
      coloresPorCapa: coloresPorCapa.length > 0 ? coloresPorCapa : undefined,
      esStock: true,
      stockVarianteId: variante._id
    }, cantidad);

    const coloresGuardados = coloresPorCapa.length > 0 ? [...coloresPorCapa] : undefined;
    this.cerrarPopupStock();
    this.cerrarDetalle();
    this.mostrarMensajeExito(`${cantidad} x ${this.productoDetalle?.nombre || stockItem.productoNombre} - Listo para retirar`, coloresGuardados);
  }

  // ========== POPUP LOGIN/REGISTRO PARA FAVORITOS ==========
  
  cerrarPopupLoginFavoritos(): void {
    this.mostrarPopupLoginFavoritos = false;
    this.popupLoginError = '';
    this.loginForm.reset();
    this.registroForm.reset();
    // Limpiar producto pendiente si se cierra sin loguearse
    this.favoritosService.getProductoPendiente();
  }

  cambiarModoLoginFavoritos(modo: 'login' | 'registro'): void {
    this.modoLoginFavoritos = modo;
    this.popupLoginError = '';
    this.loginForm.reset();
    this.registroForm.reset();
  }

  get passwordsCoinciden(): boolean {
    return this.registroForm.get('password')?.value === this.registroForm.get('confirmarPassword')?.value;
  }

  onSubmitLoginFavoritos(): void {
    const formData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/login`, formData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Guardar sesión
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", res.tipoUsuario);
            sessionStorage.setItem("nombreUsuario", res.nombre);
            
            // Sincronizar favoritos con la base de datos
            this.favoritosService.sincronizarAlLogin(formData.email as string);
            
            // Agregar el producto pendiente a favoritos
            setTimeout(() => {
              this.favoritosService.agregarProductoPendiente();
            }, 500);
            
            // Cerrar popup
            this.mostrarPopupLoginFavoritos = false;
            this.popupLoginError = '';
            this.loginForm.reset();
            
            // Mostrar mensaje de éxito
            this.mostrarMensajeExito('¡Bienvenido! Producto agregado a favoritos');
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          if (errorMessage === "contraseñaIncorrecta") {
            this.popupLoginError = 'Contraseña incorrecta';
          } else {
            this.popupLoginError = 'El email no está registrado';
          }
        }
      });
  }

  onSubmitRegistroFavoritos(): void {
    if (!this.passwordsCoinciden) {
      this.popupLoginError = 'Las contraseñas no coinciden';
      return;
    }
    
    const formData = {
      email: this.registroForm.value.email,
      nombre: this.registroForm.value.nombre,
      telefono: this.registroForm.value.telefono || '',
      password: this.registroForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/usuarios/registro`, formData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Auto-login: guardar sesión
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", "Cliente");
            sessionStorage.setItem("nombreUsuario", formData.nombre as string);
            
            // Agregar el producto pendiente a favoritos
            setTimeout(() => {
              this.favoritosService.agregarProductoPendiente();
            }, 300);
            
            // Cerrar popup
            this.mostrarPopupLoginFavoritos = false;
            this.popupLoginError = '';
            this.registroForm.reset();
            
            // Mostrar mensaje de éxito
            this.mostrarMensajeExito(`¡Bienvenido ${formData.nombre}! Producto agregado a favoritos`);
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          if (errorMessage === "usuarioExistente") {
            this.popupLoginError = 'El email ya está registrado';
          } else if (errorMessage === "emailInvalido") {
            this.popupLoginError = 'Email inválido';
          } else {
            this.popupLoginError = 'Error al registrar. Intente nuevamente';
          }
        }
      });
  }
}
