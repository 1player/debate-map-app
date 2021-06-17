import {AssertV, Command} from "web-vcore/nm/mobx-graphlink";
import {AddSchema, AssertValidate, GetSchemaJSON, Schema} from "web-vcore/nm/mobx-graphlink";
import {Timeline} from "../Store/db/timelines/@Timeline";
import {GetTimeline} from "../Store/db/timelines";
import {CE} from "web-vcore/nm/js-vextensions";
import {AssertUserCanModify} from "./Helpers/SharedAsserts";

type MainType = Timeline;
const MTName = "Timeline";

AddSchema(`Update${MTName}_payload`, [MTName], ()=>({
	properties: {
		id: {type: "string"},
		updates: Schema({
			properties: CE(GetSchemaJSON(MTName).properties).Including("name", "videoID", "videoStartTime", "videoHeightVSWidthPercent"),
		}),
	},
	required: ["id", "updates"],
}));

export class UpdateTimeline extends Command<{id: string, updates: Partial<MainType>}, {}> {
	oldData: MainType;
	newData: MainType;
	Validate() {
		AssertValidate(`Update${MTName}_payload`, this.payload, "Payload invalid");

		const {id, updates} = this.payload;
		// this.oldData = await GetAsync(() => GetTimeline(id));
		this.oldData = GetTimeline(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, `New ${MTName.toLowerCase()}-data invalid`);
	}

	GetDBUpdates() {
		const {id} = this.payload;
		const updates = {};
		updates[`timelines/${id}`] = this.newData;
		return updates;
	}
}