import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  imagenUrl?: string;
  imagenesUrls?: string[];
}

interface CarruselPorTipo {
  tipo: string;
  productos: Producto[];
  currentIndex: number;
  isHovered: boolean;
}

@Component({
    selector: 'app-inicio',
    imports: [CommonModule, CapitalizePipe],
    templateUrl: './inicio.component.html',
    styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('viewport') viewports!: QueryList<ElementRef>;
  router = inject(Router);
  
  carruseles: CarruselPorTipo[] = [];
  autoplayInterval: any;
  autoplayDelay = 3000;
  itemWidth = 0;
  nombreUsuario = '';

  constructor(private globalService: GlobalService, private http: HttpClient) {}

  ngOnInit(): void {
    // Si es admin, redirigir a inicioAdministrador
    if (this.globalService.isAdmin()) {
      this.router.navigateByUrl('/inicioAdministrador');
      return;
    }
    
    this.nombreUsuario = sessionStorage.getItem('nombreUsuario') || '';
    this.obtenerProductos();
    this.startAutoplay();
  }

  ngAfterViewInit() {
    this.calculateItemWidth();
    window.addEventListener('resize', this.calculateItemWidth.bind(this));
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    window.removeEventListener('resize', this.calculateItemWidth.bind(this));
  }

  obtenerProductos() {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe(data => {
        const productosPorTipo = new Map<string, Producto[]>();
        
        data.forEach(producto => {
          const tipo = producto.producto;
          if (!productosPorTipo.has(tipo)) {
            productosPorTipo.set(tipo, []);
          }
          productosPorTipo.get(tipo)!.push(producto);
        });
        
        this.carruseles = [];
        productosPorTipo.forEach((productos, tipo) => {
          this.carruseles.push({
            tipo: tipo,
            productos: productos,
            currentIndex: 0,
            isHovered: false
          });
        });
      });
  }

  calculateItemWidth() {
    if (this.viewports && this.viewports.first) {
      const viewportWidth = this.viewports.first.nativeElement.clientWidth;
      this.itemWidth = (viewportWidth / 3) - 20;
    }
  }

  getPrimeraImagen(producto: Producto): string {
    if (producto.imagenesUrls && producto.imagenesUrls.length > 0) {
      return producto.imagenesUrls[0];
    } else if (producto.imagenUrl) {
      return producto.imagenUrl;
    }
    return '';
  }

  previous(carrusel: CarruselPorTipo) {
    if (carrusel.currentIndex === 0) {
      carrusel.currentIndex = carrusel.productos.length - 1;
    } else {
      carrusel.currentIndex--;
    }
  }

  next(carrusel: CarruselPorTipo) {
    if (carrusel.currentIndex === carrusel.productos.length - 1) {
      carrusel.currentIndex = 0;
    } else {
      carrusel.currentIndex++;
    }
  }

  startAutoplay() {
    this.autoplayInterval = setInterval(() => {
      this.carruseles.forEach(carrusel => {
        if (!carrusel.isHovered && carrusel.productos.length > 1) {
          this.next(carrusel);
        }
      });
    }, this.autoplayDelay);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  onMouseEnter(carrusel: CarruselPorTipo) {
    carrusel.isHovered = true;
  }

  onMouseLeave(carrusel: CarruselPorTipo) {
    carrusel.isHovered = false;
  }

  getTrackStyles(carrusel: CarruselPorTipo): any {
    const offset = carrusel.currentIndex * (this.itemWidth + 20);
    return {
      transform: `translateX(-${offset}px)`,
      transition: 'transform 1.2s ease-in-out'
    };
  }

  // Ver detalle del producto (para futuro uso)
  verProducto(producto: Producto) {
    // Por ahora solo mostrar info, se puede expandir después
    console.log('Ver producto:', producto);
  }
}
