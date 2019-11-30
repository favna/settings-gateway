import ava from 'ava';
import { Schema, SchemaEntry, SerializableValue } from '../dist';
import { createClient } from './lib/MockClient';

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

ava('schemaentry-check', (test): void => {
	test.plan(11);

	const client = createClient();
	const schema = new Schema();
	const schemaEntry = new SchemaEntry(schema, 'test', 'textchannel');
	const throwsCheck = (): void => schemaEntry.check();

	/* eslint-disable @typescript-eslint/ban-ts-ignore */

	// #region Client
	// No client
	test.throws(throwsCheck, /Cannot retrieve serializers/i);
	schemaEntry.client = client;
	// #endregion

	// #region Type
	// @ts-ignore
	schemaEntry.type = null;
	test.throws(throwsCheck, /Parameter 'type' must be a string/i);

	schemaEntry.type = 'totallyaserializerpleasebelieveme';
	test.throws(throwsCheck, /is not a valid type/i);

	// Reset to a valid type
	schemaEntry.type = 'string';
	// #endregion

	// #region Booleans
	// @ts-ignore
	schemaEntry.array = 'true';
	test.throws(throwsCheck, /Parameter 'array' must be a boolean/i);
	schemaEntry.array = false;

	// @ts-ignore
	schemaEntry.configurable = 'true';
	test.throws(throwsCheck, /Parameter 'configurable' must be a boolean/i);
	schemaEntry.configurable = true;

	// @ts-ignore
	schemaEntry.minimum = '123';
	test.throws(throwsCheck, /Parameter 'minimum' must be a number or null/i);
	schemaEntry.minimum = 123;

	// @ts-ignore
	schemaEntry.maximum = '100';
	test.throws(throwsCheck, /Parameter 'maximum' must be a number or null/i);
	schemaEntry.maximum = 100;

	test.throws(throwsCheck, /Parameter 'minimum' must contain a value lower than the parameter 'maximum'/i);
	schemaEntry.maximum = 200;
	// #endregion

	// @ts-ignore
	schemaEntry.filter = 'true';
	test.throws(throwsCheck, /Parameter 'filter' must be a function/i);
	schemaEntry.filter = null;

	// Checking if the default is an array and the type is an array
	schemaEntry.array = true;
	schemaEntry.default = null;
	test.throws(throwsCheck, /Default key must be an array if the key stores an array/i);

	// Checking if the type is a string, but the default isn't
	schemaEntry.array = false;
	schemaEntry.type = 'string';
	schemaEntry.default = true;
	test.throws(throwsCheck, /Default key must be a/i);
	/* eslint-enable @typescript-eslint/ban-ts-ignore */
});

ava('schemaentry-json', (test): void => {
	test.plan(1);

	const schema = new Schema();
	const schemaEntry = new SchemaEntry(schema, 'test', 'textchannel', {
		array: true,
		configurable: false,
		default: [],
		inclusive: true,
		maximum: 1000,
		minimum: 100,
		resolve: true
	});

	const json = schemaEntry.toJSON();

	test.deepEqual(json, {
		type: 'textchannel',
		array: true,
		configurable: false,
		default: [],
		inclusive: true,
		maximum: 1000,
		minimum: 100,
		resolve: true
	});
});

ava('schemaentry-default-generator', (test): void => {
	test.plan(3);

	const schema = new Schema();
	const schemaEntry = new SchemaEntry(schema, 'test', 'textchannel');

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore 2341
	const generateDefault = (): SerializableValue => schemaEntry.generateDefaultValue();

	test.is(generateDefault(), null);

	schemaEntry.edit({ array: true });
	test.deepEqual(generateDefault(), []);

	schemaEntry.edit({ array: false, type: 'boolean' });
	test.is(generateDefault(), false);
});
