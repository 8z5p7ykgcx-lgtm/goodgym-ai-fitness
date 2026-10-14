import * as React from 'react';
import { cn } from '@/lib/utils';
export function Card({className,...p}:React.ComponentProps<'div'>){return <div className={cn('flex flex-col rounded-xl border bg-card shadow-sm',className)}{...p}/>;}
export function CardHeader({className,...p}:React.ComponentProps<'div'>){return <div className={cn('px-5 pt-5 pb-2',className)}{...p}/>;}
export function CardTitle({className,...p}:React.ComponentProps<'div'>){return <div className={cn('font-semibold',className)}{...p}/>;}
export function CardContent({className,...p}:React.ComponentProps<'div'>){return <div className={cn('px-5 pb-4',className)}{...p}/>;}
