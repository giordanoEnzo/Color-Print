import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingpageComponent implements OnInit {
  
  maisVendidos: any[] = [];
  categoriasComProdutos: any[] = [];

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
    private toastr: ToastrService,
    private produtoService: ProdutoService
  ) {}

  ngOnInit(): void {
    this.carregarCategoriasComProdutos();
  }

  carregarCategoriasComProdutos(): void {
    this.produtoService.getCategoriasComProdutos().subscribe({
      next: (res) => {
        this.categoriasComProdutos = res;
        console.log('Categorias e produtos:', res); // opcional para debug
      },
      error: (err) => {
        console.error('Erro ao carregar categorias e produtos:', err);
      }
    });
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
