import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
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
  estado: string;
  moldeId?: string;
  moldeNombre?: string;
  coloresPorCapa?: ColorCapa[];
}

interface Pedido {
  _id?: string;
  cliente: string;
  // Campos legacy para pedidos con un solo producto
  productoId?: string;
  productoNombre?: string;
  productoTipo?: string;
  material?: string;
  moldeId?: string;
  moldeNombre?: string;
  coloresPorCapa?: ColorCapa[];
  cantidad?: number;
  precio?: number;
  // Nuevo: array de items para múltiples productos
  items?: ItemPedido[];
  // Campos comunes
  fecha: string;
  metodoPago: string;
  pagado: boolean;
  nota: string;
}

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  precio: number;
  moldeNombre?: string;
}

interface Molde {
  _id: string;
  nombre: string;
  capas: { nombre: string; volumen: number }[];
}

interface Color {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, FormatoPrecioPipe],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.css'
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  productos: Producto[] = [];
  productosTipo: string[] = [];
  productosDisponibles: Producto[] = [];
  moldes: Molde[] = [];
  colores: Color[] = [];
  
  estados = ['A confirmar', 'Por hacer', 'En produccion', 'Armar', 'A entregar'];
  metodosPago = ['Efectivo', 'Transferencia'];
  
  // Formulario
  mostrarFormulario = false;
  pedidoEditando: Pedido | null = null;
  nuevoPedido: Partial<Pedido> = this.getPedidoVacio();
  tipoSeleccionado = '';
  
  // Items del pedido (múltiples productos)
  itemsPedido: ItemPedido[] = [];
  itemActual: Partial<ItemPedido> = {};
  
  // Para resina
  esResina = false;
  moldeSeleccionado: Molde | null = null;
  coloresPorCapa: { [key: number]: string } = {};
  
  // Popup confirmar acción
  mostrarPopupConfirmar = false;
  accionPendiente: 'entregar' | 'cancelar' | null = null;
  pedidoAccion: Pedido | null = null;

  constructor(private http: HttpClient, private globalService: GlobalService) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/pedidos");
    this.cargarPedidos();
    this.cargarProductos();
    this.cargarMoldes();
    this.cargarColores();
  }

  getPedidoVacio(): Partial<Pedido> {
    return {
      cliente: '',
      items: [],
      fecha: new Date().toISOString().split('T')[0],
      metodoPago: 'Efectivo',
      pagado: false,
      nota: ''
    };
  }

  getItemVacio(): Partial<ItemPedido> {
    return {
      productoId: '',
      productoNombre: '',
      productoTipo: '',
      material: '',
      cantidad: 1,
      precio: 0,
      estado: 'A confirmar',
      moldeId: '',
      moldeNombre: '',
      coloresPorCapa: []
    };
  }

  cargarPedidos() {
    this.http.get<Pedido[]>('http://localhost:5000/api/pedidos')
      .subscribe({
        next: (data) => this.pedidos = data,
        error: (err) => console.error('Error al cargar pedidos:', err)
      });
  }

  cargarProductos() {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe({
        next: (data) => {
          this.productos = data;
          this.productosTipo = [...new Set(data.map(p => p.producto))];
        },
        error: (err) => console.error('Error al cargar productos:', err)
      });
  }

  cargarMoldes() {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = data,
        error: (err) => console.error('Error al cargar moldes:', err)
      });
  }

  cargarColores() {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => console.error('Error al cargar colores:', err)
      });
  }

  // Formulario
  abrirFormulario() {
    this.mostrarFormulario = true;
    this.nuevoPedido = this.getPedidoVacio();
    this.pedidoEditando = null;
    this.itemsPedido = [];
    this.itemActual = this.getItemVacio();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
    this.esResina = false;
    this.moldeSeleccionado = null;
    this.coloresPorCapa = {};
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.nuevoPedido = this.getPedidoVacio();
    this.pedidoEditando = null;
    this.itemsPedido = [];
    this.itemActual = this.getItemVacio();
    this.tipoSeleccionado = '';
    this.esResina = false;
    this.moldeSeleccionado = null;
    this.coloresPorCapa = {};
  }

  onTipoChange() {
    this.productosDisponibles = this.productos.filter(p => p.producto === this.tipoSeleccionado);
    this.itemActual.productoId = '';
    this.itemActual.productoNombre = '';
    this.itemActual.material = '';
    this.esResina = false;
    this.moldeSeleccionado = null;
    this.coloresPorCapa = {};
  }

  onProductoChange() {
    const producto = this.productos.find(p => p._id === this.itemActual.productoId);
    if (producto) {
      this.itemActual.productoNombre = producto.nombre;
      this.itemActual.productoTipo = producto.producto;
      this.itemActual.material = producto.material;
      this.itemActual.precio = producto.precio;
      
      // Verificar si es resina
      this.esResina = producto.material.toLowerCase() === 'resina';
      if (this.esResina) {
        // Buscar el molde vinculado al producto por nombre
        if (producto.moldeNombre) {
          const moldeVinculado = this.moldes.find(m => m.nombre === producto.moldeNombre);
          if (moldeVinculado) {
            this.itemActual.moldeId = moldeVinculado._id;
            this.itemActual.moldeNombre = moldeVinculado.nombre;
            this.moldeSeleccionado = moldeVinculado;
            this.coloresPorCapa = {};
          } else {
            this.moldeSeleccionado = null;
            this.itemActual.moldeId = '';
            this.itemActual.moldeNombre = '';
            this.coloresPorCapa = {};
          }
        } else {
          this.moldeSeleccionado = null;
          this.itemActual.moldeId = '';
          this.itemActual.moldeNombre = '';
          this.coloresPorCapa = {};
        }
      } else {
        this.moldeSeleccionado = null;
        this.itemActual.moldeId = '';
        this.itemActual.moldeNombre = '';
        this.coloresPorCapa = {};
      }
    }
  }

  onMoldeChange() {
    const molde = this.moldes.find(m => m._id === this.itemActual.moldeId);
    if (molde) {
      this.moldeSeleccionado = molde;
      this.itemActual.moldeNombre = molde.nombre;
      this.coloresPorCapa = {};
    } else {
      this.moldeSeleccionado = null;
      this.coloresPorCapa = {};
    }
  }

  onColorCapaChange(capaIndex: number, colorId: string) {
    this.coloresPorCapa[capaIndex] = colorId;
  }

  getColorById(colorId: string): Color | undefined {
    return this.colores.find(c => c._id === colorId);
  }

  // Agregar item al pedido
  agregarItem() {
    if (!this.itemActual.productoId) {
      alert('Selecciona un producto');
      return;
    }

    // Construir colores por capa si es resina
    if (this.esResina && this.moldeSeleccionado) {
      this.itemActual.coloresPorCapa = this.moldeSeleccionado.capas.map((capa, index) => {
        const colorId = this.coloresPorCapa[index] || '';
        const color = this.getColorById(colorId);
        return {
          capaIndex: index,
          capaNombre: capa.nombre,
          colorId: colorId,
          colorNombre: color?.nombre || '',
          colorRgb: color?.rgb || ''
        };
      });
    } else {
      this.itemActual.coloresPorCapa = [];
    }

    // Agregar el item a la lista
    this.itemsPedido.push({
      productoId: this.itemActual.productoId!,
      productoNombre: this.itemActual.productoNombre!,
      productoTipo: this.itemActual.productoTipo!,
      material: this.itemActual.material!,
      cantidad: this.itemActual.cantidad || 1,
      precio: this.itemActual.precio || 0,
      estado: this.itemActual.estado || 'A confirmar',
      moldeId: this.itemActual.moldeId,
      moldeNombre: this.itemActual.moldeNombre,
      coloresPorCapa: this.itemActual.coloresPorCapa
    });

    // Limpiar para agregar otro
    this.itemActual = this.getItemVacio();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
    this.esResina = false;
    this.moldeSeleccionado = null;
    this.coloresPorCapa = {};
  }

  // Eliminar item del pedido
  eliminarItem(index: number) {
    this.itemsPedido.splice(index, 1);
  }

  // Obtener total del pedido
  getTotalItems(): number {
    return this.itemsPedido.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  guardarPedido() {
    if (!this.nuevoPedido.cliente) {
      alert('El nombre del cliente es requerido');
      return;
    }

    if (this.itemsPedido.length === 0) {
      alert('Agrega al menos un producto al pedido');
      return;
    }

    // Preparar pedido con items
    const pedidoData = {
      cliente: this.nuevoPedido.cliente,
      items: this.itemsPedido,
      fecha: this.nuevoPedido.fecha,
      metodoPago: this.nuevoPedido.metodoPago,
      pagado: this.nuevoPedido.pagado,
      nota: this.nuevoPedido.nota
    };

    if (this.pedidoEditando) {
      this.http.put(`http://localhost:5000/api/pedidos/${this.pedidoEditando._id}`, pedidoData)
        .subscribe({
          next: () => {
            this.cargarPedidos();
            this.cerrarFormulario();
          },
          error: (err) => console.error('Error al actualizar pedido:', err)
        });
    } else {
      this.http.post('http://localhost:5000/api/pedidos', pedidoData)
        .subscribe({
          next: () => {
            this.cargarPedidos();
            this.cerrarFormulario();
          },
          error: (err) => console.error('Error al guardar pedido:', err)
        });
    }
  }

  editarPedido(pedido: Pedido) {
    this.pedidoEditando = pedido;
    this.nuevoPedido = { 
      cliente: pedido.cliente,
      fecha: pedido.fecha,
      metodoPago: pedido.metodoPago,
      pagado: pedido.pagado,
      nota: pedido.nota
    };
    
    // Cargar items del pedido
    if (pedido.items && pedido.items.length > 0) {
      this.itemsPedido = [...pedido.items];
    } else if (pedido.productoId) {
      // Pedido legacy con un solo producto
      this.itemsPedido = [{
        productoId: pedido.productoId,
        productoNombre: pedido.productoNombre || '',
        productoTipo: pedido.productoTipo || '',
        material: pedido.material || '',
        cantidad: pedido.cantidad || 1,
        precio: pedido.precio || 0,
        estado: (pedido as any).estado || 'A confirmar',
        moldeId: pedido.moldeId,
        moldeNombre: pedido.moldeNombre,
        coloresPorCapa: pedido.coloresPorCapa
      }];
    } else {
      this.itemsPedido = [];
    }
    
    this.itemActual = this.getItemVacio();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
    this.esResina = false;
    this.moldeSeleccionado = null;
    this.coloresPorCapa = {};
    
    this.mostrarFormulario = true;
  }

  // Acciones de pedido
  confirmarAccion(pedido: Pedido, accion: 'entregar' | 'cancelar') {
    this.pedidoAccion = pedido;
    this.accionPendiente = accion;
    this.mostrarPopupConfirmar = true;
  }

  cancelarAccion() {
    this.pedidoAccion = null;
    this.accionPendiente = null;
    this.mostrarPopupConfirmar = false;
  }

  ejecutarAccion() {
    if (!this.pedidoAccion || !this.accionPendiente) return;

    const estadoVenta = this.accionPendiente === 'entregar' ? 'Entregado' : 'Cancelado';
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    // Crear una única venta con todos los items del pedido
    const venta: any = {
      cliente: this.pedidoAccion.cliente,
      metodoPago: this.pedidoAccion.metodoPago,
      fechaPedido: this.pedidoAccion.fecha,
      fechaVenta: fechaHoy,
      estado: estadoVenta,
      nota: this.pedidoAccion.nota
    };
    
    // Si tiene items, copiarlos a la venta
    if (this.tieneItems(this.pedidoAccion)) {
      venta.items = this.pedidoAccion.items;
    } else {
      // Pedido legacy - guardar como campos individuales
      venta.productoNombre = this.pedidoAccion.productoNombre;
      venta.productoTipo = this.pedidoAccion.productoTipo;
      venta.material = this.pedidoAccion.material;
      venta.cantidad = this.pedidoAccion.cantidad;
      venta.precio = this.pedidoAccion.precio;
      venta.coloresPorCapa = this.pedidoAccion.coloresPorCapa;
    }

    this.http.post('http://localhost:5000/api/ventas', venta)
      .subscribe({
        next: () => {
          this.http.delete(`http://localhost:5000/api/pedidos/${this.pedidoAccion!._id}`)
            .subscribe({
              next: () => {
                this.cargarPedidos();
                this.cancelarAccion();
              },
              error: (err) => console.error('Error al eliminar pedido:', err)
            });
        },
        error: (err) => console.error('Error al crear venta:', err)
      });
  }

  // Helpers para manejar pedidos legacy y con items
  tieneItems(pedido: Pedido): boolean {
    return !!(pedido.items && pedido.items.length > 0);
  }

  getItemsPedido(pedido: Pedido): ItemPedido[] {
    if (pedido.items && pedido.items.length > 0) {
      return pedido.items;
    }
    // Pedido legacy
    if (pedido.productoId) {
      return [{
        productoId: pedido.productoId,
        productoNombre: pedido.productoNombre || '',
        productoTipo: pedido.productoTipo || '',
        material: pedido.material || '',
        cantidad: pedido.cantidad || 1,
        precio: pedido.precio || 0,
        estado: (pedido as any).estado || 'A confirmar',
        moldeId: pedido.moldeId,
        moldeNombre: pedido.moldeNombre,
        coloresPorCapa: pedido.coloresPorCapa
      }];
    }
    return [];
  }

  getCantidadTotal(pedido: Pedido): number {
    const items = this.getItemsPedido(pedido);
    return items.reduce((sum, item) => sum + item.cantidad, 0);
  }

  getPrecioTotal(pedido: Pedido): number {
    const items = this.getItemsPedido(pedido);
    return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  getResumenProductos(pedido: Pedido): string {
    const items = this.getItemsPedido(pedido);
    if (items.length === 1) {
      return items[0].productoNombre;
    }
    return `${items.length} productos`;
  }

  // Agregar a calculadora
  agregarACalculadora(pedido: Pedido, item?: ItemPedido) {
    const itemToAdd = item || this.getItemsPedido(pedido)[0];
    
    if (!itemToAdd || (!itemToAdd.moldeId && !itemToAdd.moldeNombre) || !itemToAdd.coloresPorCapa?.length) {
      alert('Este producto no tiene configuración de resina');
      return;
    }

    // Obtener memoria actual
    this.http.get<any>('http://localhost:5000/api/calculadora-memoria')
      .subscribe({
        next: (memoria) => {
          const productos = memoria.productos || [];
          let contadorId = memoria.contadorId || 1;
          
          // Buscar molde por ID o por nombre
          let molde = itemToAdd.moldeId 
            ? this.moldes.find(m => m._id === itemToAdd.moldeId)
            : this.moldes.find(m => m.nombre === itemToAdd.moldeNombre);
          
          if (!molde) {
            alert('Molde no encontrado');
            return;
          }

          // Crear producto para calculadora
          const nuevoProducto = {
            id: contadorId,
            moldeId: molde._id,  // Usar siempre el ID del molde encontrado
            moldeNombre: molde.nombre,  // Usar siempre el nombre del molde encontrado
            cantidad: itemToAdd.cantidad,
            capas: molde.capas.map((capa, index) => {
              const colorCapa = itemToAdd.coloresPorCapa?.find(cc => cc.capaIndex === index);
              return {
                capaIndex: index,
                capaNombre: capa.nombre,
                volumenTotal: capa.volumen,
                colores: colorCapa && colorCapa.colorId ? [{
                  colorId: colorCapa.colorId,
                  colorNombre: colorCapa.colorNombre,
                  colorRgb: colorCapa.colorRgb,
                  fase: 1,
                  volumen: capa.volumen,
                  nota: ''
                }] : []
              };
            })
          };

          productos.push(nuevoProducto);
          contadorId++;

          // Guardar memoria actualizada
          this.http.post('http://localhost:5000/api/calculadora-memoria', { productos, contadorId })
            .subscribe({
              next: () => alert(`${itemToAdd.productoNombre} agregado a la calculadora de resina`),
              error: (err) => console.error('Error al agregar a calculadora:', err)
            });
        },
        error: (err) => console.error('Error al obtener memoria:', err)
      });
  }

  // Verificar si un item es de resina
  esItemResina(item: ItemPedido): boolean {
    const tieneResina = item.material?.toLowerCase() === 'resina';
    const tieneMolde = !!item.moldeId || !!item.moldeNombre;
    const tieneColores = (item.coloresPorCapa?.length || 0) > 0;
    return tieneResina && tieneMolde && tieneColores;
  }

  // Cambiar estado de un item específico
  cambiarEstadoItem(pedido: Pedido, itemIndex: number, nuevoEstado: string) {
    const items = [...this.getItemsPedido(pedido)];
    items[itemIndex] = { ...items[itemIndex], estado: nuevoEstado };
    
    this.http.put(`http://localhost:5000/api/pedidos/${pedido._id}`, { ...pedido, items })
      .subscribe({
        next: () => this.cargarPedidos(),
        error: (err) => console.error('Error al cambiar estado:', err)
      });
  }

  // Verificar si todos los items están en "A entregar"
  todosListosParaEntregar(pedido: Pedido): boolean {
    const items = this.getItemsPedido(pedido);
    return items.every(item => item.estado === 'A entregar');
  }

  // Obtener el estado general del pedido (el más atrasado)
  getEstadoGeneral(pedido: Pedido): string {
    const items = this.getItemsPedido(pedido);
    if (items.length === 0) return 'A confirmar';
    
    const ordenEstados = ['A confirmar', 'Por hacer', 'En produccion', 'Armar', 'A entregar'];
    let estadoMasAtrasado = 4; // "A entregar" index
    
    items.forEach(item => {
      const index = ordenEstados.indexOf(item.estado);
      if (index !== -1 && index < estadoMasAtrasado) {
        estadoMasAtrasado = index;
      }
    });
    
    return ordenEstados[estadoMasAtrasado];
  }

  // Cambiar pagado inline
  cambiarPagado(pedido: Pedido) {
    this.http.put(`http://localhost:5000/api/pedidos/${pedido._id}`, { ...pedido, pagado: !pedido.pagado })
      .subscribe({
        next: () => this.cargarPedidos(),
        error: (err) => console.error('Error al cambiar pagado:', err)
      });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR');
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
}
