import { ReactNode } from 'react';
import DashboardHeader from '@/app/components/DashboardHeader';
import '@/app/components/DashboardView/dashboard-view.css';

interface DashboardViewProps{
    onSearch: () => void;
    onSettings: () => void;
    children: ReactNode;
}

const DashboardView = ({ onSearch, onSettings, children }: DashboardViewProps) => (
    <div className='view'>
        <div className='page-frame'>
            <div className='page-surface'>
                <DashboardHeader onSearch={onSearch} onSettings={onSettings} />
                <main className='page-scroll'>{children}</main>
            </div>
        </div>
    </div>
);

export default DashboardView;
