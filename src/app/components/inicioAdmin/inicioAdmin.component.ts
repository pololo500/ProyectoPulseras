import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { GlobalService } from '../../services/global.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { environment } from '../../../environments/environment';

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
export class InicioAdminComponent implements OnInit, OnDestroy {
  router = inject(Router);
  
  carruseles: CarruselPorTipo[] = [];
  autoplayInterval: any;
  autoplayDelay = 3000;

  constructor(private globalService: GlobalService, private http: HttpClient) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/inicioAdministrador");
    this.obtenerProductos();
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  obtenerProductos() {
    this.http.get<Producto[]>(`${environment.apiUrl}/productos`)
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

  getItemClass(carrusel: CarruselPorTipo, index: number): string {
    const len = carrusel.productos.length;
    const current = carrusel.currentIndex;
    
    let diff = index - current;
    
    if (diff > len / 2) {
      diff -= len;
    } else if (diff < -len / 2) {
      diff += len;
    }
    
    if (diff === 0) {
      return 'carrusel-item center';
    } else if (diff === -1 || (diff === len - 1)) {
      return 'carrusel-item prev';
    } else if (diff === 1 || (diff === -(len - 1))) {
      return 'carrusel-item next';
    } else {
      return 'carrusel-item hidden';
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

  irAModificarProductos(tipo: string) {
    this.router.navigate(['/modificarProductos'], { 
      queryParams: { filtroProducto: tipo } 
    });
  }

  cerrarSesion() {
    this.globalService.logout();
  }
}