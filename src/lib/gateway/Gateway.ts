import { RequestHandler, IdKeyed } from '@klasa/request-handler';
import Collection from '@discordjs/collection';
import { GatewayStorage } from './GatewayStorage';
import { Settings } from '../settings/Settings';
import { Client } from '../types';

export class Gateway extends GatewayStorage {

	/* eslint-disable no-invalid-this */
	/**
	 * The cached entries for this Gateway or the external datastore to get the settings from.
	 */
	public cache: ProxyMap = (this.name in this.client) && (this.client[this.name as keyof Client] instanceof Map) ?
		this.client[this.name as keyof Client] as ProxyMap :
		new Collection<string, ProxyMapEntry>();

	/**
	 * The request handler that manages the synchronization queue.
	 */
	public requestHandler = new RequestHandler(
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
	/* eslint-enable no-invalid-this */

	/**
	 * Gets an entry from the cache or creates one if it does not exist
	 * @param target The target that holds a Settings instance of the holder for the new one
	 * @param id The settings' identificator
	 * @example
	 * // Retrieve a members gateway
	 * const gateway = this.client.gateways.get('members');
	 *
	 * // Acquire a settings instance belonging to a member
	 * const settings = gateway.acquire(message.member);
	 *
	 * // Do something with settings
	 * console.log(settings);
	 */
	public acquire(target: IdKeyed<string>, id = target.id): Settings {
		return this.get(id) || this.create(target, id);
	}

	/**
	 * Get an entry from the cache.
	 * @param id The key to get from the cache
	 * @example
	 * // Retrieve a members gateway
	 * const gateway = this.client.gateways.get('members');
	 *
	 * // Retrieve a settings instance belonging to a member's id
	 * const settings = gateway.get(someMemberID);
	 *
	 * // Do something with it, be careful as it can return null
	 * if (settings === null) {
	 *     // settings is null
	 * } else {
	 *     // console.log(settings);
	 * }
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
