import { ErrorTable } from '@lammps-studio/contracts/shared/errors';
import { ClientError } from '@/shared/errors/ClientError';

export const defineErrors = <T extends ErrorTable>({ domain, causes }: T) =>
    (cause: Extract<keyof T['causes'], string>, detail?: unknown): ClientError =>
        new ClientError(`${domain}::${cause}`, causes[cause], { cause: detail });
