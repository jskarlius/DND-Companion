import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export function Tooltip({ content, children }: { readonly content: ReactNode; readonly children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>
    <TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="z-50 max-w-64 rounded-ui-sm bg-foreground px-2 py-1 text-xs text-white shadow-md" sideOffset={6}>{content}<TooltipPrimitive.Arrow className="fill-foreground" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>;
}
