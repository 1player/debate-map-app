import React from "react";
import {store} from "Store";
import {RunInAction_Set} from "web-vcore";
import {ModifyString} from "web-vcore/nm/js-vextensions";
import {Button, Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

export class SideBar extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		const PageButton = (p: {page: string, subpage?: string, text?: string})=>{
			return <Button text={p.text ?? ModifyString(p.page, m=>[m.startLower_to_upper])} onClick={()=>{
				RunInAction_Set(this, ()=>{
					store.main.page = p.page;
					if (p.subpage) store.main[p.page].subpage = p.subpage;
				});
			}}/>;
		};

		return (
			<Column style={{width: 200}}>
				<PageButton page="home"/>
				<PageButton page="db" subpage="migrate" text="DB/Migrate"/>
			</Column>
		);
	}
}