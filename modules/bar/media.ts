import { Widget, Utils, Mpris, Hyprland, PopupWindow, Roundedges, Mpris, Revealer } from "../../imports";
import options from "../../options";
import icons from "../../lib/icons.js";

const { RoundedAngleEnd } = Roundedges;
const { Box, CenterBox, Button, Icon, Label, EventBox, Slider } = Widget;
const { execAsync, lookUpIcon } = Utils;

const mpris = await Service.import("mpris");
const players = mpris.bind("players");
const player = Mpris.getPlayer();

const { bar, playwin } = options;
const pos = playwin.position.bind();
const layout = Utils.derive([bar.position, playwin.position], (bar, qs) => 
		`${bar}-${qs}` as const,
	);

const FALLBACK_ICON = "audio-x-generic-symbolic"
const PLAY_ICON = "media-playback-start-symbolic"
const PAUSE_ICON = "media-playback-pause-symbolic"
const PREV_ICON = "media-skip-backward-symbolic"
const NEXT_ICON = "media-skip-forward-symbolic"
const CLOSE_ICON = "window-close-symbolic"

// ----------- The Player ------------

/** @param {number} length */
function lengthStr(length) {
	const min = Math.floor(length / 60)
	const sec = Math.floor(length % 60)
	const sec0 = sec < 10 ? "0" : ""
	return `${min}:${sec0}${sec}`
}


/** @param {import('types/service/mpris').MprisPlayer} player */
function Player(player) {
	const img = Box({
		className: "trackimg",
		vpack: "center",
		css: player.bind("cover_path").transform(p => `
			background-image: url('${p}');
		`),
	})

	const title = Label({
		className: "tracktitle",
		wrap: false,
		hpack: "center",
		vpack: "end",
		vexpand: true,
		truncate: 'end',
		maxWidthChars: 30,
		label: player.bind("track_title"),
	})

	const artist = Label({
		className: "artist",
		wrap: false,
		hpack: "center",
		vpack: "start",
		truncate: 'end',
		maxWidthChars: 30,
		label: player.bind("track_artists").transform(a => a.join(", ")),
	})

	const positionSlider = Slider({
		class_name: "position",
		draw_value: false,
		on_change: ({ value }) => player.position = value * player.length,
		visible: player.bind("length").as(l => l > 0),
		setup: self => {
			function update() {
				const value = player.position / player.length
				self.value = value > 0 ? value : 0
			}
			self.hook(player, update)
			self.hook(player, update, "position")
			self.poll(1000, update)
		},
	})

	const positionLabel = Label({
		className: "position",
		hpack: "center",
		setup: self => {
			const update = (_, time) => {
				self.label = lengthStr(time || player.position)
				self.visible = player.length > 0
			}

			self.hook(player, update, "position")
			self.poll(1000, update)
		},
	})

	const lengthLabel = Label({
		className: "length",
		hpack: "center",
		visible: player.bind("length").transform(l => l > 0),
		label: player.bind("length").transform(lengthStr),
	})

	const icon = () => Box({
		//onClicked: () => {
			//App.closeWindow('playwin');
		//},
		vexpand: true,
		hpack: "center",
		vpack: "center",
		child: Icon({
			hexpand: true,
			hpack: "end",
			vpack: "center",
			className: "playicon",
			tooltip_text: player.identity || "",
			icon: player.bind("entry").transform(entry => {
				const name = `${entry}-symbolic`
				return Utils.lookUpIcon(name) ? name : FALLBACK_ICON
			}),
		})
	})

	const playPause = Button({
		class_name: "play-pause",
		vpack: "center",
		on_clicked: () => player.playPause(),
		visible: player.bind("can_play"),
		child: Icon({
			icon: player.bind("play_back_status").transform(s => {
				switch (s) {
					case "Playing": return PAUSE_ICON
					case "Paused":
					case "Stopped": return PLAY_ICON
				}
			}),
		}),
	})

	const prev = Button({
		className: "previous",
		vpack: "center",
		on_clicked: () => player.previous(),
		visible: player.bind("can_go_prev"),
		child: Icon(PREV_ICON),
	})

	const next = Button({
		className: "next",
		vpack: "center",
		on_clicked: () => player.next(),
		visible: player.bind("can_go_next"),
		child: Icon(NEXT_ICON),
	})

	const close = Button({
		className: "close",
		vpack: "center",
		onClicked: () => player.stop(),
		child: Icon(CLOSE_ICON),
	})

	return Box(
		{
			className: "player",
			vertical: false,
			vexpand: true,
		},
		img,
		Box(
			{
				vertical: true,
				hexpand: true,
	  			hpack: "center",
	  			vpack: "center",
			},
			title,
			artist,
			positionSlider,
		),
		Box(
		{
			vertical: true,
	  		hpack: "center",
	  		vpack: "center",
		},
		icon(),
		positionLabel,
		),
		Box(
			{
			className: "playercontrols",
			vexpand: false,
			hexpand: false,
			hpack: 'end',
			},
			prev,
			playPause,
			next,
			close,
		),
	)
}

function PWin() {
	return PopupWindow({
		name: "playwin",
		className: "playwin",
		anchor: pos,
		layer: "top",
		exclusivity: 'normal',
		keymode: 'on-demand',
		margins: [0,75],
		transition: pos.as(pos => pos === "top" ? "slide_down" : "slide_up"),
		child: Box({
			vertical: true,
			children: Utils.watch([], [
				[Mpris, "player-changed"],
				[Mpris, "player-added"],
				[Mpris, "player-closed"],
			], () => Mpris.players).transform(p => p.filter(p => p.play_back_status !== 'Stopped' ).map(Player)),
		})
	})
}

export function Playwin() {
	App.addWindow(PWin())
	layout.connect("changed", () => {
		App.removeWindow("playwin")
		App.addWindow(PWin())
	})
}

// ------------- Bar Ticker -----------

function trimTrackTitle(title) {
	if (!title) return '';
	const cleanPatterns = [
		/【[^】]*】/,         // Touhou n weeb stuff
		" [FREE DOWNLOAD]", // F-777
		" (Radio Version)",
		" (Album Version)",
		" (Cafe Session)",
		" (International Version)",
	];
	cleanPatterns.forEach((expr) => title = title.replace(expr, ''));
	return title;
}

const trackTitle = Button({
	className:'mediaticker',
	onPrimaryClick: ( ) => App.toggleWindow("playwin"),
	onSecondaryClick: () => {
		 const player = Mpris.getPlayer("deezer") || Mpris.getPlayer();
		player.playPause()
	},
	child: Label({
		hexpand: true,
		truncate: 'end',
		//maxWidthChars: 30,
		setup: (self) => self.hook(Mpris, label => {
			const mpris = Mpris.getPlayer('');
			if (mpris)
				label.label =  ` ${trimTrackTitle(mpris.trackTitle)} • ${mpris.trackArtists.join(', ')}`;
			else
				self.label = 'No media';
		}),
	})
})

export const MediaBTN = ( ) => Box({
	className: 'mediabtn',
	vexpand: false,
	hexpand: true,
	child:
		trackTitle
});


// needs integration
/*

Mpris.connect("changed", (value) => {
 c *onst statusOrder = {
 Playing: 1,
 Paused: 2,
 Stopped: 3,
};

const isPlaying = value.players.find(
	(p) => p["play-back-status"] === "Playing",
	);

	if (isPlaying) {
		activePlayer.value = value.players.sort(
			(a, b) =>
			statusOrder[a["play-back-status"]] -
			statusOrder[b["play-back-status"]],
			)[0];
}
})

---- needs to be built -----
convert progress slider to an overlay progressbar
*/
