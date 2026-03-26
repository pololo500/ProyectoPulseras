import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { ordenarAlfabetico } from '../../extras/color-sort';
import { GlobalService } from '../../services/global.service';
import { PopupMoldeComponent } from '../popupMolde/popupMolde.component';
import { PopupConfirmComponent } from '../popupConfirm/popupConfirm.component';
import { environment } from '../../../environments/environment';

interface Capa {
  nombre: string;
  volumen: number;
}

interface SvgAreaMapping {
  capaIndex: number;
  capaNombre: string;
  svgElementId: string;  // ID del elemento en el SVG (ej: "layer1", "area-base")
}

interface Molde {
  _id: string;
  nombre: string;
  capas: Capa[];
  svgContent?: string;           // Contenido SVG como string
  svgAreaMappings?: SvgAreaMapping[];  // Mapeo de capas a áreas del SVG
}

@Component({
  selector: 'app-agregar-svg',
  standalone: true,
  imports: [CommonModule, FormsModule, CapitalizePipe, PopupMoldeComponent, PopupConfirmComponent],
  templateUrl: './agregarSvg.component.html',
  styleUrl: './agregarSvg.component.css'
})
export class AgregarSvgComponent implements OnInit {
  moldes: Molde[] = [];
  moldeSeleccionado: Molde | null = null;
  
  // Popup molde
  mostrarPopupMolde: boolean = false;
  moldeParaEditar: Molde | null = null;

  // Popup confirmar eliminar SVG
  mostrarPopupEliminarSvg = false;
  
  // SVG cargado
  svgContent: string = '';
  svgPreview: SafeHtml | null = null;
  svgElementIds: string[] = [];  // IDs encontrados en el SVG
  
  // Mapeo de capas a elementos SVG
  areaMappings: SvgAreaMapping[] = [];
  
  // Estado
  cargando: boolean = false;
  guardando: boolean = false;
  mensaje: string = '';
  tipoMensaje: 'exito' | 'error' | '' = '';
  
  // Colores de preview para cada capa
  coloresPreview: string[] = [
    '#E53935', '#1E88E5', '#43A047', '#FFD700', '#FF69B4', '#9C27B0', '#FF5722', '#00BCD4'
  ];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private globalService: GlobalService
  ) {}

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/agregarSvg");
    this.cargarMoldes();
  }

  cargarMoldes(): void {
    this.cargando = true;
    this.http.get<Molde[]>(`${environment.apiUrl}/moldes`)
      .subscribe({
        next: (data) => {
          this.moldes = ordenarAlfabetico(data);
          this.cargando = false;
        },
        error: (err) => {
          
          this.mostrarMensaje('Error al cargar los moldes', 'error');
          this.cargando = false;
        }
      });
  }

  seleccionarMolde(molde: Molde): void {
    this.moldeSeleccionado = molde;
    this.mensaje = '';
    this.tipoMensaje = '';
    
    // Si el molde ya tiene SVG, cargarlo
    if (molde.svgContent) {
      this.svgContent = molde.svgContent;
      this.procesarSvg();
      
      // Cargar mapeos existentes
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

  // Manejar carga de archivo SVG
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    if (!file.name.endsWith('.svg')) {
      this.mostrarMensaje('Por favor selecciona un archivo SVG válido', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.svgContent = e.target?.result as string;
      this.procesarSvg();
      this.inicializarMappings();
    };
    reader.readAsText(file);
    
    // Resetear input para permitir seleccionar el mismo archivo
    input.value = '';
  }

  procesarSvg(): void {
    if (!this.svgContent) return;

    // Limpiar el SVG para asegurar que tenga los atributos necesarios
    let svgLimpio = this.prepararSvg(this.svgContent);
    
    // Extraer IDs de elementos del SVG
    this.svgElementIds = this.extraerElementIds(svgLimpio);
    
    // Crear preview con colores de ejemplo
    this.actualizarPreview();
  }

  prepararSvg(svgString: string): string {
    // Crear un parser para el SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) return svgString;

    // Asegurar que el SVG tenga viewBox y dimensiones
    if (!svg.getAttribute('viewBox')) {
      const width = svg.getAttribute('width') || '200';
      const height = svg.getAttribute('height') || '200';
      svg.setAttribute('viewBox', `0 0 ${parseInt(width)} ${parseInt(height)}`);
    }
    
    // Establecer dimensiones responsivas
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    return new XMLSerializer().serializeToString(svg);
  }

  extraerElementIds(svgString: string): string[] {
    const ids: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // Buscar todos los elementos con ID que puedan ser coloreados
    const elementos = doc.querySelectorAll('[id]');
    elementos.forEach(el => {
      const id = el.getAttribute('id');
      const tagName = el.tagName.toLowerCase();
      
      // Incluir elementos que pueden tener fill (coloreables)
      const elementosColoreables = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'g', 'use'];
      
      if (id && (elementosColoreables.includes(tagName) || el.querySelector('path, rect, circle, ellipse, polygon'))) {
        ids.push(id);
      }
    });
    
    return ids;
  }

  actualizarPreview(): void {
    if (!this.svgContent) {
      this.svgPreview = null;
      return;
    }

    let svgConColores = this.svgContent;
    
    // Aplicar colores de preview basados en los mappings
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
    
    if (elemento) {
      // Aplicar color al elemento y sus hijos
      this.colorearElemento(elemento, color);
    }
    
    return new XMLSerializer().serializeToString(doc);
  }

  colorearElemento(elemento: Element, color: string): void {
    const tagName = elemento.tagName.toLowerCase();
    const elementosConFill = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
    
    if (elementosConFill.includes(tagName)) {
      elemento.setAttribute('fill', color);
      // Remover estilos inline que puedan sobrescribir
      const style = elemento.getAttribute('style') || '';
      const nuevoStyle = style.replace(/fill\s*:\s*[^;]+;?/gi, '') + `fill: ${color};`;
      elemento.setAttribute('style', nuevoStyle);
    }
    
    // Aplicar a todos los hijos también
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

  // Resaltar elemento SVG al pasar el mouse sobre el select
  resaltarElemento(elementId: string): void {
    // Implementar resaltado visual si es necesario
  }

  guardarSvg(): void {
    if (!this.moldeSeleccionado || !this.svgContent) {
      this.mostrarMensaje('Selecciona un molde y carga un SVG primero', 'error');
      return;
    }

    // Validar que todas las capas tengan un elemento asignado
    const mappingsIncompletos = this.areaMappings.filter(m => !m.svgElementId);
    if (mappingsIncompletos.length > 0) {
      this.mostrarMensaje('Asigna un elemento SVG a cada capa del molde', 'error');
      return;
    }

    this.guardando = true;

    const datosActualizados = {
      svgContent: this.prepararSvg(this.svgContent),
      svgAreaMappings: this.areaMappings
    };

    this.http.put(`${environment.apiUrl}/moldes/${this.moldeSeleccionado._id}`, datosActualizados)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarMensaje('SVG guardado correctamente', 'exito');
          
          // Actualizar molde en la lista local
          if (this.moldeSeleccionado) {
            this.moldeSeleccionado.svgContent = datosActualizados.svgContent;
            this.moldeSeleccionado.svgAreaMappings = datosActualizados.svgAreaMappings;
          }
          
          this.cargarMoldes();
        },
        error: (err) => {
          this.guardando = false;
          
          this.mostrarMensaje('Error al guardar el SVG', 'error');
        }
      });
  }

  eliminarSvg(): void {
    if (!this.moldeSeleccionado) return;
    this.mostrarPopupEliminarSvg = true;
  }

  confirmarEliminarSvg(): void {
    this.mostrarPopupEliminarSvg = false;
    if (!this.moldeSeleccionado) return;

    this.guardando = true;

    const datosActualizados = {
      svgContent: null,
      svgAreaMappings: []
    };

    this.http.put(`${environment.apiUrl}/moldes/${this.moldeSeleccionado._id}`, datosActualizados)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarMensaje('SVG eliminado correctamente', 'exito');
          
          // Limpiar estado local
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
          this.guardando = false;
          
          this.mostrarMensaje('Error al eliminar el SVG', 'error');
        }
      });
  }

  mostrarMensaje(texto: string, tipo: 'exito' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    
    setTimeout(() => {
      this.mensaje = '';
      this.tipoMensaje = '';
    }, 4000);
  }

  tieneSvg(molde: Molde): boolean {
    return !!molde.svgContent;
  }

  // Verificar si todos los mapeos están completos
  todosLosMapeosCompletos(): boolean {
    return this.areaMappings.every(m => m.svgElementId && m.svgElementId.length > 0);
  }

  limpiarSeleccion(): void {
    this.moldeSeleccionado = null;
    this.svgContent = '';
    this.svgPreview = null;
    this.svgElementIds = [];
    this.areaMappings = [];
    this.mensaje = '';
    this.tipoMensaje = '';
  }

  // ==================== POPUP MOLDE ====================
  abrirPopupCrear(): void {
    this.moldeParaEditar = null;
    this.mostrarPopupMolde = true;
  }

  abrirPopupEditar(molde: Molde, event: Event): void {
    event.stopPropagation();
    this.moldeParaEditar = { ...molde, capas: molde.capas.map(c => ({ ...c })) };
    this.mostrarPopupMolde = true;
  }

  cerrarPopupMolde(): void {
    this.mostrarPopupMolde = false;
    this.moldeParaEditar = null;
  }

  onMoldeGuardado(molde: Molde): void {
    this.moldes.push(molde);
    this.mostrarMensaje('Molde creado correctamente', 'exito');
  }

  onMoldeActualizado(molde: Molde): void {
    const index = this.moldes.findIndex(m => m._id === molde._id);
    if (index !== -1) {
      this.moldes[index] = molde;
    }
    // Si el molde editado es el seleccionado, actualizarlo
    if (this.moldeSeleccionado && this.moldeSeleccionado._id === molde._id) {
      this.seleccionarMolde(molde);
    }
    this.mostrarMensaje('Molde actualizado correctamente', 'exito');
  }

  onMoldeEliminado(moldeId: string): void {
    this.moldes = this.moldes.filter(m => m._id !== moldeId);
    if (this.moldeSeleccionado && this.moldeSeleccionado._id === moldeId) {
      this.limpiarSeleccion();
    }
    this.mostrarMensaje('Molde eliminado correctamente', 'exito');
  }

  onMoldesImportados(moldes: Molde[]): void {
    this.moldes.push(...moldes);
    this.mostrarMensaje(`${moldes.length} moldes importados correctamente`, 'exito');
  }
}
