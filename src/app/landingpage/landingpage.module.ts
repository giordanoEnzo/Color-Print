import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingpageComponent } from './landingpage.component';
import { LandingpageRoutingModule } from './landingpage-routing.module';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@NgModule({
  declarations: [LandingpageComponent],
  imports: [
    CommonModule,
    FormsModule,
    LandingpageRoutingModule,
    NgxMaskDirective
  ],
  providers: [provideNgxMask()],
})
export class LandingpageModule { }
