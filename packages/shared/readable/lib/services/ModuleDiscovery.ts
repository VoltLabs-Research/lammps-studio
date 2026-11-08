import BaseController from '../controllers/BaseController';
import BaseGateway from '../gateway/BaseGateway';
import { readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';

export type ModuleCategory = 'controllers' | 'gateways';

export interface MountedController{
    prefix: string;
    Controller: new () => BaseController;
}

export interface Discovered{
    controllers: MountedController[];
    gateways: Array<new () => BaseGateway>;
}

export interface DefaultExport<T>{
    default?: T;
}

export interface ControllerEntry{
    module: string;
    category: 'controllers';
    load: () => Promise<DefaultExport<new () => BaseController>>;
}

export interface GatewayEntry{
    module: string;
    category: 'gateways';
    load: () => Promise<DefaultExport<new () => BaseGateway>>;
}

export type ModuleEntry = ControllerEntry | GatewayEntry;

export interface ModuleFile{
    module: string;
    category: ModuleCategory;
    name: string;
}

const CATEGORIES: ModuleCategory[] = ['controllers', 'gateways'];
const MANIFEST_IMPORT = "import { ModuleEntry } from '@lammps-studio/readable/services/ModuleDiscovery';";
const INDENT = '    ';

const renderEntry = (specifier: string, file: ModuleFile): string => [
    `${INDENT}{`,
    `${INDENT}${INDENT}module: '${file.module}',`,
    `${INDENT}${INDENT}category: '${file.category}',`,
    `${INDENT}${INDENT}load: () => import('${specifier}/${file.module}/${file.category}/${file.name}')`,
    `${INDENT}}`
].join('\n');

export default class ModuleDiscovery{
    constructor(private readonly modulesDir: string){}

    async files(): Promise<ModuleFile[]>{
        const modules = (await readdir(this.modulesDir, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();

        const files: ModuleFile[] = [];
        for(const module of modules){
            for(const category of CATEGORIES){
                const names = await this.#sources(module, category);
                files.push(...names.map((name) => ({ module, category, name })));
            }
        }
        return files;
    }

    async manifest(specifier: string): Promise<string>{
        const entries = (await this.files()).map((file) => renderEntry(specifier, file));

        return `${MANIFEST_IMPORT}\n\nexport const modules: ModuleEntry[] = [\n${entries.join(',\n')}\n];\n`;
    }

    static async load(entries: ModuleEntry[]): Promise<Discovered>{
        const discovered: Discovered = {
            controllers: [],
            gateways: []
        };

        for(const entry of entries){
            if(entry.category === 'controllers'){
                const { default: Controller } = await entry.load();
                if(Controller) discovered.controllers.push({ prefix: `/${entry.module}`, Controller });
            }else{
                const { default: Gateway } = await entry.load();
                if(Gateway) discovered.gateways.push(Gateway);
            }
        }

        return discovered;
    }

    async #sources(module: string, category: ModuleCategory): Promise<string[]>{
        let files: string[];
        try{
            files = await readdir(join(this.modulesDir, module, category));
        }catch{
            return [];
        }

        return files
            .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
            .map((file) => parse(file).name)
            .sort();
    }
}
