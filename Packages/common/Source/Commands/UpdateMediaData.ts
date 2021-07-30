import {CE} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, AssertV, AssertValidate, ClassKeys, Command, CommandMeta, DBHelper, dbp, DeriveJSONSchema, GetSchemaJSON, NewSchema, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {Media} from "../DB/media/@Media.js";
import {GetMedia} from "../DB.js";
import {AssertUserCanModify} from "./Helpers/SharedAsserts.js";

const MTClass = Media;
type MT = typeof MTClass.prototype;
const MTName = MTClass.name;

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$id: {$ref: "UUID"},
		$updates: DeriveJSONSchema(MTClass, {includeOnly: ["name", "type", "url", "description"], makeOptional_all: true}),
	}),
})
export class UpdateMediaData extends Command<{id: string, updates: Partial<Media>}, {}> {
	oldData: MT;
	newData: MT;
	Validate() {
		const {id, updates} = this.payload;
		this.oldData = GetMedia.NN(id);
		AssertUserCanModify(this, this.oldData);
		this.newData = {...this.oldData, ...updates};
		AssertValidate(MTName, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {id} = this.payload;
		db.set(dbp`medias/${id}`, this.newData);
	}
}