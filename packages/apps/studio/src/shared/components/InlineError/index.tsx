import '@/shared/components/InlineError/inline-error.css';

interface InlineErrorProps{
    message: string | null;
}

const InlineError = ({ message }: InlineErrorProps) => {
    if(!message) return null;

    return <p className='inline-error' role='alert'>{message}</p>;
};

export default InlineError;
