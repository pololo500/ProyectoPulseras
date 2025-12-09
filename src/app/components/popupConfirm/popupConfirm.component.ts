import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-popup-confirm',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './popupConfirm.component.html',
    styleUrl: './popupConfirm.component.css'
})
export class PopupConfirmComponent {
  @Input() titulo = '¿Estás seguro?';
  @Input() mensaje = '';
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  onConfirmar(): void {
    this.confirmar.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
