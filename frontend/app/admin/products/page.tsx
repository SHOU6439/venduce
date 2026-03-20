'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AdminProduct, AdminProductCreate, AdminProductUpdate, AdminCategory, AdminBrand, AdminAssetInfo, PaginatedResponse } from '@/lib/api/admin';
import {
    Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, ImagePlus, X } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    draft: '下書き',
    published: '公開中',
    archived: 'アーカイブ',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    published: 'default',
    draft: 'secondary',
    archived: 'outline',
};

function formatPrice(cents: number, currency: string): string {
    if (currency === 'JPY') return `¥${cents.toLocaleString()}`;
    return `${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}`;
}

function resolveImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    return url;
}

export default function AdminProductsPage() {
    const [data, setData] = useState<PaginatedResponse<AdminProduct> | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // 新規作成
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState<AdminProductCreate>({
        title: '', sku: '', description: '', price_cents: 0, currency: 'JPY',
        stock_quantity: 1, status: 'draft', brand_id: '', category_ids: [],
    });
    const [creating, setCreating] = useState(false);
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [uploadedImages, setUploadedImages] = useState<AdminAssetInfo[]>([]);
    const [uploading, setUploading] = useState(false);

    const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
    const [editForm, setEditForm] = useState<AdminProductUpdate>({});
    const [saving, setSaving] = useState(false);
    const [editImages, setEditImages] = useState<AdminAssetInfo[]>([]);
    const [editUploading, setEditUploading] = useState(false);
    const [editBrands, setEditBrands] = useState<AdminBrand[]>([]);
    const [editCategories, setEditCategories] = useState<AdminCategory[]>([]);
    const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);

    const [deleteProduct, setDeleteProduct] = useState<AdminProduct | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.listProducts(
                page, 20,
                search || undefined,
                statusFilter || undefined,
            );
            setData(result);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchProducts();
    };

    const openCreate = async () => {
        setCreateForm({
            title: '', sku: '', description: '', price_cents: 0, currency: 'JPY',
            stock_quantity: 1, status: 'draft', brand_id: '', category_ids: [],
        });
        setUploadedImages([]);
        // ブランド・カテゴリーの選択肢を取得
        try {
            const [brandRes, catRes] = await Promise.all([
                adminApi.listBrands(1, 200),
                adminApi.listCategories(1, 200),
            ]);
            setBrands(brandRes.items);
            setCategories(catRes.items);
        } catch (err) {
            console.error('Failed to load options:', err);
        }
        setIsCreating(true);
    };

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const results: AdminAssetInfo[] = [];
            for (const file of Array.from(files)) {
                const asset = await adminApi.uploadProductImage(file);
                results.push(asset);
            }
            setUploadedImages((prev) => [...prev, ...results]);
        } catch (err) {
            console.error('Failed to upload image:', err);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (assetId: string) => {
        setUploadedImages((prev) => prev.filter((img) => img.id !== assetId));
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            await adminApi.createProduct({
                ...createForm,
                brand_id: createForm.brand_id || undefined,
                category_ids: createForm.category_ids?.length ? createForm.category_ids : undefined,
                asset_ids: uploadedImages.length ? uploadedImages.map((img) => img.id) : undefined,
            });
            setIsCreating(false);
            setUploadedImages([]);
            fetchProducts();
        } catch (err) {
            console.error('Failed to create product:', err);
        } finally {
            setCreating(false);
        }
    };

    const openEdit = async (product: AdminProduct) => {
        setEditProduct(product);
        setEditForm({
            title: product.title,
            description: product.description || '',
            price_cents: product.price_cents,
            stock_quantity: product.stock_quantity,
            status: product.status,
            brand_id: product.brand_id || '',
        });
        setEditImages(product.images || []);
        setEditCategoryIds(product.category_ids || []);
        // ブランド・カテゴリーの選択肢を取得
        try {
            const [brandRes, catRes] = await Promise.all([
                adminApi.listBrands(1, 200),
                adminApi.listCategories(1, 200),
            ]);
            setEditBrands(brandRes.items);
            setEditCategories(catRes.items);
        } catch (err) {
            console.error('Failed to load edit options:', err);
        }
    };

    const handleEditImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setEditUploading(true);
        try {
            const results: AdminAssetInfo[] = [];
            for (const file of Array.from(files)) {
                const asset = await adminApi.uploadProductImage(file);
                results.push(asset);
            }
            setEditImages((prev) => [...prev, ...results]);
        } catch (err) {
            console.error('Failed to upload image:', err);
        } finally {
            setEditUploading(false);
        }
    };

    const removeEditImage = (assetId: string) => {
        setEditImages((prev) => prev.filter((img) => img.id !== assetId));
    };

    const handleSave = async () => {
        if (!editProduct) return;
        setSaving(true);
        try {
            await adminApi.updateProduct(editProduct.id, {
                ...editForm,
                brand_id: editForm.brand_id || undefined,
                category_ids: editCategoryIds,
                asset_ids: editImages.map((img) => img.id),
            });
            setEditProduct(null);
            fetchProducts();
        } catch (err) {
            console.error('Failed to update product:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteProduct) return;
        setDeleting(true);
        try {
            await adminApi.deleteProduct(deleteProduct.id);
            setDeleteProduct(null);
            fetchProducts();
        } catch (err) {
            console.error('Failed to delete product:', err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">商品管理</h1>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                </Button>
            </div>

            {/* 検索 + フィルター */}
            <div className="flex flex-wrap gap-2 mb-4">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px] max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="商品名・SKUで検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary">検索</Button>
                </form>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="published">公開中</SelectItem>
                        <SelectItem value="draft">下書き</SelectItem>
                        <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* テーブル */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">画像</TableHead>
                            <TableHead>商品名</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>価格</TableHead>
                            <TableHead>在庫</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>作成日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted animate-pulse rounded w-20" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    商品が見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        {product.images?.[0]?.public_url ? (
                                            <img
                                                src={resolveImageUrl(product.images[0].public_url)}
                                                alt={product.title}
                                                className="w-10 h-10 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {product.title}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                    <TableCell>{formatPrice(product.price_cents, product.currency)}</TableCell>
                                    <TableCell>{product.stock_quantity}</TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANTS[product.status] || 'secondary'}>
                                            {STATUS_LABELS[product.status] || product.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(product.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(product)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ページネーション */}
            {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                        {data.total}件中 {(data.page - 1) * data.per_page + 1}-
                        {Math.min(data.page * data.per_page, data.total)}件
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{data.page} / {data.total_pages}</span>
                        <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 編集ダイアログ */}
            <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>商品編集</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">商品名</Label>
                            <Input
                                id="edit-title"
                                value={editForm.title || ''}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">説明</Label>
                            <Textarea
                                id="edit-description"
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-price">価格 (円)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    min={0}
                                    value={editForm.price_cents ?? 0}
                                    onChange={(e) => setEditForm({ ...editForm, price_cents: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-stock">在庫数</Label>
                                <Input
                                    id="edit-stock"
                                    type="number"
                                    min={0}
                                    value={editForm.stock_quantity ?? 0}
                                    onChange={(e) => setEditForm({ ...editForm, stock_quantity: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>ステータス</Label>
                            <Select
                                value={editForm.status || ''}
                                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="published">公開中</SelectItem>
                                    <SelectItem value="draft">下書き</SelectItem>
                                    <SelectItem value="archived">アーカイブ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {editBrands.length > 0 && (
                            <div className="grid gap-2">
                                <Label>ブランド</Label>
                                <Select
                                    value={editForm.brand_id || '_none'}
                                    onValueChange={(v) => setEditForm({ ...editForm, brand_id: v === '_none' ? '' : v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">なし</SelectItem>
                                        {editBrands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {editCategories.length > 0 && (
                            <div className="grid gap-2">
                                <Label>カテゴリー</Label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-32 overflow-y-auto">
                                    {editCategories.map((cat) => {
                                        const selected = editCategoryIds.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setEditCategoryIds((prev) =>
                                                        selected
                                                            ? prev.filter((id) => id !== cat.id)
                                                            : [...prev, cat.id]
                                                    );
                                                }}
                                                className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                                                    selected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* 商品画像 */}
                        <div className="grid gap-2">
                            <Label>商品画像</Label>
                            {editImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {editImages.map((img) => (
                                        <div key={img.id} className="relative group w-20 h-20 rounded-md overflow-hidden border">
                                            <img
                                                src={resolveImageUrl(img.public_url)}
                                                alt="商品画像"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeEditImage(img.id)}
                                                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label
                                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors hover:border-primary hover:bg-muted/50 ${
                                    editUploading ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {editUploading ? 'アップロード中...' : 'クリックで画像を追加'}
                                </span>
                                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP (最大5MB)</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleEditImageUpload(e.target.files)}
                                    disabled={editUploading}
                                />
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProduct(null)}>キャンセル</Button>
                        <Button onClick={handleSave} disabled={saving || editUploading}>
                            {saving ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除ダイアログ */}
            <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            商品「{deleteProduct?.title}」を削除します。この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? '削除中...' : '削除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 新規作成ダイアログ */}
            <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>商品を新規作成</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="grid gap-2">
                            <Label htmlFor="create-title">商品名 *</Label>
                            <Input
                                id="create-title"
                                value={createForm.title}
                                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                placeholder="商品名を入力"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-sku">SKU *</Label>
                            <Input
                                id="create-sku"
                                value={createForm.sku}
                                onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value })}
                                placeholder="例: PROD-001"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-desc">説明</Label>
                            <Textarea
                                id="create-desc"
                                value={createForm.description || ''}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                rows={3}
                                placeholder="商品の説明"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-price">価格 (円) *</Label>
                                <Input
                                    id="create-price"
                                    type="number"
                                    min={1}
                                    value={createForm.price_cents}
                                    onChange={(e) => setCreateForm({ ...createForm, price_cents: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-stock">在庫数</Label>
                                <Input
                                    id="create-stock"
                                    type="number"
                                    min={0}
                                    value={createForm.stock_quantity ?? 1}
                                    onChange={(e) => setCreateForm({ ...createForm, stock_quantity: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>ステータス</Label>
                            <Select
                                value={createForm.status || 'draft'}
                                onValueChange={(v) => setCreateForm({ ...createForm, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="published">公開中</SelectItem>
                                    <SelectItem value="draft">下書き</SelectItem>
                                    <SelectItem value="archived">アーカイブ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {brands.length > 0 && (
                            <div className="grid gap-2">
                                <Label>ブランド</Label>
                                <Select
                                    value={createForm.brand_id || '_none'}
                                    onValueChange={(v) => setCreateForm({ ...createForm, brand_id: v === '_none' ? '' : v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">なし</SelectItem>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {categories.length > 0 && (
                            <div className="grid gap-2">
                                <Label>カテゴリー</Label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-32 overflow-y-auto">
                                    {categories.map((cat) => {
                                        const selected = createForm.category_ids?.includes(cat.id) ?? false;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    const ids = createForm.category_ids || [];
                                                    setCreateForm({
                                                        ...createForm,
                                                        category_ids: selected
                                                            ? ids.filter((id) => id !== cat.id)
                                                            : [...ids, cat.id],
                                                    });
                                                }}
                                                className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                                                    selected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* 商品画像 */}
                        <div className="grid gap-2">
                            <Label>商品画像</Label>
                            {uploadedImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {uploadedImages.map((img) => (
                                        <div key={img.id} className="relative group w-20 h-20 rounded-md overflow-hidden border">
                                            <img
                                                src={resolveImageUrl(img.public_url)}
                                                alt="商品画像"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(img.id)}
                                                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label
                                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors hover:border-primary hover:bg-muted/50 ${
                                    uploading ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {uploading ? 'アップロード中...' : 'クリックまたはドラッグで画像を追加'}
                                </span>
                                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP (最大5MB)</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e.target.files)}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreating(false)}>キャンセル</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || uploading || !createForm.title.trim() || !createForm.sku.trim() || createForm.price_cents < 1}
                        >
                            {creating ? '作成中...' : '作成'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
