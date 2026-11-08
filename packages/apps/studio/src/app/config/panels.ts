import { ComponentType } from 'react';
import EditorPanel from '@/modules/editor/components/EditorPanel';
import OutputPanel from '@/modules/output/components/OutputPanel';
import ChartsPanel from '@/modules/charts/components/ChartsPanel';
import VariablesPanel from '@/modules/variables/components/VariablesPanel';
import FilesPanel from '@/modules/files/components/FilesPanel';
import RunsPanel from '@/modules/runs/components/RunsPanel';
import RunSettingsPanel from '@/modules/run-settings/components/RunSettingsPanel';
import { PanelId } from '@/shared/contracts/workspace';

export const PANELS: Record<PanelId, ComponentType> = {
    editor: EditorPanel,
    output: OutputPanel,
    charts: ChartsPanel,
    variables: VariablesPanel,
    files: FilesPanel,
    runs: RunsPanel,
    config: RunSettingsPanel
};
