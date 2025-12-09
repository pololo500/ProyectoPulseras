import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';

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
    // Campos legacy para pedidos individuales
    productoId?: string;
    productoNombre?: string;
    productoTipo?: string;
    material?: string;
    moldeId?: string;
    moldeNombre?: string;
    coloresPorCapa?: ColorCapa[];
    cantidad?: number;
    precio?: number;
    // Nuevo campo para pedidos con múltiples items
    items?: ItemPedido[];
    // Campos comunes
    fecha: string;
    estado: string;
    metodoPago: string;
    pagado: boolean;
    nota: string;
}

interface Venta {
    _id?: string;
    cliente: string;
    productoNombre: string;
    productoTipo: string;
    material: string;
    cantidad: number;
    precio: number;
    metodoPago: string;
    fechaPedido: string;
    fechaVenta: string;
    estado: string;  // 'Entregado' o 'Cancelado'
    nota: string;
}

@Component({
    selector: 'app-mis-pedidos',
    standalone: true,
    imports: [CommonModule, RouterModule, CapitalizePipe],
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
    
    emailCliente: string = '';

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
                error: (err) => console.error('Error al cargar pedidos:', err)
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
                error: (err) => console.error('Error al cargar historial:', err)
            });
    }

    cambiarVista(vista: 'proceso' | 'historial'): void {
        this.vistaActual = vista;
        this.cerrarDetalle();
    }

    verDetallePedido(pedido: Pedido): void {
        this.pedidoSeleccionado = pedido;
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
        // Si tiene items, calcular el estado basado en los estados de cada item
        if (pedido.items && pedido.items.length > 0) {
            const estados = pedido.items.map(item => item.estado || 'A confirmar');
            
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
        
        // Pedido legacy sin items
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
        return !!(pedido.items && pedido.items.length > 0);
    }

    getCantidadItems(pedido: Pedido): number {
        if (this.tieneItems(pedido)) {
            return pedido.items!.reduce((sum, item) => sum + item.cantidad, 0);
        }
        return pedido.cantidad || 0;
    }

    getTotalPedido(pedido: Pedido): number {
        if (this.tieneItems(pedido)) {
            return pedido.items!.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        }
        return (pedido.precio || 0) * (pedido.cantidad || 0);
    }

    getResumenProductos(pedido: Pedido): string {
        if (this.tieneItems(pedido)) {
            if (pedido.items!.length === 1) {
                return pedido.items![0].productoNombre;
            }
            return `${pedido.items![0].productoNombre} y ${pedido.items!.length - 1} más`;
        }
        return pedido.productoNombre || '';
    }

    getCantidadProductos(pedido: Pedido): number {
        if (this.tieneItems(pedido)) {
            return pedido.items!.length;
        }
        return 1;
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
        const fechaHoy = new Date().toISOString().split('T')[0];
        
        // Crear venta con estado Cancelado
        const venta = {
            cliente: pedido.cliente,
            productoNombre: this.getResumenProductos(pedido),
            productoTipo: this.tieneItems(pedido) ? 'Varios' : (pedido.productoTipo || ''),
            material: this.tieneItems(pedido) ? '' : (pedido.material || ''),
            cantidad: this.getCantidadItems(pedido),
            precio: this.getTotalPedido(pedido),
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
                                console.error('Error al eliminar pedido:', err);
                                this.cancelando = false;
                                alert('Error al cancelar el pedido');
                            }
                        });
                },
                error: (err) => {
                    console.error('Error al crear venta:', err);
                    this.cancelando = false;
                    alert('Error al cancelar el pedido');
                }
            });
    }
}
