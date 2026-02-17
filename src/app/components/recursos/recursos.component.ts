import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';
import { PopupMoldeComponent } from '../popupMolde/popupMolde.component';
import { PopupColorComponent } from '../popupColor/popupColor.component';

interface Capa {
  nombre: string;
  volumen: number;
}

interface SvgAreaMapping {
  capaIndex: number;
  capaNombre: string;
  svgElementId: string;
}

interface Molde {
  _id: string;
  nombre: string;
  capas: Capa[];
  svgContent?: string;
  svgAreaMappings?: SvgAreaMapping[];
}

interface Color {
  _id: string;
  nombre: string;
  rgb: string;
  categoria: string;
}

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, PopupMoldeComponent, PopupColorComponent],
  templateUrl: './recursos.component.html',
  styleUrl: './recursos.component.css'
})
export class RecursosComponent implements OnInit {
  // Tab activa
  tabActiva: 'colores' | 'moldes' | 'svgs' = 'colores';

  // Datos
  colores: Color[] = [];
  moldes: Molde[] = [];
  cargandoColores = false;
  cargandoMoldes = false;

  // Búsquedas
  busquedaColor = '';
  busquedaMolde = '';

  // Popup Color
  mostrarPopupColor = false;
  colorParaEditar: Color | null = null;

  // Popup Molde
  mostrarPopupMolde = false;
  moldeParaEditar: Molde | null = null;

  // SVG (reusar lógica de agregarSvg)
  moldeSeleccionado: Molde | null = null;
  svgContent = '';
  svgPreview: SafeHtml | null = null;
  svgElementIds: string[] = [];
  areaMappings: SvgAreaMapping[] = [];
  guardandoSvg = false;
  mensajeSvg = '';
  tipoMensajeSvg: 'exito' | 'error' | '' = '';

  coloresPreview: string[] = [
    '#E53935', '#1E88E5', '#43A047', '#FFD700', '#FF69B4', '#9C27B0', '#FF5722', '#00BCD4'
  ];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private globalService: GlobalService
  ) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn('/recursos', true);
    this.cargarColores();
    this.cargarMoldes();
  }

  // ==================== TAB ====================
  cambiarTab(tab: 'colores' | 'moldes' | 'svgs'): void {
    this.tabActiva = tab;
  }

  // ==================== COLORES ====================
  cargarColores(): void {
    this.cargandoColores = true;
    this.http.get<Color[]>('http://localhost:5000/api/colores').subscribe({
      next: (data) => { this.colores = data; this.cargandoColores = false; },
      error: (err) => { console.error('Error al cargar colores:', err); this.cargandoColores = false; }
    });
  }

  get coloresFiltrados(): Color[] {
    if (!this.busquedaColor.trim()) return this.colores;
    const busqueda = this.busquedaColor.toLowerCase();
    return this.colores.filter(c =>
      c.nombre.toLowerCase().includes(busqueda) ||
      c.rgb.toLowerCase().includes(busqueda) ||
      c.categoria.toLowerCase().includes(busqueda)
    );
  }

  get coloresTranslucidos(): Color[] {
    return this.coloresFiltrados.filter(c => c.categoria === 'translucido');
  }

  get coloresPolvo(): Color[] {
    return this.coloresFiltrados.filter(c => c.categoria === 'polvo');
  }

  abrirPopupCrearColor(): void {
    this.colorParaEditar = null;
    this.mostrarPopupColor = true;
  }

  abrirPopupEditarColor(color: Color): void {
    this.colorParaEditar = { ...color };
    this.mostrarPopupColor = true;
  }

  cerrarPopupColor(): void {
    this.mostrarPopupColor = false;
    this.colorParaEditar = null;
  }

  onColorGuardado(color: Color): void {
    this.colores.push(color);
  }

  onColorActualizado(color: Color): void {
    const index = this.colores.findIndex(c => c._id === color._id);
    if (index !== -1) this.colores[index] = color;
  }

  onColorEliminado(colorId: string): void {
    this.colores = this.colores.filter(c => c._id !== colorId);
  }

  onColoresImportados(colores: Color[]): void {
    this.colores.push(...colores);
  }

  getTextColor(hex: string): string {
    if (!hex) return '#fff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000447' : '#ffffff';
  }

  // ==================== MOLDES ====================
  cargarMoldes(): void {
    this.cargandoMoldes = true;
    this.http.get<Molde[]>('http://localhost:5000/api/moldes').subscribe({
      next: (data) => { this.moldes = data; this.cargandoMoldes = false; },
      error: (err) => { console.error('Error al cargar moldes:', err); this.cargandoMoldes = false; }
    });
  }

  get moldesFiltrados(): Molde[] {
    if (!this.busquedaMolde.trim()) return this.moldes;
    const busqueda = this.busquedaMolde.toLowerCase();
    return this.moldes.filter(m =>
      m.nombre.toLowerCase().includes(busqueda) ||
      m.capas.some(c => c.nombre.toLowerCase().includes(busqueda))
    );
  }

  abrirPopupCrearMolde(): void {
    this.moldeParaEditar = null;
    this.mostrarPopupMolde = true;
  }

  abrirPopupEditarMolde(molde: Molde): void {
    this.moldeParaEditar = { ...molde, capas: molde.capas.map(c => ({ ...c })) };
    this.mostrarPopupMolde = true;
  }

  cerrarPopupMolde(): void {
    this.mostrarPopupMolde = false;
    this.moldeParaEditar = null;
  }

  onMoldeGuardado(molde: Molde): void {
    this.moldes.push(molde);
  }

  onMoldeActualizado(molde: Molde): void {
    const index = this.moldes.findIndex(m => m._id === molde._id);
    if (index !== -1) this.moldes[index] = molde;
    if (this.moldeSeleccionado && this.moldeSeleccionado._id === molde._id) {
      this.seleccionarMoldeSvg(molde);
    }
  }

  onMoldeEliminado(moldeId: string): void {
    this.moldes = this.moldes.filter(m => m._id !== moldeId);
    if (this.moldeSeleccionado && this.moldeSeleccionado._id === moldeId) {
      this.limpiarSeleccionSvg();
    }
  }

  onMoldesImportados(moldes: Molde[]): void {
    this.moldes.push(...moldes);
  }

  tieneSvg(molde: Molde): boolean {
    return !!molde.svgContent;
  }

  // ==================== SVGs ====================
  seleccionarMoldeSvg(molde: Molde): void {
    this.moldeSeleccionado = molde;
    this.mensajeSvg = '';
    this.tipoMensajeSvg = '';

    if (molde.svgContent) {
      this.svgContent = molde.svgContent;
      this.procesarSvg();
      if (molde.svgAreaMappings && molde.svgAreaMappings.length > 0) {
        this.areaMappings = [...molde.svgAreaMappings];
      } else {
        this.inicializarMappings();
      }
    } else {
      this.svgContent = '';
      this.svgPreview = null;
      this.svgElementIds = [];
      this.inicializarMappings();
    }
  }

  inicializarMappings(): void {
    if (!this.moldeSeleccionado) return;
    this.areaMappings = this.moldeSeleccionado.capas.map((capa, index) => ({
      capaIndex: index,
      capaNombre: capa.nombre,
      svgElementId: ''
    }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.name.endsWith('.svg')) {
      this.mostrarMensajeSvg('Por favor selecciona un archivo SVG válido', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.svgContent = e.target?.result as string;
      this.procesarSvg();
      this.inicializarMappings();
    };
    reader.readAsText(file);
    input.value = '';
  }

  procesarSvg(): void {
    if (!this.svgContent) return;
    let svgLimpio = this.prepararSvg(this.svgContent);
    this.svgElementIds = this.extraerElementIds(svgLimpio);
    this.actualizarPreview();
  }

  prepararSvg(svgString: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return svgString;
    if (!svg.getAttribute('viewBox')) {
      const width = svg.getAttribute('width') || '200';
      const height = svg.getAttribute('height') || '200';
      svg.setAttribute('viewBox', `0 0 ${parseInt(width)} ${parseInt(height)}`);
    }
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return new XMLSerializer().serializeToString(svg);
  }

  extraerElementIds(svgString: string): string[] {
    const ids: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const elementos = doc.querySelectorAll('[id]');
    elementos.forEach(el => {
      const id = el.getAttribute('id');
      const tagName = el.tagName.toLowerCase();
      const elementosColoreables = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'g', 'use'];
      if (id && (elementosColoreables.includes(tagName) || el.querySelector('path, rect, circle, ellipse, polygon'))) {
        ids.push(id);
      }
    });
    return ids;
  }

  actualizarPreview(): void {
    if (!this.svgContent) { this.svgPreview = null; return; }
    let svgConColores = this.svgContent;
    this.areaMappings.forEach((mapping, index) => {
      if (mapping.svgElementId) {
        const color = this.coloresPreview[index % this.coloresPreview.length];
        svgConColores = this.aplicarColorAElemento(svgConColores, mapping.svgElementId, color);
      }
    });
    this.svgPreview = this.sanitizer.bypassSecurityTrustHtml(svgConColores);
  }

  aplicarColorAElemento(svgString: string, elementId: string, color: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const elemento = doc.getElementById(elementId);
    if (elemento) this.colorearElemento(elemento, color);
    return new XMLSerializer().serializeToString(doc);
  }

  colorearElemento(elemento: Element, color: string): void {
    const tagName = elemento.tagName.toLowerCase();
    const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
    if (elementosConFill.includes(tagName)) {
      elemento.setAttribute('fill', color);
      const style = elemento.getAttribute('style') || '';
      const nuevoStyle = style.replace(/fill\s*:\s*[^;]+;?/gi, '') + `fill: ${color};`;
      elemento.setAttribute('style', nuevoStyle);
    }
    const hijos = elemento.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
    hijos.forEach(hijo => {
      hijo.setAttribute('fill', color);
      const style = hijo.getAttribute('style') || '';
      const nuevoStyle = style.replace(/fill\s*:\s*[^;]+;?/gi, '') + `fill: ${color};`;
      hijo.setAttribute('style', nuevoStyle);
    });
  }

  onMappingChange(): void {
    this.actualizarPreview();
  }

  guardarSvg(): void {
    if (!this.moldeSeleccionado || !this.svgContent) {
      this.mostrarMensajeSvg('Selecciona un molde y carga un SVG primero', 'error');
      return;
    }
    const mappingsIncompletos = this.areaMappings.filter(m => !m.svgElementId);
    if (mappingsIncompletos.length > 0) {
      this.mostrarMensajeSvg('Asigna un elemento SVG a cada capa del molde', 'error');
      return;
    }
    this.guardandoSvg = true;
    const datosActualizados = {
      svgContent: this.prepararSvg(this.svgContent),
      svgAreaMappings: this.areaMappings
    };
    this.http.put(`http://localhost:5000/api/moldes/${this.moldeSeleccionado._id}`, datosActualizados)
      .subscribe({
        next: () => {
          this.guardandoSvg = false;
          this.mostrarMensajeSvg('SVG guardado correctamente', 'exito');
          if (this.moldeSeleccionado) {
            this.moldeSeleccionado.svgContent = datosActualizados.svgContent;
            this.moldeSeleccionado.svgAreaMappings = datosActualizados.svgAreaMappings;
          }
          this.cargarMoldes();
        },
        error: (err) => {
          this.guardandoSvg = false;
          console.error('Error al guardar:', err);
          this.mostrarMensajeSvg('Error al guardar el SVG', 'error');
        }
      });
  }

  eliminarSvg(): void {
    if (!this.moldeSeleccionado) return;
    if (!confirm('¿Estás seguro de eliminar el SVG de este molde?')) return;
    this.guardandoSvg = true;
    const datosActualizados = { svgContent: null, svgAreaMappings: [] };
    this.http.put(`http://localhost:5000/api/moldes/${this.moldeSeleccionado._id}`, datosActualizados)
      .subscribe({
        next: () => {
          this.guardandoSvg = false;
          this.mostrarMensajeSvg('SVG eliminado correctamente', 'exito');
          this.svgContent = '';
          this.svgPreview = null;
          this.svgElementIds = [];
          this.inicializarMappings();
          if (this.moldeSeleccionado) {
            this.moldeSeleccionado.svgContent = undefined;
            this.moldeSeleccionado.svgAreaMappings = undefined;
          }
          this.cargarMoldes();
        },
        error: (err) => {
          this.guardandoSvg = false;
          console.error('Error al eliminar:', err);
          this.mostrarMensajeSvg('Error al eliminar el SVG', 'error');
        }
      });
  }

  todosLosMapeosCompletos(): boolean {
    return this.areaMappings.every(m => m.svgElementId && m.svgElementId.length > 0);
  }

  limpiarSeleccionSvg(): void {
    this.moldeSeleccionado = null;
    this.svgContent = '';
    this.svgPreview = null;
    this.svgElementIds = [];
    this.areaMappings = [];
    this.mensajeSvg = '';
    this.tipoMensajeSvg = '';
  }

  mostrarMensajeSvg(texto: string, tipo: 'exito' | 'error'): void {
    this.mensajeSvg = texto;
    this.tipoMensajeSvg = tipo;
    setTimeout(() => { this.mensajeSvg = ''; this.tipoMensajeSvg = ''; }, 4000);
  }
}
