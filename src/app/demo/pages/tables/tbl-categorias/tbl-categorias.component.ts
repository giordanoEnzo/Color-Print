import { Component, OnInit } from '@angular/core';
import { Categoria } from 'src/app/interfaces/categoria.interface';
import { CategoriaService } from 'src/app/services/categoria.service';

@Component({
  selector: 'app-tbl-categorias',
  templateUrl: './tbl-categorias.component.html',
  styleUrls: ['./tbl-categorias.component.scss']
})
export class TblCategoriasComponent implements OnInit {

  categorias: Categoria[] = [];
  categoriaSelecionada: Categoria | null = null;
  mostrarModalCategoria: boolean = false;

  constructor(private categoriaService: CategoriaService) {}

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.categoriaService.getTodasCategorias().subscribe((res) => {
      this.categorias = res;
    });
  }

  abrirModalNovaCategoria(): void {
    this.categoriaSelecionada = {
      nome: '',
      descricao: '',
      ativo: true
    };
    this.mostrarModalCategoria = true;
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaSelecionada = { ...categoria };
    this.mostrarModalCategoria = true;
  }

  salvarCategoria(): void {
    if (!this.categoriaSelecionada) return;

    if (this.categoriaSelecionada.id_categoria) {
      this.categoriaService.atualizarCategoria(this.categoriaSelecionada).subscribe(() => {
        this.fecharModalCategoria();
        this.carregarCategorias();
      });
    } else {
      this.categoriaService.adicionarCategoria(this.categoriaSelecionada).subscribe(() => {
        this.fecharModalCategoria();
        this.carregarCategorias();
      });
    }
  }

  excluirCategoria(categoria: Categoria): void {
    if (confirm('Deseja realmente excluir esta categoria?')) {
      this.categoriaService.deletarCategoria(categoria.id_categoria!).subscribe(() => {
        this.carregarCategorias();
      });
    }
  }

  fecharModalCategoria(): void {
    this.mostrarModalCategoria = false;
    this.categoriaSelecionada = null;
  }
}