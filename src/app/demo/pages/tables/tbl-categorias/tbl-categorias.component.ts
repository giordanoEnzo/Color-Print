import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';

interface Categoria {
  id_categoria?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  data_criacao?: string;
}

@Component({
  selector: 'app-tbl-categorias',
  templateUrl: './tbl-categorias.component.html',
  styleUrls: ['./tbl-categorias.component.scss']
})
export class TblCategoriasComponent implements OnInit {
  categorias: Categoria[] = [];
  novaCategoria: Categoria = { nome: '', descricao: '', ativo: true };
  categoriaEmEdicao: Categoria | null = null;

  apiUrl = 'http://localhost:5000/api/categorias';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.listarCategorias();
  }

  listarCategorias(): void {
    this.http.get<Categoria[]>(this.apiUrl).subscribe({
      next: (res) => (this.categorias = res),
      error: () => this.toastr.error('Erro ao carregar categorias.')
    });
  }

  adicionarCategoria(): void {
    this.http.post<Categoria>(this.apiUrl, this.novaCategoria).subscribe({
      next: () => {
        this.toastr.success('Categoria adicionada!');
        this.novaCategoria = { nome: '', descricao: '', ativo: true };
        this.listarCategorias();
      },
      error: () => this.toastr.error('Erro ao adicionar categoria.')
    });
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaEmEdicao = { ...categoria };
  }

  cancelarEdicao(): void {
    this.categoriaEmEdicao = null;
  }

  salvarEdicao(): void {
    if (!this.categoriaEmEdicao?.id_categoria) return;

    this.http.put(`${this.apiUrl}/${this.categoriaEmEdicao.id_categoria}`, this.categoriaEmEdicao).subscribe({
      next: () => {
        this.toastr.success('Categoria atualizada!');
        this.categoriaEmEdicao = null;
        this.listarCategorias();
      },
      error: () => this.toastr.error('Erro ao atualizar categoria.')
    });
  }

  excluirCategoria(id: number): void {
    if (!confirm('Deseja realmente excluir essa categoria?')) return;

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.toastr.success('Categoria excluída!');
        this.listarCategorias();
      },
      error: () => this.toastr.error('Erro ao excluir categoria.')
    });
  }
}
