function TSScript(packageName, scriptSubpath) {
	let cdCommand = "";
	if (packageName) {
		cdCommand = `cd Packages/${packageName} && `;
	}

	const envPart = `TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true`;
	const nodeFlags = `--loader ts-node/esm.mjs --experimental-specifier-resolution=node`;
	return `${cdCommand}cross-env ${envPart} node ${nodeFlags} ${scriptSubpath}`;
}

//const memLimit = 4096;
const memLimit = 8192; // in megabytes

const scripts = {};
module.exports.scripts = scripts;

function GetServeCommand(nodeEnv = null) {
	return `cross-env-shell ${nodeEnv ? `NODE_ENV=${nodeEnv} ` : ""}_USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=${memLimit}" "npm start client.dev.part2"`;
}
Object.assign(scripts, {
	client: {
		dev: {
			//default: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true NODE_OPTIONS="--max-old-space-size=${memLimit} --experimental-modules" "npm start dev-part2"`,
			default: GetServeCommand("development"),
			staticServe: GetServeCommand(), // same as above, except with NODE_ENV=null (for static-serving of files in Dist folder)
			noDebug: `nps "dev --no_debug"`,
			//part2: `cross-env TS_NODE_OPTIONS="--experimental-modules" ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server.ts`,
			//part2: `cross-env NODE_OPTIONS="--experimental-modules" ts-node --project Scripts/tsconfig.json Scripts/Bin/Server.ts`,
			//part2: `cross-env ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server.ts`,
			part2: TSScript("client", "Scripts/Bin/Server"), // for now, call directly; no ts-node-dev [watching] till figure out use with new type:module approach

			//withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=${memLimit} --experimental-modules" "ts-node-dev --project Scripts/tsconfig.json Scripts/Bin/Server"`,
			withStats: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true OUTPUT_STATS=true NODE_OPTIONS="--max-old-space-size=${memLimit}" "ts-node-dev --project Scripts/tsconfig.json --ignore none Scripts/Bin/Server"`,
		},
		cypress: {
			open: "cypress open",
			run: "cypress run",
		},
		clean: "cd Packages/client && shx rm -rf Dist",
		compile: TSScript("client", "Scripts/Bin/Compile"),
		build: {
			default: `cross-env-shell "npm start client.clean && npm start client.compile"`,
			dev: `cross-env NODE_ENV=development npm start client.build`,
			prod: `cross-env NODE_ENV=production npm start client.build`,
			prodQuick: `cross-env NODE_ENV=production QUICK=true npm start client.build`,
		},
		//justDeploy: 'ts-node ./Scripts/Build/Deploy',
		justDeploy: {
			dev: "TODO",
			prod: "TODO",
		},
		deploy: {
			dev: `cross-env-shell NODE_ENV=development _USE_TSLOADER=true "npm start client.build && npm start client.just-deploy.dev"`,
			prod: `cross-env-shell NODE_ENV=production "npm start client.build && npm start client.just-deploy.prod"`,
			prodQuick: `cross-env-shell NODE_ENV=production QUICK=true "npm start client.build && npm start client.just-deploy.prod"`,
		},

		//tscWatch: `./node_modules/.bin/tsc-watch.cmd --onSuccess "node ./Scripts/Build/OnSuccess.js"`,
	},
	common: {
		// helps for spotting typescript errors in the "Packages/common" (client.dev script can work too, but it's nice to have one just for errors in "common")
		tsc: "cd Packages/common && tsc --noEmit",
	},
	server: {
		// setup
		//initDB: "psql -f ./Packages/server/Scripts/InitDB.sql debate-map",
		initDB: TSScript("server", "Scripts/InitDB.ts"),

		// first terminal
		dev: "cd Packages/server && snowpack build --watch",

		// second terminal
		run: GetStartServerCommand(),
	}
});
function GetStartServerCommand() {
	/*const variantPath = serverVariantPaths[server];
	return `node ${variantPath}`;*/
	//return `node ./Packages/server/Build/esm/Source/index.js`;
	return `cd Packages/server && node ./Build/esm/Source/index.js`;
}