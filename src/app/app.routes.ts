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
    { path: '', component: InicioComponent, title: 'LM HermanHadas' },
    { path: 'inicio', component: InicioComponent, title: 'LM HermanHadas - Inicio' },
    { path: 'inicioAdministrador', component: InicioAdminComponent, title: 'LM HermanHadas - Inicio' },
    { path: 'login', component: LoginComponent, title: 'LM HermanHadas - Iniciar Sesión' },
    { path: 'productos', component: ProductosComponent, title: 'LM HermanHadas - Productos' },
    { path: 'favoritos', component: FavoritosComponent, title: 'LM HermanHadas - Favoritos' },
    { path: 'carrito', component: CarritoComponent, title: 'LM HermanHadas - Carrito' },
    { path: 'mis-pedidos', component: MisPedidosComponent, title: 'LM HermanHadas - Mis Pedidos' },
    { path: 'perfil', component: PerfilComponent, title: 'LM HermanHadas - Mi Perfil' },
    { path: 'contacto', component: ContactoComponent, title: 'LM HermanHadas - Contacto' },
    { path: 'agregarProducto', component: AgregarProductoComponent, title: 'LM HermanHadas - Agregar Producto' },
    { path: 'agregarSvg', component: AgregarSvgComponent, title: 'LM HermanHadas - Gestionar SVGs' },
    { path: 'modificarProductos', component: ModificarProductosComponent, title: 'LM HermanHadas - Modificar Productos' },
    { path: 'calculadoraResina', component: CalculadoraResinaComponent, title: 'LM HermanHadas - Calculadora de Resina' },
    { path: 'ventas', component: VentasComponent, title: 'LM HermanHadas - Ventas' },
    { path: 'compras', component: ComprasComponent, title: 'LM HermanHadas - Compras' },
    { path: 'pedidos', component: PedidosComponent, title: 'LM HermanHadas - Pedidos' },
    { path: 'clientes', component: ClientesComponent, title: 'LM HermanHadas - Clientes' },
    { path: 'stock', component: StockComponent, title: 'LM HermanHadas - Stock' },
    { path: 'recursos', component: RecursosComponent, title: 'LM HermanHadas - Recursos' },
    { path: '**', component: ErrorComponent, title: 'LM HermanHadas - Error' }
];
