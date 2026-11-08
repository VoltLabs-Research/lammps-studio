import { toast } from '@/shared/store/toast';

const COPY_BY_HAND = 'Select the text and copy it with Ctrl+C';

export const copyText = (text: string, done: string) =>
    navigator.clipboard.writeText(text).then(() => toast(done), () => toast(COPY_BY_HAND));
