import { defineErrors } from './defineErrors';

export const RunErrors = defineErrors('Run', ['NotFound', 'NoContainer', 'NotStudioContainer', 'NeverStarted']);

export const BuildErrors = defineErrors('Build', ['Failed', 'Aborted']);

export const DumpErrors = defineErrors('Dump', ['Malformed', 'NotDump', 'NoFrame']);
