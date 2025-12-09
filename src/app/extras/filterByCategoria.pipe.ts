import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByCategoria',
  standalone: true
})
export class FilterByCategoriaPipe implements PipeTransform {
  transform(items: any[], categoria: string): any[] {
    if (!items || !categoria) {
      return items;
    }
    return items.filter(item => item.categoria === categoria);
  }
}
