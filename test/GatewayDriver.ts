import ava from 'ava';
import { createClient } from './lib/MockClient';
import { GatewayDriver, Gateway } from '../dist';
import Collection from '@discordjs/collection';

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

// TODO(kyranet): Add tests for all the methods
