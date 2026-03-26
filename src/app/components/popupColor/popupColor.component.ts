import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';
import { environment } from '../../../environments/environment';

interface ColorEditar {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

@Component({
  selector: 'app-popup-color',
  standalone: true,
  imports: [CommonModule, FormsModule, PopupConfirmComponent, PopupAlertaComponent],
  templateUrl: './popupColor.component.html',
  styleUrl: './popupColor.component.css'
})
export class PopupColorComponent implements OnInit, OnChanges {
  @Input() colorEditar: ColorEditar | null = null;
  @Input() tipoColor: 'resina' | 'hilo' = 'resina';
  @Output() cerrar = new EventEmitter<void>();
  @Output() colorGuardado = new EventEmitter<any>();
  @Output() colorActualizado = new EventEmitter<any>();
  @Output() colorEliminado = new EventEmitter<string>();
  @Output() coloresImportados = new EventEmitter<any[]>();

  nombreColor: string = '';
  rgbColor: string = '#D6B435';
  categoria: string = '';
  guardando: boolean = false;
  eliminando: boolean = false;
  error: string = '';
  modoEdicion: boolean = false;
  mostrarConfirmEliminar: boolean = false;

  get apiUrl(): string {
    return this.tipoColor === 'hilo' ? `${environment.apiUrl}/colores-hilo` : `${environment.apiUrl}/colores`;
  }

  // Popup alerta
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' | 'info' = 'info';

  mostrarAlertaPopup(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
  }

  cerrarAlerta() {
    this.mensajeAlerta = '';
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.inicializarDesdeColor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['colorEditar']) {
      this.inicializarDesdeColor();
    }
  }

  inicializarDesdeColor(): void {
    if (this.colorEditar) {
      this.modoEdicion = true;
      this.nombreColor = this.colorEditar.nombre;
      this.rgbColor = this.colorEditar.rgb;
      this.categoria = this.colorEditar.categoria;
    } else {
      this.modoEdicion = false;
      this.nombreColor = '';
      this.rgbColor = '#D6B435';
      this.categoria = '';
    }
  }

  formularioValido(): boolean {
    if (this.tipoColor === 'hilo') {
      return !!(this.nombreColor.trim() && this.rgbColor);
    }
    return !!(this.nombreColor.trim() && this.rgbColor && this.categoria);
  }

  guardarColor(): void {
    if (!this.formularioValido()) {
      this.error = 'Complete todos los campos requeridos';
      return;
    }

    this.guardando = true;
    this.error = '';

    const color: any = {
      nombre: this.nombreColor.trim(),
      rgb: this.rgbColor
    };
    if (this.tipoColor !== 'hilo') {
      color.categoria = this.categoria;
    }

    if (this.modoEdicion && this.colorEditar) {
      // Modo edición: actualizar color existente
      this.http.put<any>(`${this.apiUrl}/${this.colorEditar._id}`, color)
        .subscribe({
          next: (result) => {
            this.guardando = false;
            this.colorActualizado.emit(result.color);
            this.cerrarPopup();
          },
          error: (err) => {
            this.guardando = false;
            this.error = 'Error al actualizar el color';
            
          }
        });
    } else {
      // Modo creación
      this.http.post<any>(this.apiUrl, color).subscribe({
        next: (result) => {
          this.guardando = false;
          this.colorGuardado.emit(result.color);
          this.cerrarPopup();
        },
        error: (err) => {
          this.guardando = false;
          this.error = 'Error al guardar el color';
          
        }
      });
    }
  }

  confirmarEliminarColor(): void {
    this.mostrarConfirmEliminar = true;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmEliminar = false;
  }

  eliminarColor(): void {
    if (!this.colorEditar) return;

    this.eliminando = true;
    this.error = '';

    this.http.delete<any>(`${this.apiUrl}/${this.colorEditar._id}`)
      .subscribe({
        next: () => {
          this.eliminando = false;
          this.colorEliminado.emit(this.colorEditar!._id);
          this.cerrarPopup();
        },
        error: (err) => {
          this.eliminando = false;
          this.error = 'Error al eliminar el color';
          
        }
      });
  }

  cerrarPopup(): void {
    this.mostrarConfirmEliminar = false;
    this.cerrar.emit();
  }

  importarColoresJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const contenido = JSON.parse(e.target?.result as string);
        const coloresArray = Array.isArray(contenido) ? contenido : contenido.colores;
        
        if (!Array.isArray(coloresArray)) {
          this.error = 'El JSON debe contener un array de colores';
          return;
        }

        this.http.post<{ colores: any[] }>(`${this.apiUrl}/importar`, { colores: coloresArray }).subscribe({
          next: (res) => {
            this.coloresImportados.emit(res.colores);
            this.error = '';
            this.mostrarAlertaPopup(`${res.colores.length} colores importados correctamente`, 'exito');
          },
          error: (err) => {
            
            this.error = 'Error al importar colores';
          }
        });
      } catch (err) {
        this.error = 'Error al leer el archivo JSON';
      }
    };
    
    reader.readAsText(file);
    input.value = '';
  }
}
