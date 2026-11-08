import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { SimulationSpec } from '../../domain/simulation/SimulationSpec';
import { WorkspaceErrors } from '../../domain/shared/errors';
import type { Logger } from '../../ports/Logger';
import type { PreparedWorkspace, WorkspacePreparerPort } from '../../ports/WorkspacePreparerPort';

const CONTAINER_INPUT_DIR = '/workspace/input';

const findCommonRoot = (paths: string[]): string => {
    const [first, ...rest] = paths;
    let commonParts = first.split(path.sep).filter(Boolean);

    for(const currentPath of rest){
        const currentParts = currentPath.split(path.sep).filter(Boolean);
        let index = 0;
        while(index < commonParts.length && index < currentParts.length && commonParts[index] === currentParts[index]){
            index += 1;
        }
        commonParts = commonParts.slice(0, index);
    }

    return path.join(path.parse(first).root, ...commonParts);
};

const resolveRelativeTarget = (rootPath: string, filePath: string): string => {
    const relativePath = path.relative(rootPath, filePath);
    const insideRoot = relativePath.length > 0
        && !relativePath.startsWith('..')
        && !path.isAbsolute(relativePath)
        && relativePath !== '.';

    if(insideRoot){
        return relativePath;
    }

    return path.basename(filePath);
};

const toPosixPath = (value: string): string => {
    return value.split(path.sep).join(path.posix.sep);
};

const ensurePathExists = async (targetPath: string) => {
    try{
        await access(targetPath);
    }catch{
        throw WorkspaceErrors.InputNotFound(targetPath);
    }
};

export default class NodeWorkspacePreparer implements WorkspacePreparerPort{
    constructor(private readonly logger: Logger){}

    async prepare(runId: string, spec: SimulationSpec): Promise<PreparedWorkspace>{
        const outputDir = path.resolve(spec.outputDir);
        const workspaceDir = path.join(outputDir, '.lammps-runtime', runId);
        const inputDir = path.join(workspaceDir, 'input');

        await mkdir(inputDir, { recursive: true });

        const mainScriptPath = path.resolve(spec.inputFile);
        const inputFiles = (spec.inputFiles ?? []).map((value) => path.resolve(value));
        const sources = [mainScriptPath, ...inputFiles];

        for(const sourcePath of sources){
            await ensurePathExists(sourcePath);
        }

        const sourceRoot = findCommonRoot(sources);
        let mainInputHostPath = '';

        for(const sourcePath of sources){
            const targetPath = path.join(inputDir, resolveRelativeTarget(sourceRoot, sourcePath));
            await mkdir(path.dirname(targetPath), { recursive: true });
            await copyFile(sourcePath, targetPath);

            if(sourcePath === mainScriptPath){
                mainInputHostPath = targetPath;
            }
        }

        if(mainInputHostPath.length === 0){
            throw WorkspaceErrors.NotStaged(mainScriptPath);
        }

        this.logger.info('Prepared simulation workspace from script path.', { outputDir, workspaceDir, inputDir });

        return {
            outputDir,
            workspaceDir,
            inputDir,
            mainInputHostPath,
            mainInputContainerPath: toPosixPath(path.join(CONTAINER_INPUT_DIR, path.relative(inputDir, mainInputHostPath)))
        };
    }

    async cleanup(workspace: PreparedWorkspace){
        await rm(workspace.workspaceDir, { recursive: true, force: true });
    }
}
