import { StatusItem } from '@/modules/run-control/domain/run-control';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';

interface StatusbarItemProps{
    item: StatusItem;
}

const StatusbarItem = ({ item }: StatusbarItemProps) => (
    <span className={classNames('statusbar__item', item.mono && 'mono', item.wideOnly && 'hide-md')}>
        {item.icon ? <Icon glyph={item.icon} size='xs' spin={item.spin} /> : null}
        {item.text}
    </span>
);

export default StatusbarItem;
