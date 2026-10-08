import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-ui-sm border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-[#1f4559]',
        secondary: 'border-border bg-surface text-foreground hover:bg-[#e8f0f4]',
        destructive: 'border-destructive bg-destructive text-white hover:bg-[#8f1c13]',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-[#e8f0f4]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export { buttonVariants };
