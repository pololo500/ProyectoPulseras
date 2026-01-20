import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface ItemFavorito {
    _id: string;
    nombre: string;
    producto: string;
    precio: number;
    imagen: string;
}

@Injectable({
    providedIn: 'root'
})
export class FavoritosService {
    private favoritos: ItemFavorito[] = [];
    private favoritosSubject = new BehaviorSubject<ItemFavorito[]>([]);
    public favoritos$ = this.favoritosSubject.asObservable();

    // Producto pendiente para agregar después del login
    private productoPendiente: ItemFavorito | null = null;

    private apiUrl = 'http://localhost:5000/api';

    constructor(private http: HttpClient) {
        this.cargarFavoritosLocal();
    }

    private cargarFavoritosLocal(): void {
        const guardados = sessionStorage.getItem('favoritos');
        if (guardados) {
            this.favoritos = JSON.parse(guardados);
            this.favoritosSubject.next([...this.favoritos]);
        }
    }

    private guardarFavoritosLocal(): void {
        sessionStorage.setItem('favoritos', JSON.stringify(this.favoritos));
        this.favoritosSubject.next([...this.favoritos]);
        // Emitir evento para actualizar navbar
        window.dispatchEvent(new Event('favoritosActualizado'));
    }

    private guardarFavoritosDB(): void {
        const email = sessionStorage.getItem('email');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        if (email && isLoggedIn) {
            this.http.put(`${this.apiUrl}/usuarios/${email}/favoritos`, { favoritos: this.favoritos })
                .subscribe({
                    next: () => console.log('Favoritos guardados en DB'),
                    error: (err) => console.error('Error al guardar favoritos en DB:', err)
                });
        }
    }

    sincronizarAlLogin(email: string): void {
        this.http.get<{ favoritos: ItemFavorito[] }>(`${this.apiUrl}/usuarios/${email}/favoritos`)
            .subscribe({
                next: (response) => {
                    // Usar favoritos de la base de datos
                    this.favoritos = response.favoritos || [];
                    this.guardarFavoritosLocal();
                },
                error: (err) => {
                    console.error('Error al cargar favoritos desde DB:', err);
                }
            });
    }

    agregarFavorito(producto: ItemFavorito): void {
        const existe = this.favoritos.find(item => item._id === producto._id);
        if (!existe) {
            this.favoritos.push(producto);
            this.guardarFavoritosLocal();
            this.guardarFavoritosDB();
        }
    }

    eliminarFavorito(productoId: string): void {
        this.favoritos = this.favoritos.filter(item => item._id !== productoId);
        this.guardarFavoritosLocal();
        this.guardarFavoritosDB();
    }

    toggleFavorito(producto: ItemFavorito): boolean {
        const existe = this.favoritos.find(item => item._id === producto._id);
        if (existe) {
            this.eliminarFavorito(producto._id);
            return false;
        } else {
            this.agregarFavorito(producto);
            return true;
        }
    }

    esFavorito(productoId: string): boolean {
        return this.favoritos.some(item => item._id === productoId);
    }

    obtenerFavoritos(): ItemFavorito[] {
        return [...this.favoritos];
    }

    getCantidadFavoritos(): number {
        return this.favoritos.length;
    }

    limpiarFavoritos(): void {
        this.favoritos = [];
        sessionStorage.removeItem('favoritos');
        this.favoritosSubject.next([]);
    }

    // Verificar si el usuario está logueado
    isLoggedIn(): boolean {
        return sessionStorage.getItem('isLoggedIn') === 'true';
    }

    // Guardar producto pendiente para agregar después del login
    setProductoPendiente(producto: ItemFavorito): void {
        this.productoPendiente = producto;
    }

    // Obtener y limpiar producto pendiente
    getProductoPendiente(): ItemFavorito | null {
        const producto = this.productoPendiente;
        this.productoPendiente = null;
        return producto;
    }

    // Verificar si hay producto pendiente
    tieneProductoPendiente(): boolean {
        return this.productoPendiente !== null;
    }

    // Agregar el producto pendiente después del login exitoso
    agregarProductoPendiente(): void {
        if (this.productoPendiente) {
            this.agregarFavorito(this.productoPendiente);
            this.productoPendiente = null;
        }
    }
}
