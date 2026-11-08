import { post } from '../shared/routing';
import { EditorSession } from './domain';

export const editorRoutes = {
    open: post<never, EditorSession>('/editor/:simulationId')
};
