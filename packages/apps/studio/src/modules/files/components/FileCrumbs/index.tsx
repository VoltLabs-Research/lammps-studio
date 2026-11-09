import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import type { Crumb } from '@/modules/files/domain/files';
import Icon from '@/shared/components/Icon';
import '@/modules/files/components/FileCrumbs/crumbs.css';

interface FileCrumbsProps{
    crumbs: Crumb[];
    onOpen: (path: string) => void;
}

const FileCrumbs = ({ crumbs, onOpen }: FileCrumbsProps) => (
    <nav className='crumbs' aria-label='Folder'>
        {crumbs.map((crumb, index) => (
            <Fragment key={crumb.path}>
                {index > 0 && <Icon glyph={ChevronRight} size='xs' />}
                {index === crumbs.length - 1
                    ? <span className='crumb' aria-current='location'>{crumb.label}</span>
                    : <button type='button' className='crumb' onClick={() => onOpen(crumb.path)}>{crumb.label}</button>}
            </Fragment>
        ))}
    </nav>
);

export default FileCrumbs;
