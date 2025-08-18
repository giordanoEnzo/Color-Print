import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sobre',
  templateUrl: './sobre.component.html',
  styleUrls: ['./sobre.component.scss']
})
export class SobreComponent {
  // cache-buster pra refletir troca imediata feita no admin
  private _cb = `?v=${Date.now()}`;

  // usa sempre o B4.jpg do backend
  imagemEquipeUrl = `${environment.assetsUrl.replace(/\/$/, '')}/uploads/imagens/B4.jpg${this._cb}`;
}
