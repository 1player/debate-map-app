import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNode} from "../DB/nodes.js";
import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {HasModPermissions} from "../DB/users/$user.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$tag: {$ref: MapNodeTag.name},
	}),
	returnSchema: ()=>SimpleSchema({$id: {type: "string"}}),
})
export class AddNodeTag extends Command<{tag: MapNodeTag}, {id: string}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add tags currently.");

		const {tag} = this.payload;

		tag.id = this.GenerateUUID_Once("id");
		tag.creator = this.userInfo.id;
		tag.createdAt = Date.now();
		AssertValidate("MapNodeTag", tag, "MapNodeTag invalid");

		for (const nodeID of tag.nodes) {
			const node = GetNode(nodeID);
			AssertV(node, `Node with id ${nodeID} does not exist.`);
		}

		this.returnData = {id: tag.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {tag} = this.payload;
		db.set(dbp`nodeTags/${tag.id}`, tag);
	}
}