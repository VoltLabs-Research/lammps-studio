import { Search, Settings } from 'lucide-react';
import TrafficLights from '@/app/components/TrafficLights';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import Kbd from '@/shared/components/Kbd';
import '@/app/components/DashboardHeader/dashboard-header.css';

interface DashboardHeaderProps{
    onSearch: () => void;
    onSettings: () => void;
}

const DashboardHeader = ({ onSearch, onSettings }: DashboardHeaderProps) => (
    <header className='dash-header'>
        <span aria-hidden='true' />
        <button type='button' className='search' onClick={onSearch}>
            <Icon glyph={Search} size='sm' />
            <span>Search simulations, scripts and machines</span>
            <Kbd>Ctrl K</Kbd>
        </button>
        <div className='dash-header__right'>
            <IconButton label='Settings' tip='Settings' onClick={onSettings}>
                <Icon glyph={Settings} />
            </IconButton>
            <TrafficLights />
        </div>
    </header>
);

export default DashboardHeader;
