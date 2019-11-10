import { Client, Provider } from 'klasa';
import { Schema } from '../schema/Schema';

export class GatewayStorage {

	/**
	 * The client this gateway was created with.
	 */
	public readonly client: Client;

	/**
	 * The name of this gateway.
	 */
	public readonly name: string;

	/**
	 * The schema for this gateway.
	 */
	public readonly schema: Schema;

	/**
	 * Whether or not this gateway has been initialized.
	 */
	public ready: boolean = false;

	/**
	 * The provider's name that manages this gateway.
	 */
	private readonly _provider: string;

	public constructor(client: Client, name: string, options: GatewayStorageOptions) {
		this.client = client;
		this.name = name;
		this.schema = options.schema || new Schema();
		this._provider = options.provider || client.options.providers.default || '';
	}

	/**
	 * The provider that manages this gateway's persistent data.
	 */
	public get provider(): Provider | null {
		return this.client.providers.get(this._provider) || null;
	}

	/**
	 * Initializes the gateway.
	 */
	public async init(): Promise<void> {
		// Gateways must not initialize twice.
		if (this.ready) throw new Error(`The gateway ${this.name} has already been initialized.`);

		// Check the provider's existence.
		const { provider } = this;
		if (provider === null) throw new Error(`The gateway ${this.name} could not find the provider ${this._provider}.`);
		this.ready = true;
	}

}

export interface GatewayStorageOptions {
	schema?: Schema;
	provider?: string;
}
