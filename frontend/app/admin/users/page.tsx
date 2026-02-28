'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, AdminUser, AdminUserUpdate, PaginatedResponse } from '@/lib/api/admin';
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
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
    const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // 編集ダイアログ
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<AdminUserUpdate>({});
    const [saving, setSaving] = useState(false);

    // 削除ダイアログ
    const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.listUsers(page, 20, search || undefined);
            setData(result);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const openEdit = (user: AdminUser) => {
        setEditUser(user);
        setEditForm({
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            bio: user.bio || '',
            is_active: user.is_active,
            is_admin: user.is_admin,
        });
    };

    const handleSave = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            await adminApi.updateUser(editUser.id, editForm);
            setEditUser(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to update user:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await adminApi.deleteUser(deleteUser.id);
            setDeleteUser(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>

            {/* 検索 */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ユーザー名・メールで検索..."
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
                            <TableHead>ユーザー名</TableHead>
                            <TableHead>メール</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>権限</TableHead>
                            <TableHead>作成日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-muted animate-pulse rounded w-20" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    ユーザーが見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                            {user.is_active ? '有効' : '無効'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_admin && (
                                            <Badge variant="destructive">管理者</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(user)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteUser(user)}
                                            >
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
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                            {data.page} / {data.total_pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= data.total_pages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 編集ダイアログ */}
            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ユーザー編集</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-username">ユーザー名</Label>
                            <Input
                                id="edit-username"
                                value={editForm.username || ''}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-first-name">名</Label>
                                <Input
                                    id="edit-first-name"
                                    value={editForm.first_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-last-name">姓</Label>
                                <Input
                                    id="edit-last-name"
                                    value={editForm.last_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">メール</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.email || ''}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-bio">自己紹介</Label>
                            <Input
                                id="edit-bio"
                                value={editForm.bio || ''}
                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-active">有効</Label>
                            <Switch
                                id="edit-active"
                                checked={editForm.is_active ?? true}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-admin">管理者権限</Label>
                            <Switch
                                id="edit-admin"
                                checked={editForm.is_admin ?? false}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)}>
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除ダイアログ */}
            <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ユーザーを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            ユーザー「{deleteUser?.username}」を削除します。この操作は取り消せません。
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
