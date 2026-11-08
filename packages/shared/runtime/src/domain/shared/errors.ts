import { defineErrors } from './defineErrors';

export const RunErrors = defineErrors('Run', ['NotFound', 'NoContainer']);

export const BuildErrors = defineErrors('Build', ['Failed', 'Aborted']);
