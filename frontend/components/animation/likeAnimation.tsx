'use client';

import { useState } from 'react';

interface LikeAnimationProps {
  /**
   * 現在のいいね状態。
   * 指定しない場合は内部で状態管理を行います。
   */
  isLiked?: boolean;
  /**
   * 状態が変更されたときに呼ばれるコールバック。
   */
  onToggle?: (isLiked: boolean) => void;
  /**
   * アイコンのサイズ (px単位など、tailwindのクラスを指定可能)
   * デフォルト: w-8 h-8
   */
  sizeClass?: string;
}

export default function LikeAnimation({ isLiked: controlledIsLiked, onToggle, sizeClass = 'w-8 h-8' }: LikeAnimationProps) {
  const [internalIsLiked, setInternalIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 外部制御か内部状態かを判定
  const isLiked = controlledIsLiked !== undefined ? controlledIsLiked : internalIsLiked;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // リンク内にある場合などを考慮
    e.stopPropagation(); // 親要素へのイベント伝播を防止

    const newState = !isLiked;

    // 内部状態モードなら更新
    if (controlledIsLiked === undefined) {
      setInternalIsLiked(newState);
    }

    if (newState) {
      // いいね！されたときのアニメーション
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }

    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <button onClick={handleClick} className="group relative flex items-center justify-center focus:outline-none cursor-pointer" aria-label={isLiked ? 'いいねを取り消す' : 'いいね'}>
      <div className={`relative transition-transform duration-200 ease-out active:scale-75 ${isAnimating ? 'scale-125' : 'scale-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${sizeClass} transition-colors duration-300 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-gray-500 fill-transparent'}`}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>

        {/* 波紋エフェクト */}
        {isAnimating && <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>}
      </div>
    </button>
  );
}
