import { defineErrors } from './defineErrors';

export const RunErrors = defineErrors('Run', ['NotFound', 'NoContainer']);

export const WorkspaceErrors = defineErrors('Workspace', ['InputNotFound', 'NotStaged']);

export const ContainerErrors = defineErrors('Container', ['InvalidMemory']);
