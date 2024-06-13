import { Widget, Hyprland, Utils, PopupWindow, Roundedges} from "../../imports";
import PanelButton from "../PanelButton"
import { Arrow, Menu } from "../ToggleButton";
import icons from "../../../lib/icons.js";
import options from "../../options";
App.addIcons(`${App.configDir}/assets`);

const { Button, Box, Label, Revealer, Icon, EventBox } = Widget;
const { RoundedAngleEnd } = Roundedges;

const powerProfiles = await Service.import('powerprofiles')
const { powerwin } = options;
const pos = options.powerwin.position.bind();
const layout = Utils.derive([powerwin.position], (powerwin, qs) =>
`${powerwin}-${qs}` as const,
);

const PowerProfiles = () => Menu({
	name: "power-profiles",
	title: powerProfiles.bind('active_profile'),
	content: [
		Box({
			vertical: false,
			className: "pwrprofiles",
			hpack: 'center',
			spacing: 8,
			children: [
				Button({
					className: "pwrprofilesbtn",
					child: Label({ label: "Performance"}),
					onClicked: () => {
						powerProfiles.active_profile = 'performance';
						Hyprland.messageAsync('dispatch exec light -S 100')
					}
				}),
				Button({
					className: "pwrprofilesbtn",
					child: Label({ label: "Balance"}),
					onClicked: () => powerProfiles.active_profile = 'balanced',
				}),
				Button({
					className: "pwrprofilesbtn",
					child: Label({ label: "Power Saver"}),
					onClicked: () => {
						powerProfiles.active_profile = 'power-saver';
						Hyprland.messageAsync('dispatch exec light -S 40')
					}
				}),
			]
		}),
	],
})

const PowerTabs = () => Box({
	className: "pwrtabs",
	vexpand: true,
	hexpand: true,
	vertical: true,
	hpack: 'center',
	children: [
		Label({ 
			label: 'Power Center',
		}),
		Box({
			hpack: "center",
			className: "pwrmenus",
			children: [
			Box({
				child: Arrow("power-profiles"),
			}),
			//Box({
			//	child: Arrow("Power-Control"),
			//}),
		]
		}),
		PowerProfiles(),
		//PowerControls(),
	],
})

export const PowerCenter = () => Box({
	className: "pwrcenterCont",
	vexpand: false,
	hexpand: true,
	vertical: true,
	child: PowerTabs()
})


//---------------- Power Menu Window -------------

const pwrWIN = () => PopupWindow({
	name: "pwrwin",
	className: "pwrwin",
	layer: "overlay",
	anchor: pos,
	exclusivity: 'exclusive',
	transition: pos.as(pos => pos === "top" ? "slide_down" : "slide_up"),
	child: Box({
		className: "pwrbox",
		vexpand: false,
		hexpand: true,
		hpack: 'center',
		vpack: 'center',
		vertical: false,
		children: [
			Button({
				className: "pwrbtns",
				hpack: 'center',
				vpack: 'center',
				child: Box({
					vertical: true,
					hpack: 'center',
					vpack: 'center',
					children: [
						Icon({
							className: "pwricon",
							icon: 'system-lock-screen',
						}),
						Label({
							label: "Lock",
						})
					],
				}),
				onClicked: () => {
					App.closeWindow('pwrwin');
					Hyprland.messageAsync(`dispatch exec ags -b lockscreen -c ~/.config/ags/Lockscreen/lockscreen.js`);
				},
				tooltip_text: 'Lock',
			}),
			Button({
				className: "pwrbtns",
				hpack: 'center',
				vpack: 'center',
				child: Box({
					vertical: true,
					hpack: 'center',
					vpack: 'center',
					children: [
						Icon({
							icon: 'system-log-out',
							className: "pwricon",
						}),
						Label({
							label: "Logout",
						})
					],
				}),
				onClicked: () => {
					App.closeWindow('pwrwin');
					Hyprland.messageAsync(`dispatch exec  ~/.config/hypr/scripts/hyprkill.sh >/dev/null 2>&1 &`);
				},
				tooltip_text: 'Logout',
			}),
			Button({
				className: "pwrbtns",
				hpack: 'center',
				vpack: 'center',
				child: Box({
					vertical: true,
					hpack: 'center',
					vpack: 'center',
					children: [
						Icon({
							icon: 'system-reboot',
							className: "pwricon",
						}),
						Label({
							label: "Reboot",
						})
					],
				}),
				onClicked: () => {
					App.closeWindow('pwrwin');
					Hyprland.messageAsync(`dispatch exec systemctl reboot`);
				},
				tooltip_text: 'Reboot',
			}),
			Button({
				className: "pwrbtns",
				hpack: 'center',
				vpack: 'center',
				child: Box({
					vertical: true,
					hpack: 'center',
					vpack: 'center',
					children: [
						Icon({
							className: "pwricon",
							icon: 'system-shutdown',
						}),
						Label({
							label: "Shutdown"
						})
					]
				}),
				onClicked: () => {
					App.closeWindow('pwrwin');
					Hyprland.messageAsync(`dispatch exec systemctl -i poweroff`);
				},
				tooltip_text: 'Shutdown',
			}),

		]
	})
})

export function powerWIN() {
	App.addWindow(pwrWIN())
	layout.connect("changed", () => {
		App.removeWindow("pwrwin")
		App.addWindow(pwrWIN())
	})
}
