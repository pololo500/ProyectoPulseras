import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ColorPorCapa {
  capaIndex: number;
  capaNombre: string;
  colorId: string;
  colorNombre: string;
  colorRgb: string;
}

export interface ItemCarrito {
  _id: string;
  nombre: string;
  producto: string;
  material: string;
  precio: number;
  imagen: string;
  cantidad: number;
  // Para productos de resina
  moldeId?: string;
  moldeNombre?: string;
  // Colores por capa (array completo)
  coloresPorCapa?: ColorPorCapa[];
  // Para productos de stock disponible
  esStock?: boolean;
  stockVarianteId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private apiUrl = environment.apiUrl;
  private carritoSubject = new BehaviorSubject<ItemCarrito[]>([]);
  public carrito$ = this.carritoSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarCarritoInicial();
    
    // Escuchar evento de cierre de sesión para limpiar el carrito en memoria
    window.addEventListener('sessionCerrada', () => {
      this.carritoSubject.next([]);
    });
  }

  private getEmail(): string | null {
    return sessionStorage.getItem('email');
  }

  private isLoggedIn(): boolean {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  }

  // Cargar carrito al iniciar (desde DB si está logueado, sino desde sessionStorage)
  cargarCarritoInicial(): void {
    if (this.isLoggedIn() && this.getEmail()) {
      this.cargarCarritoDB();
    } else {
      this.cargarCarritoLocal();
    }
  }

  // Cargar desde sessionStorage (usuarios no logueados)
  private cargarCarritoLocal(): void {
    const carritoStr = sessionStorage.getItem('carrito');
    if (carritoStr) {
      try {
        const items = JSON.parse(carritoStr);
        this.carritoSubject.next(items);
      } catch {
        this.carritoSubject.next([]);
      }
    } else {
      // Si no hay carrito en sessionStorage, limpiar el BehaviorSubject
      this.carritoSubject.next([]);
    }
  }

  // Cargar desde la base de datos
  cargarCarritoDB(): void {
    const email = this.getEmail();
    if (!email) return;

    this.http.get<{ carrito: ItemCarrito[] }>(`${this.apiUrl}/usuarios/${email}/carrito`)
      .subscribe({
        next: (res) => {
          const items = res.carrito || [];
          this.carritoSubject.next(items);
          // Sincronizar con sessionStorage para el navbar
          sessionStorage.setItem('carrito', JSON.stringify(items));
        },
        error: (err) => {
          
          this.cargarCarritoLocal();
        }
      });
  }

  // Guardar carrito
  private guardarCarrito(items: ItemCarrito[]): void {
    // Siempre guardar en sessionStorage para el navbar
    sessionStorage.setItem('carrito', JSON.stringify(items));
    this.carritoSubject.next(items);
    
    // Si está logueado, también guardar en DB
    if (this.isLoggedIn() && this.getEmail()) {
      this.guardarCarritoDB(items);
    }
    
    // Notificar cambios
    window.dispatchEvent(new Event('carritoActualizado'));
  }

  // Guardar en base de datos
  private guardarCarritoDB(items: ItemCarrito[]): void {
    const email = this.getEmail();
    if (!email) return;

    this.http.put(`${this.apiUrl}/usuarios/${email}/carrito`, { carrito: items })
      .subscribe({
        error: (err) => {}
      });
  }

  // Obtener items actuales
  getItems(): ItemCarrito[] {
    return this.carritoSubject.getValue();
  }

  // Obtener cantidad total
  getCantidadTotal(): number {
    return this.getItems().reduce((total, item) => total + item.cantidad, 0);
  }

  // Agregar producto al carrito
  agregarProducto(producto: { 
    _id: string; 
    nombre: string; 
    producto: string; 
    material: string;
    precio: number; 
    imagen: string;
    moldeId?: string;
    moldeNombre?: string;
    coloresPorCapa?: ColorPorCapa[];
    esStock?: boolean;
    stockVarianteId?: string;
  }, cantidad: number = 1): void {
    const items = [...this.getItems()];
    
    // Para resina, cada combinación de producto+colores es un item diferente
    const coloresKey = producto.coloresPorCapa 
      ? producto.coloresPorCapa.map(c => c.colorId).join('-')
      : '';

    // Para items de stock, también diferenciar por stockVarianteId
    const stockKey = producto.stockVarianteId || '';
    
    const index = items.findIndex(item => 
      item._id === producto._id && 
      (item.coloresPorCapa?.map(c => c.colorId).join('-') || '') === coloresKey &&
      (item.stockVarianteId || '') === stockKey
    );
    
    if (index >= 0) {
      items[index].cantidad += cantidad;
    } else {
      items.push({
        ...producto,
        cantidad: cantidad
      });
    }
    
    this.guardarCarrito(items);
  }

  // Actualizar cantidad de un item
  actualizarCantidad(itemId: string, cantidad: number): void {
    if (cantidad < 1) cantidad = 1;
    
    const items = this.getItems().map(item => 
      item._id === itemId ? { ...item, cantidad } : item
    );
    
    this.guardarCarrito(items);
  }

  // Generar clave única para un item (incluye colores y stockVarianteId)
  private getItemKey(item: ItemCarrito): string {
    const coloresKey = item.coloresPorCapa 
      ? item.coloresPorCapa.map(c => c.colorId).join('-')
      : '';
    const stockKey = item.stockVarianteId || '';
    return `${item._id}-${coloresKey}-${stockKey}`;
  }

  // Incrementar cantidad
  incrementar(itemTarget: ItemCarrito): void {
    const targetKey = this.getItemKey(itemTarget);
    
    const items = this.getItems().map(item => 
      this.getItemKey(item) === targetKey ? { ...item, cantidad: item.cantidad + 1 } : item
    );
    this.guardarCarrito(items);
  }

  // Decrementar cantidad
  decrementar(itemTarget: ItemCarrito): void {
    const targetKey = this.getItemKey(itemTarget);
    
    const items = this.getItems().map(item => 
      this.getItemKey(item) === targetKey && item.cantidad > 1 
        ? { ...item, cantidad: item.cantidad - 1 } 
        : item
    );
    this.guardarCarrito(items);
  }

  // Eliminar item
  eliminarItem(itemTarget: ItemCarrito): void {
    const targetKey = this.getItemKey(itemTarget);
    
    const items = this.getItems().filter(item => this.getItemKey(item) !== targetKey);
    this.guardarCarrito(items);
  }

  // Vaciar carrito
  vaciarCarrito(): void {
    this.guardarCarrito([]);
  }

  // Calcular total
  getTotal(): number {
    return this.getItems().reduce((total, item) => total + (item.precio * item.cantidad), 0);
  }

  // Sincronizar carrito local con DB al hacer login (combina ambos carritos)
  // Retorna un Observable para poder esperar a que se complete
  sincronizarAlLogin(): Observable<void> {
    return new Observable(observer => {
      const email = this.getEmail();
      if (!email) {
        observer.next();
        observer.complete();
        return;
      }
      
      // Obtener carrito local antes de consultar DB
      const carritoLocalStr = sessionStorage.getItem('carrito');
      let itemsLocales: ItemCarrito[] = [];
      if (carritoLocalStr) {
        try {
          itemsLocales = JSON.parse(carritoLocalStr);
        } catch {
          itemsLocales = [];
        }
      }
      
      // Cargar carrito de la base de datos
      this.http.get<{ carrito: ItemCarrito[] }>(`${this.apiUrl}/usuarios/${email}/carrito`)
        .subscribe({
          next: (res) => {
            const itemsDB = res.carrito || [];
            
            // Si no hay items locales, solo cargar los de DB
            if (itemsLocales.length === 0) {
              sessionStorage.setItem('carrito', JSON.stringify(itemsDB));
              this.carritoSubject.next(itemsDB);
              window.dispatchEvent(new Event('carritoActualizado'));
              observer.next();
              observer.complete();
              return;
            }
            
            // Combinar carritos: agregar items locales al carrito de DB
            const carritoFinal = [...itemsDB];
            
            for (const itemLocal of itemsLocales) {
              const keyLocal = this.getItemKey(itemLocal);
              const existeEnDB = carritoFinal.find(item => this.getItemKey(item) === keyLocal);
              
              if (existeEnDB) {
                // Si ya existe, sumar cantidades
                existeEnDB.cantidad += itemLocal.cantidad;
              } else {
                // Si no existe, agregarlo
                carritoFinal.push(itemLocal);
              }
            }
            
            // Guardar el carrito combinado en la DB
            this.http.put(`${this.apiUrl}/usuarios/${email}/carrito`, { carrito: carritoFinal })
              .subscribe({
                next: () => {
                  // Actualizar sessionStorage con el carrito combinado
                  sessionStorage.setItem('carrito', JSON.stringify(carritoFinal));
                  this.carritoSubject.next(carritoFinal);
                  observer.next();
                  observer.complete();
                },
                error: (err) => {
                  
                  observer.next();
                  observer.complete();
                }
              });
          },
          error: () => {
            // Si hay error al obtener de DB, guardar solo los locales
            this.http.put(`${this.apiUrl}/usuarios/${email}/carrito`, { carrito: itemsLocales })
              .subscribe({
                next: () => {
                  observer.next();
                  observer.complete();
                },
                error: () => {
                  observer.next();
                  observer.complete();
                }
              });
          }
        });
    });
  }
}
