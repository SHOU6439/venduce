'use client';

import { useState, useEffect } from 'react';
import { useProfileEdit } from '@/features/profile/hooks/useProfileEdit';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import { UserProfile } from '@/types/api';
import { getImageUrl } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function ProfileSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  const {
    form,
    error: editError,
    saving,
    handleChange,
    handleSubmit,
    setForm,
  } = useProfileEdit({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
    avatar: undefined,
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await usersApi.getProfile();
        const mappedUser = {
          ...userData,
          avatar_url: (userData as any).avatar_asset?.public_url ?? userData.avatar_url ?? null,
        };
        setProfile(mappedUser);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login');
          return;
        }
        console.error('Failed to load profile', err);
        setError(err instanceof Error ? err.message : 'プロフィール情報を取得できませんでした');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (error) return <div className="p-4 rounded-lg bg-red-50 text-red-700">{error}</div>;
  if (!profile) return <div className="p-8 text-center">プロフィール情報が見つかりません。</div>;

  const handleEditClick = () => {
    setForm({
      username: profile.username ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      bio: profile.bio ?? '',
      avatar: undefined,
    });
    setEditAvatarPreview(profile.avatar_url ? getImageUrl(profile.avatar_url) : null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      const file = files[0];
      setForm((prev) => ({ ...prev, avatar: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditAvatarPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleSubmit(e);
    if (success) {
      // Refresh profile data
      const userData = await usersApi.getProfile();
      const mappedUser = {
        ...userData,
        avatar_url: (userData as any).avatar_asset?.public_url ?? userData.avatar_url ?? null,
      };
      setProfile(mappedUser);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {editError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{editError}</div>}

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">プロフィール画像</label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={editAvatarPreview || undefined} />
                <AvatarFallback>{profile?.username?.[0] ?? 'U'}</AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block text-sm"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">ユーザー名</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium mb-1">名前</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium mb-1">苗字</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-1">自己紹介</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleFormChange}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              保存
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getImageUrl(profile?.avatar_url ?? undefined)} />
            <AvatarFallback>{profile?.username?.[0] ?? 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{profile?.username}</p>
            <p className="text-sm text-muted-foreground">
              {`${profile?.last_name ?? ''} ${profile?.first_name ?? ''}`.trim() || 'ユーザー'}
            </p>
            {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
          </div>
        </div>
        <Button onClick={handleEditClick}>編集</Button>
      </div>
    </div>
  );
}
