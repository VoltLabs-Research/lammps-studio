import { ModalContext } from '@/shared/hooks/use-modal';
import { useModalStore } from '@/shared/store/modal';

const ModalRoot = () => {
    const stack = useModalStore((state) => state.stack);

    return stack.map((entry) => (
        <ModalContext.Provider key={entry.key} value={entry}>
            {entry.content}
        </ModalContext.Provider>
    ));
};

export default ModalRoot;
