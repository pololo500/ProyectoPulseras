import { Routes } from '@angular/router';
//import { HomeComponent } from './components/home/home.component';
import { AgregarProductoComponent } from './components/agregarProducto/agregarProducto.component';
import { LoginComponent } from './components/login/login.component';
import { ErrorComponent } from './components/error/error.component';
import { InicioAdminComponent } from './components/inicioAdmin/inicioAdmin.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { CalculadoraResinaComponent } from './components/calculadoraResina/calculadoraResina.component';
import { VentasComponent } from './components/ventas/ventas.component';
import { ComprasComponent } from './components/compras/compras.component';
import { PedidosComponent } from './components/pedidos/pedidos.component';
import { ModificarProductosComponent } from './components/modificarProductos/modificarProductos.component';
import { ProductosComponent } from './components/productos/productos.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { ContactoComponent } from './components/contacto/contacto.component';
import { FavoritosComponent } from './components/favoritos/favoritos.component';
import { MisPedidosComponent } from './components/misPedidos/misPedidos.component';
import { ClientesComponent } from './components/clientes/clientes.component';
import { AgregarSvgComponent } from './components/agregarSvg/agregarSvg.component';
import { StockComponent } from './components/stock/stock.component';
import { RecursosComponent } from './components/recursos/recursos.component';

export const routes: Routes = [
    { path: '', component: InicioComponent, title: 'LM Pulseras' },
    { path: 'inicio', component: InicioComponent, title: 'LM Pulseras - Inicio' },
    { path: 'inicioAdministrador', component: InicioAdminComponent, title: 'LM Pulseras - Inicio' },
    { path: 'login', component: LoginComponent, title: 'LM Pulseras - Iniciar Sesión' },
    { path: 'productos', component: ProductosComponent, title: 'LM Pulseras - Productos' },
    { path: 'favoritos', component: FavoritosComponent, title: 'LM Pulseras - Favoritos' },
    { path: 'carrito', component: CarritoComponent, title: 'LM Pulseras - Carrito' },
    { path: 'mis-pedidos', component: MisPedidosComponent, title: 'LM Pulseras - Mis Pedidos' },
    { path: 'perfil', component: PerfilComponent, title: 'LM Pulseras - Mi Perfil' },
    { path: 'contacto', component: ContactoComponent, title: 'LM Pulseras - Contacto' },
    { path: 'agregarProducto', component: AgregarProductoComponent, title: 'LM Pulseras - Agregar Producto' },
    { path: 'agregarSvg', component: AgregarSvgComponent, title: 'LM Pulseras - Gestionar SVGs' },
    { path: 'modificarProductos', component: ModificarProductosComponent, title: 'LM Pulseras - Modificar Productos' },
    { path: 'calculadoraResina', component: CalculadoraResinaComponent, title: 'LM Pulseras - Calculadora de Resina' },
    { path: 'ventas', component: VentasComponent, title: 'LM Pulseras - Ventas' },
    { path: 'compras', component: ComprasComponent, title: 'LM Pulseras - Compras' },
    { path: 'pedidos', component: PedidosComponent, title: 'LM Pulseras - Pedidos' },
    { path: 'clientes', component: ClientesComponent, title: 'LM Pulseras - Clientes' },
    { path: 'stock', component: StockComponent, title: 'LM Pulseras - Stock' },
    { path: 'recursos', component: RecursosComponent, title: 'LM Pulseras - Recursos' },
    { path: '**', component: ErrorComponent, title: 'LM Pulseras - Error' }
];
