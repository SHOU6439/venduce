'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps extends ButtonProps {
  showLabel?: boolean;
  label?: string;
}

export function BackButton({
  showLabel = false,
  label = '戻る',
  className,
  ...props
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      onClick={() => router.back()}
      className={cn('gap-2', className)}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && label}
    </Button>
  );
}
