import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { FavoritosService, ItemFavorito } from '../../services/favoritos.service';
import { CarritoService, ColorPorCapa } from '../../services/carrito.service';
import { CapitalizePipe } from '../../extras/capitalizePipe';
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
}

interface FavoritoConDatos extends ItemFavorito {
    cantidad: number;
    material?: string;
    descripcion?: string;
    imagenesUrls?: string[];
    moldeNombre?: string;
}

@Component({
    selector: 'app-favoritos',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CapitalizePipe, FormatoPrecioPipe, PopupExitoComponent],
    templateUrl: './favoritos.component.html',
    styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent implements OnInit, OnDestroy {
    favoritos: FavoritoConDatos[] = [];
    favoritosFiltrados: FavoritoConDatos[] = [];
    productos: Producto[] = [];
    colores: Color[] = [];
    moldes: Molde[] = [];
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

    // Lightbox de imágenes
    mostrarLightbox = false;
    imagenLightboxIndex = 0;

    // Popup de éxito
    mostrarPopupExito = false;
    mensajeExito = '';
    coloresExito: ColorInfo[] = [];

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
            moldes: this.http.get<Molde[]>('http://localhost:5000/api/moldes')
        }).subscribe({
            next: (data) => {
                this.productos = data.productos;
                this.colores = data.colores;
                this.moldes = data.moldes;
                
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
                            moldeNombre: productoCompleto?.moldeNombre
                        };
                    });
                    this.extraerFiltros();
                    this.aplicarFiltros();
                });
            },
            error: (err) => console.error('Error al cargar datos:', err)
        });
    }

    getMoldeByNombre(nombre: string): Molde | null {
        return this.moldes.find(m => m.nombre === nombre) || null;
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

    agregarAlCarrito(producto: FavoritoConDatos): void {
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
        this.capaAbiertaDetalle = this.capaAbiertaDetalle === capaIndex ? null : capaIndex;
    }

    getColoresPorCategoria(categoria: string): Color[] {
        return this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase());
    }

    seleccionarColorCapaDetalle(capaIndex: number, color: Color): void {
        this.coloresPorCapaDetalle[capaIndex] = color;
        this.actualizarSvgPreviewDetalle();
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
        let svgConColores = this.aplicarEstiloBase(svgContent, mappings);
        
        mappings.forEach((mapping) => {
            const color = colores[mapping.capaIndex];
            if (color && mapping.svgElementId) {
                svgConColores = this.aplicarColorAElemento(svgConColores, mapping.svgElementId, color.rgb);
            }
        });
        
        return this.sanitizer.bypassSecurityTrustHtml(svgConColores);
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
        
        if (this.esResina(this.productoDetalle) && this.moldeDetalle) {
            if (!this.todasCapasConColorDetalle()) {
                return;
            }
            
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
}
