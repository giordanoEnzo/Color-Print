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

  // Pequena lista de membros da equipe (apenas para apresentação)
  team = [
    { name: 'Giordano Enzo', role: 'Fundador / CEO', photo: 'assets/images/team/team1.jpg' },
    { name: 'Mariana Silva', role: 'Designer Gráfico', photo: 'assets/images/team/team2.jpg' },
    { name: 'Carlos Pereira', role: 'Produção', photo: 'assets/images/team/team3.jpg' },
    { name: 'Ana Costa', role: 'Atendimento', photo: 'assets/images/team/team4.jpg' },
  ];

  // Texto para a seção "História" — pode ser trocado conforme necessário
  historiaText: string = 'A Color Print nasceu da vontade de unir criatividade e tecnologia para oferecer soluções de comunicação visual eficientes. Ao longo dos anos, crescemos com foco na qualidade, no cumprimento de prazos e no atendimento personalizado aos nossos clientes.';
}
