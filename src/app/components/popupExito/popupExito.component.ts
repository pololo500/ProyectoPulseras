import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ColorInfo {
  capaNombre: string;
  colorNombre: string;
  colorRgb: string;
}

@Component({
    selector: 'app-popup-exito',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './popupExito.component.html',
    styleUrl: './popupExito.component.css'
})
export class PopupExitoComponent implements OnInit, OnDestroy {
  @Input() mensaje = '¡Producto agregado al carrito!';
  @Input() colores: ColorInfo[] = [];
  @Input() duracion = 5000; // milisegundos antes de auto-cerrar
  @Output() cerrar = new EventEmitter<void>();

  private timeoutId: any;

  ngOnInit(): void {
    // Auto-cerrar después de la duración especificada
    this.timeoutId = setTimeout(() => {
      this.onCerrar();
    }, this.duracion);
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}
