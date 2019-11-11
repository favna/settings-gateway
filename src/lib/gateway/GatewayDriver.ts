import Collection from '@discordjs/collection';
import { GatewayStorage, GatewayStorageJson } from './GatewayStorage';
import { Client } from '../types';

export class GatewayDriver extends Collection<string, GatewayStorage> {

	/**
	 * The client this GatewayDriver was created with.
	 */
	public readonly client: Client;

	/**
	 * Constructs a new instance of GatewayDriver.
	 * @param client The client that manages this instance
	 */
	public constructor(client: Client) {
		super();
		this.client = client;
	}

	/**
	 * Registers a new gateway.
	 * @param gateway The gateway to register
	 */
	public register(gateway: GatewayStorage): this {
		if (typeof this.client.options.settings.gateways === 'undefined') this.client.options.settings.gateways = {};
		if (!(gateway.name in this.client.options.settings.gateways)) this.client.options.settings.gateways[gateway.name] = {};
		this.set(gateway.name, gateway);
		return this;
	}

	/**
	 * Initializes all gateways.
	 */
	public async init(): Promise<void> {
		await Promise.all([...this.values()].map(gateway => gateway.init()));
	}

	/**
	 * The gateway driver with all serialized gateways.
	 */
	public toJSON(): GatewayDriverJson {
		return Object.fromEntries([...this.entries()].map(([key, value]) => [key, value.toJSON()]));
	}

}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GatewayDriverJson extends Record<string, GatewayStorageJson> { }
