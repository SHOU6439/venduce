'use client';

import { useState } from 'react';

interface LikeAnimationProps {
  isLiked?: boolean;
  onToggle?: (isLiked: boolean) => void;
  sizeClass?: string;
}

export default function LikeAnimation({ isLiked: controlledIsLiked, onToggle, sizeClass = 'w-8 h-8' }: LikeAnimationProps) {
  const [internalIsLiked, setInternalIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isLiked = controlledIsLiked !== undefined ? controlledIsLiked : internalIsLiked;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isLiked;

    if (controlledIsLiked === undefined) {
      setInternalIsLiked(newState);
    }

    if (newState) {
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
