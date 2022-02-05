import {chroma_maxDarken} from "Utils/UI/General.js";
import {addHook_css, SubNavBar} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Skin} from "../Skin.js";

export class DMSkin extends Skin {
	static main = new DMSkin();

	// scalars
	// ==========

	BasePanelBackgroundColor = ()=>chroma("rgba(180,180,180,.7)");
	OverlayPanelBackgroundColor = ()=>chroma("rgba(255,255,255,.7)");
	//NavBarPanelBackgroundColor = ()=>chroma("rgba(0,0,0,.7)");
	NavBarPanelBackgroundColor = ()=>this.BasePanelBackgroundColor().alpha(.9);
	OverlayBorder = ()=>"1px solid rgba(85,85,85,.5)";
	HeaderFont = ()=>this.MainFont();
	MainFont = ()=>"'Quicksand', sans-serif";
	TextColor = ()=>"rgb(50,50,50)";
	NavBarBoxShadow = ()=>"rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px";
	HeaderColor = ()=>this.ListEntryBackgroundColor_Dark();
	ListEntryBackgroundColor_Light = ()=>this.BasePanelBackgroundColor().alpha(1);
	ListEntryBackgroundColor_Dark = ()=>this.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).alpha(1);

	// styles
	// ==========

	// fixes that height:100% doesn't work in safari, when in flex container
	Style_Page = ()=>({width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto"});
	Style_VMenuItem = ()=>({padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"});
	Style_FillParent = ()=>({position: "absolute", left: 0, right: 0, top: 0, bottom: 0});
	Style_XButton = ()=>({padding: "5px 10px"});

	// style overrides and blocks
	// ==========

	StyleOverride_Button = ()=>`color: ${this.TextColor()} !important;`;
	StyleBlock_Freeform = ()=>`
		.VMenu > div:first-child { border-top: initial !important; }
		.VMenuItem:not(.disabled):not(.neverMatch):hover {
			background-color: rgb(200, 200, 200) !important;
		}

		.ReactModal__Content {
			background-color: rgba(255,255,255,0.75) !important;
		}
		.ReactModal__Content > div:first-child {
			background-color: rgba(255,255,255,1) !important;
		}
		
		.ButtonBar_OptionUI {
			border-width: 1px 0 1px 1px !important;
			border-style: solid !important;
			border-color: rgba(0,0,0,.3) !important;
		}
		.ButtonBar_OptionUI:last-child {
			border-width: 1px 1px 1px 1px !important;
		}

		.dropdown__content:not(.neverMatch) {
			background-color: rgba(255,255,255,1) !important;
			border: 1px solid rgba(0,0,0,.5);
			border-radius: 0 0 5px 5px; /* shouldn't it always be this? */
		}
		div[data-tip] {
			filter: invert(1);
		}
		.scrollBar {
			filter: invert(1);
		}

		.MessageUI, .MessageUI > div {
			background-color: rgba(255,255,255,.9) !important;
		}
		.argumentsControlBar > div:first-child > div {
			color: rgb(199, 202, 209) !important;
		}
	`;
	CSSHooks_Freeform = ()=>{
		addHook_css(SubNavBar, ctx=>{
			if (ctx.key == "sub1") {
				ctx.styleArgs.push({
					//background: this.NavBarPanelBackgroundColor().css(),
					background: chroma("rgba(0,0,0,.7)").css(),
					boxShadow: this.NavBarBoxShadow(),
					color: "rgb(255,255,255)",
				});
			}
		});
	}
}