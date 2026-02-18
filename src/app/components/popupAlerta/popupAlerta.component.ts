import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-popup-alerta',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './popupAlerta.component.html',
    styleUrl: './popupAlerta.component.css'
})
export class PopupAlertaComponent {
  @Input() mensaje = '';
  @Input() tipo: 'exito' | 'error' | 'info' = 'info';
  @Output() cerrar = new EventEmitter<void>();

  get icono(): string {
    switch (this.tipo) {
      case 'exito': return '✓';
      case 'error': return '✕';
      case 'info': return 'ℹ';
    }
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}
