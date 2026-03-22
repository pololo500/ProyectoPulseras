import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.css'
})
export class ContactoComponent {
  instagramUser = '@lm_hermanhadas';
  instagramUrl = 'https://www.instagram.com/lm_hermanhadas';
  whatsappNumber = '11 4076-6376';
  whatsappUrl = 'https://wa.me/541140766376';

  abrirInstagram(): void {
    window.open(this.instagramUrl, '_blank');
  }

  abrirWhatsapp(): void {
    window.open(this.whatsappUrl, '_blank');
  }
}
