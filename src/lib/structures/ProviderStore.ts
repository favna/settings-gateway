import { Store } from 'klasa';
import { Provider } from './Provider';
import { Client } from '../types';

export class ProviderStore extends Store<string, Provider> {

	/**
	 * Constructs our ProviderStore for use in Klasa.
	 * @param client The client that instantiates this store
	 */
	public constructor(client: Client) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore 2345
		super(client, 'providers', Provider);
	}

	/**
	 * The default provider set in ClientOptions.providers
	 */
	public get default(): Provider | null {
		return this.get(this.client.options.providers.default as string) || null;
	}

	/**
	 * Clears the providers from the store and waits for them to shutdown.
	 */
	public clear(): void {
		for (const provider of this.values()) this.delete(provider);
	}

	/**
	 * Deletes a provider from the store.
	 * @param name The Provider instance or its name
	 */
	public delete(name: string | Provider): boolean {
		const provider = this.resolve(name);
		if (!provider) return false;

		provider.shutdown();
		return super.delete(provider);
	}

}
