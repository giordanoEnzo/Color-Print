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

  // Equipe
  team = [
    { name: 'Giordano Enzo', role: 'Fundador & CEO', photo: 'assets/images/team/team1.jpg' },
    { name: 'Mariana Silva', role: 'Designer Gráfico', photo: 'assets/images/team/team2.jpg' },
    { name: 'Carlos Pereira', role: 'Gerente de Produção', photo: 'assets/images/team/team3.jpg' },
    { name: 'Ana Costa', role: 'Atendimento ao Cliente', photo: 'assets/images/team/team4.jpg' },
  ];

  // História da empresa
  historiaText: string = 'A Color Print nasceu da vontade de unir criatividade e tecnologia para oferecer soluções de comunicação visual que realmente fazem a diferença. Ao longo dos anos, crescemos mantendo nosso compromisso com a excelência, focando na qualidade superior dos produtos, no cumprimento rigoroso de prazos e em um atendimento verdadeiramente personalizado. Hoje, somos reconhecidos não apenas pela qualidade técnica do nosso trabalho, mas também pela parceria que construímos com cada cliente.';
}
