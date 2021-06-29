import {AddSchema, AssertValidate, Command, GenerateUUID, Assert, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {emptyArray_forLoading} from "web-vcore/nm/js-vextensions.js";
import {NodeRatingType} from "../Store/db/nodeRatings/@NodeRatingType.js";
import {NodeRating} from "../Store/db/nodeRatings/@NodeRating.js";
import {GetRatings} from "../Store/db/nodeRatings.js";

export class SetNodeRating extends Command<{nodeID: string, ratingType: Exclude<NodeRatingType, "impact">, value: number}, {}> {
	oldRating: NodeRating;
	newID: string;
	newRating: NodeRating;
	Validate() {
		AssertValidate({
			properties: {
				nodeID: {type: "string"},
				ratingType: {$ref: "NodeRatingType"},
				value: {type: ["number", "null"]},
			},
			required: ["nodeID", "ratingType", "value"],
		}, this.payload, "Payload invalid");
		const {nodeID, ratingType, value} = this.payload;

		const oldRatings = GetRatings(nodeID, ratingType, this.userInfo.id);
		Assert(oldRatings.length <= 1, `There should not be more than one rating for this given "slot"!`);
		this.oldRating = oldRatings[0];

		if (value != null) {
			this.newID = GenerateUUID();
			this.newRating = new NodeRating({
				node: nodeID, type: ratingType, user: this.userInfo.id,
				editedAt: Date.now(),
				value,
			});
		}
	}

	GetDBUpdates() {
		const updates = {};
		if (this.oldRating) {
			updates[`nodeRatings/${this.oldRating.id}`] = null;
		}
		if (this.newRating) {
			updates[`nodeRatings/${this.newID}`] = this.newRating;
		}
		return updates;
	}
}