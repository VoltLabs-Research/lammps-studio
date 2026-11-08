import { useState } from 'react';

export interface Submission{
    pending: boolean;
    error: string | null;
    submit: (action: () => Promise<unknown>) => Promise<void>;
}

export const useSubmission = (copy: (error: unknown) => string): Submission => {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (action: () => Promise<unknown>) => {
        setPending(true);
        setError(null);
        try{
            await action();
        }catch(cause){
            setError(copy(cause));
        }
        setPending(false);
    };

    return {
        pending,
        error,
        submit
    };
};
