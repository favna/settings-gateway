import { SettingsFolder, SettingsExistenceStatus } from './SettingsFolder';
import { Gateway } from '../gateway/Gateway';

export class Settings extends SettingsFolder {

	public readonly id: string;
	public readonly gateway: Gateway;
	public readonly target: unknown;
	public existenceStatus: SettingsExistenceStatus;

	public constructor(gateway: Gateway, target: unknown, id: string) {
		super(gateway.schema);
		this.id = id;
		this.gateway = gateway;
		this.target = target;
		this.existenceStatus = SettingsExistenceStatus.Unsynchronized;
		this._init(this, this.schema);
	}

}
