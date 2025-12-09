import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PopupMoldeComponent } from '../popupMolde/popupMolde.component';
import { PopupColorComponent } from '../popupColor/popupColor.component';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { FilterByCategoriaPipe } from '../../extras/filterByCategoria.pipe';
import { GlobalService } from '../../services/global.service';
import jsPDF from 'jspdf';

interface Capa {
  nombre: string;
  volumen: number;
}

interface Molde {
  _id: string;
  nombre: string;
  capas: Capa[];
}

interface Color {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

// Color asignado a una capa
interface ColorCapa {
  colorId: string;
  colorNombre: string;
  colorRgb: string;
  fase: number;
  volumen: number;
  nota: string;
}

// Capa del producto con múltiples colores
interface CapaProducto {
  capaIndex: number;
  capaNombre: string;
  volumenTotal: number;
  colores: ColorCapa[];
}

interface ProductoTabla {
  id: number;
  moldeId: string;
  moldeNombre: string;
  cantidad: number;
  capas: CapaProducto[];
}

interface ResumenColor {
  colorId: string;
  colorNombre: string;
  colorRgb: string;
  colorCategoria: string;
  fase: number;
  volumenTotal: number;
  detalles: { moldeNombre: string; cantidad: number; capaNombre: string; volumenUnitario: number; nota: string }[];
}

@Component({
  selector: 'app-calculadora-resina',
  standalone: true,
  imports: [CommonModule, FormsModule, PopupMoldeComponent, PopupColorComponent, PopupConfirmComponent, FilterByCategoriaPipe],
  templateUrl: './calculadoraResina.component.html',
  styleUrl: './calculadoraResina.component.css'
})
export class CalculadoraResinaComponent implements OnInit {
  mostrarPopupMolde = false;
  mostrarPopupColor = false;
  mostrarPopupConfirm = false;

  moldes: Molde[] = [];
  colores: Color[] = [];
  productos: ProductoTabla[] = [];
  contadorId = 1;
  resumenColores: ResumenColor[] = [];
  tooltipVisible: string | null = null;
  fases: number[] = [1, 2, 3, 4, 5];

  constructor(private http: HttpClient, private globalService: GlobalService) {}

  ngOnInit(): void {
    // Solo administradores pueden acceder
    this.globalService.checkLoggedIn('/calculadoraResina', true);
    
    this.cargarMoldes();
    this.cargarColores();
    this.cargarMemoria();
  }

  cargarMoldes(): void {
    this.http.get<Molde[]>('http://localhost:5000/api/moldes').subscribe({
      next: (data) => this.moldes = data,
      error: (err) => console.error('Error al cargar moldes:', err)
    });
  }

  cargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores').subscribe({
      next: (data) => this.colores = data,
      error: (err) => console.error('Error al cargar colores:', err)
    });
  }

  cargarMemoria(): void {
    this.http.get<{ productos: ProductoTabla[]; contadorId: number }>('http://localhost:5000/api/calculadora-memoria').subscribe({
      next: (data) => {
        if (data && data.productos && data.productos.length > 0) {
          let necesitaMigracion = false;
          
          // Migrar datos antiguos si es necesario
          this.productos = data.productos.map(producto => ({
            ...producto,
            capas: producto.capas.map(capa => {
              // Si la capa tiene la estructura antigua (sin array de colores)
              if (!capa.colores || !Array.isArray(capa.colores) || capa.colores.length === 0) {
                necesitaMigracion = true;
                const capaAntigua = capa as any;
                return {
                  capaIndex: capa.capaIndex,
                  capaNombre: capa.capaNombre,
                  volumenTotal: capaAntigua.volumen || capa.volumenTotal || 0,
                  colores: [{
                    colorId: capaAntigua.colorId || '',
                    colorNombre: capaAntigua.colorNombre || '',
                    colorRgb: capaAntigua.colorRgb || '',
                    fase: capaAntigua.fase || 1,
                    volumen: capaAntigua.volumen || capa.volumenTotal || 0,
                    nota: capaAntigua.nota || ''
                  }]
                };
              }
              return capa;
            })
          }));
          
          this.contadorId = data.contadorId || 1;
          this.actualizarResumen();
          
          // Guardar la estructura migrada solo si hubo migración
          if (necesitaMigracion) {
            console.log('Migrando datos a nueva estructura...');
            this.guardarMemoria();
          }
        }
      },
      error: (err) => console.error('Error al cargar memoria:', err)
    });
  }

  guardarMemoria(): void {
    const datos = {
      productos: this.productos,
      contadorId: this.contadorId
    };
    this.http.post('http://localhost:5000/api/calculadora-memoria', datos).subscribe({
      next: () => console.log('Memoria guardada'),
      error: (err) => console.error('Error al guardar memoria:', err)
    });
  }

  limpiarCalculadora(): void {
    this.mostrarPopupConfirm = true;
  }

  confirmarLimpiar(): void {
    this.mostrarPopupConfirm = false;
    this.http.delete('http://localhost:5000/api/calculadora-memoria').subscribe({
      next: () => {
        this.productos = [];
        this.contadorId = 1;
        this.resumenColores = [];
      },
      error: (err) => console.error('Error al limpiar memoria:', err)
    });
  }

  cancelarLimpiar(): void {
    this.mostrarPopupConfirm = false;
  }

  abrirPopupMolde(): void { this.mostrarPopupMolde = true; }
  cerrarPopupMolde(): void { this.mostrarPopupMolde = false; }
  onMoldeGuardado(molde: Molde): void { this.moldes.push(molde); }
  onMoldesImportados(moldes: Molde[]): void { this.moldes.push(...moldes); }

  abrirPopupColor(): void { this.mostrarPopupColor = true; }
  cerrarPopupColor(): void { this.mostrarPopupColor = false; }
  onColorGuardado(color: Color): void { this.colores.push(color); }
  onColoresImportados(colores: Color[]): void { this.colores.push(...colores); }

  // Recargar colores desde el servidor (para cuando se abre el select)
  recargarColores(): void {
    this.http.get<Color[]>('http://localhost:5000/api/colores').subscribe({
      next: (data) => this.colores = data,
      error: (err) => console.error('Error al recargar colores:', err)
    });
  }

  agregarProducto(): void {
    this.productos.push({
      id: this.contadorId++,
      moldeId: '',
      moldeNombre: '',
      cantidad: 1,
      capas: []
    });
    this.guardarMemoria();
  }

  eliminarProducto(id: number): void {
    this.productos = this.productos.filter(p => p.id !== id);
    this.actualizarResumen();
    this.guardarMemoria();
  }

  onMoldeChange(producto: ProductoTabla): void {
    const molde = this.moldes.find(m => m._id === producto.moldeId);
    if (molde) {
      producto.moldeNombre = molde.nombre;
      producto.capas = molde.capas.map((capa, index) => ({
        capaIndex: index,
        capaNombre: capa.nombre,
        volumenTotal: capa.volumen,
        colores: [{
          colorId: '',
          colorNombre: '',
          colorRgb: '',
          fase: 1,
          volumen: capa.volumen,
          nota: ''
        }]
      }));
    } else {
      producto.capas = [];
    }
    this.actualizarResumen();
    this.guardarMemoria();
  }

  onColorChange(colorCapa: ColorCapa): void {
    const color = this.colores.find(c => c._id === colorCapa.colorId);
    if (color) {
      colorCapa.colorNombre = color.nombre;
      colorCapa.colorRgb = color.rgb;
    }
    this.actualizarResumen();
    this.guardarMemoria();
  }

  agregarColorACapa(capa: CapaProducto): void {
    // El nuevo color inicia en 0
    capa.colores.push({
      colorId: '',
      colorNombre: '',
      colorRgb: '',
      fase: 1,
      volumen: 0,
      nota: ''
    });
    this.guardarMemoria();
  }

  eliminarColorDeCapa(capa: CapaProducto, index: number): void {
    if (capa.colores.length <= 1 || index === 0) return; // No se puede eliminar el principal
    
    const volumenEliminado = capa.colores[index].volumen;
    capa.colores.splice(index, 1);
    
    // Devolver el volumen al color principal
    capa.colores[0].volumen += volumenEliminado;
    
    this.actualizarResumen();
    this.guardarMemoria();
  }

  getVolumenRestante(capa: CapaProducto): number {
    // Ya no se usa, pero lo mantenemos para compatibilidad
    return 0;
  }

  onVolumenChange(capa: CapaProducto, colorCapa: ColorCapa, index: number): void {
    if (index === 0) return; // El principal no se puede modificar directamente
    
    // Calcular el volumen máximo que puede tener este color (lo que tiene el principal)
    const volumenAnterior = colorCapa.volumen || 0;
    let nuevoVolumen = colorCapa.volumen || 0;
    
    // Calcular cuánto pueden tener los demás colores secundarios (sin contar este)
    const volumenOtrosSecundarios = capa.colores
      .filter((c, i) => i !== 0 && i !== index)
      .reduce((sum, c) => sum + (c.volumen || 0), 0);
    
    // El máximo es el total menos lo que usan otros secundarios
    const maxVolumen = capa.volumenTotal - volumenOtrosSecundarios;
    
    if (nuevoVolumen < 0) nuevoVolumen = 0;
    if (nuevoVolumen > maxVolumen) nuevoVolumen = maxVolumen;
    
    colorCapa.volumen = nuevoVolumen;
    
    // Recalcular el volumen del color principal
    const totalSecundarios = capa.colores
      .filter((c, i) => i !== 0)
      .reduce((sum, c) => sum + (c.volumen || 0), 0);
    
    capa.colores[0].volumen = capa.volumenTotal - totalSecundarios;
    
    this.actualizarResumen();
    this.guardarMemoria();
  }

  onCantidadChange(): void { this.actualizarResumen(); this.guardarMemoria(); }
  onFaseChange(): void { this.actualizarResumen(); this.guardarMemoria(); }
  onNotaChange(): void { this.actualizarResumen(); this.guardarMemoria(); }

  actualizarResumen(): void {
    const resumenMap = new Map<string, ResumenColor>();

    for (const producto of this.productos) {
      if (!producto.moldeId || producto.cantidad < 1) continue;

      for (const capa of producto.capas) {
        for (const colorCapa of capa.colores) {
          if (!colorCapa.colorId || colorCapa.volumen <= 0) continue;

          const key = `${colorCapa.colorId}-${colorCapa.fase}`;
          const colorObj = this.colores.find(c => c._id === colorCapa.colorId);
          
          if (!resumenMap.has(key)) {
            resumenMap.set(key, {
              colorId: colorCapa.colorId,
              colorNombre: colorCapa.colorNombre,
              colorRgb: colorCapa.colorRgb,
              colorCategoria: colorObj?.categoria || '',
              fase: colorCapa.fase,
              volumenTotal: 0,
              detalles: []
            });
          }

          const resumen = resumenMap.get(key)!;
          resumen.volumenTotal += colorCapa.volumen * producto.cantidad;
          
          const detalleExistente = resumen.detalles.find(
            d => d.moldeNombre === producto.moldeNombre && d.capaNombre === capa.capaNombre && d.nota === colorCapa.nota && d.volumenUnitario === colorCapa.volumen
          );
          
          if (detalleExistente) {
            detalleExistente.cantidad += producto.cantidad;
          } else {
            resumen.detalles.push({
              moldeNombre: producto.moldeNombre,
              cantidad: producto.cantidad,
              capaNombre: capa.capaNombre,
              volumenUnitario: colorCapa.volumen,
              nota: colorCapa.nota
            });
          }
        }
      }
    }

    this.resumenColores = Array.from(resumenMap.values()).sort((a, b) => a.fase - b.fase);
  }

  mostrarTooltip(key: string): void { this.tooltipVisible = key; }
  ocultarTooltip(): void { this.tooltipVisible = null; }
  getResumenKey(resumen: ResumenColor): string { return `${resumen.colorId}-${resumen.fase}`; }

  getFasesUnicas(): number[] {
    const fasesUsadas = new Set(this.resumenColores.map(r => r.fase));
    return Array.from(fasesUsadas).sort((a, b) => a - b);
  }

  getResumenPorFase(fase: number): ResumenColor[] {
    return this.resumenColores.filter(r => r.fase === fase);
  }

  capitalizarCategoria(categoria: string): string {
    if (!categoria) return '';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase();
  }

  generarInformePDF(): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    let y = 20;

    // Título
    doc.setFontSize(20);
    doc.setTextColor(0, 4, 71);
    doc.text('Informe de Producción - Resina', 105, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Fecha: ${fecha}`, 105, y, { align: 'center' });
    
    y += 15;

    // Por cada fase
    for (const fase of this.getFasesUnicas()) {
      // Verificar si necesitamos nueva página
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Título de fase
      doc.setFontSize(16);
      doc.setTextColor(214, 180, 53);
      doc.text(`FASE ${fase}`, 20, y);
      y += 8;

      // Línea separadora
      doc.setDrawColor(214, 180, 53);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 8;

      const coloresFase = this.getResumenPorFase(fase);

      for (const resumen of coloresFase) {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Color y volumen total
        doc.setFontSize(14);
        doc.setTextColor(0, 4, 71);
        const categoriaTexto = resumen.colorCategoria ? ` (${this.capitalizarCategoria(resumen.colorCategoria)})` : '';
        doc.text(`${resumen.colorNombre}${categoriaTexto}`, 25, y);
        doc.setTextColor(100);
        doc.text(`${resumen.volumenTotal} ml total`, 120, y);
        
        // Dibujar cuadro de color
        const rgb = this.hexToRgb(resumen.colorRgb);
        if (rgb) {
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.rect(180, y - 5, 8, 8, 'F');
          doc.setDrawColor(0, 4, 71);
          doc.rect(180, y - 5, 8, 8, 'S');
        }
        
        y += 7;

        // Detalles de moldes
        doc.setFontSize(10);
        for (const detalle of resumen.detalles) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          doc.setTextColor(80);
          let texto = `• ${detalle.moldeNombre} - ${detalle.capaNombre}: ${detalle.cantidad} unid. × ${detalle.volumenUnitario}ml = ${detalle.cantidad * detalle.volumenUnitario}ml`;
          if (detalle.nota) {
            texto += ` [${detalle.nota}]`;
          }
          doc.text(texto, 30, y);
          y += 5;
        }
        
        y += 5;
      }
      
      y += 10;
    }

    // Pie de página en última página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`LM Pulseras - Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    // Descargar PDF
    doc.save(`informe-resina-${fecha.replace(/\//g, '-')}.pdf`);
  }

  // Función auxiliar para convertir hex a RGB
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Función para determinar si el texto debe ser blanco o negro según el color de fondo
  getTextColor(hexColor: string): string {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return '#000000';
    
    // Calcular luminosidad relativa
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  // Pasar producto a Stock
  pasarAStock(producto: ProductoTabla): void {
    // Verificar que todos los colores estén seleccionados
    const faltanColores = producto.capas.some(capa => 
      capa.colores.some(c => !c.colorId)
    );

    if (faltanColores) {
      alert('Por favor completa todos los colores antes de pasar a stock');
      return;
    }

    // Buscar el producto base en la base de datos
    this.http.get<any[]>('http://localhost:5000/api/productos').subscribe({
      next: (productos) => {
        // Buscar un producto que use este molde
        const productoBase = productos.find(p => 
          p.moldeNombre === producto.moldeNombre && 
          p.material.toLowerCase() === 'resina'
        );

        if (!productoBase) {
          alert('No se encontró un producto base con este molde. Por favor crea primero el producto en Agregar Productos.');
          return;
        }

        // Construir el objeto para Stock
        const stockData = {
          productoId: productoBase._id,
          productoNombre: productoBase.nombre,
          productoTipo: productoBase.producto,
          material: productoBase.material,
          cantidad: producto.cantidad,
          moldeId: producto.moldeId,
          moldeNombre: producto.moldeNombre,
          coloresPorCapa: producto.capas.map(capa => ({
            capaIndex: capa.capaIndex,
            capaNombre: capa.capaNombre,
            colorId: capa.colores[0].colorId,
            colorNombre: capa.colores[0].colorNombre,
            colorRgb: capa.colores[0].colorRgb
          })),
          detallesDiseno: this.generarDetallesDiseno(producto),
          imagenUrl: productoBase.imagenesUrls?.[0] || productoBase.imagenUrl || ''
        };

        console.log('📤 Enviando desde calculadora a stock:', stockData);

        // Enviar a stock
        this.http.post('http://localhost:5000/api/stock', stockData).subscribe({
          next: (response) => {
            console.log('✅ Respuesta del servidor:', response);
            alert(`✓ Producto agregado al stock: ${producto.cantidad} x ${producto.moldeNombre}`);
            // Opcionalmente eliminar de la calculadora
            if (confirm('¿Deseas eliminar este producto de la calculadora?')) {
              this.eliminarProducto(producto.id);
            }
          },
          error: (err) => {
            console.error('❌ Error al agregar a stock:', err);
            console.error('Datos enviados:', stockData);
            alert(`Error al agregar al stock: ${err.error?.mensaje || err.message}`);
          }
        });
      },
      error: (err) => {
        console.error('Error al buscar productos:', err);
        alert('Error al buscar el producto base');
      }
    });
  }

  // Generar detalles de diseño basados en las capas y colores
  generarDetallesDiseno(producto: ProductoTabla): string {
    const detalles: string[] = [];
    
    producto.capas.forEach(capa => {
      const coloresTexto = capa.colores
        .filter(c => c.colorId)
        .map(c => {
          let texto = c.colorNombre;
          if (c.nota) texto += ` (${c.nota})`;
          return texto;
        })
        .join(', ');
      
      if (coloresTexto) {
        detalles.push(`${capa.capaNombre}: ${coloresTexto}`);
      }
    });
    
    return detalles.join(' | ');
  }
}
