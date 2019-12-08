import { Provider, ReadonlyAnyObject, SettingsUpdateResults, IdKeyedObject } from '../../dist';
import { mergeObjects } from '@klasa/utils';

export class MockProvider extends Provider {

	private tables = new Map<string, Map<string, IdKeyedObject>>();

	public async createTable(table: string): Promise<void> {
		if (this.tables.has(table)) throw new Error('Table Exists');
		this.tables.set(table, new Map());
	}

	public async deleteTable(table: string): Promise<void> {
		if (!this.tables.has(table)) throw new Error('Table Not Exists');
		this.tables.delete(table);
	}

	public async hasTable(table: string): Promise<boolean> {
		return this.tables.has(table);
	}

	public async create(table: string, entry: string, data: ReadonlyAnyObject): Promise<void> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');
		if (resolvedTable.has(entry)) throw new Error('Entry Exists');
		const resolved = this.parseUpdateInput(data);
		resolvedTable.set(entry, { ...resolved, id: entry });
	}

	public async delete(table: string, entry: string): Promise<void> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');
		if (!resolvedTable.has(entry)) throw new Error('Entry Not Exists');
		resolvedTable.delete(entry);
	}

	public async get(table: string, entry: string): Promise<IdKeyedObject | null> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');
		return resolvedTable.get(entry) || null;
	}

	public async getAll(table: string, entries?: readonly string[]): Promise<IdKeyedObject[]> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');

		if (typeof entries === 'undefined') {
			return [...resolvedTable.values()];
		}

		const values: IdKeyedObject[] = [];
		for (const [key, value] of resolvedTable.entries()) {
			if (entries.includes(key)) values.push(value);
		}

		return values;
	}

	public async getKeys(table: string): Promise<string[]> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');
		return [...resolvedTable.keys()];
	}

	public async has(table: string, entry: string): Promise<boolean> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');
		return resolvedTable.has(entry);
	}

	public async update(table: string, entry: string, data: ReadonlyAnyObject | SettingsUpdateResults): Promise<void> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');

		const resolvedEntry = resolvedTable.get(entry);
		if (typeof resolvedEntry === 'undefined') throw new Error('Entry Not Exists');

		const resolved = this.parseUpdateInput(data);
		const merged = mergeObjects({ ...resolvedEntry }, resolved);
		resolvedTable.set(entry, merged);
	}

	public async replace(table: string, entry: string, data: ReadonlyAnyObject | SettingsUpdateResults): Promise<void> {
		const resolvedTable = this.tables.get(table);
		if (typeof resolvedTable === 'undefined') throw new Error('Table Not Exists');

		const resolvedEntry = resolvedTable.get(entry);
		if (typeof resolvedEntry === 'undefined') throw new Error('Entry Not Exists');

		const resolved = this.parseUpdateInput(data);
		resolvedTable.set(entry, { ...resolved, id: entry });
	}

}
