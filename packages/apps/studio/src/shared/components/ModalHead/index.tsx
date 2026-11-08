import { X } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import { useModal } from '@/shared/hooks/use-modal';

interface ModalHeadProps{
    title: string;
    children?: ReactNode;
}

const ModalHead = ({ title, children }: ModalHeadProps) => {
    const { close } = useModal();

    return (
        <div className='modal__head'>
            <div>
                <h2>{title}</h2>
                {children ? <p>{children}</p> : null}
            </div>
            <IconButton label='Close' className='modal__close' onClick={close}>
                <Icon glyph={X} />
            </IconButton>
        </div>
    );
};

export default ModalHead;
