'use client';

import type React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/api/client';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
                <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl border border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">無効なリンク</CardTitle>
                        <CardDescription className="mt-2">
                            パスワードリセットのリンクが無効です。
                            再度リセットをリクエストしてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link
                            href="/forgot-password"
                            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
                        >
                            パスワードリセットを再リクエスト
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('パスワードは8文字以上で入力してください。');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('パスワードが一致しません。');
            return;
        }

        setLoading(true);

        try {
            await apiClient.post('/auth/reset-password', {
                token,
                new_password: newPassword,
            });
            setSuccess(true);
        } catch (err) {
            if (err instanceof ApiError) {
                const data = err.data as Record<string, unknown> | null;
                const detail = data?.detail;
                if (typeof detail === 'string') {
                    setError(detail);
                } else if (typeof detail === 'object' && detail !== null) {
                    setError((detail as Record<string, unknown>).message as string || 'エラーが発生しました。');
                } else {
                    setError('トークンが無効または期限切れです。再度リセットをリクエストしてください。');
                }
            } else {
                setError('ネットワークエラーが発生しました。');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
                <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl border border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">パスワードをリセットしました</CardTitle>
                        <CardDescription className="mt-2">
                            新しいパスワードが設定されました。
                            新しいパスワードでログインしてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                        >
                            ログインページへ
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
            <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl border border-white/20">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">新しいパスワードを設定</CardTitle>
                    <CardDescription className="mt-2">
                        新しいパスワードを入力してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">新しいパスワード</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="8文字以上"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">パスワード確認</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="もう一度入力"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                required
                                minLength={8}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '設定中...' : 'パスワードを変更'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            ログインページに戻る
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
