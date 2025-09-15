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
  
  private particleEffectCircle!: ParticleEffectCircle;
  private particleEffectSquare!: ParticleEffectSquare;

  ngAfterViewInit(): void {
    this.particleEffectCircle = new ParticleEffectCircle('particle-canvas-circle');
    this.particleEffectSquare = new ParticleEffectSquare('particle-canvas-square');
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

  constructor(private router: Router) {};

  ngOnInit() {
    this.checkScreenSize();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.comprobarRuta();
      });

    this.comprobarRuta();
  }

  // Escucha los cambios de tamaño de la ventana
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 600;
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
