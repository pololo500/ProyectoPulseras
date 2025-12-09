import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';

interface ColorCapaStock {
  capaIndex: number;
  capaNombre: string;
  colorId: string;
  colorNombre: string;
  colorRgb: string;
}

interface StockVariante {
  _id: string;  // Identificador único de variante (ej: "var-1")
  coloresPorCapa: ColorCapaStock[];
  cantidad: number;
  detallesDiseno?: string;
  fechaAgriego?: Date;
}

interface StockItem {
  _id?: string;
  productoId: string;
  productoNombre: string;
  productoTipo: string;
  material: string;
  moldeId?: string;
  moldeNombre?: string;
  imagenUrl?: string;
  variantes: StockVariante[];  // Array de variantes con cantidad individual
  fechaCreacion?: Date;
  ultimaActualizacion?: Date;
}

interface Producto {
  _id: string;
  producto: string;
  material: string;
  nombre: string;
  precio?: number;
  imagenUrl?: string;
  imagenesUrls?: string[];
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
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css'
})
export class StockComponent implements OnInit {
  stock: StockItem[] = [];
  productos: Producto[] = [];
  moldes: Molde[] = [];
  colores: Color[] = [];
  
  // Modal para cargar stock
  mostrarModalCargar = false;
  nuevoStock: StockItem = this.crearNuevoStock();
  nuevaVariante: StockVariante = this.crearNuevaVariante();
  
  // Modal para vender
  mostrarModalVender = false;
  stockSeleccionado: StockItem | null = null;
  varianteSeleccionada: StockVariante | null = null;
  ventaData = {
    cantidadVendida: 1,
    cliente: '',
    metodoPago: 'Efectivo',
    precio: 0
  };
  
  // Modal para eliminar variante
  mostrarModalEliminarVariante = false;
  varianteAEliminar: StockVariante | null = null;
  
  // Modal para editar cantidad
  mostrarModalEditarCantidad = false;
  varianteAEditar: StockVariante | null = null;
  stockAEditar: StockItem | null = null;
  cantidadTemporal = 0;
  
  // Modal para detalle
  mostrarModalDetalle = false;
  stockDetalle: StockItem | null = null;
  
  // Filtros
  filtroMaterial = '';
  filtroNombre = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarStock();
    this.cargarProductos();
    this.cargarMoldes();
    this.cargarColores();
  }

  crearNuevoStock(): StockItem {
    return {
      productoId: '',
      productoNombre: '',
      productoTipo: '',
      material: '',
      moldeId: '',
      moldeNombre: '',
      imagenUrl: '',
      variantes: []
    };
  }

  crearNuevaVariante(): StockVariante {
    return {
      _id: `var-${Date.now()}`,
      coloresPorCapa: [],
      cantidad: 1,
      detallesDiseno: ''
    };
  }

  cargarStock(): void {
    this.http.get<StockItem[]>('http://localhost:5000/api/stock')
      .subscribe({
        next: (data) => this.stock = data,
        error: (err) => console.error('Error al cargar stock:', err)
      });
  }

  cargarProductos(): void {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe({
        next: (data) => this.productos = data,
        error: (err) => console.error('Error al cargar productos:', err)
      });
  }

  cargarMoldes(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = data,
        error: (err) => console.error('Error al cargar moldes:', err)
      });
  }

  cargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => console.error('Error al cargar colores:', err)
      });
  }

  get stockFiltrado(): StockItem[] {
    return this.stock.filter(item => {
      if (this.filtroMaterial && item.material !== this.filtroMaterial) {
        return false;
      }
      if (this.filtroNombre && !item.productoNombre.toLowerCase().includes(this.filtroNombre.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  get materialesUnicos(): string[] {
    const materiales = new Set(this.stock.map(s => s.material));
    return Array.from(materiales).sort();
  }

  getCantidadTotal(item: StockItem): number {
    return item.variantes.reduce((total, v) => total + v.cantidad, 0);
  }

  abrirModalCargar(): void {
    this.nuevoStock = this.crearNuevoStock();
    this.nuevaVariante = this.crearNuevaVariante();
    this.mostrarModalCargar = true;
  }

  cerrarModalCargar(): void {
    this.mostrarModalCargar = false;
    this.nuevoStock = this.crearNuevoStock();
    this.nuevaVariante = this.crearNuevaVariante();
  }

  onProductoSeleccionado(): void {
    const producto = this.productos.find(p => p._id === this.nuevoStock.productoId);
    if (producto) {
      this.nuevoStock.productoNombre = producto.nombre;
      this.nuevoStock.productoTipo = producto.producto;
      this.nuevoStock.material = producto.material;
      this.nuevoStock.imagenUrl = producto.imagenesUrls?.[0] || producto.imagenUrl || '';
      
      // Si es resina, preparar array de colores por capa
      if (producto.material.toLowerCase() === 'resina' && producto.moldeNombre) {
        const molde = this.moldes.find(m => m.nombre === producto.moldeNombre);
        if (molde) {
          this.nuevoStock.moldeId = molde._id;
          this.nuevoStock.moldeNombre = molde.nombre;
          this.nuevaVariante.coloresPorCapa = molde.capas.map((capa, index) => ({
            capaIndex: index,
            capaNombre: capa.nombre,
            colorId: '',
            colorNombre: '',
            colorRgb: ''
          }));
        }
      } else {
        this.nuevaVariante.coloresPorCapa = [];
      }
    }
  }

  seleccionarColorCapa(capaIndex: number, colorId: string): void {
    const color = this.colores.find(c => c._id === colorId);
    if (color && this.nuevaVariante.coloresPorCapa) {
      this.nuevaVariante.coloresPorCapa[capaIndex].colorId = color._id;
      this.nuevaVariante.coloresPorCapa[capaIndex].colorNombre = color.nombre;
      this.nuevaVariante.coloresPorCapa[capaIndex].colorRgb = color.rgb;
    }
  }

  esResina(item: StockItem): boolean {
    return item.material.toLowerCase() === 'resina';
  }

  agregarVarianteAlModal(): void {
    if (this.esResina(this.nuevoStock) && this.nuevaVariante.coloresPorCapa) {
      const faltanColores = this.nuevaVariante.coloresPorCapa.some(c => !c.colorId);
      if (faltanColores) {
        alert('Por favor selecciona un color para cada capa');
        return;
      }
    }

    if (this.nuevaVariante.cantidad < 1) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    // Agregar variante al stock
    this.nuevoStock.variantes.push({ ...this.nuevaVariante });
    this.nuevaVariante = this.crearNuevaVariante();

    // Reinicializar colores si es resina
    if (this.esResina(this.nuevoStock) && this.nuevoStock.moldeId) {
      const molde = this.moldes.find(m => m._id === this.nuevoStock.moldeId);
      if (molde) {
        this.nuevaVariante.coloresPorCapa = molde.capas.map((capa, index) => ({
          capaIndex: index,
          capaNombre: capa.nombre,
          colorId: '',
          colorNombre: '',
          colorRgb: ''
        }));
      }
    }
  }

  guardarStock(): void {
    // Validar
    if (!this.nuevoStock.productoId || this.nuevoStock.variantes.length === 0) {
      alert('Por favor completa el producto y agrega al menos una variante');
      return;
    }

    console.log('📤 Enviando al stock:', this.nuevoStock);

    this.http.post('http://localhost:5000/api/stock', this.nuevoStock)
      .subscribe({
        next: (response) => {
          console.log('✅ Respuesta del servidor:', response);
          alert('Producto agregado al stock exitosamente');
          this.cargarStock();
          this.cerrarModalCargar();
        },
        error: (err) => {
          console.error('❌ Error al guardar stock:', err);
          console.error('Datos enviados:', this.nuevoStock);
          alert(`Error al guardar en el stock: ${err.error?.mensaje || err.message}`);
        }
      });
  }

  abrirModalVender(item: StockItem): void {
    this.stockSeleccionado = item;
    this.varianteSeleccionada = null;
    this.ventaData = {
      cantidadVendida: 1,
      cliente: '',
      metodoPago: 'Efectivo',
      precio: 0
    };
    this.mostrarModalVender = true;
  }

  cerrarModalVender(): void {
    this.mostrarModalVender = false;
    this.stockSeleccionado = null;
    this.varianteSeleccionada = null;
  }

  confirmarVenta(): void {
    if (!this.stockSeleccionado || !this.varianteSeleccionada) {
      alert('Por favor selecciona una variante');
      return;
    }

    if (this.ventaData.cantidadVendida < 1) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (this.ventaData.cantidadVendida > this.varianteSeleccionada.cantidad) {
      alert('Cantidad insuficiente en esta variante');
      return;
    }

    const payload = {
      ...this.ventaData,
      varianteId: this.varianteSeleccionada._id
    };

    this.http.post(`http://localhost:5000/api/stock/${this.stockSeleccionado._id}/vender`, payload)
      .subscribe({
        next: () => {
          alert('Venta registrada exitosamente');
          this.cargarStock();
          this.cerrarModalVender();
        },
        error: (err) => {
          console.error('Error al registrar venta:', err);
          alert('Error al registrar la venta');
        }
      });
  }

  abrirModalEditarCantidad(item: StockItem, variante: StockVariante): void {
    this.stockAEditar = item;
    this.varianteAEditar = variante;
    this.cantidadTemporal = variante.cantidad;
    this.mostrarModalEditarCantidad = true;
  }

  cerrarModalEditarCantidad(): void {
    this.mostrarModalEditarCantidad = false;
    this.stockAEditar = null;
    this.varianteAEditar = null;
  }

  guardarCantidad(): void {
    if (!this.stockAEditar || !this.varianteAEditar || this.cantidadTemporal < 0) {
      alert('Cantidad inválida');
      return;
    }

    const payload = {
      cantidad: this.cantidadTemporal
    };

    this.http.put(`http://localhost:5000/api/stock/${this.stockAEditar._id}/variante/${this.varianteAEditar._id}/cantidad`, payload)
      .subscribe({
        next: () => {
          this.cargarStock();
          this.cerrarModalEditarCantidad();
        },
        error: (err) => {
          console.error('Error al actualizar cantidad:', err);
          alert('Error al actualizar cantidad');
        }
      });
  }

  abrirModalEliminarVariante(item: StockItem, variante: StockVariante): void {
    this.stockSeleccionado = item;
    this.varianteAEliminar = variante;
    this.mostrarModalEliminarVariante = true;
  }

  cerrarModalEliminarVariante(): void {
    this.mostrarModalEliminarVariante = false;
    this.varianteAEliminar = null;
    this.stockSeleccionado = null;
  }

  confirmarEliminarVariante(): void {
    if (!this.stockSeleccionado || !this.varianteAEliminar) return;

    if (!confirm('¿Estás seguro de eliminar esta variante?')) {
      return;
    }

    this.http.delete(`http://localhost:5000/api/stock/${this.stockSeleccionado._id}/variante/${this.varianteAEliminar._id}`)
      .subscribe({
        next: () => {
          alert('Variante eliminada');
          this.cargarStock();
          this.cerrarModalEliminarVariante();
        },
        error: (err) => {
          console.error('Error al eliminar variante:', err);
          alert('Error al eliminar variante');
        }
      });
  }

  getColorNombre(colorId: string): string {
    const color = this.colores.find(c => c._id === colorId);
    return color ? color.nombre : 'Sin color';
  }

  abrirModalDetalle(item: StockItem): void {
    this.stockDetalle = item;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.stockDetalle = null;
  }
}
