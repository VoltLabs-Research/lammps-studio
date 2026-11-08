export type RunState =
    | 'created'
    | 'preparing'
    | 'starting'
    | 'running'
    | 'stopping'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type Accelerator = 'none' | 'omp' | 'kokkos' | 'gpu' | 'intel' | 'opt';

export type RunID = string;
export type ImageTag = string;
export type ISODateString = string;
export type ScalarValue = string | number;
