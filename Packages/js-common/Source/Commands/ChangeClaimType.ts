import {GetValues} from "web-vcore/nm/js-vextensions.js";
import {Command, CommandMeta, DBHelper} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit} from "../CommandMacros/MapEdit.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {AttachmentType} from "../DB/@Shared/Attachments/@Attachment.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";

export const conversionTypes = [
	// from normal to...
	"Normal>Equation",
	// each type back to normal
	"Equation>Normal",
];
export function CanConvertFromClaimTypeXToY(from: AttachmentType, to: AttachmentType) {
	return conversionTypes.includes(`${AttachmentType[from]}>${AttachmentType[to]}`);
}

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({
		properties: {
			mapID: {type: "string"},
			nodeID: {type: "string"},
			newType: {enum: GetValues(AttachmentType)},
		},
		required: ["nodeID", "newType"],
	}),
})
export class ChangeClaimType extends Command<{mapID?: string|n, nodeID: string, newType: AttachmentType}, {}> {
	oldType: AttachmentType;
	newData: MapNode;
	newRevision: MapNodeRevision;
	newRevisionID: string;
	Validate() {
		/*const {nodeID, newType} = this.payload;
		// let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		const oldData = AV.NonNull = GetNodeL2(nodeID);
		this.oldType = GetAttachmentType(oldData);

		this.newData = {...AsNodeL1(oldData)};
		// this.newRevisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + 1;
		this.newRevisionID = this.newRevisionID ?? GenerateUUID();
		this.newRevision = {...oldData.current};
		this.newData.currentRevision = this.newRevisionID;

		if (this.oldType == AttachmentType.None) {
			if (newType == AttachmentType.Equation) {
				this.newRevision.equation = CE(new EquationAttachment()).VSet({text: this.newRevision.titles.base});
				delete this.newRevision.titles;
			}
		} else if (this.oldType == AttachmentType.Equation) {
			if (newType == AttachmentType.None) {
				this.newRevision.titles = {base: this.newRevision.equation.text};
				delete this.newRevision.equation;
			}
		}
		AssertV(CanConvertFromClaimTypeXToY(this.oldType, newType), `Cannot convert from claim-type ${AttachmentType[this.oldType]} to ${AttachmentType[newType]}.`);
		AssertValidate("MapNode", this.newData, "New node-data invalid");
		AssertValidate("MapNodeRevision", this.newRevisionID, "New revision-data invalid");*/
	}

	DeclareDBUpdates(db: DBHelper) {
		/*const {nodeID} = this.payload;
		db.set(dbp`nodes/${nodeID}`, this.newData);
		db.set(dbp`nodeRevisions/${this.newRevisionID}`, this.newRevision);*/
	}
}