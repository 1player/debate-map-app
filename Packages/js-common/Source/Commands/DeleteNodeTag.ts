import {Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: MapNodeTag;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodeTag.NN(id);
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodeTags/${id}`, null);
	}
}