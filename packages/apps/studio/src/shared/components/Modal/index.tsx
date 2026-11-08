import { KeyboardEvent, MouseEvent, PointerEvent, ReactNode, useRef } from 'react';
import { ModalFocus, ModalPlacement } from '@/shared/contracts/ui';
import { useInitialFocus } from '@/shared/hooks/use-initial-focus';
import { useModal } from '@/shared/hooks/use-modal';
import { classNames } from '@/shared/utils/class-names';
import { trapTab } from '@/shared/utils/focus-trap';
import '@/shared/components/Modal/modal.css';

interface ModalProps{
    label: string;
    className?: string;
    placement?: ModalPlacement;
    initialFocus?: ModalFocus;
    children: ReactNode;
}

const Modal = ({ label, className, placement = 'center', initialFocus = 'first', children }: ModalProps) => {
    const { close } = useModal();
    const dialogRef = useRef<HTMLDivElement>(null);
    const pressedBackdrop = useRef(false);

    useInitialFocus(dialogRef, initialFocus);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        pressedBackdrop.current = event.target === event.currentTarget;
    };

    const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target === event.currentTarget && pressedBackdrop.current) close();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if(event.key === 'Tab') trapTab(event.nativeEvent, event.currentTarget);
    };

    return (
        <div className={classNames('backdrop', placement === 'top' && 'backdrop--top')} onPointerDown={onPointerDown} onClick={onBackdropClick}>
            <div
                ref={dialogRef}
                className={classNames('modal glass', className)}
                role='dialog'
                aria-modal='true'
                aria-label={label}
                tabIndex={-1}
                onKeyDown={onKeyDown}
            >
                {children}
            </div>
        </div>
    );
};

export default Modal;
