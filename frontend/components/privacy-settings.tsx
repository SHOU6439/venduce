'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/stores/auth';

export function PrivacySettings() {
    const user = useAuthStore((state) => state.user);
    const [isPurchasePublic, setIsPurchasePublic] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const profile = await usersApi.getProfile();
                setIsPurchasePublic(
                    (profile as any).is_purchase_history_public ?? true
                );
            } catch (err) {
                console.error('Failed to load privacy settings', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleToggle = async (checked: boolean) => {
        const previous = isPurchasePublic;
        setIsPurchasePublic(checked);
        setSaving(true);
        try {
            await usersApi.updateSettings({ is_purchase_history_public: checked });
        } catch (err) {
            console.error('Failed to update privacy setting', err);
            setIsPurchasePublic(previous);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">プライバシー設定</h3>
                <p className="text-sm text-muted-foreground">
                    他のユーザーにどの情報を公開するか管理できます。
                </p>
            </div>

            <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <ShoppingBag className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div>
                            <Label htmlFor="purchase-public" className="text-sm font-medium">
                                購入履歴を公開する
                            </Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                                オンにすると、他のユーザーがあなたのプロフィールで購入履歴を閲覧できます。
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="purchase-public"
                        checked={isPurchasePublic}
                        onCheckedChange={handleToggle}
                        disabled={saving}
                    />
                </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                    <strong>いいねした投稿</strong>は常に公開されます。買った物を自慢するアプリなので、いいねも公開して楽しみましょう！
                </p>
            </div>
        </div>
    );
}
