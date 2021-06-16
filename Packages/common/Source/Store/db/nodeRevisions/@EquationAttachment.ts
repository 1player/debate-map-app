import {AddSchema} from "web-vcore/nm/mobx-graphlink";

export class EquationAttachment {
	latex: boolean;
	text = "";
	isStep? = true;
	explanation = null as string;
}
AddSchema("EquationAttachment", {
	properties: {
		latex: {type: "boolean"},
		text: {type: "string"},
		isStep: {type: ["null", "boolean"]},
		explanation: {type: ["null", "string"]},
	},
	required: ["text"],
});