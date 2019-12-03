import ava from 'ava';
import { Settings, SettingsExistenceStatus, Schema, Gateway } from '../dist';
import { createClient } from './lib/MockClient';

const client = createClient();
const gateway = new Gateway(client, 'mock', {
	schema: new Schema()
		.add('basic', 'boolean')
		.add('folder', folder => folder
			.add('deep', 'string', { default: '123' }))
});
const id = '397700693131264000';
const target = Symbol(id);
const settings = new Settings(gateway, target, id);

ava('settings-basic', (test): void => {
	test.plan(5);

	test.is(settings.id, id);
	test.is(settings.gateway, gateway);
	test.is(settings.target, target);
	test.is(settings.existenceStatus, SettingsExistenceStatus.Unsynchronized);
	test.deepEqual(settings.toJSON(), {
		basic: false,
		folder: {
			deep: '123'
		}
	});
});

ava('settings-clone', (test): void => {
	test.plan(2);

	const clone = settings.clone();
	test.true(clone instanceof Settings);
	test.deepEqual(clone.toJSON(), settings.toJSON());
});

// TODO(kyranet): Add tests for all the methods
