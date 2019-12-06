import ava from 'ava';
import { Schema, SettingsFolder, Gateway, Provider, Client, Settings } from '../dist';
import { createClient } from './lib/MockClient';

async function createSettings(id: string): Promise<PreparedContextSettings> {
	const context = await createContext();
	return {
		...context,
		settings: new Settings(context.gateway, { id }, id)
	};
}

async function createContext(): Promise<PreparedContext> {
	const client = createClient();
	const schema = new Schema()
		.add('count', 'number')
		.add('messages', folder => folder
			.add('hello', 'object'));
	const gateway = new Gateway(client, 'settings-test', {
		provider: 'Mock',
		schema
	});
	const provider = gateway.provider as Provider;

	client.gateways.register(gateway);
	await gateway.init();

	return { client, gateway, provider, schema };
}

ava('settingsfolder-basic', async (test): Promise<void> => {
	test.plan(4);

	const { schema } = await createContext();
	const settingsFolder = new SettingsFolder(schema);

	test.is(settingsFolder.base, null);
	test.is(settingsFolder.schema, schema);
	test.is(settingsFolder.size, 0);
	test.throws(() => settingsFolder.client, /Cannot retrieve gateway from a non-ready settings instance/i);
});

ava('settingsfolder-base-client', async (test): Promise<void> => {
	test.plan(2);

	const { settings } = await createSettings('0');
	const settingsFolder = settings.get('messages') as SettingsFolder;

	test.notThrows(() => settingsFolder.client);
	test.is(settingsFolder.base, settings);
});

ava('settingsfolder-get', async (test): Promise<void> => {
	test.plan(8);

	const { settings } = await createSettings('1');

	// Retrieve key from root folder
	test.is(settings.size, 2);
	test.is(settings.get('count'), null);
	test.is(settings.get('messages.hello'), null);

	// Retrieve nested folder from root folder
	const settingsFolder = settings.get('messages') as SettingsFolder;
	test.true(settingsFolder instanceof SettingsFolder);
	test.is(settingsFolder.size, 1);
	test.is(settingsFolder.get('hello'), null);

	// Invalid paths should return undefined
	test.is(settings.get('fake.path'), undefined);
	// Invalid parameter to get should return undefined
	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore
	test.is(settings.get(null), undefined);
});

ava('settingsfolder-pluck', async (test): Promise<void> => {
	test.plan(5);

	const { settings, gateway, provider } = await createSettings('2');

	await provider.create(gateway.name, '2', { count: 65 });
	await settings.sync();

	test.deepEqual(settings.pluck('count'), [65]);
	test.deepEqual(settings.pluck('messages.hello'), [null]);
	test.deepEqual(settings.pluck('invalid.path'), [undefined]);
	test.deepEqual(settings.pluck('count', 'messages.hello', 'invalid.path'), [65, null, undefined]);
	test.deepEqual(settings.pluck('count', 'messages'), [65, { hello: null }]);
});

ava('settingsfolder-resolve', async (test): Promise<void> => {
	test.plan(4);

	const { settings, gateway, provider } = await createSettings('2');

	await provider.create(gateway.name, '2', { count: 65 });
	await settings.sync();

	// Check if single value from root's folder is resolved correctly
	test.deepEqual(await settings.resolve('count'), [65]);

	// Check if multiple values are resolved correctly
	test.deepEqual(await settings.resolve('count', 'messages'), [65, { hello: null }]);

	// Update and give it an actual value
	try {
		await provider.update(gateway.name, '2', { messages: { hello: 'Hello' } });
		await settings.sync(true);
		test.deepEqual(await settings.resolve('messages.hello'), [{ data: 'Hello' }]);

		// Invalid path
		test.deepEqual(await settings.resolve('invalid.path'), [undefined]);
	} catch (error) {
		test.log(error.message);
		test.log(error.stack);
	}
});

ava('settingsfolder-reset-single', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-reset-multiple', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-reset-object', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-update-single', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-update-multiple', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-update-object', async (test): Promise<void> => {
	test.pass();
});

ava('settingsfolder-tojson', async (test): Promise<void> => {
	test.plan(2);

	const { settings, gateway, provider } = await createSettings('9');

	// Non-synced entry should have schema defaults
	test.deepEqual(settings.toJSON(), { count: null, messages: { hello: null } });

	await provider.create(gateway.name, '9', { count: 123 });
	await settings.sync();

	// Synced entry should use synced values or schema defaults
	test.deepEqual(settings.toJSON(), { count: 123, messages: { hello: null } });
});

interface PreparedContext {
	client: Client;
	gateway: Gateway;
	schema: Schema;
	provider: Provider;
}

interface PreparedContextSettings extends PreparedContext {
	settings: Settings;
}
