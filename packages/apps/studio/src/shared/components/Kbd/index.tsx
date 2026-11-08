import { ReactNode } from 'react';
import '@/shared/components/Kbd/kbd.css';

interface KbdProps{
    children: ReactNode;
}

const Kbd = ({ children }: KbdProps) => <kbd className='kbd'>{children}</kbd>;

export default Kbd;
