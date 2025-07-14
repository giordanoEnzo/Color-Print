import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingpageRoutingModule } from './landingpage-routing.module';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { LandingpageComponent } from './landingpage.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SobreComponent } from './sobre/sobre.component';

@NgModule({
  declarations: [
    LandingpageComponent,
    SobreComponent,
  ],

  imports: [
    CommonModule,
    FormsModule,
    LandingpageRoutingModule,
    HeaderComponent,
    FooterComponent,
    NgxMaskDirective
  ],
  providers: [provideNgxMask()],
})
export class LandingpageModule { }
