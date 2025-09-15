import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { CapitalizePipe } from '../../extras/capitalizePipe';
import { GlobalService } from '../../services/global.service';

@Component({
    selector: 'app-agregarProducto',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonComponent, CapitalizePipe],
    templateUrl: './agregarProducto.component.html',
    styleUrl: './agregarProducto.component.css'
})
export class AgregarProductoComponent implements OnInit {
  addProductForm: FormGroup;
  productos: string[] = [];
  materiales: string[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient, private globalService: GlobalService) {
    this.addProductForm = this.fb.group({
      producto: [''],
      material: [''],
      nombre: [''],
      mostacillas: [''],
      dijes: [''],
      descripcion: [''],
      cant: [''],
      precio: [''],
      imagen: [null]
    });
  }

  ngOnInit(): void {
    this.globalService.checkLoggedIn("/agregarProducto");
    this.obtenerProductos();
    this.addProductForm.get('producto')?.valueChanges.subscribe(producto => {
      this.obtenerMateriales(producto);
    });
  }
  
  obtenerProductos() {
    const ocultar = ['dijes', 'admins'];
    this.http.get<string[]>('http://localhost:5000/api/colecciones')
      .subscribe(data => {
        this.productos = data.filter(p => !ocultar.includes(p.toLowerCase()));
      });
  }

  obtenerMateriales(producto: string) {
    this.http.get<any[]>(`http://localhost:5000/api/${producto}/materiales`)
      .subscribe(data => {
        this.materiales = data;
        this.addProductForm.get('material')?.setValue(null);
      });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.addProductForm.patchValue({ imagen: file });
  }

  submit() {
    const formValue = this.addProductForm.value;

    if (formValue.producto.toLowerCase() === 'dijes') {
      console.error('No se puede agregar dijes desde este formulario.');
      return;
    }

    const dijesArray = formValue.dijes?.split(',').map((d: string) => d.trim()) || [];
    const mostacillasArray = formValue.mostacillas?.split(',').map((m: string) => m.trim()) || [];

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
            material: formValue.material,
            nombre: formValue.nombre,
            mostacillas: mostacillasArray,
            dijes: dijesArray,
            descripcion: formValue.descripcion,
            cant: formValue.cant,
            precio: parseFloat(formValue.precio),
            imagenUrl: imagenUrl
          };

          this.http.post(`http://localhost:5000/api/${formValue.producto}`, body)
            .subscribe({
              next: (res) => {
                this.addProductForm.reset();
              },
              error: (err) => {
                console.error('Error al guardar producto:', err);
              }
            });
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
        }
      });
  }
}