import { baseCodeOf } from '@lammps-studio/contracts/shared/errors';
import { StudioErrorCode } from '@/shared/contracts/errors';
import { ClientError } from '@/shared/errors/ClientError';

export const hasCode = (error: unknown, code: StudioErrorCode): boolean => error instanceof ClientError && baseCodeOf(error.code) === code;
