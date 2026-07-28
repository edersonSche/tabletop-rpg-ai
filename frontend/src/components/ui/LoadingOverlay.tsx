import { memo } from 'react';

interface LoadingOverlayProps {
  title: string;
  subtitle?: string;
}

export const LoadingOverlay = memo(function LoadingOverlay({
  title,
  subtitle,
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-navy-950/95 flex flex-col items-center justify-center z-50">
      <div className="animate-crystal-pulse mb-4">
        <div className="w-12 h-12 border-2 border-cyan-400/50 rotate-45" />
      </div>
      <p className="font-pixel text-[13px] text-gold-400 text-shadow-glow-gold mb-2">
        {title}
      </p>
      {subtitle && (
        <p className="font-pixel text-[9px] text-stone-600">{subtitle}</p>
      )}
    </div>
  );
});
