import ava from 'ava';
import { Schema, SettingsFolder, Gateway, Provider, Client, Settings, SchemaEntry, AnyObject, SettingsUpdateContext, SettingsExistenceStatus } from '../dist';
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
		.add('uses', 'number', { array: true })
		.add('count', 'number', { configurable: false })
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

ava('SettingsFolder (Basic)', async (test): Promise<void> => {
	test.plan(4);

	const { schema } = await createContext();
	const settingsFolder = new SettingsFolder(schema);

	test.is(settingsFolder.base, null);
	test.is(settingsFolder.schema, schema);
	test.is(settingsFolder.size, 0);
	test.throws(() => settingsFolder.client, /Cannot retrieve gateway from a non-ready settings instance/i);
});

ava('SettingsFolder#{base,client}', async (test): Promise<void> => {
	test.plan(2);

	const { settings } = await createSettings('0');
	const settingsFolder = settings.get('messages') as SettingsFolder;

	test.notThrows(() => settingsFolder.client);
	test.is(settingsFolder.base, settings);
});

ava('SettingsFolder#get', async (test): Promise<void> => {
	test.plan(9);

	const { settings, schema } = await createSettings('1');

	// Retrieve key from root folder
	test.is(settings.size, 3);
	test.is(settings.get('uses'), (schema.get('uses') as SchemaEntry).default);
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

ava('SettingsFolder#pluck', async (test): Promise<void> => {
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

ava('SettingsFolder#resolve', async (test): Promise<void> => {
	test.plan(4);

	const { settings, gateway, provider } = await createSettings('2');

	await provider.create(gateway.name, '2', { count: 65 });
	await settings.sync();

	// Check if single value from root's folder is resolved correctly
	test.deepEqual(await settings.resolve('count'), [65]);

	// Check if multiple values are resolved correctly
	test.deepEqual(await settings.resolve('count', 'messages'), [65, { hello: null }]);

	// Update and give it an actual value
	await provider.update(gateway.name, '2', { messages: { hello: 'Hello' } });
	await settings.sync(true);
	test.deepEqual(await settings.resolve('messages.hello'), [{ data: 'Hello' }]);

	// Invalid path
	test.deepEqual(await settings.resolve('invalid.path'), [undefined]);
});

ava('SettingsFolder#reset (Single | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('3');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset('count'), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Single | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('4');
	await provider.create(gateway.name, settings.id, { count: 64 });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, count: 64 });
	const results = await settings.reset('count');
	test.is(results.length, 1);
	test.is(results[0].previous, 64);
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('count') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, count: null });
});

ava('SettingsFolder#reset (Multiple[Array] | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('3');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset(['count', 'messages.hello']), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Multiple[Array] | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('4');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const results = await settings.reset(['count', 'messages.hello']);
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Multiple[Object] | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('5');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset({ count: true, 'messages.hello': true }), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Multiple[Object] | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('6');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const results = await settings.reset({ count: true, 'messages.hello': true });
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Multiple[Object-Deep] | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('7');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset({ count: true, messages: { hello: true } }), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Multiple[Object-Deep] | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('8');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const results = await settings.reset({ count: true, messages: { hello: true } });
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Root | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('9');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset(), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Root | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('10');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const results = await settings.reset();
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Folder | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('11');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	test.deepEqual(await settings.reset('messages'), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Folder | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('12');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const results = await settings.reset('messages');
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Inner-Folder | Not Exists)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('13');
	await settings.sync();

	test.is(await provider.get(gateway.name, settings.id), null);
	const settingsFolder = settings.get('messages') as SettingsFolder;
	test.deepEqual(await settingsFolder.reset(), []);
	test.is(await provider.get(gateway.name, settings.id), null);
});

ava('SettingsFolder#reset (Inner-Folder | Exists)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, provider } = await createSettings('14');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: 'world' } });
	const settingsFolder = settings.get('messages') as SettingsFolder;
	const results = await settingsFolder.reset();
	test.is(results.length, 1);
	test.is(results[0].previous, 'world');
	test.is(results[0].next, null);
	test.is(results[0].entry, gateway.schema.get('messages.hello') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, messages: { hello: null } });
});

ava('SettingsFolder#reset (Array | Empty)', async (test): Promise<void> => {
	test.plan(3);

	const { settings, gateway, provider } = await createSettings('14');
	await provider.create(gateway.name, settings.id, {});
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id });
	const results = await settings.reset('uses');
	test.is(results.length, 0);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id });
});

ava('SettingsFolder#reset (Array | Filled)', async (test): Promise<void> => {
	test.plan(6);

	const { settings, gateway, schema, provider } = await createSettings('14');
	await provider.create(gateway.name, settings.id, { uses: [1, 2, 4] });
	await settings.sync();

	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, uses: [1, 2, 4] });
	const results = await settings.reset('uses');
	test.is(results.length, 1);
	test.deepEqual(results[0].previous, [1, 2, 4]);
	test.is(results[0].next, (schema.get('uses') as SchemaEntry).default);
	test.is(results[0].entry, schema.get('uses') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, uses: [] });
});

ava('SettingsFolder#reset (Events | Not Exists)', async (test): Promise<void> => {
	test.plan(1);

	const { client, settings } = await createSettings('3');
	await settings.sync();

	client.once('settingsCreate', () => test.fail());
	client.once('settingsUpdate', () => test.fail());
	test.deepEqual(await settings.reset('count'), []);
});

ava('SettingsFolder#reset (Events | Exists)', async (test): Promise<void> => {
	test.plan(9);

	const { client, settings, gateway, provider, schema } = await createSettings('3');
	await provider.create(gateway.name, settings.id, { count: 64 });
	await settings.sync();

	const schemaEntry = schema.get('count') as SchemaEntry;
	client.once('settingsCreate', () => test.fail());
	client.once('settingsUpdate', (emittedSettings: Settings, changes: AnyObject, context: SettingsUpdateContext) => {
		test.is(emittedSettings, settings);
		test.deepEqual(changes, { count: null });
		test.is(context.changes.length, 1);
		test.is(context.changes[0].entry, schemaEntry);
		test.is(context.changes[0].previous, 64);
		test.is(context.changes[0].next, schemaEntry.default);
		test.is(context.extraContext, undefined);
		test.is(context.guild, null);
		test.is(context.language, client.languages.get('en-US'));
	});
	await settings.reset('count');
});

ava('SettingsFolder#reset (Events + Extra | Exists)', async (test): Promise<void> => {
	test.plan(9);

	const { client, settings, gateway, provider, schema } = await createSettings('3');
	await provider.create(gateway.name, settings.id, { count: 64 });
	await settings.sync();

	const extraContext = Symbol('Hello!');
	const schemaEntry = schema.get('count') as SchemaEntry;
	client.once('settingsCreate', () => test.fail());
	client.once('settingsUpdate', (emittedSettings: Settings, changes: AnyObject, context: SettingsUpdateContext) => {
		test.is(emittedSettings, settings);
		test.deepEqual(changes, { count: null });
		test.is(context.changes.length, 1);
		test.is(context.changes[0].entry, schemaEntry);
		test.is(context.changes[0].previous, 64);
		test.is(context.changes[0].next, schemaEntry.default);
		test.is(context.extraContext, extraContext);
		test.is(context.guild, null);
		test.is(context.language, client.languages.get('en-US'));
	});
	await settings.reset('count', { extraContext });
});

ava('SettingsFolder#reset (Uninitialized)', async (test): Promise<void> => {
	test.plan(1);

	const settings = new SettingsFolder(new Schema());
	await test.throwsAsync(() => settings.reset(), 'Cannot reset keys from a non-ready settings instance.');
});

ava('SettingsFolder#reset (Unsynchronized)', async (test): Promise<void> => {
	test.plan(1);

	const { settings } = await createSettings('15');
	await test.throwsAsync(() => settings.reset(), 'Cannot reset keys from a pending to synchronize settings instance. Perhaps you want to call `sync()` first.');
});

ava('SettingsFolder#reset (Invalid Key)', async (test): Promise<void> => {
	test.plan(1);

	const { settings, gateway, provider } = await createSettings('16');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();
	try {
		await settings.reset('invalid.path');
		test.fail('This Settings#reset call must error.');
	} catch (error) {
		test.is(error, '[SETTING_GATEWAY_KEY_NOEXT]: invalid.path');
	}
});

ava('SettingsFolder#reset (Unconfigurable)', async (test): Promise<void> => {
	test.plan(1);

	const { settings, gateway, provider } = await createSettings('17');
	await provider.create(gateway.name, settings.id, { count: 64 });
	await settings.sync();
	try {
		await settings.reset('count', { onlyConfigurable: true });
		test.fail('This Settings#reset call must error.');
	} catch (error) {
		test.is(error, '[SETTINGS_GATEWAY_UNCONFIGURABLE_KEY]: count');
	}
});

ava('SettingsFolder#update (Single)', async (test): Promise<void> => {
	test.plan(7);

	const { settings, gateway, schema, provider } = await createSettings('18');
	await settings.sync();

	test.is(settings.existenceStatus, SettingsExistenceStatus.NotExists);
	const results = await settings.update('count', 2);
	test.is(results.length, 1);
	test.is(results[0].previous, null);
	test.is(results[0].next, 2);
	test.is(results[0].entry, schema.get('count') as SchemaEntry);
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, count: 2 });
	test.is(settings.existenceStatus, SettingsExistenceStatus.Exists);
});

ava('SettingsFolder#update (Multiple)', async (test): Promise<void> => {
	test.plan(8);

	const { settings, gateway, schema, provider } = await createSettings('19');
	await settings.sync();

	const results = await settings.update([['count', 6], ['uses', [4]]]);
	test.is(results.length, 2);

	// count
	test.is(results[0].previous, null);
	test.is(results[0].next, 6);
	test.is(results[0].entry, schema.get('count') as SchemaEntry);

	// uses
	test.deepEqual(results[1].previous, []);
	test.deepEqual(results[1].next, [4]);
	test.is(results[1].entry, schema.get('uses') as SchemaEntry);

	// persistence
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, count: 6, uses: [4] });
});

ava('SettingsFolder#update (Multiple | Object)', async (test): Promise<void> => {
	test.plan(8);

	const { settings, gateway, schema, provider } = await createSettings('20');
	await settings.sync();

	const results = await settings.update({ count: 6, uses: [4] });
	test.is(results.length, 2);

	// count
	test.is(results[0].previous, null);
	test.is(results[0].next, 6);
	test.is(results[0].entry, schema.get('count') as SchemaEntry);

	// uses
	test.deepEqual(results[1].previous, []);
	test.deepEqual(results[1].next, [4]);
	test.is(results[1].entry, schema.get('uses') as SchemaEntry);

	// persistence
	test.deepEqual(await provider.get(gateway.name, settings.id), { id: settings.id, count: 6, uses: [4] });
});

ava('SettingsFolder#update (Uninitialized)', async (test): Promise<void> => {
	test.plan(1);

	const settings = new SettingsFolder(new Schema());
	await test.throwsAsync(() => settings.update('count', 6), 'Cannot update keys from a non-ready settings instance.');
});

ava('SettingsFolder#update (Unsynchronized)', async (test): Promise<void> => {
	test.plan(1);

	const { settings } = await createSettings('15');
	await test.throwsAsync(() => settings.update('count', 6), 'Cannot update keys from a pending to synchronize settings instance. Perhaps you want to call `sync()` first.');
});

ava('SettingsFolder#update (Invalid Key)', async (test): Promise<void> => {
	test.plan(1);

	const { settings, gateway, provider } = await createSettings('21');
	await provider.create(gateway.name, settings.id, { messages: { hello: 'world' } });
	await settings.sync();
	try {
		await settings.update('invalid.path', 420);
		test.fail('This Settings#update call must error.');
	} catch (error) {
		test.is(error, '[SETTING_GATEWAY_KEY_NOEXT]: invalid.path');
	}
});

ava('SettingsFolder#update (Unconfigurable)', async (test): Promise<void> => {
	test.plan(1);

	const { settings, gateway, provider } = await createSettings('22');
	await provider.create(gateway.name, settings.id, { count: 64 });
	await settings.sync();
	try {
		await settings.update('count', 4, { onlyConfigurable: true });
		test.fail('This Settings#update call must error.');
	} catch (error) {
		test.is(error, '[SETTINGS_GATEWAY_UNCONFIGURABLE_KEY]: count');
	}
});

ava('SettingsFolder#toJSON', async (test): Promise<void> => {
	test.plan(2);

	const { settings, gateway, provider } = await createSettings('9');

	// Non-synced entry should have schema defaults
	test.deepEqual(settings.toJSON(), { uses: [], count: null, messages: { hello: null } });

	await provider.create(gateway.name, '9', { count: 123 });
	await settings.sync();

	// Synced entry should use synced values or schema defaults
	test.deepEqual(settings.toJSON(), { uses: [], count: 123, messages: { hello: null } });
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
