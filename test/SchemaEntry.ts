import ava from 'ava';
import { Schema, SchemaEntry } from '../dist';

ava('schemapiece-basic', (test): void => {
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

// TODO(kyranet): Add tests for all the methods
