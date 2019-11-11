import { GatewayStorage } from './GatewayStorage';
import { KlasaClient } from 'klasa';
import { Collection } from '@discordjs/collection';
import { Settings } from '../settings/Settings';
import { RequestHandler, IdKeyed } from '@klasa/request-handler';

export class Gateway extends GatewayStorage {

	/**
	 * The cached entries for this Gateway or the external datastore to get the settings from.
	 */
	public cache: ProxyMap = (this.name in this.client) && (this.client[this.name as keyof KlasaClient] instanceof Map) ?
		this.client[this.name as keyof KlasaClient] as ProxyMap :
		new Collection<string, ProxyMapEntry>();

	/**
	 * The request handler that manages the synchronization queue.
	 */
	protected requestHandler = new RequestHandler(
		(id: string): Promise<IdKeyed<string>> => {
			const { provider } = this;
			if (provider === null) throw new Error('Cannot run requests without a provider available.');
			return provider.get(this.name, id) as Promise<IdKeyed<string>>;
		}, (ids: string[]): Promise<IdKeyed<string>[]> => {
			const { provider } = this;
			if (provider === null) throw new Error('Cannot run requests without a provider available.');
			return provider.getAll(this.name, ids) as Promise<IdKeyed<string>[]>;
		}
	);

	/**
	 * Gets an entry from the cache or creates one if it does not exist
	 * @param target The target that holds a Settings instance of the holder for the new one
	 * @param id The settings' identificator
	 */
	public acquire(target: IdKeyed<string>, id = target.id): Settings {
		return this.get(id) || this.create(target, id);
	}

	/**
	 * Get an entry from the cache.
	 * @param id The key to get from the cache
	 */
	public get(id: string): Settings | null {
		const entry = this.cache.get(id);
		return (entry && entry.settings) || null;
	}

	/**
	 * Create a new Settings instance for this gateway.
	 * @param target The target that will hold this instance alive
	 * @param id The settings' identificator
	 */
	public create(target: IdKeyed<string>, id = target.id): Settings {
		const settings = new Settings(this, target, id);
		if (this.schema.size !== 0) settings.sync(true).catch(err => this.client.emit('error', err));
		return settings;
	}

	/**
	 * Runs a synchronization task for the gateway.
	 */
	public async sync(): Promise<this> {
		await this.requestHandler.wait();
		return this;
	}

}

export interface ProxyMapEntry {
	settings: Settings;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProxyMap extends Map<string, ProxyMapEntry> { }
