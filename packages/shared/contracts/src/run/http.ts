import { RunConfig } from './domain';

export interface StartRunInput{
    config: RunConfig;
}

export interface StopRunInput{
    kill: boolean;
}
