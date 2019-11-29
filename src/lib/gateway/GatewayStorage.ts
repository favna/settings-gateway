import { Client } from '../types';
import { Schema, SchemaJson } from '../schema/Schema';
import { Provider } from '../structures/Provider';

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
	public ready = false;

	/**
	 * The provider's name that manages this gateway.
	 */
	private readonly _provider: string;

	public constructor(client: Client, name: string, options: GatewayStorageOptions = {}) {
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

		const errors = [];
		for (const entry of this.schema.values(true)) {
			// Assign Client to all Pieces for Serializers && Type Checking
			entry.client = this.client;

			Object.freeze(entry);

			// Check if the entry is valid
			try {
				entry.check();
			} catch (error) {
				errors.push(error.message);
			}
		}

		if (errors.length) throw new Error(`[SCHEMA] There is an error with your schema.\n${errors.join('\n')}`);

		// Initialize the defaults
		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore 2445
		this.schema.defaults._init(this.schema.defaults, this.schema);

		// Init the table
		const hasTable = await provider.hasTable(this.name);
		if (!hasTable) await provider.createTable(this.name);

		// Add any missing columns (NoSQL providers return empty array)
		const columns = await provider.getColumns(this.name);
		if (columns.length) {
			const promises = [];
			for (const entry of this.schema.values(true)) {
				if (!columns.includes(entry.path)) promises.push(provider.addColumn(this.name, entry));
			}
			await Promise.all(promises);
		}

		await this.sync();
	}

	/**
	 * Runs a synchronization task for the gateway.
	 */
	public async sync(): Promise<this> {
		return this;
	}

	/**
	 * Get A JSON object containing the schema and the options.
	 */
	public toJSON(): GatewayStorageJson {
		return {
			name: this.name,
			provider: this._provider,
			schema: this.schema.toJSON()
		};
	}

}

export interface GatewayStorageOptions {
	schema?: Schema;
	provider?: string;
}

export interface GatewayStorageJson {
	name: string;
	provider: string;
	schema: SchemaJson;
}
