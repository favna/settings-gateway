import { Client as DiscordClient } from 'discord.js';
import { ProviderStore } from './structures/ProviderStore';
import { SerializerStore } from './structures/SerializerStore';
import { GatewayDriver } from './gateway/GatewayDriver';

export type DeepReadonly<T extends object> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
}

export type KeyedObject = Record<PropertyKey, unknown>;
export type AnyObject = KeyedObject;
export type ReadonlyKeyedObject = DeepReadonly<KeyedObject>;
export type ReadonlyAnyObject = DeepReadonly<AnyObject>;
export type SerializableValue = boolean | number | string | AnyObject | SerializableValue[] | null;

export interface Client extends Omit<DiscordClient, 'gateways' | 'providers' | 'serializers'> {
	gateways: GatewayDriver;
	providers: ProviderStore;
	serializers: SerializerStore;
}
