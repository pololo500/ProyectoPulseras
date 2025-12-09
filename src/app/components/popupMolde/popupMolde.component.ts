import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Capa {
  nombre: string;
  volumen: number | null;
}

@Component({
  selector: 'app-popup-molde',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './popupMolde.component.html',
  styleUrl: './popupMolde.component.css'
})
export class PopupMoldeComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() moldeGuardado = new EventEmitter<any>();
  @Output() moldesImportados = new EventEmitter<any[]>();

  nombreMolde: string = '';
  capas: Capa[] = [{ nombre: '', volumen: null }];
  guardando: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

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

  cerrarPopup(): void {
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
            alert(`${res.moldes.length} moldes importados correctamente`);
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
