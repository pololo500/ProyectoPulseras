import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-popup-subcategoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './popupSubcategoria.component.html',
  styleUrl: './popupSubcategoria.component.css'
})
export class PopupSubcategoriaComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() subcategoriaGuardada = new EventEmitter<string>();

  nombreSubcategoria: string = '';
  error: string = '';

  formularioValido(): boolean {
    return !!(this.nombreSubcategoria.trim());
  }

  guardarSubcategoria(): void {
    if (!this.formularioValido()) {
      this.error = 'Ingrese un nombre para la sub-categoría';
      return;
    }

    this.error = '';
    const nombre = this.nombreSubcategoria.trim().toLowerCase();
    this.subcategoriaGuardada.emit(nombre);
    this.cerrarPopup();
  }

  cerrarPopup(): void {
    this.cerrar.emit();
  }
}
