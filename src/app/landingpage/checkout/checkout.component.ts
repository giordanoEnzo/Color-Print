import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  carrinho: any[] = [];
  total: number = 0;

  ngOnInit(): void {
    const carrinhoLocal = localStorage.getItem('carrinho');
    this.carrinho = carrinhoLocal ? JSON.parse(carrinhoLocal) : [];
    this.calcularTotal();
  }

  calcularTotal(): void {
    this.total = this.carrinho.reduce((acc, item) => {
      return acc + (item.preco * (item.quantidade || 1));
    }, 0);
  }
}
