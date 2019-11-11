import { Client } from 'klasa';
import { ProviderStore, SerializerStore, GatewayDriver, Gateway, Client as InternalClient } from '../../dist';
import { ClientOptions } from 'discord.js';
import { MockProvider } from './MockProvider';

export class MockClient extends Client {

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore 2416
	public providers: ProviderStore = new ProviderStore(this);

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore 2416
	public serializers: SerializerStore = new SerializerStore(this);

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore 2416
	public gateways: GatewayDriver = new GatewayDriver(this);

	public constructor(options: ClientOptions = {}) {
		super(options);

		this.registerStore(this.providers)
			.registerStore(this.serializers);

		this.providers.set(new MockProvider(this.providers, ['lib', 'MockProvider'], 'dist', { name: 'Mock' }));
		this.gateways.register(new Gateway(this as unknown as InternalClient, 'mocks', { provider: 'Mock' }));
	}

}
