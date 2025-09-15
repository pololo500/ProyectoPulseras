import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppComponent } from '../../app.component';
import { ButtonComponent } from '../button/button.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PopupLoginComponent } from '../popupLogin/popupLogin.component';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PopupErrorComponent } from '../popupError/popupError.component';
import { ParticleEffectSquare } from '../../extras/particle-effect-square';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ RouterOutlet, AppComponent, ReactiveFormsModule, ButtonComponent, PopupLoginComponent, CommonModule, PopupErrorComponent ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  loginForm = new FormGroup({
    dni: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  constructor(private http: HttpClient) {}
  
  popup = '';

  private particleEffectSquare!: ParticleEffectSquare;

  ngAfterViewInit(): void {
    this.particleEffectSquare = new ParticleEffectSquare('particle-canvas-square-inicio');
  }

  ngOnDestroy(): void {
    if (this.particleEffectSquare) {
      this.particleEffectSquare.destroy();
    }
  }

  ngOnInit(): void {}

  onSubmit() {
    (async () => {    
      const formData = {
        dni: this.loginForm.value.dni,
        password: this.loginForm.value.password
      };
    
      try {
        const body = {
          dni: formData.dni,
          password: formData.password,
        };
        this.http.post<any>(`http://localhost:5000/api/admins`, body)
            .subscribe({
              next: (res) => {
                console.log(res);
                if(res.success) {
                  this.popup = 'success';
                  sessionStorage.setItem("dni", formData.dni as string);
                  sessionStorage.setItem("isLoggedIn", "true");
                }
                this.loginForm.reset();
              },
              error: (err) => {
                const errorMessage = err?.error?.error;
                
                if(errorMessage == "contraseñaIncorrecta") {
                  this.popup = 'contraseñaIncorrecta';
                } else {
                  this.popup = 'fail';
                }
                console.error('Error en el inicio de sesión:', err);
              }
            });
      } catch (error) {
        console.error('Error en el inicio de sesión:', error);
      }
    })();
  }

  close() {
    this.popup = '';
  }
}
