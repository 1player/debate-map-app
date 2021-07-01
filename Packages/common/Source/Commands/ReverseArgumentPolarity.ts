import {Assert} from "web-vcore/nm/js-vextensions.js";
import {MapEdit} from "../CommandMacros.js";
import {AddSchema, AssertValidate} from "web-vcore/nm/mobx-graphlink.js";
import {GetAsync, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {MapNodeL3} from "../DB/nodes/@MapNode.js";
import {GetNodeL3, ReversePolarity} from "../DB/nodes/$node.js";
import {GetParentNodeID} from "../DB/nodes.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {NodeChildLink} from "../DB/nodeChildLinks/@NodeChildLink.js";

AddSchema("ReverseArgumentPolarity_payload", {
	properties: {
		mapID: {type: "string"},
		nodeID: {type: "string"},
		path: {type: "string"},
	},
	required: ["nodeID"],
});

@MapEdit
@UserEdit
export class ReverseArgumentPolarity extends Command<{mapID?: string, nodeID: string, path: string}, {}> {
	parentID: string;
	oldNodeData: MapNodeL3;
	newLinkData: NodeChildLink;
	Validate() {
		AssertValidate("ReverseArgumentPolarity_payload", this.payload, "Payload invalid");
		const {nodeID, path} = this.payload;

		this.oldNodeData = GetNodeL3.BIN(path);
		AssertV(this.oldNodeData.type == MapNodeType.argument, "Can only reverse polarity of an argument node.");
		this.parentID = GetParentNodeID.BIN(path);

		this.newLinkData = {...this.oldNodeData.link};
		Assert(this.newLinkData.polarity, "Polarity must be non-null, if calling ReverseArgumentPolarity.");
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);

		AssertValidate("ChildEntry", this.newLinkData, "New link-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;

		const updates = {};
		updates[`nodes/${this.parentID}/.children/.${nodeID}`] = this.newLinkData;
		return updates;
	}
}