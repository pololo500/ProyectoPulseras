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
  instagramUser = '@l.m_pulseras';
  instagramUrl = 'https://www.instagram.com/l.m_pulseras';
  whatsappNumber = '1140766376';
  whatsappUrl = 'https://wa.me/541140766376';

  abrirInstagram(): void {
    window.open(this.instagramUrl, '_blank');
  }

  abrirWhatsapp(): void {
    window.open(this.whatsappUrl, '_blank');
  }
}
