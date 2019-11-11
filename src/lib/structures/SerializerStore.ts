import { AliasStore, Client } from 'klasa';
import { Serializer } from './Serializer';

export class SerializerStore extends AliasStore<string, Serializer> {

	/**
	 * Constructs our SerializerStore for use in Klasa.
	 * @param client The client that instantiates this store
	 */
	public constructor(client: Client) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore 2345
		super(client, 'serializers', Serializer);
	}

}
