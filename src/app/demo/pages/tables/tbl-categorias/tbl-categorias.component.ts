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
  categoriasPaginadas: Categoria[] = [];
  categoriaSelecionada: Categoria | null = null;
  mostrarModalCategoria: boolean = false;
  // paginação
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pages: number[] = [];

  constructor(private categoriaService: CategoriaService) {}

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.categoriaService.getTodasCategorias().subscribe((res) => {
      this.categorias = res;
      this.atualizarPaginacao();
    });
  }

  atualizarPaginacao(): void {
    this.totalPages = Math.max(1, Math.ceil(this.categorias.length / this.itemsPerPage));
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    // ajusta currentPage se necessário
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = this.currentPage * this.itemsPerPage;
    this.categoriasPaginadas = this.categorias.slice(start, end);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.atualizarPaginacao();
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