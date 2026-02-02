import { client } from "./client";
import { Product, PaginatedResponse, PaginatedProductsResponse } from "@/types/api";

const mapProduct = (product: Product): Product => ({
  ...product,
  images: product.images ?? (product.assets ? product.assets.map((a) => a.public_url ?? a.id) : []),
});

export const productsApi = {
  listProducts: async (
    params: {
      page?: number;
      per_page?: number;
      sort?: string;
      q?: string;
    } = {},
  ): Promise<Product[]> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.q) searchParams.set("q", params.q);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/products?${queryString}`
      : "/api/products";
    const result = await client.get<PaginatedResponse<Product>>(endpoint);
    return result.items.map(mapProduct);
  },

  listProductsInfinite: async (
    params: { cursor?: string | null; limit?: number; sort?: string; q?: string } = {},
  ): Promise<PaginatedProductsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.cursor)
      searchParams.set("cursor", params.cursor);
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.q) searchParams.set("q", params.q);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/products?${queryString}`
      : "/api/products";
    const result = await client.get<PaginatedProductsResponse>(endpoint);
    return {
      items: result.items.map(mapProduct),
      meta: {
        next_cursor: result.meta?.next_cursor ?? null,
        has_more: result.meta?.has_more ?? false,
        returned: result.meta?.returned ?? result.items.length,
      },
    };
  },

  getTrendingProducts: async (limit = 5): Promise<Product[]> => {
    const params = new URLSearchParams({
      per_page: String(limit),
      sort: "stock_quantity:desc",
    });
    const result = await client.get<PaginatedResponse<Product>>(
      `/api/products?${params.toString()}`,
    );
    return result.items.slice(0, limit).map(mapProduct);
  },

  getProduct: async (id: string): Promise<Product> => {
    const product = await client.get<Product>(`/api/products/${id}`);
    return mapProduct(product);
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    const params = new URLSearchParams({ q: query });
    const result = await client.get<PaginatedResponse<Product>>(
      `/api/products?${params.toString()}`,
    );
    return result.items.map(mapProduct);
  },
};
