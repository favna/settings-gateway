import ava from 'ava';
import { createClient } from './lib/MockClient';
import { GatewayStorage, Gateway } from '../dist';
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

// TODO(kyranet): Add tests for all the methods
