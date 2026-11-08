export const autoValidateBody = () => ({
    name: 'readable:auto-validate-body',
    enforce: 'pre' as const,
    transform(code: string, id: string){
        if(!/src\/modules\/[^/?]+\/controllers\/[^/?]+\.ts(\?.*)?$/.test(id)) return null;
        if(!code.includes('@Body()')) return null;

        let out = code.replace(
            /@Body\(\)(\s+)(\w+):(\s*)(\w+)/g,
            '@Body(typia.misc.createValidatePrune<$4>())$1$2:$3$4'
        );
        if(!/from 'typia'/.test(out)) out += "\nimport typia from 'typia';\n";
        return {
            code: out,
            map: null
        };
    }
});
