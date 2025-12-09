import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-popup-color',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './popupColor.component.html',
  styleUrl: './popupColor.component.css'
})
export class PopupColorComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() colorGuardado = new EventEmitter<any>();
  @Output() coloresImportados = new EventEmitter<any[]>();

  nombreColor: string = '';
  rgbColor: string = '#D6B435';
  categoria: string = '';
  guardando: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  formularioValido(): boolean {
    return !!(this.nombreColor.trim() && this.rgbColor && this.categoria);
  }

  guardarColor(): void {
    if (!this.formularioValido()) {
      this.error = 'Complete todos los campos requeridos';
      return;
    }

    this.guardando = true;
    this.error = '';

    const color = {
      nombre: this.nombreColor.trim(),
      rgb: this.rgbColor,
      categoria: this.categoria
    };

    this.http.post<any>('http://localhost:5000/api/colores', color).subscribe({
      next: (result) => {
        this.guardando = false;
        this.colorGuardado.emit(result.color);
        this.cerrarPopup();
      },
      error: (err) => {
        this.guardando = false;
        this.error = 'Error al guardar el color';
        console.error('Error:', err);
      }
    });
  }

  cerrarPopup(): void {
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

        this.http.post<{ colores: any[] }>('http://localhost:5000/api/colores/importar', { colores: coloresArray }).subscribe({
          next: (res) => {
            this.coloresImportados.emit(res.colores);
            this.error = '';
            alert(`${res.colores.length} colores importados correctamente`);
          },
          error: (err) => {
            console.error('Error al importar colores:', err);
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
