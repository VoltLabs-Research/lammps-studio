import { useToastStore } from '@/shared/store/toast';
import '@/shared/components/ToastRoot/toast-root.css';

const ToastRoot = () => {
    const current = useToastStore((state) => state.current);

    return (
        <div role='status' aria-live='polite'>
            {current ? <div key={current.id} className='toast'>{current.message}</div> : null}
        </div>
    );
};

export default ToastRoot;
