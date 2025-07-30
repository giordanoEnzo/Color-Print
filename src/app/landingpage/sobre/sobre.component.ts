import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sobre',
  templateUrl: './sobre.component.html',
  styleUrls: ['./sobre.component.scss']
})
export class SobreComponent {
  imagemEquipeUrl = `${environment.assetsUrl}/uploads/imagens/equipe.jpg`;
}
