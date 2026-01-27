import { client } from "./client";
import { Product, PaginatedResponse } from "@/types/api";

const mapProduct = (product: Product): Product => ({
  ...product,
  images: product.images ?? [],
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
    params: { skip?: number; limit?: number; sort?: string; q?: string } = {},
  ): Promise<PaginatedResponse<Product>> => {
    const searchParams = new URLSearchParams();
    if (params.skip !== undefined)
      searchParams.set("skip", String(params.skip));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.q) searchParams.set("q", params.q);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/products?${queryString}`
      : "/api/products";
    const result = await client.get<PaginatedResponse<Product>>(endpoint);
    return {
      ...result,
      items: result.items.map(mapProduct),
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
