import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { CarritoService, ItemCarrito } from '../../services/carrito.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent implements OnInit, OnDestroy {
  items: ItemCarrito[] = [];
  private subscription!: Subscription;
  
  // WhatsApp
  private numeroWhatsApp = '541140766376';
  
  // Popup confirmación
  mostrarPopupConfirmacion = false;
  procesando = false;
  
  // Popup teléfono
  mostrarPopupTelefono = false;
  telefonoInput = '';
  guardandoTelefono = false;

  constructor(
    private router: Router, 
    private carritoService: CarritoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.subscription = this.carritoService.carrito$.subscribe(items => {
      this.items = items;
    });
    // Recargar carrito desde DB si está logueado
    this.carritoService.cargarCarritoInicial();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  actualizarCantidad(item: ItemCarrito, cantidad: number): void {
    this.carritoService.actualizarCantidad(item._id, cantidad);
  }

  incrementar(item: ItemCarrito): void {
    this.carritoService.incrementar(item._id);
  }

  decrementar(item: ItemCarrito): void {
    this.carritoService.decrementar(item._id);
  }

  eliminarItem(item: ItemCarrito): void {
    this.carritoService.eliminarItem(item._id);
  }

  vaciarCarrito(): void {
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
      this.carritoService.vaciarCarrito();
    }
  }

  getSubtotal(item: ItemCarrito): number {
    return item.precio * item.cantidad;
  }

  getTotal(): number {
    return this.carritoService.getTotal();
  }

  getCantidadTotal(): number {
    return this.carritoService.getCantidadTotal();
  }

  continuarComprando(): void {
    this.router.navigateByUrl('/productos');
  }

  finalizarCompra(): void {
    // Verificar si está logueado
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      alert('Debes iniciar sesión para finalizar la compra');
      this.router.navigateByUrl('/login');
      return;
    }
    
    // Verificar si tiene teléfono guardado
    const email = sessionStorage.getItem('email') || '';
    this.http.get<any>(`http://localhost:5000/api/usuarios/${email}`)
      .subscribe({
        next: (usuario) => {
          if (usuario && usuario.telefono && usuario.telefono.trim() !== '') {
            // Tiene teléfono, mostrar confirmación
            this.mostrarPopupConfirmacion = true;
          } else {
            // No tiene teléfono, pedir que lo complete
            this.telefonoInput = '';
            this.mostrarPopupTelefono = true;
          }
        },
        error: (err) => {
          console.error('Error al verificar usuario:', err);
          // En caso de error, pedir teléfono por seguridad
          this.telefonoInput = '';
          this.mostrarPopupTelefono = true;
        }
      });
  }

  cerrarPopupTelefono(): void {
    this.mostrarPopupTelefono = false;
    this.telefonoInput = '';
  }

  guardarTelefono(): void {
    if (!this.telefonoInput || this.telefonoInput.trim() === '') {
      alert('Por favor ingresa un número de teléfono válido');
      return;
    }
    
    this.guardandoTelefono = true;
    const email = sessionStorage.getItem('email') || '';
    const nombreUsuario = sessionStorage.getItem('nombreUsuario') || '';
    
    this.http.put(`http://localhost:5000/api/usuarios/${email}/datos`, { 
      nombre: nombreUsuario,
      telefono: this.telefonoInput.trim() 
    })
      .subscribe({
        next: () => {
          this.guardandoTelefono = false;
          this.mostrarPopupTelefono = false;
          // Ahora sí mostrar la confirmación de compra
          this.mostrarPopupConfirmacion = true;
        },
        error: (err) => {
          console.error('Error al guardar teléfono:', err);
          this.guardandoTelefono = false;
          alert('Error al guardar el teléfono. Intenta nuevamente.');
        }
      });
  }

  cancelarCompra(): void {
    this.mostrarPopupConfirmacion = false;
  }

  confirmarCompra(): void {
    this.procesando = true;
    
    const email = sessionStorage.getItem('email') || '';
    const nombreUsuario = sessionStorage.getItem('nombreUsuario') || 'Cliente';
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    // Crear items con toda la información necesaria para el admin
    const items = this.items.map(item => {
      const itemPedido: any = {
        productoId: item._id,
        productoNombre: item.nombre,
        productoTipo: item.producto,
        material: item.material || '',
        cantidad: item.cantidad,
        precio: item.precio,
        estado: 'A confirmar'
      };
      
      // Si tiene molde (resina)
      if (item.moldeNombre) {
        itemPedido.moldeNombre = item.moldeNombre;
      }
      
      // Si tiene colores por capa (resina)
      if (item.coloresPorCapa && item.coloresPorCapa.length > 0) {
        itemPedido.coloresPorCapa = item.coloresPorCapa;
      }
      
      return itemPedido;
    });
    
    const pedido = {
      cliente: email,
      items: items,
      fecha: fechaHoy,
      estado: 'A confirmar',
      metodoPago: 'A definir',
      pagado: false,
      nota: `Pedido web - ${this.getCantidadTotal()} productos - Total: $${this.getTotal()}`
    };
    
    // Crear el pedido único
    this.http.post('http://localhost:5000/api/pedidos', pedido).toPromise()
      .then(() => {
        // Generar mensaje de WhatsApp
        const mensaje = this.generarMensajeWhatsApp(nombreUsuario);
        const urlWhatsApp = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        
        // Vaciar carrito
        this.carritoService.vaciarCarrito();
        
        // Cerrar popup
        this.mostrarPopupConfirmacion = false;
        this.procesando = false;
        
        // Abrir WhatsApp
        window.open(urlWhatsApp, '_blank');
        
        // Redirigir a mis pedidos
        this.router.navigateByUrl('/mis-pedidos');
      })
      .catch(error => {
        console.error('Error al crear pedidos:', error);
        this.procesando = false;
        alert('Error al procesar el pedido. Intenta nuevamente.');
      });
  }

  private generarMensajeWhatsApp(nombreUsuario: string): string {
    let mensaje = `¡Hola! Soy ${nombreUsuario} 👋\n\n`;
    mensaje += `Me gustaría realizar el siguiente pedido:\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    this.items.forEach((item, index) => {
      mensaje += `📦 *${item.nombre}*\n`;
      if (item.material) {
        mensaje += `   Material: ${item.material}\n`;
      }
      // Mostrar colores por capa
      if (item.coloresPorCapa && item.coloresPorCapa.length > 0) {
        item.coloresPorCapa.forEach(cc => {
          mensaje += `   ${cc.capaNombre}: ${cc.colorNombre}\n`;
        });
      }
      mensaje += `   Cantidad: ${item.cantidad}\n`;
      mensaje += `   Precio: $${item.precio} c/u\n`;
      mensaje += `   Subtotal: $${item.precio * item.cantidad}\n`;
      if (index < this.items.length - 1) {
        mensaje += `\n`;
      }
    });
    
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `📝 *Total de productos:* ${this.getCantidadTotal()}\n`;
    mensaje += `💰 *TOTAL: $${this.getTotal()}*\n\n`;
    mensaje += `¡Espero su confirmación! 😊`;
    
    return mensaje;
  }
}
