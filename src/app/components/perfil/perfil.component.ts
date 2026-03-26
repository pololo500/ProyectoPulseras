import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  email: string = '';
  nombreUsuario: string = '';
  
  // Formulario de datos personales
  datosForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    telefono: new FormControl('', [Validators.pattern('^[ \\-\\+\\(\\)]*(?:\\d[ \\-\\+\\(\\)]*){10}$')])
  });
  
  // Formulario de contraseña
  passwordForm = new FormGroup({
    passwordActual: new FormControl('', Validators.required),
    passwordNuevo: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarPassword: new FormControl('', Validators.required)
  });
  
  // Estados
  editandoPassword: boolean = false;
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' = 'success';
  cargando: boolean = false;
  mensajeTimeout: any;
  
  // Datos originales para comparar cambios
  datosOriginales: { nombre: string; telefono: string } = { nombre: '', telefono: '' };

  constructor(
    private http: HttpClient, 
    private router: Router,
    private globalService: GlobalService
  ) {}

  ngOnInit(): void {
    // Verificar que el usuario esté logueado
    if (!this.globalService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }
    
    this.email = sessionStorage.getItem('email') || '';
    this.nombreUsuario = sessionStorage.getItem('nombreUsuario') || '';
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario(): void {
    this.http.get<any>(`${environment.apiUrl}/usuarios/${this.email}`)
      .subscribe({
        next: (usuario) => {
          const nombre = usuario.nombre || '';
          const telefono = usuario.telefono || '';
          
          this.datosForm.patchValue({ nombre, telefono });
          this.datosOriginales = { nombre, telefono };
        },
        error: (err) => {
          console.error('Error al cargar datos:', err);
        }
      });
  }
  
  datosModificados(): boolean {
    return this.datosForm.value.nombre !== this.datosOriginales.nombre ||
           this.datosForm.value.telefono !== this.datosOriginales.telefono;
  }
  
  cancelarCambiosDatos(): void {
    this.datosForm.patchValue(this.datosOriginales);
    this.mensaje = '';
  }

  toggleEditarPassword(): void {
    this.editandoPassword = !this.editandoPassword;
    this.mensaje = '';
    if (!this.editandoPassword) {
      this.passwordForm.reset();
    }
  }

  get passwordsCoinciden(): boolean {
    return this.passwordForm.get('passwordNuevo')?.value === 
           this.passwordForm.get('confirmarPassword')?.value;
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    
    if (this.mensajeTimeout) {
      clearTimeout(this.mensajeTimeout);
    }
    
    this.mensajeTimeout = setTimeout(() => {
      this.mensaje = '';
    }, 5000);
  }

  // Capitalizar cada palabra del nombre
  private capitalizarNombre(nombre: string): string {
    return nombre
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  guardarDatos(): void {
    if (this.datosForm.invalid) return;
    
    this.cargando = true;
    const nombreCapitalizado = this.capitalizarNombre(this.datosForm.value.nombre || '');
    const datos = {
      nombre: nombreCapitalizado,
      telefono: this.datosForm.value.telefono
    };
    
    this.http.put<any>(`${environment.apiUrl}/usuarios/${this.email}/datos`, datos)
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.mostrarMensaje('Datos actualizados correctamente', 'success');
          
          // Actualizar datos originales
          this.datosOriginales = {
            nombre: datos.nombre as string,
            telefono: datos.telefono as string
          };
          
          // Actualizar sessionStorage
          sessionStorage.setItem('nombreUsuario', datos.nombre as string);
          this.nombreUsuario = datos.nombre as string;
        },
        error: (err) => {
          this.cargando = false;
          this.mostrarMensaje(err?.error?.error || 'Error al actualizar datos', 'error');
        }
      });
  }

  cambiarPassword(): void {
    if (this.passwordForm.invalid) return;
    
    if (!this.passwordsCoinciden) {
      this.mostrarMensaje('Las contraseñas no coinciden', 'error');
      return;
    }
    
    this.cargando = true;
    const datos = {
      passwordActual: this.passwordForm.value.passwordActual,
      passwordNuevo: this.passwordForm.value.passwordNuevo
    };
    
    this.http.put<any>(`${environment.apiUrl}/usuarios/${this.email}/password`, datos)
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.mostrarMensaje('Contraseña actualizada correctamente', 'success');
          this.editandoPassword = false;
          this.passwordForm.reset();
        },
        error: (err) => {
          this.cargando = false;
          this.mostrarMensaje(err?.error?.error || 'Error al cambiar contraseña', 'error');
        }
      });
  }

  cerrarSesion(): void {
    this.globalService.logout();
  }
}
