import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import express, {RequestHandler} from "express";
import cookieSession from "cookie-session";
import {AddUser, GetUser, GetUsers, GetUserHiddensWithEmail, User, UserHidden, systemUserID} from "dm_common";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import expressSession from "express-session";
import {Assert} from "web-vcore/nm/js-vextensions";
import {pgClient, pgPool} from "./Main.js";
import {graph} from "./Utils/LibIntegrations/MobXGraphlink.js";

//type ExpressApp = Express.Application;
type ExpressApp = ReturnType<typeof express>;

type GoogleAuth_ProviderData = {
	displayName: string;
	email: string;
	phoneNumber: string;
	photoURL: string;
	providerId: string; // "google.com"
	uid: string;
};

passport.use(new GoogleStrategy(
	{
		clientID: process.env.CLIENT_ID as string,
		clientSecret: process.env.CLIENT_SECRET as string,
		callbackURL: "http://localhost:3105/auth/google/callback",
	},
	async(accessToken, refreshToken, profile, done)=>{
		//console.log("Test1");
		const profile_firstEmail = profile.emails?.map(a=>a.value).find(a=>a);
		if (profile_firstEmail == null) return void done("Account must have associated email-address to sign-in.");

		//await pgPool.query("INSERT INTO users(name, email) VALUES($1, $2) ON CONFLICT (id) DO NOTHING", [profile.id, profile.email]);

		//const existingUser = await GetAsync(()=>GetUsers()));
		const existingUser_hidden = await GetAsync(()=>GetUserHiddensWithEmail(profile_firstEmail)[0], {errorHandling_final: "log"});
		if (existingUser_hidden != null) {
			console.log("Found existing user for email:", profile_firstEmail);
			const existingUser = await GetAsync(()=>GetUser(existingUser_hidden.id), {errorHandling_final: "log"});
			console.log("Also found user-data:", existingUser);
			Assert(existingUser != null, `Could not find user with id matching that of the entry in userHiddens (${existingUser_hidden.id}), which was found based on your provided account's email (${existingUser_hidden.email}).`);
			return void done(null, existingUser);
		}

		console.log(`User not found for email "${profile_firstEmail}". Creating new.`);
		const user = new User({
			displayName: profile.displayName,
			permissionGroups: {basic: true, verified: false, mod: false, admin: false},
			photoURL: profile.photos?.[0]?.value,
		});
		const userHidden = new UserHidden({
			email: profile_firstEmail,
			providerData: [profile._json],
		});
		const command = new AddUser({user, userHidden});
		command._userInfo_override = graph.userInfo; // use system-user to run the AddUser command
		const {id: newID} = await command.RunLocally();
		console.log("AddUser done! NewID:", newID);

		//if (true) return void done(null, {id: newID}); // temp (till AddUser actually adds a user that can be retrieved in next step)

		const result = await GetAsync(()=>GetUser(newID), {errorHandling_final: "log"});
		console.log("User result:", result);
		done(null, result!);
	},
));
type UserBasicInfo = {id: string, displayName: string, photoURL: string|n};
passport.serializeUser((user: User, done)=>{
	//console.log("Test1.5:"); //, JSON.stringify(user));
	const basicInfo: UserBasicInfo = {id: user["id"], displayName: user["displayName"], photoURL: user["photoURL"]}; // todo: maybe serialize just the user-id, like before
	done(null, basicInfo);
});
passport.deserializeUser(async(userBasicInfo: UserBasicInfo, done)=>{
	/*const {rows} = await pgClient.query("select * from users where id = $1", []);
	if (rows.length == 0) done(`Cannot find user with id "${id}".`);*/
	//console.log("Test2:", JSON.stringify(userBasicInfo));

	//if (true) return void done(null, {id}); // temp (till AddUser actually adds a user that can be retrieved in next step)

	const user = await GetAsync(()=>GetUser(userBasicInfo.id));
	if (user == null) done(`Cannot find user with id "${userBasicInfo.id}".`);
	done(null, user);
});

// commented; we just use the return-value of "_PassConnectionID" now
/*const setUserIDResponseCookie: RequestHandler = (req, res, next)=>{
	const currentUserID = req.user?.["id"];
	//console.log("Afterward, got user:", currentUserID);

	var userIDCookie = req.cookies["debate-map-userid"];
	// if user-id cookie is out of date, update it
	if (currentUserID != userIDCookie) {
		if (currentUserID) {
			res.cookie("debate-map-userid", currentUserID, {
				//maxAge: new Date(2147483647 * 1000).toUTCString(),
				expires: new Date(253402300000000), // from: https://stackoverflow.com/a/28289961/2441655
				httpOnly: false, // httpOnly:false, so frontend code can access it

				//domain: ".app.localhost", // see above for reason
				//domain: ".localhost", // see above for reason
				//domain: "localhost",
			});
		} else {
			res.clearCookie("debate-map-userid");
		}
	}
	next();
};*/

export function SetUpAuthHandling(app: ExpressApp) {
	//app.use(express.session({ secret: 'keyboard cat' }));
	app.use(cookieSession({
		name: "debate-map-session",
		keys: ["key1", "key2"],

		//domain: ".app.localhost", // explicitly set domain to ".app.localhost", so that it ignores the port segment, letting cookie be seen by both [app.]localhost:3005 and [db.app.]localhost:3105
		//domain: ".localhost",
		//domain: "localhost",
	}));
	/*app.use(expressSession({
		secret: "debate-map-session-123123",
		resave: false,
		saveUninitialized: false,
	}));*/
	app.use(passport.initialize());
	app.use(passport.session());

	// server-side access-token-retrieval approach
	app.get("/auth/google",
		passport.authenticate("google", {
			scope: ["profile", "email"],
		}));
	//includeUserIDAsResponseCookie);
	app.get("/auth/google/callback",
		passport.authenticate("google"),
		//setUserIDResponseCookie,
		(req, res, next)=>{
			// if success
			if (req.user) {
				res.redirect("http://localhost:3005");
			} else {
				res.redirect("http://localhost:3005/login-failed");
			}
			next();
		});

	// for testing commands, as server-side
	/*app.get("/Test1", async(req, res, next)=>{
		console.log("Trying to add user... @req.body:", req.body);
		const user = new User({
			displayName: "displayName",
			permissionGroups: {basic: true, verified: false, mod: false, admin: false},
			photoURL: null,
		});
		const userHidden = new UserHidden({
			email: "test@gmail.com",
			providerData: ["n/a"],
		});
		const command = new AddUser({user, userHidden});
		console.log("Running command...");
		const result = await command.Run();
		console.log("Command done! Result:", result);
		next();
	});*/
}