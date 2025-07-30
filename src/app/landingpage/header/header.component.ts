import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CartService, CarrinhoItem } from 'src/app/services/cart.service';
import { CommonModule, CurrencyPipe, NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private cartService = inject(CartService);

  @Output() checkoutClicked = new EventEmitter<void>();

  carrinho$ = this.cartService.carrinho$;
  carrinhoAberto = false;

  toggleCarrinho(): void {
    this.carrinhoAberto = !this.carrinhoAberto;
  }

  getTotalItensCarrinho(): number {
    return this.cartService.getTotalItens();
  }

  removerDoCarrinho(item: CarrinhoItem): void {
    this.cartService.removerDoCarrinho(item);
      window.location.reload(); // ⚠️ Grosseiro, mas funcional
  }

  get totalCarrinho(): number {
    return this.cartService.getTotalPreco();
  }

  finalizarCompra(): void {
    this.checkoutClicked.emit(); // Emitido para o componente pai tomar ação
  }
}
