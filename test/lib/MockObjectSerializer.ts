import { Serializer, SerializableValue, SerializerStore } from '../../dist';

export class MockObjectSerializer extends Serializer {

	public constructor(store: SerializerStore, file: string[], directory: string) {
		super(store, file, directory, { name: 'object' });
	}

	public deserialize(data: SerializableValue): object {
		return data as object;
	}

	public resolve(data: SerializableValue): object | null {
		return data === null ? null : { data };
	}

}
