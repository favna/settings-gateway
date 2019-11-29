import ava from 'ava';
import { createClient } from './lib/MockClient';
import { GatewayDriver, Gateway } from '../dist';
import Collection from '@discordjs/collection';
import { GatewaysOptions } from 'klasa';

ava('gatewaydriver-basic', (test): void => {
	test.plan(3);

	const client = createClient();
	const gatewayDriver = new GatewayDriver(client);

	test.true(gatewayDriver instanceof Collection);
	test.is(gatewayDriver.client, client);

	// No gateway is registered
	test.is(gatewayDriver.size, 0);
});

ava('gatewaydriver-from-client', (test): void => {
	test.plan(6);

	const client = createClient();

	test.true(client.gateways instanceof Collection);
	test.is(client.gateways.client, client);

	// clientStorage, guilds, users
	test.is(client.gateways.size, 3);
	test.true(client.gateways.get('clientStorage') instanceof Gateway);
	test.true(client.gateways.get('guilds') instanceof Gateway);
	test.true(client.gateways.get('users') instanceof Gateway);
});

ava('gatewaydriver-register', (test): void => {
	test.plan(4);

	const client = createClient();
	const gateway = new Gateway(client, 'someCustomGateway');

	test.is((client.options.settings.gateways as GatewaysOptions).someCustomGateway, undefined);
	test.is(client.gateways.register(gateway), client.gateways);

	test.deepEqual((client.options.settings.gateways as GatewaysOptions).someCustomGateway, {});
	test.is(client.gateways.get('someCustomGateway'), gateway);
});

ava('gatewaydriver-init', async (test): Promise<void> => {
	test.plan(7);

	const client = createClient();

	test.false((client.gateways.get('guilds') as Gateway).ready);
	test.false((client.gateways.get('users') as Gateway).ready);
	test.false((client.gateways.get('clientStorage') as Gateway).ready);

	test.is(await client.gateways.init(), undefined);

	test.true((client.gateways.get('guilds') as Gateway).ready);
	test.true((client.gateways.get('users') as Gateway).ready);
	test.true((client.gateways.get('clientStorage') as Gateway).ready);
});

ava('gatewaydriver-json', (test): void => {
	const client = createClient();
	test.deepEqual(client.gateways.toJSON(), {
		guilds: {
			name: 'guilds',
			provider: 'Mock',
			schema: {}
		},
		users: {
			name: 'users',
			provider: 'Mock',
			schema: {}
		},
		clientStorage: {
			name: 'clientStorage',
			provider: 'Mock',
			schema: {}
		}
	});
});
