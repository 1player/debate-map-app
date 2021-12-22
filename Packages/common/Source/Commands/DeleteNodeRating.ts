import {Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {GetNodeRating} from "../DB/nodeRatings.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {AssertUserCanDelete} from "./Helpers/SharedAsserts.js";
import {UpdateNodeRatingSummaries} from "./UpdateNodeRatingSummaries.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {type: "string"},
	}),
})
export class DeleteNodeRating extends Command<{id: string}, {}> {
	oldData: NodeRating;
	sub_updateRatingSummaries: UpdateNodeRatingSummaries;
	Validate() {
		const {id} = this.payload;
		this.oldData = GetNodeRating.NN(id);
		AssertUserCanDelete(this, this.oldData);

		this.IntegrateSubcommand(()=>this.sub_updateRatingSummaries, new UpdateNodeRatingSummaries({
			nodeID: this.oldData.node, ratingType: this.oldData.type,
			ratingsBeingRemoved: [id], ratingsBeingAdded: [],
		}));
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`nodeRatings/${id}`, null);
		db.add(this.sub_updateRatingSummaries.GetDBUpdates(db));
	}
}