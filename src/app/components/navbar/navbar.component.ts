import { AfterViewInit, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { filter } from 'rxjs';
import { ParticleEffectCircle } from '../../extras/particle-effect-circle';
import { ParticleEffectSquare } from '../../extras/particle-effect-square';
@Component({
    selector: 'app-navbar',
    imports: [RouterModule, NgIf, CommonModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  validRoute = true;
  color='blanco';
  isMobile: boolean = false;
  isTablet: boolean = false;
  isAdmin: boolean = false;
  cantidadCarrito: number = 0;
  cantidadFavoritos: number = 0;
  
  private particleEffectCircle!: ParticleEffectCircle;
  private particleEffectSquare!: ParticleEffectSquare;
  private particlesInitialized = false;

  ngAfterViewInit(): void {
    // Dar tiempo para que el DOM se actualice con el *ngIf
    if (this.validRoute) {
      this.initParticlesWithRetry();
    }
  }

  private initParticlesWithRetry(attempts = 0): void {
    if (attempts > 20) return; // Más intentos
    
    setTimeout(() => {
      const canvasCircle = document.getElementById('particle-canvas-circle');
      const canvasSquare = document.getElementById('particle-canvas-square');
      
      if (canvasCircle && canvasSquare) {
        try {
          // Destruir instancias anteriores si existen
          if (this.particleEffectCircle) {
            this.particleEffectCircle.destroy();
          }
          if (this.particleEffectSquare) {
            this.particleEffectSquare.destroy();
          }
          
          this.particleEffectCircle = new ParticleEffectCircle('particle-canvas-circle');
          this.particleEffectSquare = new ParticleEffectSquare('particle-canvas-square');
          this.particlesInitialized = true;
        } catch (e) {
          console.warn('Error inicializando partículas:', e);
          this.particlesInitialized = false;
        }
      } else if (this.validRoute) {
        // Reintentar si los canvas aún no están disponibles y la ruta es válida
        this.initParticlesWithRetry(attempts + 1);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.particleEffectCircle) {
      this.particleEffectCircle.destroy();
    }
    if (this.particleEffectSquare) {
      this.particleEffectSquare.destroy();
    }
  }
  
  comprobarRuta() {
    const currentUrl = this.router.url;

    if(currentUrl == '/login')
      return this.validRoute = false;
    else
      return this.validRoute = true;
  }

  checkUserType() {
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');
    this.isAdmin = tipoUsuario === 'Administrador';
  }

  constructor(private router: Router) {};

  ngOnInit() {
    this.checkScreenSize();
    this.checkUserType();
    this.actualizarCarrito();
    this.actualizarFavoritos();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.comprobarRuta();
        this.checkUserType();
        this.actualizarCarrito();
        this.actualizarFavoritos();
        // Reinicializar partículas si es una ruta válida
        if (this.validRoute) {
          // Pequeño delay para que el *ngIf renderice los canvas
          setTimeout(() => {
            if (!this.particlesInitialized) {
              this.initParticlesWithRetry();
            }
          }, 50);
        } else {
          // Si no es ruta válida, marcar como no inicializado para el próximo cambio
          this.particlesInitialized = false;
        }
      });

    // Escuchar eventos de actualización del carrito
    window.addEventListener('carritoActualizado', () => {
      this.actualizarCarrito();
    });

    // Escuchar eventos de actualización de favoritos
    window.addEventListener('favoritosActualizado', () => {
      this.actualizarFavoritos();
    });

    this.comprobarRuta();
  }

  actualizarCarrito() {
    const carrito = sessionStorage.getItem('carrito');
    if (carrito) {
      try {
        const items = JSON.parse(carrito);
        this.cantidadCarrito = items.reduce((total: number, item: any) => total + (item.cantidad || 1), 0);
      } catch {
        this.cantidadCarrito = 0;
      }
    } else {
      this.cantidadCarrito = 0;
    }
  }

  actualizarFavoritos() {
    const favoritos = sessionStorage.getItem('favoritos');
    if (favoritos) {
      try {
        const items = JSON.parse(favoritos);
        this.cantidadFavoritos = items.length;
      } catch {
        this.cantidadFavoritos = 0;
      }
    } else {
      this.cantidadFavoritos = 0;
    }
  }

  // Escucha los cambios de tamaño de la ventana
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    const width = window.innerWidth;
    this.isMobile = width <= 480;
    this.isTablet = width > 480 && width <= 768;
  }

  isActive(route: string): boolean {
    if(this.router.url === `/${route}`) {
      this.color = 'azul';
      return true;
    } else {
      this.color = 'blanco';
      return false;
    }
  }
}
