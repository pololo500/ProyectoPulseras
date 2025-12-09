import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoritosService, ItemFavorito } from '../../services/favoritos.service';
import { CarritoService } from '../../services/carrito.service';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { Subscription } from 'rxjs';

interface FavoritoConCantidad extends ItemFavorito {
    cantidad: number;
}

@Component({
    selector: 'app-favoritos',
    standalone: true,
    imports: [CommonModule, RouterModule, CapitalizePipe],
    templateUrl: './favoritos.component.html',
    styleUrl: './favoritos.component.css'
})
export class FavoritosComponent implements OnInit, OnDestroy {
    favoritos: FavoritoConCantidad[] = [];
    private favoritosSub!: Subscription;

    constructor(
        private favoritosService: FavoritosService,
        private carritoService: CarritoService
    ) {}

    ngOnInit(): void {
        this.favoritosSub = this.favoritosService.favoritos$.subscribe(items => {
            // Agregar cantidad = 1 a cada favorito
            this.favoritos = items.map(item => ({
                ...item,
                cantidad: this.favoritos.find(f => f._id === item._id)?.cantidad || 1
            }));
        });
    }

    ngOnDestroy(): void {
        if (this.favoritosSub) {
            this.favoritosSub.unsubscribe();
        }
    }

    eliminarFavorito(productoId: string): void {
        this.favoritosService.eliminarFavorito(productoId);
    }

    incrementarCantidad(producto: FavoritoConCantidad): void {
        producto.cantidad++;
    }

    decrementarCantidad(producto: FavoritoConCantidad): void {
        if (producto.cantidad > 1) {
            producto.cantidad--;
        }
    }

    agregarAlCarrito(producto: FavoritoConCantidad): void {
        this.carritoService.agregarProducto({
            _id: producto._id,
            nombre: producto.nombre,
            producto: producto.producto,
            material: '',
            precio: producto.precio,
            imagen: producto.imagen
        }, producto.cantidad);
        alert(`${producto.cantidad} x ${producto.nombre} agregado al carrito`);
        producto.cantidad = 1; // Resetear cantidad
    }
}
