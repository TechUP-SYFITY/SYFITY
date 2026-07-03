'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = 'end',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-52 overflow-hidden rounded-lg border border-border bg-popover/98 text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('flex flex-col gap-0.5 px-4 py-3', className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  'flex h-11 cursor-pointer items-center gap-3 px-4 text-sm font-semibold outline-none transition-colors data-[highlighted]:bg-white/5 data-[disabled]:pointer-events-none data-[disabled]:text-white/25 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'text-white/85',
        destructive: 'text-destructive data-[highlighted]:bg-destructive/10',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface DropdownMenuItemProps
  extends
    React.ComponentProps<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof itemVariants> {}

export function DropdownMenuItem({ className, variant, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item className={cn(itemVariants({ variant }), className)} {...props} />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('mx-3 my-0 h-px bg-border', className)}
      {...props}
    />
  );
}
