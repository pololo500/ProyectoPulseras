import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';

interface Pedido {
    _id: string;
    cliente: string;
    items?: any[];
    productoNombre?: string;
    cantidad?: number;
    fecha: string;
    estado: string;
}

interface Cliente {
    _id: string;
    email: string;
    nombre: string;
    telefono: string;
    tipoUsuario: string;
    pedidosPendientes: number;
    pedidos: Pedido[];
}

@Component({
    selector: 'app-clientes',
    standalone: true,
    imports: [CommonModule, FormsModule, CapitalizePipe],
    templateUrl: './clientes.component.html',
    styleUrl: './clientes.component.css'
})
export class ClientesComponent implements OnInit {
    clientes: Cliente[] = [];
    clientesFiltrados: Cliente[] = [];
    pedidos: Pedido[] = [];
    
    // Filtros
    filtroNombre = '';
    filtroEmail = '';
    filtroPendientes: 'todos' | 'conPedidos' | 'sinPedidos' = 'todos';
    
    // Detalle de cliente
    mostrarDetalle = false;
    clienteSeleccionado: Cliente | null = null;
    
    // Pedido expandido
    pedidoExpandido: string | null = null;
    
    // Estado de carga
    cargando = true;

    constructor(
        private http: HttpClient,
        private globalService: GlobalService
    ) {}

    ngOnInit(): void {
        this.globalService.checkLoggedIn('/clientes');
        this.cargarDatos();
    }

    cargarDatos(): void {
        this.cargando = true;
        
        // Cargar usuarios y pedidos en paralelo
        Promise.all([
            this.http.get<any[]>('http://localhost:5000/api/usuarios').toPromise(),
            this.http.get<Pedido[]>('http://localhost:5000/api/pedidos').toPromise()
        ]).then(([usuarios, pedidos]) => {
            this.pedidos = pedidos || [];
            
            // Filtrar solo clientes (no administradores)
            const soloClientes = (usuarios || []).filter(u => u.tipoUsuario !== 'Administrador');
            
            // Mapear clientes con sus pedidos pendientes
            this.clientes = soloClientes.map(usuario => {
                const pedidosCliente = this.pedidos.filter(p => 
                    p.cliente.toLowerCase() === usuario.email.toLowerCase() ||
                    p.cliente.toLowerCase().includes(usuario.email.split('@')[0].toLowerCase())
                );
                
                return {
                    _id: usuario._id,
                    email: usuario.email,
                    nombre: usuario.nombre || 'Sin nombre',
                    telefono: usuario.telefono || '',
                    tipoUsuario: usuario.tipoUsuario,
                    pedidosPendientes: pedidosCliente.length,
                    pedidos: pedidosCliente
                };
            });
            
            this.aplicarFiltros();
            this.cargando = false;
        }).catch(err => {
            console.error('Error al cargar datos:', err);
            this.cargando = false;
        });
    }

    aplicarFiltros(): void {
        this.clientesFiltrados = this.clientes.filter(cliente => {
            // Filtro por nombre
            if (this.filtroNombre) {
                const nombreBuscado = this.filtroNombre.toLowerCase();
                if (!cliente.nombre.toLowerCase().includes(nombreBuscado)) {
                    return false;
                }
            }
            
            // Filtro por email
            if (this.filtroEmail) {
                const emailBuscado = this.filtroEmail.toLowerCase();
                if (!cliente.email.toLowerCase().includes(emailBuscado)) {
                    return false;
                }
            }
            
            // Filtro por pedidos pendientes
            if (this.filtroPendientes === 'conPedidos' && cliente.pedidosPendientes === 0) {
                return false;
            }
            if (this.filtroPendientes === 'sinPedidos' && cliente.pedidosPendientes > 0) {
                return false;
            }
            
            return true;
        });
    }

    limpiarFiltros(): void {
        this.filtroNombre = '';
        this.filtroEmail = '';
        this.filtroPendientes = 'todos';
        this.aplicarFiltros();
    }

    verDetalle(cliente: Cliente): void {
        this.clienteSeleccionado = cliente;
        this.pedidoExpandido = null;
        this.mostrarDetalle = true;
    }

    cerrarDetalle(): void {
        this.mostrarDetalle = false;
        this.clienteSeleccionado = null;
        this.pedidoExpandido = null;
    }

    togglePedido(pedidoId: string): void {
        if (this.pedidoExpandido === pedidoId) {
            this.pedidoExpandido = null;
        } else {
            this.pedidoExpandido = pedidoId;
        }
    }

    isPedidoExpandido(pedidoId: string): boolean {
        return this.pedidoExpandido === pedidoId;
    }

    getTotalPedido(pedido: Pedido): number {
        if (pedido.items && pedido.items.length > 0) {
            return pedido.items.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
        }
        return 0;
    }

    getCantidadItems(pedido: Pedido): number {
        if (pedido.items && pedido.items.length > 0) {
            return pedido.items.reduce((sum, item) => sum + (item.cantidad || 1), 0);
        }
        return pedido.cantidad || 1;
    }

    getResumenProductos(pedido: Pedido): string {
        if (pedido.items && pedido.items.length > 0) {
            if (pedido.items.length === 1) {
                return pedido.items[0].productoNombre;
            }
            return `${pedido.items.length} productos`;
        }
        return pedido.productoNombre || 'Producto';
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
            'A entregar': 'estado-entregar'
        };
        return clases[estado] || '';
    }

    getTotalClientes(): number {
        return this.clientes.length;
    }

    getClientesConPedidos(): number {
        return this.clientes.filter(c => c.pedidosPendientes > 0).length;
    }

    copiarEmail(email: string): void {
        navigator.clipboard.writeText(email);
        alert('Email copiado al portapapeles');
    }

    copiarTelefono(telefono: string): void {
        navigator.clipboard.writeText(telefono);
        alert('Teléfono copiado al portapapeles');
    }

    abrirWhatsApp(telefono: string): void {
        if (!telefono) {
            alert('Este cliente no tiene teléfono registrado');
            return;
        }
        // Limpiar teléfono de caracteres no numéricos
        const telefonoLimpio = telefono.replace(/\D/g, '');
        const url = `https://wa.me/54${telefonoLimpio}`;
        window.open(url, '_blank');
    }
}
