import { Client } from 'klasa';
import { ProviderStore, SerializerStore, GatewayDriver, Gateway, Client as InternalClient } from '../../dist';
import { ClientOptions } from 'discord.js';
import { MockProvider } from './MockProvider';
import { MockStringSerializer } from './MockStringSerializer';
import { MockNumberSerializer } from './MockNumberSerializer';

export class MockClient extends Client {

	/* eslint-disable @typescript-eslint/ban-ts-ignore, no-invalid-this */
	// @ts-ignore 2416
	public providers: ProviderStore = new ProviderStore(this);

	// @ts-ignore 2416
	public serializers: SerializerStore = new SerializerStore(this);

	// @ts-ignore 2416
	public gateways: GatewayDriver = new GatewayDriver(this);
	/* eslint-enable @typescript-eslint/ban-ts-ignore, no-invalid-this */

	public constructor(options: ClientOptions = {}) {
		super(options);

		this.registerStore(this.providers)
			.registerStore(this.serializers);

		this.serializers.set(new MockStringSerializer(this.serializers, ['lib', 'MockStringSerializer'], 'dist'));
		this.serializers.set(new MockNumberSerializer(this.serializers, ['lib', 'MockNumberSerializer'], 'dist'));
		this.providers.set(new MockProvider(this.providers, ['lib', 'MockProvider'], 'dist', { name: 'Mock' }));
		this.gateways
			.register(new Gateway(this as unknown as InternalClient, 'clientStorage', { provider: 'Mock' }))
			.register(new Gateway(this as unknown as InternalClient, 'guilds', { provider: 'Mock' }))
			.register(new Gateway(this as unknown as InternalClient, 'users', { provider: 'Mock' }));
	}

}

export function createClient(options: ClientOptions = {}): InternalClient {
	return new MockClient(options) as unknown as InternalClient;
}
