import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const v=cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:opacity-50 [&_svg]:size-4',{variants:{variant:{default:'bg-primary text-primary-foreground hover:bg-primary/90',destructive:'bg-destructive text-white hover:bg-destructive/90',outline:'border border-input hover:bg-accent',secondary:'bg-secondary text-secondary-foreground hover:bg-secondary/80',ghost:'hover:bg-accent'}},size:{default:'h-9 px-4',sm:'h-8 px-3',lg:'h-10 px-6',icon:'h-9 w-9'}},defaultVariants:{variant:'default',size:'default'}});
export function Button({className,variant,size,asChild=false,...p}:React.ComponentProps<'button'>&VariantProps<typeof v>&{asChild?:boolean}){const C=asChild?Slot:'button';return <C className={cn(v({variant,size,className}))}{...p}/>;}
