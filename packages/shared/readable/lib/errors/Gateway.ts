import { GatewayErrors } from '@lammps-studio/contracts/shared/errors';
import { defineErrors } from '../utils/errors/define-errors';

export const GatewayError = defineErrors(GatewayErrors);