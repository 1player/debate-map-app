import {makeObservable, observable} from "web-vcore/nm/mobx.js";
import {Vector2, Clone} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, DB, Field, MGLClass, RunXOnceSchemasAdded, schemaEntryJSONs} from "web-vcore/nm/mobx-graphlink.js";

// this module is in "dm_common", so avoid import from web-vcore (just be careful, since the new @O doesn't warn about classes with missing makeObservable calls)
//import {O} from "web-vcore";
const O = observable;

@MGLClass()
export class MapView {
	constructor() { makeObservable(this); }

	// rootNodeView = new MapNodeView();
	// include root-node-view as a keyed-child, so that it's consistent with descendants (of key signifying id)
	// rootNodeView;
	// @O rootNodeViews = observable.map<string, MapNodeView>();
	// use simple object rather than observable-map, since observable-map would lose its prototype on page refresh (when mobx-sync starts loading stored data, this path is not initialized-with-types, since it's nested/non-static)
	// maybe todo: update mobx-sync to at least be able to handle the mobx classes (observable.map, observable.array, etc.)

	//@DB((t, n)=>t.jsonb(n))
	@Field({
		$gqlType: "JSON",
		patternProperties: {".{22}": {$ref: "MapNodeView"}},
	})
	@O rootNodeViews = {} as {[key: string]: MapNodeView};

	// client-side only, for when rendering for crawler/bot
	@O bot_currentNodeID?: string;
}

@MGLClass()
export class MapNodeView {
	constructor() { makeObservable(this); }

	// constructor(childLimit?: number) {
	// constructor(childLimit: number) {
	/*constructor() {
		//this.childLimit = State(a=>a.main.initialChildLimit);
		// try to catch cause of odd "MapNodeView.children is undefined" issue hit sometimes
		Assert(this.children != null);
		new Timer(100, ()=>Assert(this.children != null), 1).Start();
	}*/

	@Field({type: "boolean"}, {opt: true})
	@O expanded? = false;

	@Field({type: "boolean"}, {opt: true})
	@O expanded_truth? = false;

	@Field({type: "boolean"}, {opt: true})
	@O expanded_relevance? = false;

	/** True for node which is selected (ie. has its hover-panel locked open). */
	@Field({type: "boolean"}, {opt: true})
	@O selected?: boolean;

	/** True for node whose box is closest to the view center. */
	@Field({type: "boolean"}, {opt: true})
	@O focused?: boolean;

	/** Offset of view-center from self (since we're the focus-node). */
	@Field({$ref: "Vector2"}, {opt: true})
	@O viewOffset?: Vector2;

	@Field({type: "string"}, {opt: true})
	@O openPanel?: string;

	@Field({type: "string"}, {opt: true})
	@O openTermID?: string;

	@Field({patternProperties: {".{22}": {$ref: "MapNodeView"}}})
	// @O children? = observable.map<string, MapNodeView>();
	@O children = {} as {[key: string]: MapNodeView};

	@Field({type: "number"}, {opt: true})
	@O childLimit_up?: number;

	@Field({type: "number"}, {opt: true})
	@O childLimit_down?: number;
}
export const emptyNodeView = new MapNodeView();
//RunXOnceSchemasAdded(["Vector2"], ()=>console.log("Should be done...", schemaEntryJSONs.get("MapNodeView")));

// export type MapNodeView_SelfOnly = Omit<MapNodeView, 'children'>;
// export const MapNodeView_SelfOnly_props = ['expanded', 'expanded_truth', 'expanded_relevance', 'selected', 'focused', 'viewOffset', 'openPanel', 'openTermID', 'childLimit_up', 'childLimit_down'];

/*export function NormalizedMapView(mapView: MapView) {
	const result = Clone(mapView);
	return result;
}*/