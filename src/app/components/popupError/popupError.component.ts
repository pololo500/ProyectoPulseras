import { Component, Input } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-popupError',
    imports: [ButtonComponent, CommonModule],
    templateUrl: './popupError.component.html',
    styleUrl: './popupError.component.css'
})
export class PopupErrorComponent {
  @Input() text = '';
  @Input() textAux = '';
  @Input() textButton = 'Reintentar';
  @Input() closePopup!: () => void;

  close() {
    this.closePopup();
  }
}
