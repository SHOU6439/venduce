export interface PaginatedProductsResponse {
  items: Product[];
  meta: {
    next_cursor?: string | null;
    has_more: boolean;
    returned: number;
  };
}
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_confirmed: boolean;
  is_active: boolean;
  is_admin: boolean;
  avatar_url?: string | null;
  avatar_asset?: { public_url?: string | null } | null;
  bio?: string | null;
  is_purchase_history_public: boolean;
}

export type UserProfile = User;

export interface PublicUserProfile {
  id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_asset?: { public_url?: string | null } | null;
  created_at: string;
  is_purchase_history_public: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  image_asset_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Asset {
  id: string;
  owner_id: string;
  purpose: string;
  status: string;
  storage_key: string;
  content_type: string;
  extension: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
  public_url?: string | null;
  variants?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface Product {
  id: string;
  title: string;
  sku: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: string;
  stock_quantity: number;
  extra_metadata?: Record<string, unknown> | null;
  categories: Category[];
  brand?: Brand | null;
  created_at: string;
  updated_at?: string | null;
  assets: Asset[];
  /** frontend helpers */
  images: string[];
  like_count?: number;
  purchase_count?: number;
}

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
}

export interface Post {
  id: string;
  user_id: string;
  caption?: string | null;
  status: string;
  purchase_count: number;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile | null;
  products: Product[];
  tags: Tag[];
  images: Asset[];
  assets?: Asset[];
  asset_products?: Array<{
    asset: Asset;
    product: Product | null;
  }>;
  liked_by_me?: boolean;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  payment_type: string;
  name: string;
  is_default: boolean;
  details?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  product_id: string;
  product: Product;
  quantity: number;
  price_cents: number;
  total_amount_cents: number;
  currency: string;
  payment_method_id: string;
  payment_method?: PaymentMethod | null;
  referring_post_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResponseCursor<T> {
  items: T[];
  meta: {
    next_cursor?: string | null;
    has_more: boolean;
    returned: number;
  };
}

export interface AssetProductPair {
  asset_id: string;
  product_id: string | null;
}

export interface CreatePostPayload {
  caption: string;
  asset_product_pairs: AssetProductPair[];
  tags?: string[];
}

export interface PostUpdatePayload {
  caption?: string | null;
  status?: string;
  tags?: string[];
  extra_metadata?: Record<string, unknown> | null;
}

export interface UserPostStats {
  post_count: number;
  total_likes: number;
  total_purchases: number;
}

export interface UserRankingItem {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  total_likes: number;
  total_purchases: number;
  rank: number;
}

export interface RankingResponse {
  items: UserRankingItem[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface FollowStatus {
  is_following: boolean;
  follower_count: number;
  following_count: number;
}

export interface FollowUserItem {
  id: string;
  username: string;
  bio?: string | null;
  avatar_url?: string | null;
  is_following: boolean;
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  threshold: number;
  sort_order: number;
  category: string;
}

export interface UserBadge {
  badge: BadgeDefinition;
  awarded_at: string;
}

export interface BadgeNotification {
  badges: BadgeDefinition[];
}

// 売れている商品ランキング
export interface TrendingProductItem {
  product: Product;
  total_purchases: number;
  rank: number;
}

export interface TrendingProductsResponse {
  items: TrendingProductItem[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

// いいねが多い商品ランキング
export interface MostLikedProductItem {
  product: Product;
  total_likes: number;
  rank: number;
}

export interface MostLikedProductsResponse {
  items: MostLikedProductItem[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

// 通知
export type NotificationType = "like" | "follow" | "comment" | "purchase" | "ranking";

export interface NotificationActor {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id?: string | null;
  actor?: NotificationActor | null;
  type: NotificationType;
  entity_id?: string | null;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}
