import ava from 'ava';
import { Schema, SettingsFolder, SchemaEntry, SchemaFolder } from '../dist';

ava('schema-empty', (test): void => {
	test.plan(13);

	const schema = new Schema();

	test.is(schema.path, '');
	test.is(schema.type, 'Folder');

	test.true(schema instanceof Map);
	test.is(schema.size, 0);

	test.true(schema.defaults instanceof SettingsFolder);
	test.is(schema.defaults.size, 0);

	test.deepEqual(schema.toJSON(), {});

	test.deepEqual([...schema.keys()], []);
	test.deepEqual([...schema.keys(true)], []);
	test.deepEqual([...schema.values()], []);
	test.deepEqual([...schema.values(true)], []);
	test.deepEqual([...schema.entries()], []);
	test.deepEqual([...schema.entries(true)], []);
});

ava('schema-simple', (test): void => {
	test.plan(19);

	const schema = new Schema()
		.add('test', 'String');

	test.true(schema instanceof Schema, '"add" method must be chainable.');
	test.is(schema.path, '');
	test.is(schema.type, 'Folder');

	test.is(schema.defaults.size, 1);
	const settingsEntry = schema.defaults.get('test');
	test.is(settingsEntry, null);

	test.is(schema.size, 1);
	const schemaEntry = schema.get('test') as SchemaEntry;
	test.true(schemaEntry instanceof SchemaEntry);
	test.is(schemaEntry.key, 'test');
	test.is(schemaEntry.parent, schema);
	test.is(schemaEntry.path, 'test');
	test.is(schemaEntry.type, 'string');
	test.deepEqual(schemaEntry.toJSON(), {
		array: false,
		configurable: true,
		default: null,
		inclusive: false,
		maximum: null,
		minimum: null,
		resolve: true,
		type: 'string'
	});

	test.deepEqual(schema.toJSON(), {
		test: {
			array: false,
			configurable: true,
			default: null,
			inclusive: false,
			maximum: null,
			minimum: null,
			resolve: true,
			type: 'string'
		}
	});

	test.deepEqual([...schema.keys()], ['test']);
	test.deepEqual([...schema.keys(true)], ['test']);
	test.deepEqual([...schema.values()], [schemaEntry]);
	test.deepEqual([...schema.values(true)], [schemaEntry]);
	test.deepEqual([...schema.entries()], [['test', schemaEntry]]);
	test.deepEqual([...schema.entries(true)], [['test', schemaEntry]]);
});

ava('schema-folder-empty', (test): void => {
	test.plan(22);

	const schema = new Schema()
		.add('test', () => { });

	test.true(schema instanceof Schema, '"add" method must be chainable.');
	test.is(schema.path, '');
	test.is(schema.type, 'Folder');

	test.is(schema.defaults.size, 1);
	const settingsFolder = schema.defaults.get('test') as SettingsFolder;
	test.true(settingsFolder instanceof SettingsFolder);
	test.is(settingsFolder.size, 0);

	test.is(schema.size, 1);
	const schemaFolder = schema.get('test') as SchemaFolder;
	test.true(schemaFolder instanceof SchemaFolder);
	test.is(schemaFolder.size, 0);
	test.is(schemaFolder.key, 'test');
	test.is(schemaFolder.parent, schema);
	test.is(schemaFolder.path, 'test');
	test.is(schemaFolder.type, 'Folder');
	test.true(schemaFolder.defaults instanceof SettingsFolder);
	test.is(schemaFolder.defaults.size, 0);

	test.deepEqual(schema.toJSON(), {
		test: {}
	});

	test.deepEqual([...schema.keys()], ['test']);
	test.deepEqual([...schema.keys(true)], []);
	test.deepEqual([...schema.values()], [schemaFolder]);
	test.deepEqual([...schema.values(true)], []);
	test.deepEqual([...schema.entries()], [['test', schemaFolder]]);
	test.deepEqual([...schema.entries(true)], []);
});

ava('schema-folder-filled', (test): void => {
	test.plan(29);

	const schema = new Schema()
		.add('someFolder', folder => folder
			.add('someKey', 'TextChannel'));

	test.is(schema.defaults.size, 1);
	const settingsFolder = schema.defaults.get('someFolder') as SettingsFolder;
	test.true(settingsFolder instanceof SettingsFolder);
	test.is(settingsFolder.size, 1);
	test.is(settingsFolder.get('someKey'), null);
	test.is(schema.defaults.get('someFolder.someKey'), null);

	test.is(schema.size, 1);
	const schemaFolder = schema.get('someFolder') as SchemaFolder;
	test.true(schemaFolder instanceof SchemaFolder);
	test.is(schemaFolder.size, 1);
	test.is(schemaFolder.key, 'someFolder');
	test.is(schemaFolder.parent, schema);
	test.is(schemaFolder.path, 'someFolder');
	test.is(schemaFolder.type, 'Folder');
	test.true(schemaFolder.defaults instanceof SettingsFolder);
	test.is(schemaFolder.defaults.size, 1);

	const innerSettingsFolder = schemaFolder.defaults.get('someKey');
	test.is(innerSettingsFolder, null);

	const schemaEntry = schemaFolder.get('someKey') as SchemaEntry;
	test.true(schemaEntry instanceof SchemaEntry);
	test.is(schemaEntry.key, 'someKey');
	test.is(schemaEntry.parent, schemaFolder);
	test.is(schemaEntry.path, 'someFolder.someKey');
	test.is(schemaEntry.type, 'textchannel');
	test.deepEqual(schemaEntry.toJSON(), {
		array: false,
		configurable: true,
		default: null,
		inclusive: false,
		maximum: null,
		minimum: null,
		resolve: true,
		type: 'textchannel'
	});

	test.is(schema.get('someFolder.someKey'), schemaFolder.get('someKey'));

	test.deepEqual(schema.toJSON(), {
		someFolder: {
			someKey: {
				array: false,
				configurable: true,
				default: null,
				inclusive: false,
				maximum: null,
				minimum: null,
				resolve: true,
				type: 'textchannel'
			}
		}
	});

	test.deepEqual([...schema.keys()], ['someFolder']);
	test.deepEqual([...schema.keys(true)], ['someKey']);
	test.deepEqual([...schema.values()], [schemaFolder]);
	test.deepEqual([...schema.values(true)], [schemaEntry]);
	test.deepEqual([...schema.entries()], [['someFolder', schemaFolder]]);
	test.deepEqual([...schema.entries(true)], [['someKey', schemaEntry]]);
});
