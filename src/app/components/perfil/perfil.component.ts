import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GlobalService } from '../../services/global.service';

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
    telefono: new FormControl('')
  });
  
  // Formulario de contraseña
  passwordForm = new FormGroup({
    passwordActual: new FormControl('', Validators.required),
    passwordNuevo: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarPassword: new FormControl('', Validators.required)
  });
  
  // Estados
  editandoDatos: boolean = false;
  editandoPassword: boolean = false;
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' = 'success';
  cargando: boolean = false;

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
    this.http.get<any>(`http://localhost:5000/api/usuarios/${this.email}`)
      .subscribe({
        next: (usuario) => {
          this.datosForm.patchValue({
            nombre: usuario.nombre,
            telefono: usuario.telefono || ''
          });
        },
        error: (err) => {
          console.error('Error al cargar datos:', err);
        }
      });
  }

  toggleEditarDatos(): void {
    this.editandoDatos = !this.editandoDatos;
    this.mensaje = '';
    if (!this.editandoDatos) {
      this.cargarDatosUsuario(); // Recargar datos originales si cancela
    }
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

  guardarDatos(): void {
    if (this.datosForm.invalid) return;
    
    this.cargando = true;
    const datos = {
      nombre: this.datosForm.value.nombre,
      telefono: this.datosForm.value.telefono
    };
    
    this.http.put<any>(`http://localhost:5000/api/usuarios/${this.email}/datos`, datos)
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.mensaje = 'Datos actualizados correctamente';
          this.tipoMensaje = 'success';
          this.editandoDatos = false;
          
          // Actualizar sessionStorage
          sessionStorage.setItem('nombreUsuario', datos.nombre as string);
          this.nombreUsuario = datos.nombre as string;
        },
        error: (err) => {
          this.cargando = false;
          this.mensaje = err?.error?.error || 'Error al actualizar datos';
          this.tipoMensaje = 'error';
        }
      });
  }

  cambiarPassword(): void {
    if (this.passwordForm.invalid) return;
    
    if (!this.passwordsCoinciden) {
      this.mensaje = 'Las contraseñas no coinciden';
      this.tipoMensaje = 'error';
      return;
    }
    
    this.cargando = true;
    const datos = {
      passwordActual: this.passwordForm.value.passwordActual,
      passwordNuevo: this.passwordForm.value.passwordNuevo
    };
    
    this.http.put<any>(`http://localhost:5000/api/usuarios/${this.email}/password`, datos)
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.mensaje = 'Contraseña actualizada correctamente';
          this.tipoMensaje = 'success';
          this.editandoPassword = false;
          this.passwordForm.reset();
        },
        error: (err) => {
          this.cargando = false;
          this.mensaje = err?.error?.error || 'Error al cambiar contraseña';
          this.tipoMensaje = 'error';
        }
      });
  }

  cerrarSesion(): void {
    this.globalService.logout();
  }
}
