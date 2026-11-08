export type ClassName = string | false | null | undefined;

export const classNames = (...names: ClassName[]): string => names.filter(Boolean).join(' ');
