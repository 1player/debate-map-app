import {GetAccessPolicies, GetUsers} from "dm_common";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {ES, Observer} from "web-vcore";

@Observer
export class PolicyPicker extends BaseComponentPlus({} as {value: string|n, onChange: (value: string)=>any, containerStyle?: any}, {}) {
	dropDown: DropDown|n;
	render() {
		const {value, onChange, containerStyle, children} = this.props;
		const policies = GetAccessPolicies().OrderBy(a=>a.name);
		return (
			<DropDown ref={c=>this.dropDown = c} style={E({flex: 1}, containerStyle)}>
				<DropDownTrigger>{children}</DropDownTrigger>
				<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600}}>
							<ScrollView style={ES({flex: 1})} contentStyle={{position: "relative", maxHeight: 500}}>
								{policies.map((policy, index)=>(
									<Column key={index} p="5px 10px"
										style={E(
											{
												cursor: "pointer",
												background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
											},
											index == policies.length - 1 && {borderRadius: "0 0 10px 10px"},
										)}
										onClick={()=>{
											onChange(policy.id);
											this.dropDown!.Hide();
										}}>
										<Row center>
											<Pre>{policy.name}</Pre><span style={{marginLeft: 5, fontSize: 11}}>(id: {policy.id})</span>
										</Row>
									</Column>
								))}
							</ScrollView>
						</Column>
					</Row>
				</DropDownContent>
			</DropDown>
		);
	}
}