import {AV, Command, dbp} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNodeTag} from "../DB/nodeTags/@MapNodeTag.js";
import {GetNodeTag} from "../DB/nodeTags.js";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts.js";

@UserEdit
export class DeleteNodeTag extends Command<{id: string}, {}> {
	oldData: MapNodeTag;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodeTag.BIN(id);
		AssertUserCanDelete(this, this.oldData);
	}

	DeclareDBUpdates(db) {
		const {id} = this.payload;
		db.set(dbp`nodeTags/${id}`, null);
	}
}