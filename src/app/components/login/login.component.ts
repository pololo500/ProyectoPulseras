import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { PopupLoginComponent } from '../popupLogin/popupLogin.component';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PopupErrorComponent } from '../popupError/popupError.component';
import { ParticleEffectSquare } from '../../extras/particle-effect-square';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { FavoritosService } from '../../services/favoritos.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, PopupLoginComponent, CommonModule, PopupErrorComponent],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  // Modo: 'login' o 'registro'
  modo: 'login' | 'registro' = 'login';
  
  // Formulario de login
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  });
  
  // Formulario de registro
  registroForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    nombre: new FormControl('', Validators.required),
    telefono: new FormControl(''),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarPassword: new FormControl('', Validators.required),
  });

  constructor(
    private http: HttpClient, 
    private router: Router,
    private carritoService: CarritoService,
    private favoritosService: FavoritosService
  ) {}
  
  popup = '';

  private particleEffectSquare!: ParticleEffectSquare;

  ngAfterViewInit(): void {
    this.initParticlesWithRetry();
  }

  private initParticlesWithRetry(attempts = 0): void {
    if (attempts > 20) return;
    
    setTimeout(() => {
      const canvas = document.getElementById('particle-canvas-square-inicio');
      if (canvas) {
        try {
          this.particleEffectSquare = new ParticleEffectSquare('particle-canvas-square-inicio');
        } catch (e) {
          console.warn('Error inicializando partículas en login:', e);
        }
      } else {
        this.initParticlesWithRetry(attempts + 1);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.particleEffectSquare) {
      this.particleEffectSquare.destroy();
    }
  }

  ngOnInit(): void {}

  // Cambiar entre login y registro
  cambiarModo(nuevoModo: 'login' | 'registro') {
    this.modo = nuevoModo;
    this.popup = '';
    this.loginForm.reset();
    this.registroForm.reset();
  }

  // Verificar si las contraseñas coinciden
  get passwordsCoinciden(): boolean {
    return this.registroForm.get('password')?.value === this.registroForm.get('confirmarPassword')?.value;
  }

  // Login
  onSubmitLogin() {
    const formData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/login`, formData)
      .subscribe({
        next: (res) => {
          if(res.success) {
            this.popup = 'success';
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", res.tipoUsuario);
            sessionStorage.setItem("nombreUsuario", res.nombre);
            
            // Sincronizar carrito con la base de datos
            this.carritoService.sincronizarAlLogin();
            
            // Sincronizar favoritos con la base de datos
            this.favoritosService.sincronizarAlLogin(formData.email as string);
          }
          this.loginForm.reset();
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          
          if(errorMessage == "contraseñaIncorrecta") {
            this.popup = 'contraseñaIncorrecta';
          } else {
            this.popup = 'emailNoRegistrado';
          }
          console.error('Error en el inicio de sesión:', err);
        }
      });
  }

  // Registro
  onSubmitRegistro() {
    if (!this.passwordsCoinciden) {
      this.popup = 'passwordsNoCoinciden';
      return;
    }
    
    const formData = {
      email: this.registroForm.value.email,
      nombre: this.registroForm.value.nombre,
      telefono: this.registroForm.value.telefono || '',
      password: this.registroForm.value.password
    };
  
    this.http.post<any>(`http://localhost:5000/api/usuarios/registro`, formData)
      .subscribe({
        next: (res) => {
          if(res.success) {
            // Auto-login: guardar sesión y redirigir a inicio
            sessionStorage.setItem("email", formData.email as string);
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("tipoUsuario", "Cliente");
            sessionStorage.setItem("nombreUsuario", formData.nombre as string);
            
            this.popup = 'registroExitoso';
            this.registroForm.reset();
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.error;
          
          if(errorMessage == "usuarioExistente") {
            this.popup = 'usuarioExistente';
          } else if(errorMessage == "emailInvalido") {
            this.popup = 'emailInvalido';
          } else {
            this.popup = 'errorRegistro';
          }
          console.error('Error en el registro:', err);
        }
      });
  }

  close() {
    this.popup = '';
  }

  continuarComoAnonimo() {
    this.router.navigate(['/productos']);
  }
}
