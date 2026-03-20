'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AdminPost, AdminPostUpdate, PaginatedResponse } from '@/lib/api/admin';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

const POST_STATUSES = ['public', 'draft', 'archived'];

function statusBadge(status: string, deletedAt: string | null) {
    if (deletedAt) return <Badge variant="destructive">削除済</Badge>;
    switch (status) {
        case 'public': return <Badge variant="default">公開</Badge>;
        case 'draft': return <Badge variant="secondary">下書き</Badge>;
        case 'archived': return <Badge variant="outline">アーカイブ</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function AdminPostsPage() {
    const [data, setData] = useState<PaginatedResponse<AdminPost> | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [loading, setLoading] = useState(true);

    // 編集
    const [editPost, setEditPost] = useState<AdminPost | null>(null);
    const [editForm, setEditForm] = useState<AdminPostUpdate>({});
    const [saving, setSaving] = useState(false);

    // 削除
    const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
    const [hardDelete, setHardDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.listPosts(
                page, 20,
                search || undefined,
                statusFilter || undefined,
                includeDeleted,
            );
            setData(result);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, includeDeleted]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchPosts();
    };

    const openEdit = (post: AdminPost) => {
        setEditPost(post);
        setEditForm({ caption: post.caption || '', status: post.status });
    };

    const handleSave = async () => {
        if (!editPost) return;
        setSaving(true);
        try {
            await adminApi.updatePost(editPost.id, editForm);
            setEditPost(null);
            fetchPosts();
        } catch (err) {
            console.error('Failed to update post:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletePost) return;
        setDeleting(true);
        try {
            await adminApi.deletePost(deletePost.id, hardDelete);
            setDeletePost(null);
            setHardDelete(false);
            fetchPosts();
        } catch (err) {
            console.error('Failed to delete post:', err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">投稿管理</h1>

            {/* フィルター */}
            <div className="flex flex-wrap gap-2 mb-4">
                <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="キャプションで検索..."
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
                        {POST_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor="include-deleted" className="text-sm text-muted-foreground">削除済も表示</Label>
                    <Switch
                        id="include-deleted"
                        checked={includeDeleted}
                        onCheckedChange={(v) => { setIncludeDeleted(v); setPage(1); }}
                    />
                </div>
            </div>

            {/* テーブル */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>投稿者</TableHead>
                            <TableHead>キャプション</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead className="text-right">いいね</TableHead>
                            <TableHead className="text-right">購入数</TableHead>
                            <TableHead>作成日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted animate-pulse rounded w-16" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    投稿が見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((post) => (
                                <TableRow key={post.id} className={post.deleted_at ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{post.username || post.user_id.slice(0, 8)}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {post.caption || <span className="text-muted-foreground italic">なし</span>}
                                    </TableCell>
                                    <TableCell>{statusBadge(post.status, post.deleted_at)}</TableCell>
                                    <TableCell className="text-right">{post.like_count}</TableCell>
                                    <TableCell className="text-right">{post.purchase_count}</TableCell>
                                    <TableCell>{new Date(post.created_at).toLocaleDateString('ja-JP')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletePost(post)}>
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
            <Dialog open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>投稿編集</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>キャプション</Label>
                            <Textarea
                                value={editForm.caption || ''}
                                onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>ステータス</Label>
                            <Select
                                value={editForm.status || 'public'}
                                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {POST_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditPost(null)}>キャンセル</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除ダイアログ */}
            <AlertDialog open={!!deletePost} onOpenChange={(open) => { if (!open) { setDeletePost(null); setHardDelete(false); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletePost?.username || '不明'} の投稿を削除します。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center gap-2 px-6 pb-2">
                        <Switch
                            id="hard-delete"
                            checked={hardDelete}
                            onCheckedChange={setHardDelete}
                        />
                        <Label htmlFor="hard-delete" className="text-sm">
                            完全削除（復元不可）
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? '削除中...' : hardDelete ? '完全削除' : '論理削除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
