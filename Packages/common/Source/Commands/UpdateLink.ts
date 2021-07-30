import {GetAsync, Command, AssertV, NewSchema, AV, AddSchema, AssertValidate, GetSchemaJSON, CommandMeta, DBHelper, dbp, SimpleSchema, DeriveJSONSchema} from "web-vcore/nm/mobx-graphlink.js";
import {CE} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";
import {GetNode} from "../DB/nodes.js";
import {GetLinkUnderParent} from "../DB/nodes/$node.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";
import {GetNodeChildLink} from "../DB/nodeChildLinks.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$linkID: {$ref: "UUID"},
		$linkUpdates: DeriveJSONSchema(NodeChildLink, {includeOnly: ["form", "polarity"], makeOptional_all: true}),
	}),
})
export class UpdateLink extends Command<{linkID: string, linkUpdates: Partial<NodeChildLink>}, {}> {
	newData: NodeChildLink;
	Validate() {
		const {linkID, linkUpdates} = this.payload;
		const oldData = GetNodeChildLink.NN(linkID);
		this.newData = {...oldData, ...linkUpdates};
		AssertValidate("NodeChildLink", this.newData, "New node-child-link data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {linkID} = this.payload;
		db.set(dbp`nodeChildLinks/${linkID}`, this.newData);
	}
}