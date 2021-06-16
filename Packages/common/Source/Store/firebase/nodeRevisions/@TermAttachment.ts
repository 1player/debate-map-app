import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {CE} from "web-vcore/nm/js-vextensions";

export class TermAttachment {
	constructor(initialData?: Partial<TermAttachment>) {
		CE(this).VSet(initialData);
	}
	id: string;
}
AddSchema("TermAttachment", {
	properties: {
		id: {type: "string"},
	},
	required: ["id"],
});