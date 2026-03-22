import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { GlobalService } from '../../services/global.service';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';

interface ColorCapa {
    capaIndex: number;
    capaNombre: string;
    colorId: string;
    colorNombre: string;
    colorRgb: string;
}

interface ItemPedido {
    productoId: string;
    productoNombre: string;
    productoTipo: string;
    material: string;
    cantidad: number;
    precio: number;
    estado?: string;
    moldeId?: string;
    moldeNombre?: string;
    coloresPorCapa?: ColorCapa[];
}

interface Pedido {
    _id?: string;
    cliente: string;
    items: ItemPedido[];
    fecha: string;
    estado: string;
    metodoPago: string;
    pagado: boolean;
    nota: string;
}

interface Venta {
    _id?: string;
    cliente: string;
    items: ItemPedido[];
    metodoPago: string;
    fechaPedido: string;
    fechaVenta: string;
    estado: string;  // 'Entregado' o 'Cancelado'
    nota: string;
}

@Component({
    selector: 'app-mis-pedidos',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CapitalizePipe, FormatoPrecioPipe, PopupAlertaComponent, PopupConfirmComponent],
    templateUrl: './misPedidos.component.html',
    styleUrl: './misPedidos.component.css'
})
export class MisPedidosComponent implements OnInit {
    pedidosEnProceso: Pedido[] = [];
    historial: Venta[] = [];
    
    // Vista
    vistaActual: 'proceso' | 'historial' = 'proceso';
    
    // Detalle de pedido
    mostrarDetalle = false;
    pedidoSeleccionado: Pedido | null = null;
    ventaSeleccionada: Venta | null = null;
    
    // Cancelar pedido
    mostrarPopupCancelar = false;
    pedidoACancelar: Pedido | null = null;
    cancelando = false;
    
    // Nota editable
    notaEditada: string = '';
    guardandoNota = false;
    
    emailCliente: string = '';

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

    constructor(
        private http: HttpClient,
        private globalService: GlobalService
    ) {}

    ngOnInit(): void {
        if (!this.globalService.isLoggedIn()) {
            return;
        }
        
        this.emailCliente = sessionStorage.getItem('email') || '';
        this.cargarPedidos();
        this.cargarHistorial();
    }

    cargarPedidos(): void {
        this.http.get<Pedido[]>('http://localhost:5000/api/pedidos')
            .subscribe({
                next: (data) => {
                    // Filtrar solo los pedidos del cliente actual
                    this.pedidosEnProceso = data.filter(p => 
                        p.cliente.toLowerCase() === this.emailCliente.toLowerCase() ||
                        p.cliente.toLowerCase().includes(this.emailCliente.split('@')[0].toLowerCase())
                    );
                },
                error: (err) => {}
            });
    }

    cargarHistorial(): void {
        this.http.get<Venta[]>('http://localhost:5000/api/ventas')
            .subscribe({
                next: (data) => {
                    // Filtrar solo las ventas del cliente actual
                    this.historial = data.filter(v => 
                        v.cliente.toLowerCase() === this.emailCliente.toLowerCase() ||
                        v.cliente.toLowerCase().includes(this.emailCliente.split('@')[0].toLowerCase())
                    );
                },
                error: (err) => {}
            });
    }

    cambiarVista(vista: 'proceso' | 'historial'): void {
        this.vistaActual = vista;
        this.cerrarDetalle();
    }

    verDetallePedido(pedido: Pedido): void {
        this.pedidoSeleccionado = pedido;
        this.notaEditada = pedido.nota || '';
        this.ventaSeleccionada = null;
        this.mostrarDetalle = true;
    }

    verDetalleVenta(venta: Venta): void {
        this.ventaSeleccionada = venta;
        this.pedidoSeleccionado = null;
        this.mostrarDetalle = true;
    }

    cerrarDetalle(): void {
        this.mostrarDetalle = false;
        this.pedidoSeleccionado = null;
        this.ventaSeleccionada = null;
    }

    formatearFecha(fecha: string): string {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    getEstadoClass(estado: string): string {
        const clases: { [key: string]: string } = {
            'A confirmar': 'estado-confirmar',
            'Por hacer': 'estado-hacer',
            'En produccion': 'estado-produccion',
            'Armar': 'estado-armar',
            'A entregar': 'estado-entregar',
            'Entregado': 'estado-entregado',
            'Cancelado': 'estado-cancelado'
        };
        return clases[estado] || '';
    }

    getEstadoTexto(estado: string): string {
        const textos: { [key: string]: string } = {
            'A confirmar': '⏳ Por confirmar',
            'Por hacer': '📝 Por hacer',
            'En produccion': '🔨 En producción',
            'Armar': '📦 Armando',
            'A entregar': '🚚 Listo para entregar',
            'Entregado': '✅ Entregado',
            'Cancelado': '❌ Cancelado'
        };
        return textos[estado] || estado;
    }

    // Obtener estado visible para el cliente basado en los estados de los items
    getEstadoCliente(pedido: Pedido): string {
        const items = pedido.items || [];
        if (items.length === 0) return pedido.estado || 'A confirmar';

        const estados = items.map(item => item.estado || 'A confirmar');

        // Si todos están "A entregar", mostrar "A entregar"
        if (estados.every(e => e === 'A entregar')) {
            return 'A entregar';
        }

        // Si todos están "A confirmar", mostrar "A confirmar"
        if (estados.every(e => e === 'A confirmar')) {
            return 'A confirmar';
        }

        // Si alguno está en "Por hacer", "En produccion" o "Armar", mostrar "En produccion"
        const estadosProduccion = ['Por hacer', 'En produccion', 'Armar'];
        if (estados.some(e => estadosProduccion.includes(e))) {
            return 'En produccion';
        }

        // Default
        return pedido.estado || 'A confirmar';
    }

    // Obtener texto del estado para el cliente
    getEstadoTextoCliente(pedido: Pedido): string {
        const estado = this.getEstadoCliente(pedido);
        return this.getEstadoTexto(estado);
    }

    // Obtener clase CSS del estado para el cliente
    getEstadoClassCliente(pedido: Pedido): string {
        const estado = this.getEstadoCliente(pedido);
        return this.getEstadoClass(estado);
    }

    getTotalPedidosEnProceso(): number {
        return this.pedidosEnProceso.length;
    }

    getTotalHistorial(): number {
        return this.historial.length;
    }

    // Métodos helper para pedidos con múltiples items
    tieneItems(pedido: Pedido): boolean {
        return (pedido.items?.length || 0) > 0;
    }

    getCantidadItems(pedido: Pedido): number {
        return (pedido.items || []).reduce((sum, item) => sum + item.cantidad, 0);
    }

    getTotalPedido(pedido: Pedido): number {
        return (pedido.items || []).reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    }

    getResumenProductos(pedido: Pedido): string {
        const items = pedido.items || [];
        if (items.length === 0) return '';
        if (items.length === 1) return items[0].productoNombre;
        return `${items[0].productoNombre} y ${items.length - 1} más`;
    }

    getCantidadProductos(pedido: Pedido): number {
        return (pedido.items || []).length;
    }

    // Métodos helper para ventas (historial)
    tieneItemsVenta(venta: Venta): boolean {
        return (venta.items?.length || 0) > 0;
    }

    getCantidadItemsVenta(venta: Venta): number {
        return (venta.items || []).reduce((sum, item) => sum + item.cantidad, 0);
    }

    getTotalVenta(venta: Venta): number {
        return (venta.items || []).reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    }

    getResumenProductosVenta(venta: Venta): string {
        const items = venta.items || [];
        if (items.length === 0) return '';
        if (items.length === 1) return items[0].productoNombre;
        return `${items[0].productoNombre} y ${items.length - 1} más`;
    }

    getCantidadProductosVenta(venta: Venta): number {
        return (venta.items || []).length;
    }

    // Cancelar pedido
    abrirPopupCancelar(pedido: Pedido, event: Event): void {
        event.stopPropagation();
        this.pedidoACancelar = pedido;
        this.mostrarPopupCancelar = true;
    }

    cerrarPopupCancelar(): void {
        this.mostrarPopupCancelar = false;
        this.pedidoACancelar = null;
    }

    confirmarCancelacion(): void {
        if (!this.pedidoACancelar || !this.pedidoACancelar._id) return;
        
        this.cancelando = true;
        const pedido = this.pedidoACancelar;
        const now = new Date();
        const fechaHoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Crear venta con estado Cancelado
        const venta: any = {
            cliente: pedido.cliente,
            items: pedido.items,
            metodoPago: pedido.metodoPago,
            fechaPedido: pedido.fecha,
            fechaVenta: fechaHoy,
            estado: 'Cancelado',
            nota: pedido.nota ? `${pedido.nota} - Cancelado por el cliente` : 'Cancelado por el cliente'
        };
        
        // Primero crear la venta, luego eliminar el pedido
        this.http.post('http://localhost:5000/api/ventas', venta)
            .subscribe({
                next: () => {
                    // Eliminar el pedido
                    this.http.delete(`http://localhost:5000/api/pedidos/${pedido._id}`)
                        .subscribe({
                            next: () => {
                                this.cancelando = false;
                                this.cerrarPopupCancelar();
                                this.cerrarDetalle();
                                // Recargar datos
                                this.cargarPedidos();
                                this.cargarHistorial();
                                // Cambiar a vista historial
                                this.vistaActual = 'historial';
                            },
                            error: (err) => {
                                
                                this.cancelando = false;
                                this.mostrarAlerta('Error al cancelar el pedido', 'error');
                            }
                        });
                },
                error: (err) => {
                    
                    this.cancelando = false;
                    this.mostrarAlerta('Error al cancelar el pedido', 'error');
                }
            });
    }

    guardarNota(): void {
        if (!this.pedidoSeleccionado || !this.pedidoSeleccionado._id) return;
        
        this.guardandoNota = true;
        
        this.http.put(`http://localhost:5000/api/pedidos/${this.pedidoSeleccionado._id}`, {
            ...this.pedidoSeleccionado,
            nota: this.notaEditada
        }).subscribe({
            next: () => {
                this.guardandoNota = false;
                this.pedidoSeleccionado!.nota = this.notaEditada;
                // Actualizar también en la lista
                const index = this.pedidosEnProceso.findIndex(p => p._id === this.pedidoSeleccionado!._id);
                if (index !== -1) {
                    this.pedidosEnProceso[index].nota = this.notaEditada;
                }
            },
            error: (err) => {
                
                this.guardandoNota = false;
                this.mostrarAlerta('Error al guardar la nota', 'error');
            }
        });
    }
}
