import { Client as DiscordClient } from 'discord.js';
import { ProviderStore } from './structures/ProviderStore';
import { SerializerStore } from './structures/SerializerStore';
import { GatewayDriver } from './gateway/GatewayDriver';

export type AnyObject = {} | Record<PropertyKey, unknown>;
export type ReadonlyAnyObject = Readonly<AnyObject>;
export type SerializableValue = boolean | number | string | AnyObject | SerializableValue[] | null;

export interface Client extends Omit<DiscordClient, 'gateways' | 'providers' | 'serializers'> {
	gateways: GatewayDriver;
	providers: ProviderStore;
	serializers: SerializerStore;
}
