import { Component, HostListener, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';

@Component({
    selector: 'app-title',
    imports: [RouterModule, CommonModule],
    templateUrl: './title.component.html',
    styleUrl: './title.component.css'
})
export class TitleComponent implements OnInit {
  validRoute = false;
  color='blanco';
  isMobile: boolean = false;
  
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
