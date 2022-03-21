import {Button, Column, Row, Switch, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import React, {useState} from "react";
import {MigrateUI} from "./DB/Migrate";

@Observer
export class DBUI extends BaseComponent<{}, {}> {
	render() {
		const currentSubpage = store.main.db.subpage;
		return (
			<Switch>
				<MigrateUI/>
			</Switch>
		);
	}
}