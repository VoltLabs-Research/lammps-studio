import { LucideIcon } from 'lucide-react';

export interface Command{
    id: string;
    label: string;
    icon: LucideIcon;
    kbd?: string;
    run: () => void;
}
