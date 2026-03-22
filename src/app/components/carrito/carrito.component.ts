import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { CarritoService, ItemCarrito } from '../../services/carrito.service';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CapitalizePipe, FormatoPrecioPipe, PopupAlertaComponent],
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
  notaPedido = '';
  
  // Popup teléfono
  mostrarPopupTelefono = false;
  telefonoInput = '';
  guardandoTelefono = false;

  // Popup eliminar
  mostrarPopupEliminar = false;
  itemAEliminar: ItemCarrito | null = null;

  // Popup vaciar carrito
  mostrarPopupVaciar = false;

  // Popup alerta
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' | 'info' = 'info';

  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
  }

  cerrarAlerta() {
    this.mensajeAlerta = '';
  }

  // Popup Login/Registro
  mostrarPopupLogin = false;
  modoLogin: 'login' | 'registro' = 'login';
  popupLoginError = '';
  
  // Formularios
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]),
    password: new FormControl('', Validators.required),
  });
  
  registroForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]),
    nombre: new FormControl('', Validators.required),
    telefono: new FormControl('', [Validators.pattern('^[ \\-\\+\\(\\)]*(?:\\d[ \\-\\+\\(\\)]*){10}$')]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarPassword: new FormControl('', Validators.required),
  });

  constructor(
    private router: Router, 
    private carritoService: CarritoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.subscription = this.carritoService.carrito$.subscribe(items => {
      this.items = items;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  incrementar(item: ItemCarrito): void {
    this.carritoService.incrementar(item);
  }

  decrementar(item: ItemCarrito): void {
    this.carritoService.decrementar(item);
  }

  eliminarItem(item: ItemCarrito): void {
    this.carritoService.eliminarItem(item);
  }

  abrirPopupEliminar(item: ItemCarrito): void {
    this.itemAEliminar = item;
    this.mostrarPopupEliminar = true;
  }

  cerrarPopupEliminar(): void {
    this.mostrarPopupEliminar = false;
    this.itemAEliminar = null;
  }

  confirmarEliminar(): void {
    if (this.itemAEliminar) {
      this.eliminarItem(this.itemAEliminar);
      this.cerrarPopupEliminar();
    }
  }

  abrirPopupVaciar(): void {
    this.mostrarPopupVaciar = true;
  }

  cerrarPopupVaciar(): void {
    this.mostrarPopupVaciar = false;
  }

  confirmarVaciar(): void {
    this.carritoService.vaciarCarrito();
    this.cerrarPopupVaciar();
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
      this.mostrarPopupLogin = true;
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
      this.mostrarAlerta('Por favor ingresa un número de teléfono válido', 'error');
      return;
    }
    const regex = /^[ \\-\\+\\(\\)]*(?:\\d[ \\-\\+\\(\\)]*){10}$/;
    if (!regex.test(this.telefonoInput.trim())) {
      this.mostrarAlerta('El teléfono debe tener exactamente 10 números', 'error');
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
          
          this.guardandoTelefono = false;
          this.mostrarAlerta('Error al guardar el teléfono. Intenta nuevamente.', 'error');
        }
      });
  }

  cancelarCompra(): void {
    this.mostrarPopupConfirmacion = false;
    this.notaPedido = '';
  }

  confirmarCompra(): void {
    this.procesando = true;
    
    // Obtener stock actualizado
    this.http.get<any[]>('http://localhost:5000/api/stock').subscribe({
      next: (stockItems) => {
        const email = sessionStorage.getItem('email') || '';
        const nombreUsuario = sessionStorage.getItem('nombreUsuario') || 'Cliente';
        const now = new Date();
        const fechaHoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        let notasStock: string[] = [];

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

          // Si es producto de stock disponible
          if (item.esStock) {
            itemPedido.esStock = true;
            itemPedido.stockVarianteId = item.stockVarianteId;
            
            // Calcular cantidad disponible en stock
            let stockDisp = 0;
            for (const s of stockItems) {
              const v = s.variantes?.find((x: any) => x._id === item.stockVarianteId);
              if (v) {
                stockDisp = v.cantidad;
                break;
              }
            }
            
            const cantTomadaDeStock = Math.min(item.cantidad, stockDisp);
            if (cantTomadaDeStock > 0) {
              notasStock.push(`- ${item.nombre}: ${cantTomadaDeStock} en stock`);
            }
          }
          
          return itemPedido;
        });

        let notaFinal = this.notaPedido.trim();
        if (notasStock.length > 0) {
          let notaStockStr = "\nProductos apartados del stock disponible:\n" + notasStock.join('\n');
          notaFinal = notaFinal ? notaFinal + "\n" + notaStockStr : notaStockStr.trim();
        }
        
        const pedido = {
          cliente: email,
          items: items,
          fecha: fechaHoy,
          estado: 'A confirmar',
          metodoPago: 'A definir',
          pagado: false,
          nota: notaFinal
        };
        
        // Crear el pedido único
        this.http.post('http://localhost:5000/api/pedidos', pedido)
          .subscribe({
            next: () => {
              // Generar mensaje de WhatsApp
              const mensaje = this.generarMensajeWhatsApp(nombreUsuario);
              const urlWhatsApp = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
              
              // Vaciar carrito
              this.carritoService.vaciarCarrito();
              
              // Cerrar popup
              this.mostrarPopupConfirmacion = false;
              this.procesando = false;
              this.notaPedido = '';
              
              // Abrir WhatsApp
              window.open(urlWhatsApp, '_blank');
              
              // Redirigir a mis pedidos
              this.router.navigateByUrl('/mis-pedidos');
            },
            error: (error) => {
              
              this.procesando = false;
              if (error.status === 0) {
                this.mostrarAlerta('No se pudo conectar con el servidor. Verifica que esté en ejecución.', 'error');
              } else {
                this.mostrarAlerta(`Error al procesar el pedido: ${error.message || 'Intenta nuevamente.'}`, 'error');
              }
            }
          });
      },
      error: (errorStock) => {
        
        this.procesando = false;
        this.mostrarAlerta('No se pudo verificar el stock disponible. Intenta nuevamente.', 'error');
      }
    });
  }

  private generarMensajeWhatsApp(nombreUsuario: string): string {
    let mensaje = `¡Hola! Soy ${nombreUsuario}\n\n`;
    mensaje += `Me gustaría realizar el siguiente pedido:\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    this.items.forEach((item, index) => {
      mensaje += `*${item.nombre}*\n`;
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
    mensaje += `*Total de productos:* ${this.getCantidadTotal()}\n`;
    mensaje += `*TOTAL: $${this.getTotal()}*\n\n`;
    mensaje += `¡Espero su confirmación!`;
    
    return mensaje;
  }

  // ========== POPUP LOGIN/REGISTRO ==========
  
  cerrarPopupLogin(): void {
    this.mostrarPopupLogin = false;
    this.popupLoginError = '';
    this.loginForm.reset();
    this.registroForm.reset();
  }

  cambiarModoLogin(modo: 'login' | 'registro'): void {
    this.modoLogin = modo;
    this.popupLoginError = '';
    this.loginForm.reset();
    this.registroForm.reset();
  }

  get passwordsCoinciden(): boolean {
    return this.registroForm.get('password')?.value === this.registroForm.get('confirmarPassword')?.value;
  }

  onSubmitLogin(): void {
    const formData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/login`, formData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Guardar sesión
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", res.tipoUsuario);
            sessionStorage.setItem("nombreUsuario", res.nombre);
            
            // Sincronizar carrito (combina local + DB) y recargar página
            this.carritoService.sincronizarAlLogin().subscribe({
              next: () => {
                // Recargar la página para que se carguen todos los datos correctamente
                window.location.reload();
              },
              error: () => {
                window.location.reload();
              }
            });
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          if (errorMessage === "contraseñaIncorrecta") {
            this.popupLoginError = 'Contraseña incorrecta';
          } else {
            this.popupLoginError = 'El email no está registrado';
          }
        }
      });
  }

  onSubmitRegistro(): void {
    if (!this.passwordsCoinciden) {
      this.popupLoginError = 'Las contraseñas no coinciden';
      return;
    }
    
    // Capitalizar cada palabra del nombre
    const nombreCapitalizado = (this.registroForm.value.nombre || '')
      .toLowerCase()
      .split(' ')
      .map((palabra: string) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
    
    const formData = {
      email: this.registroForm.value.email,
      nombre: nombreCapitalizado,
      telefono: this.registroForm.value.telefono || '',
      password: this.registroForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/usuarios/registro`, formData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Auto-login: guardar sesión
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", "Cliente");
            sessionStorage.setItem("nombreUsuario", formData.nombre as string);
            
            // Sincronizar carrito (combina local + DB) y recargar página
            this.carritoService.sincronizarAlLogin().subscribe({
              next: () => {
                // Recargar la página para que se carguen todos los datos correctamente
                window.location.reload();
              },
              error: () => {
                window.location.reload();
              }
            });
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          if (errorMessage === "usuarioExistente") {
            this.popupLoginError = 'El email ya está registrado';
          } else if (errorMessage === "emailInvalido") {
            this.popupLoginError = 'Email inválido';
          } else {
            this.popupLoginError = 'Error al registrar. Intente nuevamente';
          }
        }
      });
  }
}
