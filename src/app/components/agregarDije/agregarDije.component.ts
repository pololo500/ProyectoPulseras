import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TitleComponent } from '../title/title.component';
import { ButtonComponent } from '../button/button.component';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-agregarDije',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, ReactiveFormsModule, TitleComponent, ButtonComponent, CapitalizePipe],
  templateUrl: './agregarDije.component.html',
  styleUrl: './agregarDije.component.css'
})
export class AgregarDijeComponent {
  addDijeForm: FormGroup;

  constructor(private fb: FormBuilder, private http: HttpClient, private globalService: GlobalService) {
    this.addDijeForm = this.fb.group({
      nombre: [''],
      categoria: [''],
      color: [''],
      precio: [''],
      imagen: [null]
    });
  }

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/agregarDije");
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.addDijeForm.patchValue({ imagen: file });
  }

  submit() {
    const formValue = this.addDijeForm.value;

    const categoriasArray = formValue.categoria?.split(',').map((d: string) => d.trim()) || [];

    const file = formValue.imagen;

    if (!file) {
      console.error('No hay archivo seleccionado');
      return;
    }

    const imageData = new FormData();
    imageData.append('file', file);
    imageData.append('upload_preset', 'unsigned_upload');
    imageData.append('cloud_name', 'dkbkgyvw7');

    this.http.post<any>('https://api.cloudinary.com/v1_1/dkbkgyvw7/image/upload', imageData)
      .subscribe({
        next: (response) => {
          const imagenUrl = response.secure_url;

          const body = {
            nombre: formValue.nombre,
            categoria: categoriasArray,
            color: formValue.color,
            precio: parseFloat(formValue.precio),
            imagenUrl: imagenUrl
          };

          this.http.post(`http://localhost:5000/api/dijes`, body)
            .subscribe({
              next: (res) => {
                this.addDijeForm.reset();
              },
              error: (err) => {
                console.error('Error al guardar dije:', err);
              }
            });
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
        }
      });
  }
}