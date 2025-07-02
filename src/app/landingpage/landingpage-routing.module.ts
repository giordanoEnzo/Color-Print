import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingpageComponent } from './landingpage.component';
import { SobreComponent } from './sobre/sobre.component';

const routes: Routes = [
  { path: '', component: LandingpageComponent },
  { path: 'sobre', component: SobreComponent }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  
  exports: [RouterModule]
})
export class LandingpageRoutingModule { }
