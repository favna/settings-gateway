import { Language, LanguageStore } from 'klasa';
import { SchemaEntry } from '../../dist';

export class MockLanguage extends Language {

	public constructor(store: LanguageStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'en-US' });
		this.language = {
			SETTING_GATEWAY_KEY_NOEXT: (key: string): string => `[SETTING_GATEWAY_KEY_NOEXT]: ${key}`,
			SETTING_GATEWAY_CHOOSE_KEY: (keys: string[]): string => `[SETTING_GATEWAY_CHOOSE_KEY]: ${keys.join(' ')}`,
			SETTING_GATEWAY_UNCONFIGURABLE_FOLDER: '[SETTING_GATEWAY_UNCONFIGURABLE_FOLDER]',
			SETTINGS_GATEWAY_UNCONFIGURABLE_KEY: (key: string): string => `[SETTINGS_GATEWAY_UNCONFIGURABLE_KEY]: ${key}`,
			SETTING_GATEWAY_INVALID_FILTERED_VALUE: (entry: SchemaEntry, value: unknown): string => `[SETTING_GATEWAY_INVALID_FILTERED_VALUE]: ${entry.path} ${value}`,
			RESOLVER_MINMAX_EXACTLY: (key: string, value: number, inclusive: boolean): string => `[RESOLVER_MINMAX_EXACTLY]: ${key} ${value} ${inclusive}`,
			RESOLVER_MINMAX_BOTH: (key: string, minimum: number, maximum: number, inclusive: boolean): string => `[RESOLVER_MINMAX_BOTH]: ${key} ${minimum} ${maximum} ${inclusive}`,
			RESOLVER_MINMAX_MIN: (key: string, minimum: number, inclusive: number): string => `[RESOLVER_MINMAX_MIN]: ${key} ${minimum} ${inclusive}`,
			RESOLVER_MINMAX_MAX: (key: string, maximum: number, inclusive: number): string => `[RESOLVER_MINMAX_MAX]: ${key} ${maximum} ${inclusive}`
		};
	}

}
