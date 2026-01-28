import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatoPrecio',
  standalone: true
})
export class FormatoPrecioPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '0';
    
    const numero = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numero)) return '0';
    
    // Formatear con punto como separador de miles
    return numero.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
}
