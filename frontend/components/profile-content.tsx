'use client';
import { ArrowLeft, Settings, Grid3x3, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const MOCK_USER = {
  name: '',
  username: '',
  avatar: '',
  bio: '',
  followers: 0,
  following: 0,
  posts: [] as any[],
  likedPosts: [] as any[],
};

export function ProfileContent() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="flex-1 font-semibold text-lg">{MOCK_USER.username}</h1>
          <Button asChild variant="ghost" size="icon">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        {/* Profile Info */}
        <div className="space-y-6 p-4">
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-8 md:text-left">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={MOCK_USER.avatar || '/placeholder.svg'} />
              <AvatarFallback>{MOCK_USER.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="mt-4 flex-1 md:mt-0">
              <h2 className="text-2xl font-bold">{MOCK_USER.name}</h2>
              <p className="text-muted-foreground">@{MOCK_USER.username}</p>

              <p className="mt-4 text-sm leading-relaxed">{MOCK_USER.bio}</p>

              <div className="mt-4 flex justify-center gap-6 md:justify-start">
                <button className="text-center hover:underline">
                  <p className="font-semibold text-lg">{MOCK_USER.posts.length}</p>
                  <p className="text-xs text-muted-foreground">投稿</p>
                </button>
                <button className="text-center hover:underline">
                  <p className="font-semibold text-lg">{MOCK_USER.followers}</p>
                  <p className="text-xs text-muted-foreground">フォロワー</p>
                </button>
                <button className="text-center hover:underline">
                  <p className="font-semibold text-lg">{MOCK_USER.following}</p>
                  <p className="text-xs text-muted-foreground">フォロー中</p>
                </button>
              </div>

              <Button className="mt-4 w-full md:w-auto">プロフィールを編集</Button>
            </div>
          </div>
        </div>

        {/* Posts Tabs */}
        <Tabs defaultValue="posts" className="mt-6">
          <TabsList className="w-full justify-center border-b border-border rounded-none bg-transparent h-auto p-0">
            <TabsTrigger value="posts" className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">投稿</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">いいね</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            <div className="grid grid-cols-3 gap-1">
              {MOCK_USER.posts.map((post) => (
                <Link key={post.id} href="/feed" className="group relative aspect-square overflow-hidden bg-muted">
                  <img src={post.image || '/placeholder.svg'} alt="投稿" className="h-full w-full object-cover transition-all group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-2 text-white">
                      <Heart className="h-5 w-5 fill-white" />
                      <span className="font-semibold">{post.likes}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            <div className="grid grid-cols-3 gap-1">
              {MOCK_USER.likedPosts.map((post) => (
                <Link key={post.id} href="/feed" className="group relative aspect-square overflow-hidden bg-muted">
                  <img src={post.image || '/placeholder.svg'} alt="いいねした投稿" className="h-full w-full object-cover transition-all group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-2 text-white">
                      <Heart className="h-5 w-5 fill-white" />
                      <span className="font-semibold">{post.likes}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
