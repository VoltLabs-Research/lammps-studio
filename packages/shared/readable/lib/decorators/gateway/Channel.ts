export const channelByGateway = new WeakMap<object, string>();

export const Channel = (path: string): ClassDecorator => {
    return (target) => {
        channelByGateway.set(target, path);  
    };
};
