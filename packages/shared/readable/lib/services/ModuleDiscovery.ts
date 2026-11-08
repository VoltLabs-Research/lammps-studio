import BaseController from '../controllers/BaseController';
import BaseGateway from '../gateway/BaseGateway';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface MountedController{
    prefix: string;
    Controller: new () => BaseController;
}

export interface Discovered{
    controllers: MountedController[];
    gateways: Array<new () => BaseGateway>;
}

interface DefaultExport<T>{
    default?: T;
}

export default class ModuleDiscovery{
    constructor(private readonly modulesDir: string){}

    async discover(): Promise<Discovered>{
        const names = (await readdir(this.modulesDir, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();

        const discovered: Discovered = {
            controllers: [],
            gateways: []
        };

        for(const name of names){
            const controllers = await this.#loadDefaults<new () => BaseController>(name, 'controllers');
            discovered.controllers.push(...controllers.map((Controller) => ({
                prefix: `/${name}`,
                Controller
            })));
            discovered.gateways.push(...await this.#loadDefaults<new () => BaseGateway>(name, 'gateways'));
        }

        return discovered;
    }

    async #loadDefaults<T>(moduleName: string, category: string): Promise<T[]>{
        const dir = join(this.modulesDir, moduleName, category);

        let files: string[];
        try{
            files = await readdir(dir);
        }catch{
            return [];
        }

        const loaded: T[] = [];
        for(const file of files.sort()){
            if(!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
            const imported = await import(pathToFileURL(join(dir, file)).href) as DefaultExport<T>;
            if(imported.default) loaded.push(imported.default);
        }
        return loaded;
    }
}
