import { Component, inject, OnInit } from '@angular/core';
import { AppComponent } from '../../app.component';
import { ButtonComponent } from '../button/button.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [ AppComponent, ButtonComponent ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnInit{
  link = '';
  logged = '';
  router = inject(Router);

  ngOnInit(): void {
    this.logged = sessionStorage.getItem("isLoggedIn")??'';
    if(this.logged) {
      this.link = '/inicioAdministrador';
      this.goToAnotherScreen();
    }
  }

  goToAnotherScreen() {
    this.router.navigateByUrl(this.link);
  }
}
