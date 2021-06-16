import {FromJSON, GetEntries, ToNumber, E} from "web-vcore/nm/js-vextensions";
import {Pre, Row, Select} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {store} from "Store";
import {ShowChangesSinceType} from "Store/main/maps/mapStates/@MapState";
import {runInAction} from "web-vcore/nm/mobx";
import {Observer, HSLA} from "web-vcore";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {Map, WeightingType} from "@debate-map/server-link/Source/Link";
import {GADDemo} from "UI/@GAD/GAD";
import {colors} from "../../../../Utils/UI/GlobalStyles";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown";

import {ShareDropDown} from "./ActionBar_Right/ShareDropDown";

const changesSince_options = [];
changesSince_options.push({name: "None", value: `${ShowChangesSinceType.None}_null`});
for (let offset = 1; offset <= 5; offset++) {
	const offsetStr = [null, "", "2nd ", "3rd ", "4th ", "5th "][offset];
	changesSince_options.push({name: `Your ${offsetStr}last visit`, value: `${ShowChangesSinceType.SinceVisitX}_${offset}`});
}
changesSince_options.push({name: "All unclicked changes", value: `${ShowChangesSinceType.AllUnseenChanges}_null`});

@Observer
export class ActionBar_Right extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const mapState = GetMapState(map._key);
		const {showChangesSince_type} = mapState;
		const {showChangesSince_visitOffset} = mapState;
		const {weighting} = store.main.maps;

		const tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={E(
					{
						justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
						width: "100%", height: GADDemo ? 40 : 30, borderRadius: "0 0 0 10px",
					},
					GADDemo && {
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					{!GADDemo &&
					<>
						<Row center mr={5}>
							<Pre>Show changes since: </Pre>
							<Select options={changesSince_options} value={`${showChangesSince_type}_${showChangesSince_visitOffset}`} onChange={val=>{
								runInAction("ActionBar_Right.ShowChangesSince.onChange", ()=>{
									const parts = val.split("_");
									mapState.showChangesSince_type = ToNumber(parts[0]);
									mapState.showChangesSince_visitOffset = FromJSON(parts[1]);
								});
							}}/>
							<Pre ml={5}>Weighting: </Pre>
							<Select options={GetEntries(WeightingType, name=>({ReasonScore: "Reason score"})[name] || name)} value={weighting} onChange={val=>{
								runInAction("ActionBar_Right.Weighting.onChange", ()=>{
									store.main.maps.weighting = val;
								});
							}}/>
						</Row>
						<ShareDropDown map={map}/>
					</>}
					<LayoutDropDown map={map}/>
				</Row>
			</nav>
		);
	}
}