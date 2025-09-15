import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-button',
    imports: [NgClass],
    template: '<button [ngClass]="buttonClass" (click)=\'goToAnotherScreen()\'> {{etiqueta}} </button>',
    styleUrl: './button.component.css'
})
export class ButtonComponent {
  router = inject(Router);
  @Input() etiqueta = '';
  @Input() link = '';
  @Input() buttonClass = '';
  
  goToAnotherScreen() {
    this.router.navigateByUrl(this.link);
  }
}
