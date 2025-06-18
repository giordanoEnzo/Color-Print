import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import {AuthGuard} from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard], // ✅ AQUI
    data: { roles: ['ADMIN', 'FUNCIONARIO'] }, // Protege todas as rotas internas
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./demo/dashboard/dashboard.component'),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }, // Somente ADMIN pode ver
      },
      {
        path: 'basic',
        loadChildren: () => import('./demo/ui-elements/ui-basic/ui-basic.module').then((m) => m.UiBasicModule),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }, // Somente ADMIN pode ver
      },
      {
        path: 'forms',
        loadChildren: () => import('./demo/pages/form-elements/form-elements.module').then((m) => m.FormElementsModule),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }, // Somente ADMIN pode ver
      },
      {
        path: 'tables',
        loadChildren: () => import('./demo/pages/tables/tables.module').then((m) => m.TablesModule),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN', 'FUNCIONARIO'] }, // Somente ADMIN E FUNCIONARIO pode ver
      },
      {
        path: 'apexchart',
        loadComponent: () => import('./demo/chart/apex-chart/apex-chart.component'),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }, // Somente ADMIN pode ver
      },
      {
        path: 'sample-page',
        loadComponent: () => import('./demo/extra/sample-page/sample-page.component'),
        canActivate: [AuthGuard],
        data: { roles: ['ADMIN'] }, // Somente ADMIN pode ver
      }
    ]
  },
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: 'auth',
        loadChildren: () => import('./demo/pages/authentication/authentication.module').then((m) => m.AuthenticationModule)
      },
      {
        path: 'home',
        loadChildren: () => import('./landingpage/landingpage.module').then(m => m.LandingpageModule)
      }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
