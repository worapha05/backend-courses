export type SortOrder = 'asc' | 'desc';

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export interface CatalogSearchQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortOrder;
  page?: number;
  limit?: number;
}
