import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { FormatoPrecioPipe } from '../../extras/formatoPrecio.pipe';
import { GlobalService } from '../../services/global.service';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';

interface Compra {
  _id?: string;
  producto: string;
  cantidad: number;
  costoUnidad: number;
  costoTotal: number;
  lugar: string;
  fechaCompra: string;
  cantidadIndividual: number;
  costoIndividual: number;
}

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, FormatoPrecioPipe, PopupConfirmComponent, PopupAlertaComponent],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.css'
})
export class ComprasComponent implements OnInit {
  compras: Compra[] = [];
  lugares: string[] = [];
  
  // Formulario
  mostrarFormulario = false;
  nuevaCompra: Partial<Compra> = this.getCompraVacia();
  mostrarInputNuevoLugar = false;
  nuevoLugarNombre = '';
  
  // Edición
  compraEditando: Compra | null = null;
  
  // Popup eliminar
  mostrarPopupEliminar = false;
  compraAEliminar: Compra | null = null;
  
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
    this.globalService.checkLoggedIn("/compras");
    this.cargarCompras();
    this.cargarLugares();
  }

  getCompraVacia(): Partial<Compra> {
    return {
      producto: '',
      cantidad: 0,
      costoUnidad: 0,
      lugar: '',
      fechaCompra: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
      cantidadIndividual: 1
    };
  }

  cargarCompras() {
    this.http.get<Compra[]>('http://localhost:5000/api/compras')
      .subscribe({
        next: (data) => {
          this.compras = data;
        },
        error: (err) => {}
      });
  }

  cargarLugares() {
    this.http.get<string[]>('http://localhost:5000/api/compras/lugares')
      .subscribe({
        next: (data) => {
          this.lugares = data;
        },
        error: (err) => {}
      });
  }

  // Cálculos automáticos
  calcularCostoTotal(): number {
    return (this.nuevaCompra.cantidad || 0) * (this.nuevaCompra.costoUnidad || 0);
  }

  calcularCostoIndividual(): number {
    const cantInd = this.nuevaCompra.cantidadIndividual || 1;
    if (cantInd <= 0) return 0;
    return (this.nuevaCompra.costoUnidad || 0) / cantInd;
  }

  // Formulario
  abrirFormulario() {
    this.mostrarFormulario = true;
    this.nuevaCompra = this.getCompraVacia();
    this.compraEditando = null;
    this.mostrarInputNuevoLugar = false;
    this.nuevoLugarNombre = '';
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.nuevaCompra = this.getCompraVacia();
    this.compraEditando = null;
    this.mostrarInputNuevoLugar = false;
    this.nuevoLugarNombre = '';
  }

  onLugarChange() {
    if (this.nuevaCompra.lugar === '__nuevo__') {
      this.mostrarInputNuevoLugar = true;
    } else {
      this.mostrarInputNuevoLugar = false;
      this.nuevoLugarNombre = '';
    }
  }

  cancelarNuevoLugar() {
    this.mostrarInputNuevoLugar = false;
    this.nuevoLugarNombre = '';
    this.nuevaCompra.lugar = '';
  }

  guardarCompra() {
    const lugarFinal = this.nuevaCompra.lugar === '__nuevo__' ? this.nuevoLugarNombre.trim() : this.nuevaCompra.lugar;
    
    if (!this.nuevaCompra.producto || !lugarFinal) {
      this.mostrarAlerta('Producto y lugar son requeridos', 'error');
      return;
    }

    const compraData: Partial<Compra> = {
      producto: this.nuevaCompra.producto,
      cantidad: this.nuevaCompra.cantidad || 0,
      costoUnidad: this.nuevaCompra.costoUnidad || 0,
      costoTotal: this.calcularCostoTotal(),
      lugar: lugarFinal,
      fechaCompra: this.nuevaCompra.fechaCompra,
      cantidadIndividual: this.nuevaCompra.cantidadIndividual || 1,
      costoIndividual: this.calcularCostoIndividual()
    };

    if (this.compraEditando) {
      // Actualizar
      this.http.put(`http://localhost:5000/api/compras/${this.compraEditando._id}`, compraData)
        .subscribe({
          next: () => {
            this.cargarCompras();
            this.cargarLugares();
            this.cerrarFormulario();
          },
          error: (err) => {}
        });
    } else {
      // Crear
      this.http.post('http://localhost:5000/api/compras', compraData)
        .subscribe({
          next: () => {
            this.cargarCompras();
            this.cargarLugares();
            this.cerrarFormulario();
          },
          error: (err) => {}
        });
    }
  }

  // Editar
  editarCompra(compra: Compra) {
    this.compraEditando = compra;
    this.nuevaCompra = { ...compra };
    this.mostrarFormulario = true;
    this.mostrarInputNuevoLugar = false;
    this.nuevoLugarNombre = '';
    
    // Si el lugar no está en la lista, mostrarlo como nuevo lugar
    if (compra.lugar && !this.lugares.includes(compra.lugar)) {
      this.mostrarInputNuevoLugar = true;
      this.nuevoLugarNombre = compra.lugar;
      this.nuevaCompra.lugar = '__nuevo__';
    }
  }

  // Eliminar
  confirmarEliminar(compra: Compra) {
    this.compraAEliminar = compra;
    this.mostrarPopupEliminar = true;
  }

  cancelarEliminar() {
    this.compraAEliminar = null;
    this.mostrarPopupEliminar = false;
  }

  eliminarCompra() {
    if (!this.compraAEliminar) return;

    this.http.delete(`http://localhost:5000/api/compras/${this.compraAEliminar._id}`)
      .subscribe({
        next: () => {
          this.cargarCompras();
          this.cargarLugares();
          this.cancelarEliminar();
        },
        error: (err) => {}
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
      this.mostrarAlerta('Por favor selecciona un archivo .json', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const datos = JSON.parse(e.target.result);
        const compras = Array.isArray(datos) ? datos : datos.compras;
        
        if (!Array.isArray(compras)) {
          this.mostrarAlerta('El JSON debe ser un array de compras o un objeto con propiedad "compras"', 'error');
          return;
        }

        // Procesar cada compra para calcular totales
        const comprasProcesadas = compras.map((c: any) => ({
          producto: c.producto,
          cantidad: c.cantidad || 0,
          costoUnidad: c.costoUnidad || 0,
          costoTotal: (c.cantidad || 0) * (c.costoUnidad || 0),
          lugar: c.lugar,
          fechaCompra: c.fechaCompra || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
          cantidadIndividual: c.cantidadIndividual || 1,
          costoIndividual: (c.costoUnidad || 0) / (c.cantidadIndividual || 1)
        }));

        this.http.post('http://localhost:5000/api/compras/importar', { compras: comprasProcesadas })
          .subscribe({
            next: (res: any) => {
              this.mostrarAlerta(`${res.cantidad || comprasProcesadas.length} compras importadas correctamente`, 'exito');
              this.cargarCompras();
              this.cargarLugares();
              this.cerrarImportarJson();
            },
            error: (err) => {
              
              this.mostrarAlerta('Error al importar compras', 'error');
            }
          });
      } catch (e) {
        this.mostrarAlerta('Error al leer el archivo JSON. Verifica el formato.', 'error');
      }
    };
    reader.readAsText(this.archivoSeleccionado);
  }

  // Formato de fecha
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR');
  }

  // Total general
  getTotalGeneral(): number {
    return this.compras.reduce((sum, c) => sum + (c.costoTotal || 0), 0);
  }
}
