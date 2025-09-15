import { Component, inject, Input, OnInit } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';


@Component({
  selector: 'app-popupLogin',
  standalone: true,
  imports: [ ButtonComponent, CommonModule ],
  templateUrl: './popupLogin.component.html',
  styleUrl: './popupLogin.component.css'
})
export class PopupLoginComponent implements OnInit {
  dni = '';
  router = inject(Router);
  url = '';

  constructor(private globalService: GlobalService, private routerP: Router) {}

  ngOnInit(): void {
    this.dni = sessionStorage.getItem("dni")??'';
    this.globalService.url$.subscribe(url => {
      if (url != "") {
        this.url = url;
      } else {
          this.url = "/agregarProducto";
      }
    });
  }
}
