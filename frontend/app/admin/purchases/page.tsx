'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AdminPurchase, AdminPurchaseUpdate, PaginatedResponse } from '@/lib/api/admin';
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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

const PURCHASE_STATUSES = ['pending', 'processing', 'completed', 'refunded', 'failed', 'cancelled', 'expired'];

function statusBadge(status: string) {
    switch (status) {
        case 'completed': return <Badge variant="default">完了</Badge>;
        case 'pending': return <Badge variant="secondary">保留中</Badge>;
        case 'processing': return <Badge variant="outline">処理中</Badge>;
        case 'refunded': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">返金済</Badge>;
        case 'failed': return <Badge variant="destructive">失敗</Badge>;
        case 'cancelled': return <Badge variant="destructive">キャンセル</Badge>;
        case 'expired': return <Badge variant="secondary">期限切れ</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}

function formatPrice(cents: number, currency: string) {
    if (currency === 'JPY') return `¥${cents.toLocaleString()}`;
    return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function AdminPurchasesPage() {
    const [data, setData] = useState<PaginatedResponse<AdminPurchase> | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);

    // 編集
    const [editPurchase, setEditPurchase] = useState<AdminPurchase | null>(null);
    const [editForm, setEditForm] = useState<AdminPurchaseUpdate>({});
    const [saving, setSaving] = useState(false);

    // 削除
    const [deletePurchase, setDeletePurchase] = useState<AdminPurchase | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.listPurchases(
                page, 20,
                search || undefined,
                statusFilter || undefined,
            );
            setData(result);
        } catch (err) {
            console.error('Failed to fetch purchases:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchPurchases();
    };

    const openEdit = (purchase: AdminPurchase) => {
        setEditPurchase(purchase);
        setEditForm({ status: purchase.status, quantity: purchase.quantity });
    };

    const handleSave = async () => {
        if (!editPurchase) return;
        setSaving(true);
        try {
            await adminApi.updatePurchase(editPurchase.id, editForm);
            setEditPurchase(null);
            fetchPurchases();
        } catch (err) {
            console.error('Failed to update purchase:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletePurchase) return;
        setDeleting(true);
        try {
            await adminApi.deletePurchase(deletePurchase.id);
            setDeletePurchase(null);
            fetchPurchases();
        } catch (err) {
            console.error('Failed to delete purchase:', err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">購入管理</h1>

            {/* フィルター */}
            <div className="flex flex-wrap gap-2 mb-4">
                <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="購入者名・商品名で検索..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary">検索</Button>
                </form>

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全て</SelectItem>
                        {PURCHASE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* テーブル */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>購入者</TableHead>
                            <TableHead>商品</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead className="text-right">金額</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>帰属投稿</TableHead>
                            <TableHead>購入日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted animate-pulse rounded w-16" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    購入が見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((purchase) => (
                                <TableRow key={purchase.id}>
                                    <TableCell className="font-medium">
                                        {purchase.buyer_username || purchase.buyer_id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="max-w-[180px] truncate">
                                        {purchase.product_title || purchase.product_id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatPrice(purchase.total_amount_cents, purchase.currency)}
                                    </TableCell>
                                    <TableCell>{statusBadge(purchase.status)}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {purchase.referring_post_id
                                            ? purchase.referring_post_id.slice(0, 10) + '...'
                                            : <span className="italic">直接</span>}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(purchase.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(purchase)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletePurchase(purchase)}>
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
            <Dialog open={!!editPurchase} onOpenChange={(open) => !open && setEditPurchase(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>購入編集</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="text-sm text-muted-foreground">
                            購入者: {editPurchase?.buyer_username} / 商品: {editPurchase?.product_title}
                        </div>
                        <div className="grid gap-2">
                            <Label>ステータス</Label>
                            <Select
                                value={editForm.status || 'completed'}
                                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PURCHASE_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-quantity">数量</Label>
                            <Input
                                id="edit-quantity"
                                type="number"
                                min={1}
                                value={editForm.quantity ?? 1}
                                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditPurchase(null)}>キャンセル</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除ダイアログ */}
            <AlertDialog open={!!deletePurchase} onOpenChange={(open) => !open && setDeletePurchase(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>購入を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletePurchase?.buyer_username} による「{deletePurchase?.product_title}」の購入を削除します。この操作は取り消せません。
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
