export interface ScriptVariable{
    name: string;
    style: string;
    value: string;
    line: number;
    overridable: boolean;
}

export interface ScriptCommand{
    id: string;
    group: string;
    style: string;
    args: string;
    line: number;
}

export interface ScriptDump{
    id: string;
    group: string;
    style: string;
    every: number;
    file: string;
    columns: string[];
    line: number;
}

export interface ScriptRun{
    line: number;
    steps: number;
}

export interface RequiredPackage{
    name: string;
    reason: string;
    line: number;
}

export interface ScriptInfo{
    entry: string;
    lines: number;
    variables: ScriptVariable[];
    computes: ScriptCommand[];
    fixes: ScriptCommand[];
    dumps: ScriptDump[];
    runs: ScriptRun[];
    requiredPackages: RequiredPackage[];
    thermoEvery: number | null;
}

export interface EntryCandidate{
    path: string;
    lines: number;
    hint: string;
    likely: boolean;
}
