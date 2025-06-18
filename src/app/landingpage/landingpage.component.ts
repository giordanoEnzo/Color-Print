import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingpageComponent implements OnInit {
  
  maisVendidos: any[] = [];

  destaque: any = {
    nome: 'Signal DL',
    preco: 129.00,
    imagem: 'assets/images/card.jpg'
  };

  produtoDestaque = {
    id_produto: 999, // um ID fictício, só precisa ser único
    nome: 'Combo',
    descricao: 'Combo promocional especial',
    preco: 25.00,
    imagemUrl: 'assets/images/promo.jpg'
  };

  carrinho: any[] = [];
  carrinhoAberto = false;
  mostrarModal = false;

  constructor(
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {

    this.maisVendidos = [  
      {
        id_produto: 1,
        nome: 'Cartão de Visita Premium',
        preco: 49.90,
        imagem: 'assets/images/produto1.jpg'
      },
      {
        id_produto: 2,
        nome: 'Banner Promocional',
        preco: 89.90,
        imagem: 'assets/images/produto2.jpg'
      },
      {
        id_produto: 3,
        nome: 'Imã de Geladeira',
        preco: 29.90,
        imagem: 'assets/images/produto3.jpg'
      }
    ];

  }


  adicionarAoCarrinho(produto: any) {
    const existente = this.carrinho.find(p => p.id_produto === produto.id_produto);
    if (existente) {
      existente.quantidade += 1;
      this.toastr.success('Mais uma unidade adicionada ao carrinho!');
    } else {
      this.carrinho.push({ ...produto, quantidade: 1 });
      this.toastr.success('Produto adicionado ao carrinho!');
    }
  }




}
