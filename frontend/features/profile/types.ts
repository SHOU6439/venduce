import { z } from 'zod';

export const profileEditSchema = z.object({
    username: z.string().min(6, 'ユーザー名は6文字以上で入力してください').max(32, 'ユーザー名は32文字以内で入力してください'),
    first_name: z.string().min(1, '名は必須です').max(100, '名は100文字以内で入力してください'),
    last_name: z.string().min(1, '姓は必須です').max(100, '姓は100文字以内で入力してください'),
    bio: z.string().min(1, '自己紹介文は必須です').max(1000, '自己紹介文は1000文字以内で入力してください'),
    avatar: z
        .instanceof(File)
        .optional()
        .refine(
            (file) => !file || file.size <= 5 * 1024 * 1024,
            { message: '5MB以下の画像を選択してください' }
        ),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;
