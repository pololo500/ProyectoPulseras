import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { ordenarCromatico, ordenarAlfabetico } from '../../extras/color-sort';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';

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
  imports: [CommonModule, FormsModule, CapitalizePipe, PopupConfirmComponent, PopupAlertaComponent],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css'
})
export class StockComponent implements OnInit {
  stock: StockItem[] = [];
  productos: Producto[] = [];
  moldes: Molde[] = [];
  moldesHilo: Molde[] = [];
  colores: Color[] = [];
  coloresHilo: Color[] = [];
  
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

  // Modal para agregar variante a stock existente
  mostrarModalAgregarVariante = false;
  stockParaVariante: StockItem | null = null;
  nuevaVarianteExistente: StockVariante = this.crearNuevaVariante();
  
  // Accordion de capas para selector de colores
  capaAbiertaCargar: number | null = null;
  capaAbiertaVariante: number | null = null;

  // Filtros
  filtroMaterial = '';
  filtroNombre = '';
  filtroTipo = '';
  mostrarFiltrosMobile = false;

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarStock();
    this.cargarProductos();
    this.cargarMoldes();
    this.cargarMoldesHilo();
    this.cargarColores();
    this.cargarColoresHilo();
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
        error: (err) => {}
      });
  }

  cargarProductos(): void {
    this.http.get<Producto[]>('http://localhost:5000/api/productos')
      .subscribe({
        next: (data) => this.productos = data,
        error: (err) => {}
      });
  }

  cargarMoldes(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes')
      .subscribe({
        next: (data) => this.moldes = ordenarAlfabetico(data),
        error: (err) => {}
      });
  }

  cargarMoldesHilo(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes-hilo')
      .subscribe({
        next: (data) => this.moldesHilo = ordenarAlfabetico(data),
        error: (err) => {}
      });
  }

  cargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores')
      .subscribe({
        next: (data) => this.colores = data,
        error: (err) => {}
      });
  }

  cargarColoresHilo(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores-hilo')
      .subscribe({
        next: (data) => this.coloresHilo = ordenarCromatico(data),
        error: (err) => {}
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
      if (this.filtroTipo && item.productoTipo !== this.filtroTipo) {
        return false;
      }
      return true;
    });
  }

  get materialesUnicos(): string[] {
    const materiales = new Set(this.stock.map(s => s.material));
    return Array.from(materiales).sort();
  }

  get tiposUnicos(): string[] {
    const tipos = new Set(this.stock.map(s => s.productoTipo));
    return Array.from(tipos).sort();
  }

  abrirFiltrosMobile(): void {
    this.mostrarFiltrosMobile = true;
  }

  cerrarFiltrosMobile(): void {
    this.mostrarFiltrosMobile = false;
  }

  tieneFiltrosActivos(): boolean {
    return !!(this.filtroNombre || this.filtroTipo || this.filtroMaterial);
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroTipo = '';
    this.filtroMaterial = '';
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
      
      // Si es resina, preparar array de colores por capa desde molde
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
      } else if (producto.material.toLowerCase() === 'hilo encerado') {
        // Hilo encerado: buscar molde en moldesHilo
        if (producto.moldeNombre) {
          const moldeHilo = this.moldesHilo.find(m => m.nombre === producto.moldeNombre);
          if (moldeHilo) {
            this.nuevoStock.moldeId = moldeHilo._id;
            this.nuevoStock.moldeNombre = moldeHilo.nombre;
            this.nuevaVariante.coloresPorCapa = moldeHilo.capas.map((capa, index) => ({
              capaIndex: index,
              capaNombre: capa.nombre,
              colorId: '',
              colorNombre: '',
              colorRgb: ''
            }));
          } else {
            this.nuevoStock.moldeId = '';
            this.nuevoStock.moldeNombre = '';
            this.nuevaVariante.coloresPorCapa = [];
          }
        } else {
          this.nuevoStock.moldeId = '';
          this.nuevoStock.moldeNombre = '';
          this.nuevaVariante.coloresPorCapa = [];
        }
      } else {
        this.nuevaVariante.coloresPorCapa = [];
      }
    }
  }

  seleccionarColorCapa(capaIndex: number, colorId: string): void {
    const color = this.colores.find(c => c._id === colorId) || this.coloresHilo.find(c => c._id === colorId);
    if (color && this.nuevaVariante.coloresPorCapa) {
      this.nuevaVariante.coloresPorCapa[capaIndex].colorId = color._id;
      this.nuevaVariante.coloresPorCapa[capaIndex].colorNombre = color.nombre;
      this.nuevaVariante.coloresPorCapa[capaIndex].colorRgb = color.rgb;
    }
  }

  esResina(item: StockItem): boolean {
    return item.material.toLowerCase() === 'resina';
  }

  esHiloEncerado(item: StockItem): boolean {
    return item.material.toLowerCase() === 'hilo encerado';
  }

  requiereColores(item: StockItem): boolean {
    return this.esResina(item) || this.esHiloEncerado(item);
  }

  getColoresPorCategoria(categoria: string): Color[] {
    return ordenarCromatico(this.colores.filter(c => c.categoria?.toLowerCase() === categoria.toLowerCase()));
  }

  toggleCapaCargar(index: number): void {
    this.capaAbiertaCargar = this.capaAbiertaCargar === index ? null : index;
  }

  toggleCapaVariante(index: number): void {
    this.capaAbiertaVariante = this.capaAbiertaVariante === index ? null : index;
  }

  seleccionarColorCapaDesdeGrid(capaIndex: number, color: Color, modo: 'cargar' | 'variante'): void {
    if (modo === 'cargar') {
      if (this.nuevaVariante.coloresPorCapa) {
        this.nuevaVariante.coloresPorCapa[capaIndex].colorId = color._id;
        this.nuevaVariante.coloresPorCapa[capaIndex].colorNombre = color.nombre;
        this.nuevaVariante.coloresPorCapa[capaIndex].colorRgb = color.rgb;
      }
      this.capaAbiertaCargar = null;
    } else {
      if (this.nuevaVarianteExistente.coloresPorCapa) {
        this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorId = color._id;
        this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorNombre = color.nombre;
        this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorRgb = color.rgb;
      }
      this.capaAbiertaVariante = null;
    }
  }

  agregarVarianteAlModal(): void {
    if (this.requiereColores(this.nuevoStock) && this.nuevaVariante.coloresPorCapa) {
      const faltanColores = this.nuevaVariante.coloresPorCapa.some(c => !c.colorId);
      if (faltanColores) {
        this.mostrarAlerta('Por favor selecciona un color para cada capa', 'error');
        return;
      }
    }

    if (this.nuevaVariante.cantidad < 1) {
      this.mostrarAlerta('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    // Agregar variante al stock
    this.nuevoStock.variantes.push({ ...this.nuevaVariante });
    this.nuevaVariante = this.crearNuevaVariante();

    // Reinicializar colores si requiere colores
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
    } else if (this.esHiloEncerado(this.nuevoStock)) {
      if (this.nuevoStock.moldeNombre) {
        const moldeHilo = this.moldesHilo.find(m => m.nombre === this.nuevoStock.moldeNombre);
        if (moldeHilo) {
          this.nuevaVariante.coloresPorCapa = moldeHilo.capas.map((capa, index) => ({
            capaIndex: index,
            capaNombre: capa.nombre,
            colorId: '',
            colorNombre: '',
            colorRgb: ''
          }));
        }
      }
    }
  }

  guardarStock(): void {
    // Validar
    if (!this.nuevoStock.productoId || this.nuevoStock.variantes.length === 0) {
      this.mostrarAlerta('Por favor completa el producto y agrega al menos una variante', 'error');
      return;
    }

    

    this.http.post('http://localhost:5000/api/stock', this.nuevoStock)
      .subscribe({
        next: (response) => {
          
          this.mostrarAlerta('Producto agregado al stock exitosamente', 'exito');
          this.cargarStock();
          this.cerrarModalCargar();
        },
        error: (err) => {
          
          
          this.mostrarAlerta(`Error al guardar en el stock: ${err.error?.mensaje || err.message}`, 'error');
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
      this.mostrarAlerta('Por favor selecciona una variante', 'error');
      return;
    }

    if (this.ventaData.cantidadVendida < 1) {
      this.mostrarAlerta('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    if (this.ventaData.cantidadVendida > this.varianteSeleccionada.cantidad) {
      this.mostrarAlerta('Cantidad insuficiente en esta variante', 'error');
      return;
    }

    const payload = {
      ...this.ventaData,
      varianteId: this.varianteSeleccionada._id
    };

    this.http.post(`http://localhost:5000/api/stock/${this.stockSeleccionado._id}/vender`, payload)
      .subscribe({
        next: () => {
          this.mostrarAlerta('Venta registrada exitosamente', 'exito');
          this.cargarStock();
          this.cerrarModalVender();
        },
        error: (err) => {
          
          this.mostrarAlerta('Error al registrar la venta', 'error');
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
      this.mostrarAlerta('Cantidad inválida', 'error');
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
          
          this.mostrarAlerta('Error al actualizar cantidad', 'error');
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

    this.http.delete(`http://localhost:5000/api/stock/${this.stockSeleccionado._id}/variante/${this.varianteAEliminar._id}`)
      .subscribe({
        next: () => {
          this.mostrarAlerta('Variante eliminada', 'exito');
          this.cargarStock();
          this.cerrarModalEliminarVariante();
        },
        error: (err) => {
          
          this.mostrarAlerta('Error al eliminar variante', 'error');
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

  // ========== AGREGAR VARIANTE A STOCK EXISTENTE ==========

  abrirModalAgregarVariante(item: StockItem): void {
    this.stockParaVariante = item;
    this.nuevaVarianteExistente = this.crearNuevaVariante();

    // Si es resina o hilo encerado, preparar array de colores por capa
    if (this.esResina(item) && item.moldeNombre) {
      const molde = this.moldes.find(m => m.nombre === item.moldeNombre);
      if (molde) {
        this.nuevaVarianteExistente.coloresPorCapa = molde.capas.map((capa, index) => ({
          capaIndex: index,
          capaNombre: capa.nombre,
          colorId: '',
          colorNombre: '',
          colorRgb: ''
        }));
      }
    } else if (this.esHiloEncerado(item)) {
      if (item.moldeNombre) {
        const moldeHilo = this.moldesHilo.find(m => m.nombre === item.moldeNombre);
        if (moldeHilo) {
          this.nuevaVarianteExistente.coloresPorCapa = moldeHilo.capas.map((capa, index) => ({
            capaIndex: index,
            capaNombre: capa.nombre,
            colorId: '',
            colorNombre: '',
            colorRgb: ''
          }));
        }
      }
    }

    this.mostrarModalAgregarVariante = true;
  }

  cerrarModalAgregarVariante(): void {
    this.mostrarModalAgregarVariante = false;
    this.stockParaVariante = null;
    this.nuevaVarianteExistente = this.crearNuevaVariante();
  }

  seleccionarColorCapaVarianteExistente(capaIndex: number, colorId: string): void {
    const color = this.colores.find(c => c._id === colorId) || this.coloresHilo.find(c => c._id === colorId);
    if (color && this.nuevaVarianteExistente.coloresPorCapa) {
      this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorId = color._id;
      this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorNombre = color.nombre;
      this.nuevaVarianteExistente.coloresPorCapa[capaIndex].colorRgb = color.rgb;
    }
  }

  guardarNuevaVariante(): void {
    if (!this.stockParaVariante?._id) return;

    if (this.requiereColores(this.stockParaVariante) && this.nuevaVarianteExistente.coloresPorCapa) {
      const faltanColores = this.nuevaVarianteExistente.coloresPorCapa.some(c => !c.colorId);
      if (faltanColores) {
        this.mostrarAlerta('Por favor selecciona un color para cada capa', 'error');
        return;
      }
    }

    if (this.nuevaVarianteExistente.cantidad < 1) {
      this.mostrarAlerta('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    this.http.post(`http://localhost:5000/api/stock/${this.stockParaVariante._id}/variante`, this.nuevaVarianteExistente)
      .subscribe({
        next: () => {
          this.mostrarAlerta('Variante agregada exitosamente', 'exito');
          this.cargarStock();
          this.cerrarModalAgregarVariante();
        },
        error: (err) => {
          
          this.mostrarAlerta('Error al agregar variante', 'error');
        }
      });
  }
}
