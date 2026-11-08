import { ReactNode } from 'react';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import Modal from '@/shared/components/Modal';
import ModalHead from '@/shared/components/ModalHead';
import { useModal } from '@/shared/hooks/use-modal';
import { useSubmission } from '@/shared/hooks/use-submission';
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
    const { pending, error, submit } = useSubmission(copy);

    const confirm = () => submit(async () => {
        await onConfirm();
        close();
    });

    return (
        <Modal label={title} className='confirm'>
            <ModalHead title={title}>{children}</ModalHead>
            <InlineError message={error} />
            <div className='modal__foot'>
                <Button variant='ghost' onClick={close}>Cancel</Button>
                <Button variant='danger' disabled={pending} onClick={confirm}>{confirmLabel}</Button>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
