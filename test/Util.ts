import ava from 'ava';
import { MockClient } from './lib/MockClient';

ava('client-extensions', (test): void => {
	test.plan(3);

	const client = new MockClient();
	test.true(client.providers instanceof Map);
	test.true(client.serializers instanceof Map);
	test.true(client.gateways instanceof Map);
});

ava('provider', (test): void => {
	const client = new MockClient();
	const provider = client.providers.get('Mock');
	test.not(typeof provider, 'undefined');
});
