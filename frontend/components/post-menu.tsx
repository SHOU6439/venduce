'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';
import { postsApi } from '@/lib/api/posts';
import { Post } from '@/types/api';

interface PostMenuProps {
    post: Post;
    /** 更新後に呼ばれる。引数として最新の Post を渡す */
    onUpdated?: (updated: Post) => void;
    /** 削除後に呼ばれる。引数として削除した postId を渡す */
    onDeleted?: (postId: string) => void;
    /** 削除後にページ遷移が必要な場合はパスを指定 */
    redirectAfterDelete?: string;
}

/**
 * 投稿の「編集 / 削除」三点ドットメニュー。
 * 投稿オーナーのみ表示される。
 */
export function PostMenu({
    post,
    onUpdated,
    onDeleted,
    redirectAfterDelete,
}: PostMenuProps) {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const router = useRouter();

    const [editOpen, setEditOpen] = useState(false);
    const [editCaption, setEditCaption] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // オーナーでなければ何も表示しない
    if (!user || user.id !== post.user_id) return null;

    const handleOpenEdit = () => {
        setEditCaption(post.caption ?? '');
        setEditOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await postsApi.updatePost(post.id, { caption: editCaption });
            setEditOpen(false);
            toast({ title: '投稿を編集しました' });
            onUpdated?.(updated);
        } catch {
            toast({ title: '編集に失敗しました', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await postsApi.deletePost(post.id);
            toast({ title: '投稿を削除しました' });
            onDeleted?.(post.id);
            if (redirectAfterDelete) router.push(redirectAfterDelete);
        } catch {
            toast({ title: '削除に失敗しました', variant: 'destructive' });
            setIsDeleting(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {/* スマホでもタップしやすいよう min-w/h を確保 */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 min-h-9 min-w-9 touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">メニュー</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={handleOpenEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* 編集ダイアログ */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>投稿を編集</DialogTitle>
                        <DialogDescription>キャプションを変更してください</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        rows={5}
                        placeholder="キャプションを入力..."
                        className="resize-none"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            キャンセル
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。投稿が完全に削除されます。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            削除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
