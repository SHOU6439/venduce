import { client } from './client';

// ═══════════════════════════════════════════════════════════
// 型定義
// ═══════════════════════════════════════════════════════════

export interface DashboardStats {
    total_users: number;
    total_products: number;
    total_posts: number;
    total_categories: number;
    total_brands: number;
    total_purchases: number;
}

export interface AdminUser {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    bio: string | null;
    avatar_asset: { public_url?: string | null } | null;
    is_active: boolean;
    is_confirmed: boolean;
    is_admin: boolean;
    is_purchase_history_public: boolean;
    created_at: string;
}

export interface AdminUserUpdate {
    username?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    bio?: string;
    is_active?: boolean;
    is_admin?: boolean;
}

export interface AdminAssetInfo {
    id: string;
    public_url: string | null;
    content_type: string;
}

export interface AdminProduct {
    id: string;
    title: string;
    sku: string;
    description: string | null;
    price_cents: number;
    currency: string;
    stock_quantity: number;
    status: string;
    brand_id: string | null;
    images: AdminAssetInfo[];
    category_ids: string[];
    created_at: string;
    updated_at: string | null;
}

export interface AdminProductCreate {
    title: string;
    sku: string;
    description?: string;
    price_cents: number;
    currency?: string;
    stock_quantity?: number;
    status?: string;
    brand_id?: string;
    category_ids?: string[];
    asset_ids?: string[];
}

export interface AdminProductUpdate {
    title?: string;
    description?: string;
    price_cents?: number;
    stock_quantity?: number;
    status?: string;
    brand_id?: string;
    category_ids?: string[];
    asset_ids?: string[];
}

export interface AdminCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    is_active: boolean;
    created_at: string | null;
}

export interface AdminCategoryCreate {
    name: string;
    slug?: string;
    description?: string;
    parent_id?: string;
    is_active?: boolean;
}

export interface AdminCategoryUpdate {
    name?: string;
    slug?: string;
    description?: string;
    parent_id?: string;
    is_active?: boolean;
}

export interface AdminBrand {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    created_at: string | null;
}

export interface AdminBrandCreate {
    name: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
}

export interface AdminBrandUpdate {
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
}

export interface AdminPost {
    id: string;
    user_id: string;
    username: string | null;
    caption: string | null;
    status: string;
    purchase_count: number;
    view_count: number;
    like_count: number;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface AdminPostUpdate {
    caption?: string;
    status?: string;
}

export interface AdminPurchase {
    id: string;
    buyer_id: string;
    buyer_username: string | null;
    product_id: string;
    product_title: string | null;
    quantity: number;
    price_cents: number;
    total_amount_cents: number;
    currency: string;
    status: string;
    referring_post_id: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface AdminPurchaseUpdate {
    status?: string;
    quantity?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

// ═══════════════════════════════════════════════════════════
// API 関数
// ═══════════════════════════════════════════════════════════

export const adminApi = {
    // ダッシュボード
    getDashboard: () =>
        client.get<DashboardStats>('/api/admin/dashboard'),

    // ユーザー
    listUsers: (page = 1, perPage = 20, q?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        return client.get<PaginatedResponse<AdminUser>>(`/api/admin/users?${params}`);
    },
    getUser: (userId: string) =>
        client.get<AdminUser>(`/api/admin/users/${userId}`),
    updateUser: (userId: string, data: AdminUserUpdate) =>
        client.patch<AdminUser>(`/api/admin/users/${userId}`, data),
    deleteUser: (userId: string) =>
        client.delete(`/api/admin/users/${userId}`),

    // 商品
    uploadProductImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return client.post<AdminAssetInfo>('/api/admin/products/upload-image', formData);
    },
    createProduct: (data: AdminProductCreate) =>
        client.post<AdminProduct>('/api/admin/products', data),
    listProducts: (page = 1, perPage = 20, q?: string, status?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        return client.get<PaginatedResponse<AdminProduct>>(`/api/admin/products?${params}`);
    },
    getProduct: (productId: string) =>
        client.get<AdminProduct>(`/api/admin/products/${productId}`),
    updateProduct: (productId: string, data: AdminProductUpdate) =>
        client.patch<AdminProduct>(`/api/admin/products/${productId}`, data),
    deleteProduct: (productId: string) =>
        client.delete(`/api/admin/products/${productId}`),

    // カテゴリー
    listCategories: (page = 1, perPage = 50, q?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        return client.get<PaginatedResponse<AdminCategory>>(`/api/admin/categories?${params}`);
    },
    createCategory: (data: AdminCategoryCreate) =>
        client.post<AdminCategory>('/api/admin/categories', data),
    updateCategory: (categoryId: string, data: AdminCategoryUpdate) =>
        client.patch<AdminCategory>(`/api/admin/categories/${categoryId}`, data),
    deleteCategory: (categoryId: string) =>
        client.delete(`/api/admin/categories/${categoryId}`),

    // ブランド
    listBrands: (page = 1, perPage = 50, q?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        return client.get<PaginatedResponse<AdminBrand>>(`/api/admin/brands?${params}`);
    },
    createBrand: (data: AdminBrandCreate) =>
        client.post<AdminBrand>('/api/admin/brands', data),
    updateBrand: (brandId: string, data: AdminBrandUpdate) =>
        client.patch<AdminBrand>(`/api/admin/brands/${brandId}`, data),
    deleteBrand: (brandId: string) =>
        client.delete(`/api/admin/brands/${brandId}`),

    // 投稿
    listPosts: (page = 1, perPage = 20, q?: string, status?: string, includeDeleted = false) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        if (includeDeleted) params.set('include_deleted', 'true');
        return client.get<PaginatedResponse<AdminPost>>(`/api/admin/posts?${params}`);
    },
    getPost: (postId: string) =>
        client.get<AdminPost>(`/api/admin/posts/${postId}`),
    updatePost: (postId: string, data: AdminPostUpdate) =>
        client.patch<AdminPost>(`/api/admin/posts/${postId}`, data),
    deletePost: (postId: string, hard = false) => {
        const params = hard ? '?hard=true' : '';
        return client.delete(`/api/admin/posts/${postId}${params}`);
    },

    // 購入
    listPurchases: (page = 1, perPage = 20, q?: string, status?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        return client.get<PaginatedResponse<AdminPurchase>>(`/api/admin/purchases?${params}`);
    },
    getPurchase: (purchaseId: string) =>
        client.get<AdminPurchase>(`/api/admin/purchases/${purchaseId}`),
    updatePurchase: (purchaseId: string, data: AdminPurchaseUpdate) =>
        client.patch<AdminPurchase>(`/api/admin/purchases/${purchaseId}`, data),
    deletePurchase: (purchaseId: string) =>
        client.delete(`/api/admin/purchases/${purchaseId}`),
};
