import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Produto {
  id_produto: number;
  nome: string;
  preco: number;
  imagem: string;
  descricao?: string;
}

export interface CarrinhoItem extends Produto {
  quantidade: number;
  tamanho: string;
  altura: number;
  largura: number;
  preco: number; // Preço final calculado
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private carrinho: CarrinhoItem[] = [];
  private carrinhoSubject = new BehaviorSubject<CarrinhoItem[]>([]);

  carrinho$ = this.carrinhoSubject.asObservable();

  constructor() {}

  adicionarAoCarrinho(produto: Produto, preco: number, tamanho: string, altura: number, largura: number, quantidade = 1): void {
    const novoItem: CarrinhoItem = {
      ...produto,
      preco,
      tamanho,
      altura,
      largura,
      quantidade
    };

    this.carrinho.push(novoItem);
    this.emitir();
  }

  removerDoCarrinho(item: CarrinhoItem): void {
    this.carrinho = this.carrinho.filter(p =>
      !(p.id_produto === item.id_produto &&
        p.tamanho === item.tamanho &&
        p.altura === item.altura &&
        p.largura === item.largura &&
        p.preco === item.preco)
    );
    this.emitir();
  }

  limparCarrinho(): void {
    this.carrinho = [];
    this.emitir();
  }

  getCarrinhoAtual(): CarrinhoItem[] {
    return [...this.carrinho];
  }

  getTotalItens(): number {
    return this.carrinho.reduce((total, item) => total + item.quantidade, 0);
  }

  getTotalPreco(): number {
    return this.carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  }

  private emitir(): void {
    this.carrinhoSubject.next([...this.carrinho]);
  }
}
