import {Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {AssertValidate} from "web-vcore/nm/mobx-graphlink.js";
import {HasModPermissions} from "../Store/db/users/$user.js";

export class SetMapFeatured extends Command<{id: string, featured: boolean}, {}> {
	Validate() {
		AssertV(HasModPermissions(this.userInfo.id), "Only mods can set whether a map is featured.");
		AssertValidate({
			properties: {
				id: {type: "string"},
				featured: {type: "boolean"},
			},
			required: ["id", "featured"],
		}, this.payload, "Payload invalid");
	}

	GetDBUpdates() {
		const {id, featured} = this.payload;
		return {
			[`maps/${id}/.featured`]: featured,
		};
	}
}