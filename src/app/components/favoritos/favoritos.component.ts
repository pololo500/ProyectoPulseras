import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { FavoritosService, ItemFavorito } from '../../services/favoritos.service';
import { CarritoService, ColorPorCapa } from '../../services/carrito.service';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { ordenarCromatico, ordenarAlfabetico } from '../../extras/color-sort';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
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

interface FavoritoConDatos extends ItemFavorito {
    cantidad: number;
    material?: string;
    descripcion?: string;
    imagenesUrls?: string[];
    moldeNombre?: string;
    coloresPorImagen?: Producto['coloresPorImagen'];
}

@Component({
    selector: 'app-favoritos',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, CapitalizePipe, FormatoPrecioPipe, PopupExitoComponent],
    templateUrl: './favoritos.component.html',
    styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent implements OnInit, OnDestroy {
    favoritos: FavoritoConDatos[] = [];
    favoritosFiltrados: FavoritoConDatos[] = [];
    productos: Producto[] = [];
    colores: Color[] = [];
    coloresHilo: Color[] = [];
    moldes: Molde[] = [];
    moldesHilo: Molde[] = [];
    private favoritosSub!: Subscription;

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

    // Modal de detalle
    mostrarDetalle = false;
    productoDetalle: FavoritoConDatos | null = null;
    imagenActualIndex = 0;
    cantidadDetalle = 1;
    moldeDetalle: Molde | null = null;
    coloresPorCapaDetalle: (Color | null)[] = [];
    svgPreviewDetalle: SafeHtml | null = null;
    capaAbiertaDetalle: number | null = null;
    categoriaAbiertaDetalle: string | null = null;

    // Stock disponible
    stockPorProducto: Map<string, { items: StockItem[], totalUnidades: number }> = new Map();
    mostrarPopupStock = false;
    stockDetalleItems: StockItem[] = [];
    cantidadStockSeleccionada: Map<string, number> = new Map();

    // Lightbox de imágenes
    mostrarLightbox = false;
    imagenLightboxIndex = 0;

    // Popup de éxito
    mostrarPopupExito = false;
    mensajeExito = '';
    coloresExito: ColorInfo[] = [];

    // Popup de Login/Registro para favoritos
    mostrarPopupLoginFavoritos = false;
    modoLoginFavoritos: 'login' | 'registro' = 'login';
    popupLoginError = '';

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
        private favoritosService: FavoritosService,
        private carritoService: CarritoService,
        private http: HttpClient,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        if (this.favoritosSub) {
            this.favoritosSub.unsubscribe();
        }
    }

    cargarDatos(): void {
        forkJoin({
            productos: this.http.get<Producto[]>('http://localhost:5000/api/productos'),
            colores: this.http.get<Color[]>('http://localhost:5000/api/colores'),
            coloresHilo: this.http.get<Color[]>('http://localhost:5000/api/colores-hilo'),
            moldes: this.http.get<Molde[]>('http://localhost:5000/api/moldes'),
            moldesHilo: this.http.get<Molde[]>('http://localhost:5000/api/moldes-hilo'),
            stock: this.http.get<StockItem[]>('http://localhost:5000/api/stock')
        }).subscribe({
            next: (data) => {
                this.productos = data.productos;
                this.colores = data.colores;
                this.coloresHilo = ordenarCromatico(data.coloresHilo);
                this.moldes = ordenarAlfabetico(data.moldes);
                this.moldesHilo = ordenarAlfabetico(data.moldesHilo);

                // Procesar stock
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
                
                // Suscribirse a favoritos después de cargar productos
                this.favoritosSub = this.favoritosService.favoritos$.subscribe(items => {
                    this.favoritos = items.map(item => {
                        const productoCompleto = this.productos.find(p => p._id === item._id);
                        return {
                            ...item,
                            cantidad: this.favoritos.find(f => f._id === item._id)?.cantidad || 1,
                            material: productoCompleto?.material,
                            descripcion: productoCompleto?.descripcion,
                            imagenesUrls: productoCompleto?.imagenesUrls,
                            moldeNombre: productoCompleto?.moldeNombre,
                            coloresPorImagen: productoCompleto?.coloresPorImagen
                        };
                    });
                    this.extraerFiltros();
                    this.aplicarFiltros();
                });
            },
            error: (err) => {}
        });
    }

    getMoldeByNombre(nombre: string): Molde | null {
        return this.moldes.find(m => m.nombre === nombre) || null;
    }

    getMoldeHiloByNombre(nombre: string): Molde | null {
        return this.moldesHilo.find(m => m.nombre === nombre) || null;
    }

    // Métodos de filtrado
    extraerFiltros(): void {
        const tipos = new Set(this.favoritos.map(p => p.producto));
        this.tiposUnicos = Array.from(tipos).sort();
        
        const materiales = new Set(this.favoritos.map(p => p.material).filter(m => m));
        this.materialesUnicos = Array.from(materiales).sort() as string[];
    }

    aplicarFiltros(): void {
        this.favoritosFiltrados = this.favoritos.filter(producto => {
            if (this.filtroTipo && producto.producto !== this.filtroTipo) {
                return false;
            }
            
            if (this.filtroMaterial && producto.material !== this.filtroMaterial) {
                return false;
            }
            
            if (this.filtroNombre) {
                const nombreBuscado = this.filtroNombre.toLowerCase();
                if (!producto.nombre.toLowerCase().includes(nombreBuscado)) {
                    return false;
                }
            }
            
            if (this.filtroPrecioMin !== null && producto.precio !== undefined) {
                if (producto.precio < this.filtroPrecioMin) {
                    return false;
                }
            }
            
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
        this.favoritosFiltrados = [...this.favoritos];
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

    eliminarFavorito(productoId: string): void {
        this.favoritosService.eliminarFavorito(productoId);
    }

    incrementarCantidad(producto: FavoritoConDatos): void {
        producto.cantidad++;
    }

    decrementarCantidad(producto: FavoritoConDatos): void {
        if (producto.cantidad > 1) {
            producto.cantidad--;
        }
    }

    cambiarVista(grid: boolean): void {
        this.vistaGrid = grid;
    }

    getPrimeraImagen(producto: FavoritoConDatos): string {
        if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
            return producto.imagenesUrls[0];
        } else if (producto.imagen) {
            return producto.imagen;
        }
        return 'images/placeholder.png';
    }

    getImagenes(producto: FavoritoConDatos): string[] {
        if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
            return producto.imagenesUrls;
        } else if (producto.imagen) {
            return [producto.imagen];
        }
        return ['images/placeholder.png'];
    }

    esResina(producto: FavoritoConDatos): boolean {
        return producto.material?.toLowerCase() === 'resina';
    }

    esHiloEncerado(producto: FavoritoConDatos): boolean {
        return producto.material?.toLowerCase() === 'hilo encerado';
    }

    requiereColores(producto: FavoritoConDatos): boolean {
        return this.esResina(producto) || this.esHiloEncerado(producto);
    }

    getCapasDetalle(): { nombre: string; volumen: number }[] {
        return this.moldeDetalle?.capas || [];
    }

    agregarAlCarrito(producto: FavoritoConDatos): void {
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
            material: producto.material || '',
            precio: producto.precio || 0,
            imagen: this.getPrimeraImagen(producto),
            moldeNombre: producto.moldeNombre
        }, cantidad);
        
        this.mostrarMensajeExito(`${cantidad} x ${producto.nombre} agregado al carrito`);
        producto.cantidad = 1;
    }

    // ========== MODAL DE DETALLE ==========
    abrirDetalle(producto: FavoritoConDatos, event: Event): void {
        event.stopPropagation();
        this.productoDetalle = producto;
        this.imagenActualIndex = 0;
        this.cantidadDetalle = producto.cantidad || 1;
        
        if (this.esResina(producto) && producto.moldeNombre) {
            this.moldeDetalle = this.getMoldeByNombre(producto.moldeNombre);
            if (this.moldeDetalle) {
                this.coloresPorCapaDetalle = new Array(this.moldeDetalle.capas.length).fill(null);
                if (this.moldeTieneSvg(this.moldeDetalle)) {
                    this.svgPreviewDetalle = this.getSvgInicial(this.moldeDetalle);
                }
            }
        } else if (this.esHiloEncerado(producto) && producto.moldeNombre) {
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

    // ========== LIGHTBOX ==========
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

    // ========== SVG Y COLORES ==========
    toggleCapaDetalle(capaIndex: number): void {
        if (this.capaAbiertaDetalle === capaIndex) {
            this.capaAbiertaDetalle = null;
            this.categoriaAbiertaDetalle = null;
        } else {
            this.capaAbiertaDetalle = capaIndex;
            this.categoriaAbiertaDetalle = null;
        }
    }

    toggleCategoriaDetalle(categoria: string): void {
        this.categoriaAbiertaDetalle = this.categoriaAbiertaDetalle === categoria ? null : categoria;
    }

    getColoresPorCategoria(categoria: string): Color[] {
        return ordenarCromatico(this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase()));
    }

    seleccionarColorCapaDetalle(capaIndex: number, color: Color): void {
        this.coloresPorCapaDetalle[capaIndex] = color;
        if (this.productoDetalle && this.moldeTieneSvg(this.moldeDetalle)) {
            this.actualizarSvgPreviewDetalle();
        }
        this.categoriaAbiertaDetalle = null;
        this.capaAbiertaDetalle = null;
    }

    moldeTieneSvg(molde: Molde | null): boolean {
        return !!(molde?.svgContent && molde?.svgAreaMappings && molde.svgAreaMappings.length > 0);
    }

    getSvgInicial(molde: Molde): SafeHtml | null {
        if (!molde?.svgContent || !molde?.svgAreaMappings) {
            return null;
        }
        const coloresVacios: (Color | null)[] = new Array(molde.capas.length).fill(null);
        return this.generarSvgConColores(molde.svgContent, molde.svgAreaMappings, coloresVacios);
    }

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

    generarSvgConColores(svgContent: string, mappings: SvgAreaMapping[], colores: (Color | null)[]): SafeHtml {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');

        // Asegurar definiciones globales (gradientes para translucido/polvo)
        this.ensureGlobalDefs(doc);

        // Aplicar estilo base (blanco con borde negro)
        this.aplicarEstiloBaseEnDoc(doc, mappings);

        // Aplicar colores seleccionados
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
        
        // Manejo de efectos para translucido y polvo
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

    aplicarEstiloBaseAElemento(elemento: Element): void {
        const tagName = elemento.tagName.toLowerCase();
        const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
        
        if (elementosConFill.includes(tagName)) {
            elemento.setAttribute('fill', '#FFFFFF');
            elemento.setAttribute('stroke', '#000000');
            elemento.setAttribute('stroke-width', '1');
        }
        
        const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
        hijos.forEach(hijo => {
            hijo.setAttribute('fill', '#FFFFFF');
            hijo.setAttribute('stroke', '#000000');
            hijo.setAttribute('stroke-width', '1');
        });
    }

    aplicarColorAElemento(svgString: string, elementId: string, color: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const elemento = doc.getElementById(elementId);
        
        if (elemento) {
            this.colorearElemento(elemento, color);
        }
        
        return new XMLSerializer().serializeToString(doc);
    }

    colorearElemento(elemento: Element, color: string): void {
        const tagName = elemento.tagName.toLowerCase();
        const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
        
        if (elementosConFill.includes(tagName)) {
            elemento.setAttribute('fill', color);
            elemento.setAttribute('stroke', '#000000');
            elemento.setAttribute('stroke-width', '1');
        }
        
        const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
        hijos.forEach(hijo => {
            hijo.setAttribute('fill', color);
            hijo.setAttribute('stroke', '#000000');
            hijo.setAttribute('stroke-width', '1');
        });
    }

    onSvgClickDetalle(event: MouseEvent): void {
        const target = event.target as Element;
        if (!this.moldeDetalle?.svgAreaMappings) return;
        
        let elemento: Element | null = target;
        let elementId: string | null = null;
        
        while (elemento && !elementId) {
            elementId = elemento.getAttribute('id');
            if (!elementId) {
                elemento = elemento.parentElement;
            }
        }
        
        if (elementId) {
            const mapping = this.moldeDetalle.svgAreaMappings.find(m => m.svgElementId === elementId);
            if (mapping) {
                this.toggleCapaDetalle(mapping.capaIndex);
            }
        }
    }

    todasCapasConColorDetalle(): boolean {
        if (!this.moldeDetalle) return true;
        return this.coloresPorCapaDetalle.every(c => c !== null);
    }

    // ========== AGREGAR DESDE DETALLE ==========
    agregarDesdeDetalle(): void {
        if (!this.productoDetalle) return;
        
        const capas = this.getCapasDetalle();
        if (this.requiereColores(this.productoDetalle) && capas.length > 0) {
            if (!this.todasCapasConColorDetalle()) {
                return;
            }
            
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
                material: this.productoDetalle.material || '',
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
            this.carritoService.agregarProducto({
                _id: this.productoDetalle._id,
                nombre: this.productoDetalle.nombre,
                producto: this.productoDetalle.producto,
                material: this.productoDetalle.material || '',
                precio: this.productoDetalle.precio || 0,
                imagen: this.getPrimeraImagen(this.productoDetalle),
                moldeNombre: this.productoDetalle.moldeNombre
            }, this.cantidadDetalle);
            
            const mensaje = `${this.cantidadDetalle} x ${this.productoDetalle.nombre} agregado al carrito`;
            this.cerrarDetalle();
            this.mostrarMensajeExito(mensaje);
        }
    }

    // ========== COLORES DE FOTO ==========
    imagenActualTieneColores(): boolean {
        if (!this.productoDetalle?.coloresPorImagen) return false;
        const entry = this.productoDetalle.coloresPorImagen.find(c => c.imagenIndex === this.imagenActualIndex);
        return !!(entry && entry.colores.length > 0);
    }

    aplicarColoresDeFoto(): void {
        if (!this.productoDetalle?.coloresPorImagen) return;
        if (!this.moldeDetalle && !this.esHiloEncerado(this.productoDetalle)) return;
        
        const entry = this.productoDetalle.coloresPorImagen.find(c => c.imagenIndex === this.imagenActualIndex);
        if (!entry || entry.colores.length === 0) return;
        
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
        
        const coloresArray: (Color | null)[] = new Array(molde.capas.length).fill(null);
        variante.coloresPorCapa.forEach(cc => {
            if (cc.capaIndex < coloresArray.length) {
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
            material: this.productoDetalle.material || '',
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

    // ========== POPUP DE ÉXITO ==========
    mostrarMensajeExito(mensaje: string, coloresPorCapa?: ColorPorCapa[]): void {
        this.mensajeExito = mensaje;
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

    // ========== POPUP LOGIN/REGISTRO PARA FAVORITOS ==========

    abrirPopupLoginFavoritos(): void {
        this.mostrarPopupLoginFavoritos = true;
        this.modoLoginFavoritos = 'login';
        this.popupLoginError = '';
        this.loginForm.reset();
        this.registroForm.reset();
    }

    cerrarPopupLoginFavoritos(): void {
        this.mostrarPopupLoginFavoritos = false;
        this.popupLoginError = '';
        this.loginForm.reset();
        this.registroForm.reset();
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

        this.http.post<any>('http://localhost:5000/api/login', formData)
            .subscribe({
                next: (res) => {
                    if (res.success) {
                        sessionStorage.setItem('email', formData.email as string);
                        sessionStorage.setItem('isLoggedIn', 'true');
                        sessionStorage.setItem('tipoUsuario', res.tipoUsuario);
                        sessionStorage.setItem('nombreUsuario', res.nombre);

                        this.favoritosService.sincronizarAlLogin(formData.email as string);

                        this.mostrarPopupLoginFavoritos = false;
                        this.popupLoginError = '';
                        this.loginForm.reset();

                        // Recargar favoritos después de sincronizar
                        setTimeout(() => {
                            this.cargarDatos();
                        }, 500);

                        this.mostrarMensajeExito('¡Bienvenido! Tus favoritos se han cargado');
                    }
                },
                error: (err) => {
                    const errorMessage = err?.error?.error;
                    if (errorMessage === 'contraseñaIncorrecta') {
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

        this.http.post<any>('http://localhost:5000/api/usuarios/registro', formData)
            .subscribe({
                next: (res) => {
                    if (res.success) {
                        sessionStorage.setItem('email', formData.email as string);
                        sessionStorage.setItem('isLoggedIn', 'true');
                        sessionStorage.setItem('tipoUsuario', 'Cliente');
                        sessionStorage.setItem('nombreUsuario', formData.nombre as string);

                        this.mostrarPopupLoginFavoritos = false;
                        this.popupLoginError = '';
                        this.registroForm.reset();

                        // Recargar favoritos después de registrarse
                        setTimeout(() => {
                            this.cargarDatos();
                        }, 300);

                        this.mostrarMensajeExito(`¡Bienvenido ${formData.nombre}! Ya podés guardar tus favoritos`);
                    }
                },
                error: (err) => {
                    const errorMessage = err?.error?.error;
                    if (errorMessage === 'usuarioExistente') {
                        this.popupLoginError = 'El email ya está registrado';
                    } else if (errorMessage === 'emailInvalido') {
                        this.popupLoginError = 'Email inválido';
                    } else {
                        this.popupLoginError = 'Error al registrar. Intente nuevamente';
                    }
                }
            });
    }
}
