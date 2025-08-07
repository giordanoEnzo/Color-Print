import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  // Painel administrativo
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./demo/dashboard/dashboard.component'),
      },
      {
        path: 'tables',
        loadChildren: () =>
          import('./demo/pages/tables/tables.module').then((m) => m.TablesModule),
      },
    ]
  },
  // Parte pública (site/loja)
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('./landingpage/landingpage.module').then(m => m.LandingpageModule)
      },
      {
        path: 'sobre',
        loadComponent: () =>
          import('./landingpage/sobre/sobre.component').then(m => m.SobreComponent)
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./landingpage/checkout/checkout.component').then(m => m.CheckoutComponent)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
