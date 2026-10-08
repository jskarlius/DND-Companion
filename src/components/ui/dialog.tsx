import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#14232bcc] data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 grid w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-ui-lg border border-border bg-surface-raised p-5 shadow-md focus:outline-none', className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-ui-sm p-1 text-muted-foreground hover:bg-[#e8f0f4] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring)]" aria-label="Close dialog"><X className="size-5" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
