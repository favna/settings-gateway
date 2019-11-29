import ava from 'ava';
import { createClient } from './lib/MockClient';
import { GatewayStorage, Schema } from '../dist';

const client = createClient();

ava('gateway-storage-empty', (test): void => {
	test.plan(9);

	const gateway = new GatewayStorage(client, 'MockGateway', { provider: 'Mock' });
	test.is(gateway.client, client);
	test.is(gateway.name, 'MockGateway');
	test.is(gateway.provider, client.providers.get('Mock'));
	test.is(gateway.ready, false);

	test.true(gateway.schema instanceof Schema);
	test.is(gateway.schema.size, 0);
	test.is(gateway.schema.path, '');
	test.is(gateway.schema.type, 'Folder');
	test.deepEqual(gateway.toJSON(), {
		name: 'MockGateway',
		provider: 'Mock',
		schema: {}
	});
});

ava('gateway-storage-schema', (test): void => {
	const schema = new Schema();
	const gateway = new GatewayStorage(client, 'MockGateway', { schema: schema });
	test.is(gateway.schema, schema);
});

// TODO(kyranet): Add tests for the client options overrides
// TODO(kyranet): Add tests for all the methods
// TODO(kyranet): Test SQL mode as well
