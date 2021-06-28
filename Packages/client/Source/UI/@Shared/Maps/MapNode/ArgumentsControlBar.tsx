import {Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {AddArgumentButton} from "UI/@Shared/Maps/MapNode/NodeUI/AddArgumentButton";
import {MapNodeL3, Polarity} from "dm_common";
import {Map} from "dm_common";

export class ArgumentsControlBar extends BaseComponentPlus({} as {map: Map, node: MapNodeL3, path: string, childBeingAdded: boolean}, {premiseTitle: ""}) {
	render() {
		const {map, node, path, childBeingAdded} = this.props;
		// const backgroundColor = GetNodeColor({ type: MapNodeType.category } as MapNodeL3);

		return (
			<Row className="argumentsControlBar clickThrough">
				{/* <Row style={{
					/*alignSelf: "flex-start",*#/ position: "relative", background: backgroundColor.css(), borderRadius: 5,
					boxShadow: "rgba(0,0,0,1) 0px 0px 2px", alignSelf: "stretch",
					padding: "0 5px",
					//paddingLeft: 5,
				}}>
					<Pre>Sort by: </Pre>
					<Select options={["Ratings", "Recent"]} style={{borderRadius: 5, outline: "none"}} value={"Ratings"} onChange={val=>{}}/>
				</Row> */}
				{/* <Column>
					<Row>Supporting arguments</Row>
					<Row>Opposing arguments</Row>
				</Column> */}
				<Column ml={0}> {/* vertical */}
					<AddArgumentButton map={map} node={node} path={path} polarity={Polarity.supporting}/>
					<AddArgumentButton map={map} node={node} path={path} polarity={Polarity.opposing} style={{marginTop: 1}}/>
				</Column>
				{/* <Row ml={0}> // horizontal
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.supporting}/>
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.opposing} style={{marginLeft: 3}}/>
				</Row> */}
				{childBeingAdded &&
					<div style={{marginLeft: 15}}>
						Adding new entry...
					</div>}
			</Row>
		);
	}
}