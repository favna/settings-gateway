import ava from 'ava';
import { createClient } from './lib/MockClient';
import { GatewayStorage, Gateway, Settings, Provider, SettingsExistenceStatus } from '../dist';
import Collection from '@discordjs/collection';
import { RequestHandler } from '@klasa/request-handler';
import { UserStore } from 'discord.js';

ava('gateway-basic', (test): void => {
	const gateway = new Gateway(createClient(), 'test', { provider: 'Mock' });

	test.true(gateway instanceof GatewayStorage);

	test.true(gateway.cache instanceof Collection);
	test.is(gateway.cache.size, 0);

	test.true(gateway.requestHandler instanceof RequestHandler);
	test.true(gateway.requestHandler.available);
});

ava('gateway-reverse-proxy', (test): void => {
	test.plan(2);

	const gateway = new Gateway(createClient(), 'users', { provider: 'Mock' });

	test.true(gateway.cache instanceof UserStore);
	test.is(gateway.cache.size, 0);
});

ava('gateway-get', (test): void => {
	const gateway = new Gateway(createClient(), 'test', { provider: 'Mock' });
	test.is(gateway.get('id'), null);
});

ava('gateway-create', (test): void => {
	test.plan(2);

	const gateway = new Gateway(createClient(), 'test', { provider: 'Mock' });

	const created = gateway.create({ id: 'id' });
	test.true(created instanceof Settings);
	test.is(created.id, 'id');
});

ava('gateway-acquire', (test): void => {
	test.plan(2);

	const gateway = new Gateway(createClient(), 'test', { provider: 'Mock' });

	const acquired = gateway.acquire({ id: 'id' });
	test.true(acquired instanceof Settings);
	test.is(acquired.id, 'id');
});

ava('gateway-init-database-existence', async (test): Promise<void> => {
	test.plan(2);

	const gateway = new Gateway(createClient(), 'test', { provider: 'Mock' });
	const provider = gateway.provider as Provider;

	test.false(await provider.hasTable(gateway.name));

	await gateway.init();
	test.true(await provider.hasTable(gateway.name));
});

ava('gateway-reverse-no-data', (test): void => {
	const client = createClient();
	const gateway = client.gateways.get('users') as Gateway;
	test.is(gateway.get('339942739275677727'), null);
});

ava('gateway-reverse-data', (test): void => {
	test.plan(2);

	const client = createClient();
	const gateway = client.gateways.get('users') as Gateway;

	client.users.add({
		id: '339942739275677727',
		username: 'Dirigeants',
		avatar: null,
		discriminator: '0000'
	}, true);

	const retrieved = gateway.get('339942739275677727') as Settings;
	test.true(retrieved instanceof Settings);
	test.is(retrieved.id, '339942739275677727');
});

ava('gateway-reverse-sync', async (test): Promise<void> => {
	test.plan(6);

	const client = createClient();
	const gateway = client.gateways.get('users') as Gateway;
	const provider = gateway.provider as Provider;
	gateway.schema.add('value', 'String');

	await provider.createTable('users');
	await Promise.all([
		provider.create('users', 'foo', { value: 'bar' }),
		provider.create('users', 'hello', { value: 'world' })
	]);

	const user1 = client.users.add({ id: 'foo', username: 'Dirigeants', avatar: null, discriminator: '0000' }, true);
	const user2 = client.users.add({ id: 'hello', username: 'Dirigeants', avatar: null, discriminator: '0001' }, true);
	const user3 = client.users.add({ id: 'bar', username: 'Dirigeants', avatar: null, discriminator: '0002' }, true);

	const settings1 = user1.settings as unknown as Settings;
	const settings2 = user2.settings as unknown as Settings;
	const settings3 = user3.settings as unknown as Settings;

	test.is(settings1.existenceStatus, SettingsExistenceStatus.Unsynchronized);
	test.is(settings2.existenceStatus, SettingsExistenceStatus.Unsynchronized);
	test.is(settings3.existenceStatus, SettingsExistenceStatus.Unsynchronized);

	await gateway.sync();

	test.is(settings1.existenceStatus, SettingsExistenceStatus.Exists);
	test.is(settings2.existenceStatus, SettingsExistenceStatus.Exists);
	test.is(settings3.existenceStatus, SettingsExistenceStatus.NotExists);
});
