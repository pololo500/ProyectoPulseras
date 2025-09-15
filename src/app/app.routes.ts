import { Routes } from '@angular/router';
//import { HomeComponent } from './components/home/home.component';
import { AgregarProductoComponent } from './components/agregarProducto/agregarProducto.component';
import { AgregarDijeComponent } from './components/agregarDije/agregarDije.component';
import { LoginComponent } from './components/login/login.component';
import { ErrorComponent } from './components/error/error.component';
import { InicioAdminComponent } from './components/inicioAdmin/inicioAdmin.component';
import { InicioComponent } from './components/inicio/inicio.component';

export const routes: Routes = [
    { path: '', component: InicioComponent, title: 'LM Pulseras' },
    { path: 'inicio', component: InicioComponent, title: 'LM Pulseras - Inicio' },
    { path: 'inicioAdministrador', component: InicioAdminComponent, title: 'LM Pulseras - Inicio' },
    { path: 'login', component: LoginComponent, title: 'LM Pulseras - Iniciar Sesión' },
    { path: 'agregarProducto', component: AgregarProductoComponent, title: 'LM Pulseras - Agregar Producto' },
    { path: 'agregarDije', component: AgregarDijeComponent, title: 'LM Pulseras - Agregar Dije' },
    { path: '**', component: ErrorComponent, title: 'LM Pulseras - Error' }
];
