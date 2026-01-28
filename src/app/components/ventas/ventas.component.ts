import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { GlobalService } from '../../services/global.service';

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
  imports: [CommonModule, FormsModule, CapitalizePipe, FormatoPrecioPipe],
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
  nuevaVenta: Partial<Venta> = this.getVentaVacia();
  metodosPago = ['Efectivo', 'Transferencia'];
  estadosVenta = ['Entregado', 'Cancelado'];

  // Importar JSON
  mostrarImportarJson = false;
  archivoSeleccionado: File | null = null;

  constructor(private http: HttpClient, private globalService: GlobalService) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/ventas");
    this.cargarVentas();
    this.cargarProductos();
  }

  getVentaVacia(): Partial<Venta> {
    return {
      cliente: '',
      productoNombre: '',
      productoTipo: '',
      material: '',
      cantidad: 1,
      precio: 0,
      metodoPago: 'Efectivo',
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaVenta: new Date().toISOString().split('T')[0],
      estado: 'Entregado',
      nota: ''
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
    this.nuevaVenta.productoTipo = this.tipoSeleccionado;
    this.nuevaVenta.productoNombre = '';
    this.nuevaVenta.material = '';
    this.nuevaVenta.precio = 0;
  }

  onProductoChange(productoId: string) {
    const producto = this.productos.find(p => p._id === productoId);
    if (producto) {
      this.nuevaVenta.productoNombre = producto.nombre;
      this.nuevaVenta.productoTipo = producto.producto;
      this.nuevaVenta.material = producto.material;
      this.nuevaVenta.precio = producto.precio;
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
      .reduce((sum, v) => sum + (v.precio * v.cantidad), 0);
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
    this.nuevaVenta = this.getVentaVacia();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.nuevaVenta = this.getVentaVacia();
    this.tipoSeleccionado = '';
    this.productosDisponibles = [];
  }

  guardarVenta() {
    if (!this.nuevaVenta.cliente || !this.nuevaVenta.productoNombre) {
      alert('Cliente y producto son requeridos');
      return;
    }

    this.http.post('http://localhost:5000/api/ventas', this.nuevaVenta)
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
      alert('Por favor selecciona un archivo .json válido');
      this.archivoSeleccionado = null;
    }
  }

  importarJson() {
    if (!this.archivoSeleccionado) {
      alert('Por favor selecciona un archivo JSON');
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
          const ventaNormalizada: Partial<Venta> = {
            cliente: venta.cliente || '',
            productoNombre: venta.productoNombre || venta.producto || '',
            productoTipo: venta.productoTipo || venta.tipo || '',
            material: venta.material || '',
            cantidad: parseInt(venta.cantidad) || 1,
            precio: parseFloat(venta.precio) || 0,
            metodoPago: venta.metodoPago || 'Efectivo',
            fechaPedido: venta.fechaPedido || new Date().toISOString().split('T')[0],
            fechaVenta: venta.fechaVenta || new Date().toISOString().split('T')[0],
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
                  alert(`Importación completada: ${importados} ventas importadas, ${errores} errores`);
                }
              },
              error: () => {
                errores++;
                if (importados + errores === ventasArray.length) {
                  this.cargarVentas();
                  this.cerrarImportarJson();
                  alert(`Importación completada: ${importados} ventas importadas, ${errores} errores`);
                }
              }
            });
        });
      } catch (error) {
        alert('Error al parsear el archivo JSON. Verifica el formato.');
      }
    };
    reader.readAsText(this.archivoSeleccionado);
  }
}
