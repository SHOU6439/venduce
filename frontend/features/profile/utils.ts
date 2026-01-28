export function calcTotalLikes(posts: { like_count: number }[]): number {
    return posts.reduce((sum, post) => sum + post.like_count, 0);
}

export function calcTotalPurchases(posts: { purchase_count: number }[]): number {
    return posts.reduce((sum, post) => sum + post.purchase_count, 0);
}
