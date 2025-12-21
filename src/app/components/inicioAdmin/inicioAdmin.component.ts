import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { GlobalService } from '../../services/global.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CapitalizePipe } from '../../extras/capitalizePipe';

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
    selector: 'app-inicioAdmin',
    imports: [ButtonComponent, CommonModule, CapitalizePipe],
    templateUrl: './inicioAdmin.component.html',
    styleUrl: './inicioAdmin.component.css'
})
export class InicioAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('viewport') viewports!: QueryList<ElementRef>;
  router = inject(Router);
  
  carruseles: CarruselPorTipo[] = [];
  autoplayInterval: any;
  autoplayDelay = 3000; // 3 segundos
  itemWidth = 0;

  constructor(private globalService: GlobalService, private http: HttpClient) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/inicioAdministrador");
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
        // Agrupar productos por tipo
        const productosPorTipo = new Map<string, Producto[]>();
        
        data.forEach(producto => {
          const tipo = producto.producto;
          if (!productosPorTipo.has(tipo)) {
            productosPorTipo.set(tipo, []);
          }
          productosPorTipo.get(tipo)!.push(producto);
        });
        
        // Crear carruseles por tipo
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

  // Obtener la primera imagen de un producto
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

  // Navegar a modificar productos con filtro
  irAModificarProductos(tipo: string) {
    this.router.navigate(['/modificarProductos'], { 
      queryParams: { filtroProducto: tipo } 
    });
  }

  // Cerrar sesión
  cerrarSesion() {
    this.globalService.logout();
  }
}