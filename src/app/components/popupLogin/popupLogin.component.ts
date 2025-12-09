import { Component, inject, Input, OnInit } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';


@Component({
    selector: 'app-popupLogin',
    imports: [ButtonComponent, CommonModule],
    templateUrl: './popupLogin.component.html',
    styleUrl: './popupLogin.component.css'
})
export class PopupLoginComponent implements OnInit {
  nombre = '';
  router = inject(Router);
  url = '';
  tipoUsuario = '';

  constructor(private globalService: GlobalService, private routerP: Router) {}

  ngOnInit(): void {
    this.nombre = this.globalService.getNombreUsuario();
    this.tipoUsuario = this.globalService.getTipoUsuario();
    
    this.globalService.url$.subscribe(url => {
      if (url != "") {
        // Si hay una URL guardada, verificar que el usuario tenga acceso
        this.url = url;
      } else {
        // Redirigir según el tipo de usuario
        this.url = this.globalService.getUrlInicio();
      }
    });
  }
}
