import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

// Rutas de administrador
const RUTAS_ADMIN = [
  '/inicioAdministrador',
  '/agregarProducto',
  '/modificarProductos',
  '/calculadoraResina',
  '/compras',
  '/pedidos',
  '/ventas'
];

// Rutas de cliente
const RUTAS_CLIENTE = [
  '/inicio',
  '/catalogo',
  '/pedido'
];

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  router = inject(Router);
  
  // Variables globales
  private _url = new BehaviorSubject<string>('');
  private _imageClass = new BehaviorSubject<string>('default-style');
  
  // Observable para que los componentes puedan suscribirse
  url$ = this._url.asObservable();
  imageClass$ = this._imageClass.asObservable();

  // Verificar si está logueado
  isLoggedIn(): boolean {
    return sessionStorage.getItem("isLoggedIn") === "true";
  }

  // Obtener tipo de usuario
  getTipoUsuario(): string {
    return sessionStorage.getItem("tipoUsuario") || '';
  }

  // Obtener nombre de usuario
  getNombreUsuario(): string {
    return sessionStorage.getItem("nombreUsuario") || '';
  }

  // Verificar si es administrador
  isAdmin(): boolean {
    return this.getTipoUsuario() === 'Administrador';
  }

  // Verificar si es cliente
  isCliente(): boolean {
    return this.getTipoUsuario() === 'Cliente';
  }

  // Cerrar sesión
  logout(): void {
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("tipoUsuario");
    sessionStorage.removeItem("nombreUsuario");
    sessionStorage.removeItem("carrito");  // Limpiar carrito al cerrar sesión
    sessionStorage.removeItem("favoritos");  // Limpiar favoritos al cerrar sesión
    window.dispatchEvent(new Event('carritoActualizado'));
    window.dispatchEvent(new Event('favoritosActualizado'));
    this.router.navigateByUrl("/login");
  }

  /**
   * Verifica si el usuario está logueado y tiene acceso a la URL
   * @param url - La URL a la que se intenta acceder
   * @param requiereAdmin - Si es true, solo administradores pueden acceder (por defecto true para compatibilidad)
   */
  checkLoggedIn(url: string, requiereAdmin: boolean = true): void {
    // Si no está logueado, redirigir al login
    if (!this.isLoggedIn()) {
      this._url.next(url);
      this.router.navigateByUrl("/login");
      return;
    }

    const tipoUsuario = this.getTipoUsuario();

    // Verificar permisos según el tipo de usuario requerido
    if (requiereAdmin && tipoUsuario !== 'Administrador') {
      // Usuario cliente intentando acceder a ruta de admin
      console.warn('Acceso denegado: Se requiere ser Administrador');
      this.router.navigateByUrl("/inicio");
      return;
    }

    if (!requiereAdmin && tipoUsuario === 'Administrador') {
      // Admin puede acceder a rutas de cliente también
      return;
    }
  }

  /**
   * Obtiene la URL de inicio según el tipo de usuario
   */
  getUrlInicio(): string {
    if (this.isAdmin()) {
      return '/inicioAdministrador';
    } else if (this.isCliente()) {
      return '/inicio';
    }
    return '/login';
  }

  updateUrl(newUrl: string): void {
    this._url.next(newUrl);
  }
}
