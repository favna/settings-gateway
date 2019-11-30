import ava from 'ava';
import { Schema, SchemaEntry } from '../dist';

ava('schemaentry-basic', (test): void => {
	test.plan(15);

	const schema = new Schema();
	const schemaEntry = new SchemaEntry(schema, 'test', 'textchannel');

	test.is(schemaEntry.client, null);
	test.is(schemaEntry.key, 'test');
	test.is(schemaEntry.path, 'test');
	test.is(schemaEntry.type, 'textchannel');
	test.is(schemaEntry.parent, schema);
	test.is(schemaEntry.array, false);
	test.is(schemaEntry.configurable, true);
	test.is(schemaEntry.default, null);
	test.is(schemaEntry.filter, null);
	test.is(schemaEntry.inclusive, false);
	test.is(schemaEntry.maximum, null);
	test.is(schemaEntry.minimum, null);
	test.is(schemaEntry.shouldResolve, true);
	test.throws(() => schemaEntry.serializer, Error);
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
});

ava('schemaentry-edit', (test): void => {
	test.plan(8);

	const schema = new Schema();
	const schemaEntry = new SchemaEntry(schema, 'test', 'textchannel', {
		array: false,
		configurable: false,
		default: 1,
		filter: (): boolean => true,
		inclusive: false,
		maximum: 100,
		minimum: 98,
		resolve: false
	});

	schemaEntry.edit({
		type: 'guild',
		array: true,
		configurable: true,
		default: [1],
		filter: null,
		inclusive: true,
		maximum: 200,
		minimum: 100,
		resolve: true
	});

	test.is(schemaEntry.type, 'guild');
	test.is(schemaEntry.array, true);
	test.is(schemaEntry.configurable, true);
	test.is(schemaEntry.filter, null);
	test.is(schemaEntry.shouldResolve, true);
	test.is(schemaEntry.maximum, 200);
	test.is(schemaEntry.minimum, 100);
	test.deepEqual(schemaEntry.default, [1]);
});

// TODO(vladfrangu): SchemaEntry#check
ava.skip('schemaentry-check', (test): void => {
	test.pass();
});

// TODO(kyranet): Add tests for all the methods
