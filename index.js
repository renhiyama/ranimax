#!/usr/bin/env -S reejs x
import enquirer from "npm:enquirer@2.3.6";
const { prompt, Select } = enquirer;
import ora from "npm:ora@6.3.1";
import chalk from "npm:chalk@5.2.0";
import gradient from "npm:gradient-string@2.0.2";

console.log(gradient.retro.multiline(`

██████╗  █████╗ ███╗   ██╗██╗███╗   ███╗ █████╗ ██╗  ██╗
██╔══██╗██╔══██╗████╗  ██║██║████╗ ████║██╔══██╗╚██╗██╔╝
██████╔╝███████║██╔██╗ ██║██║██╔████╔██║███████║ ╚███╔╝ 
██╔══██╗██╔══██║██║╚██╗██║██║██║╚██╔╝██║██╔══██║ ██╔██╗ 
██║  ██║██║  ██║██║ ╚████║██║██║ ╚═╝ ██║██║  ██║██╔╝ ██╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝

`));


let response = await prompt({
	type: "input",
	name: "name",
	message: chalk.blue("Enter anime name:")
});

const animeName = response.name;

//we are going to use consumenet api to get anime.

import { ANIME } from "npm:@consumet/extensions@1.4.18";
//ask user what provider to use
response = new Select({
	name: "provider",
	message: chalk.blue("Select provider:"),
	choices: ["Gogoanime", "Zoro"]
});
let provider = await response.run();
const Anime = new ANIME[provider]();
if (provider == "Gogoanime") {
	Anime.client.defaults.baseURL = "https://gogoanime.hu";
}
let spinner = ora(gradient.instagram("Searching for anime...")).start();
const { results } = await Anime.search(animeName);
if (!results.length) {
	spinner.fail(gradient.instagram("No Anime found"));
	throw new Error("No Anime found");
}
spinner.succeed(gradient.instagram("Found " + results.length + " anime"));
console.log("\n");
response = new Select({
	name: "anime",
	message: chalk.blue("Select anime:"),
	choices: results.map((anime) => anime.title)
});

response = await response.run();

const anime = results.find((anime) => anime.title == response);
if (!anime) {
	console.log("%c[ERROR] %cAnime not found", "color: #333fff", "color: #ff0000");
	throw new Error("Anime not found");
}

spinner = ora(gradient.instagram("Fetching anime info...")).start();

const animeInfo = await Anime.fetchAnimeInfo(anime.id);
spinner.succeed(gradient.instagram("Fetched successfully!"));

console.log("\n");
console.log("%c[INFO] %cAnime: " + anime.title, "color: #333fff", "color: #72d777; font-weight: bold");
console.log("%c[INFO] %cTotal Episodes: " + animeInfo.totalEpisodes, "color: #333fff", "color: #72d777; font-weight: bold");
console.log("%c[INFO] %cType: " + animeInfo.type, "color: #333fff", "color: #72d777; font-weight: bold");
console.log("\n");

let iindex = 0;
let ttyWidth = process.stdout.columns - 5;

animeInfo.description = animeInfo.description.split("").map((char, index) => {
	iindex++;
	if (iindex > ttyWidth && char == " ") {
		iindex = 0;
		return char + "\n";
	}
	return char;
}).join("");
console.log("%c[INFO] %cDescription:\n" + gradient.instagram.multiline(animeInfo.description), "color: #333fff", "color: #72d777; font-weight: bold");


//let user select episodes like:
// 1,2 or 1-5 or 1,2,3,4,5 or all or none or 1,2-6,7,8-10

response = await prompt({
	name: "episodes",
	message: gradient.instagram("Enter episodes to download (eg: 1,2 or 1-5 or 1,2,3,4,5 or all or none or 1,2-6,7,8-10):"),
	type: "input",
	initial: "all"
});
const rawEpisodes = response.episodes;
const selectedEpisodes = [];

if (rawEpisodes === "all") {
	for (let i = 1; i <= animeInfo.totalEpisodes; i++) {
		selectedEpisodes.push(i);
	}
}
else if (rawEpisodes === "none") {
	//do nothing
}
else {
	let episodes = rawEpisodes.split(",");
	for (let episode of episodes) {
		if (episode.includes("-")) {
			let [start, end] = episode.split("-");
			start = parseInt(start);
			end = parseInt(end);
			if (start > end) {
				console.log("%c[ERROR] %cInvalid episode range: " + episode, "color: #333fff", "color: #ff0000");
				throw new Error("Invalid episode range: " + episode);
			}
			for (let i = start; i <= end; i++) {
				selectedEpisodes.push(i);
			}
		}
		else {
			selectedEpisodes.push(parseInt(episode));
		}
	}
}

console.log("%c[INFO] Episodes selected: " + (selectedEpisodes.join(",") || "none"), "color: #333fff");
if (!selectedEpisodes.length) {
	console.log("%c[WARN] %cNo episodes selected", "color: #333fff", "color: yellow");
}
//now we are going to download episodes

console.log("%c[INFO] %cDownloading episodes...", "color: #333fff", "color: #72d777");

const episodeIDs = animeInfo.episodes.map((episode) => { return { id: episode.id, n: episode.number } }).filter((ep) => selectedEpisodes.includes(ep.n));

//ask for download quality size
console.log("%c[INFO] %cIf mentioned quality is not available, it will download the next best quality, and if that too isn't available, it tries lower versions.", "color: #333fff", "color: #72d777");

response = new Select({
	name: "quality",
	message: chalk.blue("Select quality:"),
	choices: ["1080p", "720p", "360p"],
});

response = await response.run();
const quality = response;

console.log("%c[INFO] %cDownloading in " + quality + " quality", "color: #333fff", "color: #72d777");

//ask how many episodes to download parallelly

response = await prompt({
	name: "parallel",
	message: "How many episodes to download parallelly:",
	type: "input",
	initial: (episodeIDs.length < 11 ? episodeIDs.length : 10)
});

const parallel = parseInt(response.parallel);

console.log("%c[INFO] %cDownloading " + parallel + " episodes parallelly", "color: #333fff", "color: #72d777");

//ask where to download

response = await prompt({
	name: "path",
	message: "Enter path to download:",
	type: "input",
	initial: `./${anime.title}`
});

const path = response.path;

console.log("%c[INFO] %cDownloading to " + path, "color: #333fff", "color: #72d777");

//create download folder
import { mkdir, unlink, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";
import { Readable } from "node:stream";

if (!await stat(path).catch(() => false)) {
	console.log("%c[INFO] %cCreating download folder: " + path, "color: #333fff", "color: #72d777");
	await mkdir(path, { recursive: true });
}

//save metadata of the anime at path/_meta.json

if (!(await stat(`${path}/ranimax.meta.json`).catch(() => false))) {
	await writeFile(
		`${path}/ranimax.meta.json`,
		JSON.stringify({
			title: animeInfo.title,
			malID: animeInfo.malID,
			alID: animeInfo.alID,
			description: animeInfo.description,
			type: animeInfo.type,
			totalEpisodes: animeInfo.totalEpisodes,
			episodes: animeInfo.episodes.map(e => {
				return {
					index: e.number,
					isFiller: e.isFiller,
					title: e.title
				}
			})
		})
	);
}

if (!(await stat(`${path}/image.${
	//get the file extension from animeInfo.image
	animeInfo.image.split(".").pop()
	}`).catch(() => false))) {
	//download image
	console.log("%c[INFO] %cDownloading image...", "color: #333fff", "color: #72d777");
	const image = await fetch(animeInfo.image);
	const fileStream = createWriteStream(`${path}/image.${animeInfo.image.split(".").pop()}`, { flags: "w" });
	await finished(Readable.fromWeb(image.body).pipe(fileStream));
}

//create download queue

const downloadQueue = [];
//crrate a event emitter to emit download progress
import { EventEmitter } from "node:events";
const dlEvent = new EventEmitter();

import { spawn } from "node:child_process";

let progress = [];
let shouldContinue = true;

//create a readline interface to accept user inputs now
import readline from "node:readline";
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

for (const episode of episodeIDs) {
	downloadQueue.push(async () => {
		let selectedQuality = quality;
		const { sources, subtitles } = (await Anime.fetchEpisodeSources(episode.id));
		let url = sources.find((source) => source.quality == quality)?.url;
		if (!url) {
			url = sources.find((source) => source.quality == "720p")?.url;
			selectedQuality = "720p";
		}
		if (!url) {
			url = sources.find((source) => source.quality == "360p")?.url;
			selectedQuality = "360p";
		}
		if (!url) {
			console.log("%c[ERROR] %cNo source found for episode " + episode.n, "color: #333fff", "color: #ff0000");
			return;
		}
		const fileName = `Episode ${episode.n}.${selectedQuality}.mp4`;
		const outputFile = `${path}/${fileName}`;
		//download subtitle first
		if (subtitles?.length > 0) {
			const subtitle = subtitles.find((subtitle) => subtitle.lang == "English");
			if (subtitle) {
				if (stat(`${path}/Episode ${episode.n}.${selectedQuality}.${subtitle.url.split(".").pop()}`).catch(() => false)) {
					let s = await fetch(subtitle.url);
					s = await s.text();
					await writeFile(`${path}/Episode ${episode.n}.${selectedQuality}.${subtitle.url.split(".").pop()}`, s);
				}
			}
		}
		if (await stat(outputFile).catch(() => false)) {
			console.log("%c[INFO] %cSkipping episode " + episode.n + " as it is already downloaded. Delete the file if you think it was not completed.", "color: #333fff", "color: #72d777");
			dlEvent.emit("downloaded", episode);
			return;
		}
		//download video
		dlEvent.emit("download", episode);
		let p = spawn("ffmpeg", ["-i", url, "-c", "copy", outputFile]);
		//read ffmpeg output and update progress bar
		p.stderr.on("data", (data) => {
			const str = data.toString();
			const lines = str.split("\n");
			for (const line of lines) {
				if (line.includes("Duration: ")) {
					console.log("%c[INFO] %cStarted " + fileName, "color: #333fff", "color: #72d777");
					// duration looks like 00:00:00.00
					const duration = line.split("Duration: ")[1].split(",")[0].trim();
					const t = parseInt(duration.split(":")[0]) * 360 + parseInt(duration.split(":")[1] * 60) + parseInt(duration.split(":")[2]);
					//t is in seconds
					progress.push(
						{
							...episode,
							duration: t,
							at: 0,
							outputFile,
							fileName,
							selectedQuality,
							cancel: async () => {
								p.kill();
								console.log("%c[INFO] %cCancelled download of episode " + episode.n, "color: #333fff", "color: #72d777");
								await unlink(outputFile);
							},
							alreadyOver: async () => {
								p.kill();
								console.log("%c[INFO] %cDownloaded episode " + episode.n + " to " + fileName, "color: #333fff", "color: #72d777");
							}
						});
				}
				if (line.includes("time=")) {
					// time looks like 00:00:00.00
					const time = line.split("time=")[1].split(" ")[0].trim();
					const t = parseInt(time.split(":")[0]) * 360 + parseInt(time.split(":")[1] * 60) + parseInt(time.split(":")[2]);
					//t is in seconds
					const index = progress.findIndex((e) => e.id == episode.id);
					progress[index].at = t;
				}
				//check overwrite prompt and reply with y
				if (line.includes("already exists. Overwrite? [y/N]")) {
					p.stdin.write("y\n");
				}
			}
		});
		//wait for download to complete
		await new Promise((resolve) => {
			p.on("close", () => {
				const index = progress.findIndex((e) => e.id == episode.id);
				progress.splice(index, 1);
				console.log("%c[INFO] %cDownloaded episode " + episode.n + " to " + fileName, "color: #333fff", "color: #72d777");
				dlEvent.emit("downloaded", episode);
				resolve();
			});
		});
	});
}

//start downloading

console.log("%c[INFO] %cStarting download...", "color: #333fff", "color: #72d777");

//start parallel downloads, try to donload parallelly as mentioned at a time. listen for download progress and when downloaded event fired, start a new download.
let parrallelDownloading = 1;
//dont pass the parallel limit
dlEvent.on("downloaded", () => {
	parrallelDownloading--;
	while ((parrallelDownloading < parallel) && shouldContinue && (downloadQueue.length > 0)) {
		parrallelDownloading++;
		downloadQueue.shift()();
	}
	if (progress.length == 0 && downloadQueue.length == 0) {
		console.log("%c[INFO] %cAll downloads completed!", "color: #333fff", "color: #72d777");
	}
});

dlEvent.emit("downloaded");


//show ">" in the console
console.log("%c[RANIMAX] %ctype %chelp %cfor help", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777");
process.stdout.write("> ");
rl.on("line", async (line) => {
	if (line === "help") {
		console.log("%c[RANIMAX] %cAvailable commands:", "color: #333fff", "color: #72d777");
		console.log("%c[RANIMAX] %cstop %c- %cStop further downloads, complete current downloads", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777");
		console.log("%c[RANIMAX] %cstopnow %c- %cStop further downloads, cancel current downloads", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777");
		console.log("%c[RANIMAX] %cprogress %c- %cShow download progress", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777");
	}

	else if (line === "stop") {
		console.log("%c[RANIMAX] %cStopping further downloads, waiting for current downloads to complete", "color: #333fff", "color: #72d777");
		shouldContinue = false;
	}

	else if (line === "stopnow") {
		console.log("%c[RANIMAX] %cStopping further downloads, cancelling current downloads", "color: #333fff", "color: #72d777");
		shouldContinue = false;
		//cancel all downloads
		for (const dl of progress) {
			await dl.cancel();
		}
		process.exit(0);
	}

	else if (line === "progress") {
		console.log("%c[RANIMAX] %cDownload progress:", "color: #333fff", "color: #72d777");
		for (const dl of progress) {
			//format time of each episode
			const duration = dl.duration;
			const at = dl.at;

			const durationHours = Math.floor(duration / 3600);
			const durationMinutes = Math.floor((duration - durationHours * 3600) / 60);
			const durationSeconds = duration - durationHours * 3600 - durationMinutes * 60;

			const atHours = Math.floor(at / 3600);
			const atMinutes = Math.floor((at - atHours * 3600) / 60);
			const atSeconds = at - atHours * 3600 - atMinutes * 60;

			const durationString = `${durationHours != 0 ? durationHours + "h " : ""}${durationMinutes}m ${durationSeconds}s`;
			const atString = `${atHours != 0 ? atHours + "h " : ""}${atMinutes}m ${atSeconds}s`;
			const percentage = Math.floor((at / duration) * 100);
			console.log(`%c[RANIMAX] %c${dl.n} %c[${dl.selectedQuality}] %c- %c${percentage}%%c - %c${atString}/${durationString}`,
				"color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777", "color: #333fff", "color: #72d777");
			if (percentage == 100) {
				//wait for 10 seconds before runing alreadyOver function
				setTimeout(() => {
					dl.alreadyOver();
					//remove from progress
					const index = progress.findIndex((e) => e.id == dl.id);
					progress.splice(index, 1);
				}, 10000);
			}
		}
	}
	else {
		console.log("%c[RANIMAX] %cUnknown command", "color: #333fff", "color: #72d777")
		process.stdout.write("> ");
		return;
	}
	process.stdout.write("> ");
});

process.on("SIGINT", () => {
	console.log("%c[RANIMAX] %cStopping further downloads, waiting for current downloads to complete", "color: #333fff", "color: #72d777");
	shouldContinue = false;
}
);