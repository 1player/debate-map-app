import {GetValues_ForSchema, CE, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, MGLClass, GetSchemaJSON, Field} from "web-vcore/nm/mobx-graphlink.js";
import {QuoteAttachment} from "../nodeRevisions/@QuoteAttachment.js";
import {MediaAttachment} from "../nodeRevisions/@MediaAttachment.js";
import {AccessLevel} from "./@MapNode.js";
import {EquationAttachment} from "../nodeRevisions/@EquationAttachment.js";
import {TermAttachment} from "../nodeRevisions/@TermAttachment.js";
import {ReferencesAttachment} from "../nodeRevisions/@ReferencesAttachment.js";

export const TitleKey_values = ["base", "negation", "yesNoQuestion"] as const;
//export type TitleKey = "base" | "negation" | "yesNoQuestion";
//export type TitleKey = keyof typeof TitleKey_values;
export type TitleKey = typeof TitleKey_values[number];
export class TitlesMap {
	base?: string;
	negation?: string;
	yesNoQuestion?: string;

	//allTerms?: {[key: string]: boolean};
}
AddSchema("TitlesMap", {
	properties: {
		base: {type: "string"},
		negation: {type: "string"},
		yesNoQuestion: {type: "string"},

		//allTerms: {type: "object"},
	},
});

export enum PermissionInfoType {
	creator = "creator",
	mapEditors = "mapEditors",
	anyone = "anyone",
}
AddSchema("PermissionInfoType", {enum: GetValues(PermissionInfoType)});

export class PermissionInfo {
	constructor(initialData: Partial<PermissionInfo>) {
		CE(this).VSet(initialData);
	}
	type: PermissionInfoType;
}
AddSchema("PermissionInfo", {
	properties: {
		type: {$ref: "PermissionInfoType"},
		mapID: {type: "string"},
	},
	required: ["type"],
});

@MGLClass()
export class NodeRevisionDisplayDetails {
	@Field({type: ["number", "null"]}, {opt: true})
	fontSizeOverride?: number;

	@Field({type: ["number", "null"]}, {opt: true})
	widthOverride?: number;
}

/*export const MapNodeRevision_Defaultable_props = ["accessLevel", "votingDisabled", "permission_edit", "permission_contribute"] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, "accessLevel" | "votingDisabled" | "permission_edit" | "permission_contribute">;*/
export const MapNodeRevision_Defaultable_props = [] as const;
export type MapNodeRevision_Defaultable = Pick<MapNodeRevision, never>;
export function MapNodeRevision_Defaultable_DefaultsForMap(): MapNodeRevision_Defaultable {
	return {};
}

//export const MapNodeRevision_titlePattern = `(^\\S$)|(^\\S.*\\S$)`; // must start and end with non-whitespace
export const MapNodeRevision_titlePattern = "^\\S.*$"; // must start with non-whitespace
@MGLClass({table: "nodeRevisions"}, {
	allOf: [
		// if not an argument or content-node, require "titles" prop
		{
			if: {prohibited: ["argumentType", "equation", "quote", "media"]},
			then: {required: ["titles"]},
		},
	],
})
export class MapNodeRevision {
	constructor(initialData?: Partial<MapNodeRevision>|n) {
		CE(this).VSet(initialData);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true}) // optional during creation
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"})
	node: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"})
	creator: string;

	@DB((t, n)=>t.bigInteger(n))
	@Field({type: "number"})
	createdAt: number;

	//updatedAt: number;
	//approved = false;

	// text
	@DB((t, n)=>t.jsonb(n))
	@Field({
		properties: {
			//base: {pattern: MapNodeRevision_titlePattern}, negation: {pattern: MapNodeRevision_titlePattern}, yesNoQuestion: {pattern: MapNodeRevision_titlePattern},
			base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
		},
		//required: ["base", "negation", "yesNoQuestion"],
	})
	titles = {base: ""} as TitlesMap;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: ["null", "string"]}, {opt: true}) // add null-type, for later when the payload-validation schema is derived from the main schema
	note?: string;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: NodeRevisionDisplayDetails.name}, {opt: true})
	displayDetails?: NodeRevisionDisplayDetails;

	// attachments
	// ==========

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {$ref: TermAttachment.name}})
	termAttachments: TermAttachment[];

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: EquationAttachment.name}, {opt: true})
	equation?: EquationAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: ReferencesAttachment.name}, {opt: true})
	references?: ReferencesAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: QuoteAttachment.name}, {opt: true})
	quote?: QuoteAttachment;

	@DB((t, n)=>t.jsonb(n).nullable())
	@Field({$ref: MediaAttachment.name}, {opt: true})
	media?: MediaAttachment;
}
AddSchema("MapNodeRevision_Partial", ["MapNodeRevision"], ()=>{
	const schema = GetSchemaJSON("MapNodeRevision");
	// schema.required = (schema.required as string[]).Except('creator', 'createdAt');
	schema.required = [];
	return schema;
});

// argument
// ==========

export enum ArgumentType {
	any = "any",
	anyTwo = "anyTwo",
	all = "all",
}
AddSchema("ArgumentType", {enum: GetValues(ArgumentType)});

export function GetArgumentTypeDisplayText(type: ArgumentType) {
	return {Any: "any", AnyTwo: "any two", All: "all"}[ArgumentType[type]];
}