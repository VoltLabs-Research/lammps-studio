import { runApi } from '@/modules/run-control/api/api';
import { stopPicking } from '@/modules/run-control/store/entry';
import { runErrorCopy } from '@/modules/run-control/utils/error-messages';
import { patchDraft } from '@/modules/run-settings/utils/draft-edits';
import { reloadScript } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';
import { toast } from '@/shared/store/toast';

export const chooseEntry = async (simulationId: string, path: string) => {
    try{
        const simulation = await runApi.setEntry(simulationId, path);
        useSimulationsStore.getState().upsert(simulation);
        patchDraft({ entry: path });
        stopPicking();
        await reloadScript(simulationId);
        toast(`Entry script set to ${path}`);
    }catch(error){
        toast(runErrorCopy(error));
    }
};
