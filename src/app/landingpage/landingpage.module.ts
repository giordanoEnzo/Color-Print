import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingpageRoutingModule } from './landingpage-routing.module';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { LandingpageComponent } from './landingpage.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SobreComponent } from './sobre/sobre.component';
import { CheckoutComponent } from './checkout/checkout.component';

@NgModule({
  declarations: [
    LandingpageComponent,
    SobreComponent,
    HeaderComponent,
    FooterComponent,
    CheckoutComponent
  ],

  imports: [
    CommonModule,
    FormsModule,
    LandingpageRoutingModule,
    NgxMaskDirective
  ],
  providers: [provideNgxMask()],
})
export class LandingpageModule { }
