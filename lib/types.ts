export type Universo = {
  id: string;
  nome: string;
  slug: string;
  codigo: string;
  descricao: string;
  imagem_url: string;
  created_at: string;
  historias_count?: number;
};

export type Categoria = "Personagem" | "Evento" | "Local" | "Facção" | "Era";

export const CATEGORIAS: Categoria[] = [
  "Personagem",
  "Evento",
  "Local",
  "Facção",
  "Era",
];

export type Historia = {
  id: string;
  universo_id: string;
  titulo: string;
  slug: string;
  categoria: Categoria;
  resumo: string;
  conteudo: string;
  imagem_capa_url: string;
  created_at: string;
};

export type CreateUniversoInput = {
  nome: string;
  descricao: string;
  imagem_url: string;
};

export type UpdateUniversoInput = {
  nome?: string;
  descricao?: string;
  imagem_url?: string;
};

export type CreateHistoriaInput = {
  universo_id: string;
  titulo: string;
  categoria: Categoria;
  resumo: string;
  conteudo: string;
  imagem_capa_url: string;
};

export type UpdateHistoriaInput = {
  universo_id?: string;
  titulo?: string;
  categoria?: Categoria;
  resumo?: string;
  conteudo?: string;
  imagem_capa_url?: string;
};

export type GetHistoriasFilter = {
  universo_id?: string;
  categoria?: Categoria;
};
