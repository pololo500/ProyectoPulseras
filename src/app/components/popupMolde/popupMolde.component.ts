import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { PopupAlertaComponent } from '../popupAlerta/popupAlerta.component';

interface Capa {
  nombre: string;
  volumen: number | null;
}

interface MoldeEditar {
  _id: string;
  nombre: string;
  capas: { nombre: string; volumen: number }[];
  svgContent?: string;
  svgAreaMappings?: any[];
}

@Component({
  selector: 'app-popup-molde',
  standalone: true,
  imports: [CommonModule, FormsModule, PopupConfirmComponent, PopupAlertaComponent],
  templateUrl: './popupMolde.component.html',
  styleUrl: './popupMolde.component.css'
})
export class PopupMoldeComponent implements OnInit, OnChanges {
  @Input() moldeEditar: MoldeEditar | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() moldeGuardado = new EventEmitter<any>();
  @Output() moldeActualizado = new EventEmitter<any>();
  @Output() moldeEliminado = new EventEmitter<string>();
  @Output() moldesImportados = new EventEmitter<any[]>();

  nombreMolde: string = '';
  capas: Capa[] = [{ nombre: '', volumen: null }];
  guardando: boolean = false;
  eliminando: boolean = false;
  error: string = '';
  modoEdicion: boolean = false;
  mostrarConfirmEliminar: boolean = false;

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
    this.inicializarDesdeMolde();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['moldeEditar']) {
      this.inicializarDesdeMolde();
    }
  }

  inicializarDesdeMolde(): void {
    if (this.moldeEditar) {
      this.modoEdicion = true;
      this.nombreMolde = this.moldeEditar.nombre;
      this.capas = this.moldeEditar.capas.map(c => ({
        nombre: c.nombre,
        volumen: c.volumen
      }));
      // Agregar una capa vacía al final para facilitar agregar nuevas
      this.capas.push({ nombre: '', volumen: null });
    } else {
      this.modoEdicion = false;
      this.nombreMolde = '';
      this.capas = [{ nombre: '', volumen: null }];
    }
  }

  agregarCapa(): void {
    this.capas.push({ nombre: '', volumen: null });
  }

  verificarYAgregarCapa(index: number): void {
    const capaActual = this.capas[index];
    const esUltimaCapa = index === this.capas.length - 1;
    
    if (esUltimaCapa && capaActual.nombre && capaActual.volumen !== null && capaActual.volumen > 0) {
      this.capas.push({ nombre: '', volumen: null });
    }
  }

  eliminarCapa(index: number): void {
    if (this.capas.length > 1) {
      this.capas.splice(index, 1);
    }
  }

  moverCapaArriba(index: number): void {
    if (index > 0) {
      const temp = this.capas[index];
      this.capas[index] = this.capas[index - 1];
      this.capas[index - 1] = temp;
    }
  }

  moverCapaAbajo(index: number): void {
    const capasValidas = this.capas.filter(c => c.nombre.trim() && c.volumen !== null && c.volumen > 0);
    if (index < capasValidas.length - 1) {
      const temp = this.capas[index];
      this.capas[index] = this.capas[index + 1];
      this.capas[index + 1] = temp;
    }
  }

  esCapaValida(capa: Capa): boolean {
    return !!(capa.nombre.trim() && capa.volumen !== null && capa.volumen > 0);
  }

  formularioValido(): boolean {
    if (!this.nombreMolde.trim()) return false;
    const capasCompletas = this.capas.filter(c => c.nombre.trim() && c.volumen !== null && c.volumen > 0);
    return capasCompletas.length > 0;
  }

  guardarMolde(): void {
    if (!this.formularioValido()) {
      this.error = 'Complete todos los campos requeridos';
      return;
    }

    this.guardando = true;
    this.error = '';

    const capasValidas = this.capas.filter(c => c.nombre.trim() && c.volumen !== null && c.volumen > 0);

    if (this.modoEdicion && this.moldeEditar) {
      // Modo edición: actualizar molde existente
      const moldeActualizado: any = {
        nombre: this.nombreMolde.trim(),
        capas: capasValidas.map(c => ({ nombre: c.nombre.trim(), volumen: c.volumen }))
      };

      // Preservar SVG si existe
      if (this.moldeEditar.svgContent) {
        moldeActualizado.svgContent = this.moldeEditar.svgContent;
        // Recalcular mappings si las capas cambiaron
        moldeActualizado.svgAreaMappings = this.recalcularMappings(capasValidas);
      }

      this.http.put<any>(`http://localhost:5000/api/moldes/${this.moldeEditar._id}`, moldeActualizado)
        .subscribe({
          next: (result) => {
            this.guardando = false;
            this.moldeActualizado.emit(result.molde);
            this.cerrarPopup();
          },
          error: (err) => {
            this.guardando = false;
            this.error = 'Error al actualizar el molde';
            console.error('Error:', err);
          }
        });
    } else {
      // Modo creación: crear molde nuevo
      const molde = {
        nombre: this.nombreMolde.trim(),
        capas: capasValidas.map(c => ({ nombre: c.nombre.trim(), volumen: c.volumen }))
      };

      this.http.post<any>('http://localhost:5000/api/moldes', molde).subscribe({
        next: (result) => {
          this.guardando = false;
          this.moldeGuardado.emit(result.molde);
          this.cerrarPopup();
        },
        error: (err) => {
          this.guardando = false;
          this.error = 'Error al guardar el molde';
          console.error('Error:', err);
        }
      });
    }
  }

  recalcularMappings(capasValidas: Capa[]): any[] {
    if (!this.moldeEditar?.svgAreaMappings) return [];
    
    return capasValidas.map((capa, index) => {
      // Buscar mapping existente por nombre de capa
      const mappingExistente = this.moldeEditar!.svgAreaMappings!.find(
        m => m.capaNombre === capa.nombre.trim()
      );
      return {
        capaIndex: index,
        capaNombre: capa.nombre.trim(),
        svgElementId: mappingExistente?.svgElementId || ''
      };
    });
  }

  confirmarEliminarMolde(): void {
    this.mostrarConfirmEliminar = true;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmEliminar = false;
  }

  eliminarMolde(): void {
    if (!this.moldeEditar) return;

    this.eliminando = true;
    this.error = '';

    this.http.delete<any>(`http://localhost:5000/api/moldes/${this.moldeEditar._id}`)
      .subscribe({
        next: () => {
          this.eliminando = false;
          this.moldeEliminado.emit(this.moldeEditar!._id);
          this.cerrarPopup();
        },
        error: (err) => {
          this.eliminando = false;
          this.error = 'Error al eliminar el molde';
          console.error('Error:', err);
        }
      });
  }

  cerrarPopup(): void {
    this.mostrarConfirmEliminar = false;
    this.cerrar.emit();
  }

  importarMoldesJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const contenido = JSON.parse(e.target?.result as string);
        const moldesArray = Array.isArray(contenido) ? contenido : contenido.moldes;
        
        if (!Array.isArray(moldesArray)) {
          this.error = 'El JSON debe contener un array de moldes';
          return;
        }

        this.http.post<{ moldes: any[] }>('http://localhost:5000/api/moldes/importar', { moldes: moldesArray }).subscribe({
          next: (res) => {
            this.moldesImportados.emit(res.moldes);
            this.error = '';
            this.mostrarAlerta(`${res.moldes.length} moldes importados correctamente`, 'exito');
          },
          error: (err) => {
            console.error('Error al importar moldes:', err);
            this.error = 'Error al importar moldes';
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
