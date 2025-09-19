export interface Produto {
  id_produto: number;
  nome: string;
  descricao?: string;
  preco: number;
  quantidade_estoque?: number;
  imagem?: File | null;
  imagemUrl?: string;
  categoria?: string;
  id_categoria?: number;
  destaque?: boolean;
  estoque?: number;

  variacoes?: {
    id_variacao: number;
    nome_variacao: string;
    descricao_opcao: string;
    preco_adicional: number;
  }[];

  // Dimensões/peso (compat)
  width_cm?: number | null;
  height_cm?: number | null;
  length_cm?: number | null;
  weight_kg?: number | null;

  // ===== Orçamento Online =====
  aceita_orcamento?: boolean;
  modo_precificacao?: 'MATRIZ' | 'AREA';
  largura_min_cm?: number | null;
  altura_min_cm?: number | null;
  largura_max_cm?: number | null;
  altura_max_cm?: number | null;
  incremento_cm?: number | null;
  upload_obrigatorio?: boolean;
}
