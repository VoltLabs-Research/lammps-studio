import { baseCodeOf } from '@lammps-studio/contracts/shared/errors';
import { ErrorMessages, StudioErrorCode } from '@/shared/contracts/errors';
import { ClientError } from '@/shared/errors/ClientError';

const SHARED: ErrorMessages<StudioErrorCode> = {
    'Agent::NotConfigured': 'Studio has no agent to talk to. Set VITE_AGENT_URL and VITE_AGENT_TOKEN.',
    'Agent::Unreachable': 'Studio can’t reach the agent.',
    'Agent::UnexpectedResponse': 'The agent sent a response Studio doesn’t understand.',
    'Request::Unauthorized': 'The agent rejected Studio’s token.',
    'Request::ValidationFailed': 'The agent rejected the request as invalid.',
    'Machine::NotFound': 'This machine is no longer connected to Studio.',
    'Machine::Offline': 'This machine is offline.',
    'Simulation::NotFound': 'This simulation no longer exists.',
    'Build::NotFound': 'This build no longer exists.'
};

const hasCopy = <C extends string>(messages: Partial<Record<C, string>>, code: string): code is C => code in messages;

const lookup = <C extends string>(messages: Partial<Record<C, string>>, code: string): string | undefined => {
    if(!hasCopy(messages, code)) return undefined;

    return messages[code];
};

const codeOf = (error: unknown): string => {
    if(error instanceof ClientError) return error.code;
    if(error instanceof Error) return error.message;

    return String(error);
};

export const errorCopy = <C extends StudioErrorCode>(messages: ErrorMessages<C>) => (error: unknown): string => {
    const code = baseCodeOf(codeOf(error));

    return lookup(messages, code) ?? lookup(SHARED, code) ?? code;
};

export const sharedErrorCopy = errorCopy({});
