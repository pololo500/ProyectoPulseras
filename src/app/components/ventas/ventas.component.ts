import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { GlobalService } from '../../services/global.service';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';

interface ColorCapa {
  capaIndex: number;
  capaNombre: string;
  colorId: string;
  colorNombre: string;
  colorRgb: string;
}

interface ItemVenta {
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

interface Venta {
  _id?: string;
  cliente: string;
  items: ItemVenta[];
  metodoPago: string;
  fechaPedido: string;
  fechaVenta: string;
  estado: 'Entregado' | 'Cancelado';
  nota: string;
}

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  precio: number;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, FormatoPrecioPipe, PopupAlertaComponent],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent implements OnInit {
  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];
  
  // Productos
  productos: Producto[] = [];
  productosTipo: string[] = [];
  productosDisponibles: Producto[] = [];
  tipoSeleccionado = '';
  
  // Filtros
  filtroEstado = '';
  filtroCliente = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  
  // Totales
  totalVentas = 0;
  totalCancelados = 0;
  ingresoTotal = 0;

  // Formulario agregar venta
  mostrarFormulario = false;
  nuevaVentaCliente = '';
  nuevaVentaItem: Partial<ItemVenta> = this.getItemVacio();
  itemsVenta: ItemVenta[] = [];
  nuevaVentaMetodoPago = 'Efectivo';
  nuevaVentaEstado: 'Entregado' | 'Cancelado' = 'Entregado';
  nuevaVentaFechaPedido = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  nuevaVentaFechaVenta = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  nuevaVentaNota = '';
  metodosPago = ['Efectivo', 'Transferencia'];
  estadosVenta = ['Entregado', 'Cancelado'];

  // Importar JSON
  mostrarImportarJson = false;
  archivoSeleccionado: File | null = null;

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

  constructor(private http: HttpClient, private globalService: GlobalService) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/ventas");
    this.cargarVentas();
    this.cargarProductos();
  }

  getItemVacio(): Partial<ItemVenta> {
    return {
      productoId: '',
      productoNombre: '',
      productoTipo: '',
      material: '',
      cantidad: 1,
      precio: 0,
      estado: 'Entregado'
    };
  }

  cargarVentas() {
    this.http.get<Venta[]>('http://localhost:5000/api/ventas')
      .subscribe({
        next: (data) => {
          this.ventas = data;
          this.aplicarFiltros();
          this.calcularTotales();
        },
        error: (err) => console.error('Error al cargar ventas:', err)
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

  onTipoChange() {
    this.productosDisponibles = this.productos.filter(p => p.producto === this.tipoSeleccionado);
    this.nuevaVentaItem.productoTipo = this.tipoSeleccionado;
    this.nuevaVentaItem.productoNombre = '';
    this.nuevaVentaItem.productoId = '';
    this.nuevaVentaItem.material = '';
    this.nuevaVentaItem.precio = 0;
  }

  onProductoChange(productoId: string) {
    const producto = this.productos.find(p => p._id === productoId);
    if (producto) {
      this.nuevaVentaItem.productoId = producto._id;
      this.nuevaVentaItem.productoNombre = producto.nombre;
      this.nuevaVentaItem.productoTipo = producto.producto;
      this.nuevaVentaItem.material = producto.material;
      this.nuevaVentaItem.precio = producto.precio;
    }
  }

  aplicarFiltros() {
    this.ventasFiltradas = this.ventas.filter(v => {
      let cumple = true;
      
      if (this.filtroEstado && v.estado !== this.filtroEstado) {
        cumple = false;
      }
      
      if (this.filtroCliente && !v.cliente.toLowerCase().includes(this.filtroCliente.toLowerCase())) {
        cumple = false;
      }
      
      if (this.filtroFechaDesde && v.fechaVenta < this.filtroFechaDesde) {
        cumple = false;
      }
      
      if (this.filtroFechaHasta && v.fechaVenta > this.filtroFechaHasta) {
        cumple = false;
      }
      
      return cumple;
    });
    
    this.calcularTotalesFiltrados();
  }

  calcularTotales() {
    this.totalVentas = this.ventas.filter(v => v.estado === 'Entregado').length;
    this.totalCancelados = this.ventas.filter(v => v.estado === 'Cancelado').length;
    this.ingresoTotal = this.ventas
      .filter(v => v.estado === 'Entregado')
      .reduce((sum, v) => sum + this.getTotalVenta(v), 0);
  }

  calcularTotalesFiltrados() {
    // Recalcular basado en filtrados para mostrar en resumen
  }

  limpiarFiltros() {
    this.filtroEstado = '';
    this.filtroCliente = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.aplicarFiltros();
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR');
  }

  getEstadoClass(estado: string): string {
    return estado === 'Entregado' ? 'estado-entregado' : 'estado-cancelado';
  }

  // Formulario manual
  abrirFormulario() {
    this.mostrarFormulario = true;
    this.nuevaVentaCliente = '';
    this.nuevaVentaItem = this.getItemVacio();
    this.itemsVenta = [];
    this.nuevaVentaMetodoPago = 'Efectivo';
    this.nuevaVentaEstado = 'Entregado';
    const now = new Date();
    const hoy = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    this.nuevaVentaFechaPedido = hoy;
    this.nuevaVentaFechaVenta = hoy;
    this.nuevaVentaNota = '';
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.nuevaVentaCliente = '';
    this.nuevaVentaItem = this.getItemVacio();
    this.itemsVenta = [];
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
  }

  agregarItemVenta() {
    if (!this.nuevaVentaItem.productoId) {
      this.mostrarAlerta('Selecciona un producto', 'error');
      return;
    }

    this.itemsVenta.push({
      productoId: this.nuevaVentaItem.productoId || '',
      productoNombre: this.nuevaVentaItem.productoNombre || '',
      productoTipo: this.nuevaVentaItem.productoTipo || '',
      material: this.nuevaVentaItem.material || '',
      cantidad: this.nuevaVentaItem.cantidad || 1,
      precio: this.nuevaVentaItem.precio || 0,
      estado: this.nuevaVentaEstado
    });

    // Limpiar para agregar otro
    this.nuevaVentaItem = this.getItemVacio();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
  }

  eliminarItemVenta(index: number) {
    this.itemsVenta.splice(index, 1);
  }

  getTotalItemsForm(): number {
    return this.itemsVenta.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  guardarVenta() {
    if (!this.nuevaVentaCliente) {
      this.mostrarAlerta('El nombre del cliente es requerido', 'error');
      return;
    }

    if (this.itemsVenta.length === 0) {
      this.mostrarAlerta('Agrega al menos un producto a la venta', 'error');
      return;
    }

    const venta = {
      cliente: this.nuevaVentaCliente,
      items: this.itemsVenta,
      metodoPago: this.nuevaVentaMetodoPago,
      fechaPedido: this.nuevaVentaFechaPedido,
      fechaVenta: this.nuevaVentaFechaVenta,
      estado: this.nuevaVentaEstado,
      nota: this.nuevaVentaNota
    };

    this.http.post('http://localhost:5000/api/ventas', venta)
      .subscribe({
        next: () => {
          this.cargarVentas();
          this.cerrarFormulario();
        },
        error: (err) => console.error('Error al guardar venta:', err)
      });
  }

  // Importar JSON
  abrirImportarJson() {
    this.mostrarImportarJson = true;
    this.archivoSeleccionado = null;
  }

  cerrarImportarJson() {
    this.mostrarImportarJson = false;
    this.archivoSeleccionado = null;
  }

  onArchivoJsonSeleccionado(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      this.archivoSeleccionado = file;
    } else {
      this.mostrarAlerta('Por favor selecciona un archivo .json válido', 'error');
      this.archivoSeleccionado = null;
    }
  }

  importarJson() {
    if (!this.archivoSeleccionado) {
      this.mostrarAlerta('Por favor selecciona un archivo JSON', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const contenido = JSON.parse(e.target.result);
        const ventasArray = Array.isArray(contenido) ? contenido : [contenido];
        
        let importados = 0;
        let errores = 0;

        ventasArray.forEach((venta: any) => {
          const ventaNormalizada = {
            cliente: venta.cliente || '',
            items: venta.items || [{
              productoId: '',
              productoNombre: venta.productoNombre || venta.producto || '',
              productoTipo: venta.productoTipo || venta.tipo || '',
              material: venta.material || '',
              cantidad: parseInt(venta.cantidad) || 1,
              precio: parseFloat(venta.precio) || 0,
              estado: venta.estado || 'Entregado'
            }],
            metodoPago: venta.metodoPago || 'Efectivo',
            fechaPedido: venta.fechaPedido || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
            fechaVenta: venta.fechaVenta || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
            estado: venta.estado || 'Entregado',
            nota: venta.nota || ''
          };

          this.http.post('http://localhost:5000/api/ventas', ventaNormalizada)
            .subscribe({
              next: () => {
                importados++;
                if (importados + errores === ventasArray.length) {
                  this.cargarVentas();
                  this.cerrarImportarJson();
                  this.mostrarAlerta(`Importación completada: ${importados} ventas importadas, ${errores} errores`, errores > 0 ? 'info' : 'exito');
                }
              },
              error: () => {
                errores++;
                if (importados + errores === ventasArray.length) {
                  this.cargarVentas();
                  this.cerrarImportarJson();
                  this.mostrarAlerta(`Importación completada: ${importados} ventas importadas, ${errores} errores`, errores > 0 ? 'info' : 'exito');
                }
              }
            });
        });
      } catch (error) {
        this.mostrarAlerta('Error al parsear el archivo JSON. Verifica el formato.', 'error');
      }
    };
    reader.readAsText(this.archivoSeleccionado);
  }

  // Helpers para ventas con items[]
  getItemsVenta(venta: Venta): ItemVenta[] {
    return venta.items || [];
  }

  getCantidadTotal(venta: Venta): number {
    return this.getItemsVenta(venta).reduce((sum, item) => sum + item.cantidad, 0);
  }

  getTotalVenta(venta: Venta): number {
    return this.getItemsVenta(venta).reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  getResumenProductos(venta: Venta): string {
    const items = this.getItemsVenta(venta);
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].productoNombre;
    return `${items[0].productoNombre} y ${items.length - 1} más`;
  }
}
