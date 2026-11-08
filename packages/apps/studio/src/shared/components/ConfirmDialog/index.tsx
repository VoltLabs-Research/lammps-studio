import { ReactNode, useState } from 'react';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import ModalHead from '@/shared/components/ModalHead';
import { useModal } from '@/shared/hooks/use-modal';
import '@/shared/components/ConfirmDialog/confirm-dialog.css';

interface ConfirmDialogProps{
    title: string;
    confirmLabel: string;
    onConfirm: () => Promise<unknown>;
    copy: (error: unknown) => string;
    children: ReactNode;
}

const ConfirmDialog = ({ title, confirmLabel, onConfirm, copy, children }: ConfirmDialogProps) => {
    const { close } = useModal();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirm = async () => {
        setPending(true);
        setError(null);
        try{
            await onConfirm();
            close();
        }catch(cause){
            setError(copy(cause));
            setPending(false);
        }
    };

    return (
        <Modal label={title} className='confirm'>
            <ModalHead title={title}>{children}</ModalHead>
            {error ? <p className='confirm__error danger-ink' role='alert'>{error}</p> : null}
            <div className='modal__foot'>
                <Button variant='ghost' onClick={close}>Cancel</Button>
                <Button variant='danger' disabled={pending} onClick={confirm}>{confirmLabel}</Button>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
