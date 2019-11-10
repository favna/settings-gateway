export type AnyObject = {} | Record<string | number | symbol, unknown>;
export type ReadonlyAnyObject = Readonly<AnyObject>;
export type SerializableValue = boolean | number | string | AnyObject | unknown[] | null;
