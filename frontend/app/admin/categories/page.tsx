'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AdminCategory, AdminCategoryCreate, AdminCategoryUpdate, PaginatedResponse } from '@/lib/api/admin';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCategoriesPage() {
    const [data, setData] = useState<PaginatedResponse<AdminCategory> | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // 作成/編集
    const [editCategory, setEditCategory] = useState<AdminCategory | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<AdminCategoryCreate & { is_active: boolean }>({
        name: '', slug: '', description: '', is_active: true,
    });
    const [saving, setSaving] = useState(false);

    // 削除
    const [deleteCategory, setDeleteCategory] = useState<AdminCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.listCategories(page, 50, search || undefined);
            setData(result);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchCategories();
    };

    const openCreate = () => {
        setEditCategory(null);
        setIsCreating(true);
        setForm({ name: '', slug: '', description: '', is_active: true });
    };

    const openEdit = (cat: AdminCategory) => {
        setIsCreating(false);
        setEditCategory(cat);
        setForm({
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            is_active: cat.is_active,
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isCreating) {
                await adminApi.createCategory({
                    name: form.name,
                    slug: form.slug || undefined,
                    description: form.description || undefined,
                    is_active: form.is_active,
                });
            } else if (editCategory) {
                const updateData: AdminCategoryUpdate = {
                    name: form.name,
                    slug: form.slug || undefined,
                    description: form.description || undefined,
                    is_active: form.is_active,
                };
                await adminApi.updateCategory(editCategory.id, updateData);
            }
            setEditCategory(null);
            setIsCreating(false);
            fetchCategories();
        } catch (err) {
            console.error('Failed to save category:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCategory) return;
        setDeleting(true);
        try {
            await adminApi.deleteCategory(deleteCategory.id);
            setDeleteCategory(null);
            fetchCategories();
        } catch (err) {
            console.error('Failed to delete category:', err);
        } finally {
            setDeleting(false);
        }
    };

    const dialogOpen = isCreating || !!editCategory;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">カテゴリー管理</h1>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                </Button>
            </div>

            {/* 検索 */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="カテゴリー名で検索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button type="submit" variant="secondary">検索</Button>
            </form>

            {/* テーブル */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>カテゴリー名</TableHead>
                            <TableHead>スラッグ</TableHead>
                            <TableHead>説明</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted animate-pulse rounded w-20" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    カテゴリーが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                        {cat.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                                            {cat.is_active ? '有効' : '無効'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteCategory(cat)}>
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

            {/* 作成/編集ダイアログ */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditCategory(null); setIsCreating(false); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'カテゴリー作成' : 'カテゴリー編集'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cat-name">カテゴリー名</Label>
                            <Input
                                id="cat-name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cat-slug">スラッグ（空欄で自動生成）</Label>
                            <Input
                                id="cat-slug"
                                value={form.slug || ''}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cat-desc">説明</Label>
                            <Input
                                id="cat-desc"
                                value={form.description || ''}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="cat-active">有効</Label>
                            <Switch
                                id="cat-active"
                                checked={form.is_active}
                                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditCategory(null); setIsCreating(false); }}>
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                            {saving ? '保存中...' : isCreating ? '作成' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除ダイアログ */}
            <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>カテゴリーを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            カテゴリー「{deleteCategory?.name}」を削除します。この操作は取り消せません。
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
        </div>
    );
}
