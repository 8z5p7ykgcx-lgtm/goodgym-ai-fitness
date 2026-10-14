import { Toaster as S } from 'sonner';
export function Toaster(props:React.ComponentProps<typeof S>){return <S className="toaster" toastOptions={{classNames:{toast:'bg-background text-foreground border shadow-lg rounded-md'}}}{...props}/>;}
