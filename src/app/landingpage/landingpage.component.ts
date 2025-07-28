import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ProdutoService } from 'src/app/services/produto.service';
import { PixService } from 'src/app/services/pix.service';
import { CartService } from 'src/app/services/cart.service';

import { Produto } from 'src/app/services/cart.service';

interface Categoria {
  id_categoria: number;
  nome: string;
  produtos: Produto[];
}

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})

export class LandingpageComponent implements OnInit {
  categoriasComProdutos: Categoria[] = [];
  categoriaSelecionada: Categoria | null = null;
  produtosDaCategoria: Produto[] = [];

  textoDestaque: string = 'DESTAQUE DE PROMOÇÃO';
  repeteTexto = Array(20);

  produtoSelecionado: Produto | null = null;

  slides = [
    { imagem: 'assets/images/banner.jpg', alt: 'Banner 1' },
    { imagem: 'assets/images/banner2.jpg', alt: 'Banner 2' },
    { imagem: 'assets/images/banner3.jpg', alt: 'Banner 3' },
  ];
  slideIndex = 0;

  tamanhos = [
    { label: '21 x 15', preco: 15 },
    { label: '30 x 20', preco: 25 },
    { label: '40 x 30', preco: 35 }
  ];
  tamanhoSelecionado = this.tamanhos[0];

  quantidade: number = 1;
  precoCalculado: number = this.tamanhoSelecionado.preco;

  produtoDestaque: Produto = {
    id_produto: 999,
    nome: 'Placas adesivas proibido estacionar 2x2 100 Unidades',
    preco: 35.0,
    imagem: 'assets/images/produtos/SC001.jpg',
    descricao: 'Adesivo para Placa de Transito 50x50cm A-18 Saliencia Lombada Placa de sinalização vertical, utilizada para vias urbanas e/ou identificação de condomínios, loteamentos etc...Características:• Placa de Regulamentação;• Formato: Octogonal / Circular / Quadrado;• Fundo: Película Refletiva;• Orla: Película Refletiva (Exceto placas de advertência);• Algarismo/Letra/Símbolo: Preto;'
  };

  constructor(
    private toastr: ToastrService,
    private produtoService: ProdutoService,
    private pixService: PixService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.carregarCategoriasComProdutos();
    this.calcularPreco();
  }

  avancarSlide() {
    this.slideIndex = (this.slideIndex + 1) % this.slides.length;
  }

  voltarSlide() {
    this.slideIndex = (this.slideIndex - 1 + this.slides.length) % this.slides.length;
  }

  carregarCategoriasComProdutos(): void {
    this.produtoService.getCategoriasComProdutos().subscribe({
      next: (res: Categoria[]) => this.categoriasComProdutos = res,
      error: (err) => console.error('Erro ao carregar categorias e produtos:', err)
    });
  }

  verTodosDaCategoria(categoria: Categoria): void {
    this.categoriaSelecionada = categoria;
    this.produtosDaCategoria = categoria.produtos;
  }

  voltarParaHome(): void {
    this.categoriaSelecionada = null;
    this.produtosDaCategoria = [];
  }

  abrirModal(produto: Produto): void {
    this.produtoSelecionado = produto;
    this.tamanhoSelecionado = this.tamanhos[0];
    this.quantidade = 1;
    this.calcularPreco();
  }

  fecharModal(): void {
    this.produtoSelecionado = null;
  }

  selecionarTamanho(tamanho: { label: string; preco: number }): void {
    this.tamanhoSelecionado = tamanho;
    this.calcularPreco();
  }

  aumentarQuantidade(): void {
    this.quantidade++;
    this.calcularPreco();
  }

  diminuirQuantidade(): void {
    if (this.quantidade > 1) {
      this.quantidade--;
      this.calcularPreco();
    }
  }

  incrementarQuantidade() {
    this.quantidade++;
    this.calcularPreco();
  }

  decrementarQuantidade() {
    if (this.quantidade > 1) {
      this.quantidade--;
      this.calcularPreco();
    }
  }

  calcularPreco(): void {
    const precoUnitario = this.tamanhoSelecionado?.preco || 0;
    this.precoCalculado = precoUnitario * this.quantidade;
  }

  

  adicionarAoCarrinho(produto: Produto): void {
    this.cartService.adicionarAoCarrinho(
      produto,
      this.tamanhoSelecionado.preco,
      this.tamanhoSelecionado.label,
      1, // altura padrão
      1, // largura padrão
      this.quantidade
    );
    this.toastr.success('Produto adicionado ao carrinho!');
  }

  adicionarSelecionadoAoCarrinho(): void {
    if (!this.produtoSelecionado) return;
    this.adicionarAoCarrinho(this.produtoSelecionado);
    this.fecharModal();
  }

  finalizarCompra(): void {
    const carrinho = this.cartService.getCarrinhoAtual();

    if (carrinho.length === 0) {
      this.toastr.warning('Carrinho vazio!');
      return;
    }

    this.pixService.criarCheckoutPro(carrinho).subscribe({
      next: (res) => {
        if (res.init_point) {
          window.location.href = res.init_point;
        } else {
          this.toastr.error('Erro ao redirecionar para o Mercado Pago');
        }
      },
      error: (err) => {
        console.error('Erro ao finalizar compra:', err);
        this.toastr.error('Falha ao criar preferência');
      }
    });
  }

  getImagemUrl(imagem: string): string {
    if (!imagem) return 'assets/images/placeholder.jpg'; // fallback se não tiver imagem
    return `http://192.168.99.103:5000/uploads/produtos/${imagem}`;
  }


}
