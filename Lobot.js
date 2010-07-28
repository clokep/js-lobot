function Lobot(name, modulePacks) {
	// Lobot framework
	this.name = name;
	this.modules = [];
	this.modulePacks = [{name: "core", author: "Patrick Cloke", version: 0.1}];
	this.addModulePacks(modulePacks);
	this.startup();
	
	// Keep track of "stuff"
	this.users = [new User(this, this.name)];
	this.channels = [];
	this.accounts = [];
	
	// Some configuration options
	this['maxInChannel'] = 200; // beyond this answers are /msged
};
Lobot.prototype = {
	/*
	 * Utilities
	 */
	dump: function(str) {
		document.getElementById("console").innerHTML += str + "<br>";
	},
	debug: function (str) {
		this.dump("<span style=\"color: grey;\">[<i>" + str + "</i>]</span>");
	},

	addModulePacks: function(modulePacks) {
		// Load each module into the list
		modulePacks.forEach(function(modulePack) {
			var metRequirements = true;
			if (modulePack.meta.requires)
				metRequirements = modulePack.meta.requires.every(function(requirement) {
					return this.modulePacks.some(function(loadedModulePack) {
						return (this.name.toLowerCase() == loadedModulePack.name.toLowerCase()
								&& this.version < loadedModulePack.version);
					}, requirement);
				}, this);
				
			if (metRequirements)
				this.modulePacks.push(modulePack);
		}, this);
		
		this.modulePacks.forEach(function(modulePack) {
			if (modulePack.modules) // Skip core
				modulePack.modules.forEach(function(module) {
					module.parent = modulePack;
				});
		});
		/*this.modulePacks.forEach(function(modulePack, index) {
			if (modulePack.modules) // Skip core
				this.modulePacks[index].modules.forEach(function(module, index2) {
					this.modulePacks[index].modules[index2].parent = this.modulePacks[index];
					//this.dump(this.modulePacks[index].modules[index2].parent);
				}, this);
		}, this);*/
	},
	
	addUser: function(user) {
		this.users[user.name] = user;
	},
	
	getUser: function(userName) {
		if (this.users[userName])
			return this.users[userName];
		else // Try to find a case insensitive version and return it
			for (var key in this.users)
				if (key.toLowerCase() == userName.toLowerCase())
					return this.users[key];
	},
	
	addChannel: function(channel) {
		this.channels[channel.name] = channel;
		channel.users = this.users; // XXX for testing
		// Find all users in this channel and add them
	},
	
	/*
	 * Run a function for every module
	 * Second parameter is "this" variable in function, otherwise the Lobot instance is used
	 */
	moduleRunner: function(fun /*, thisp*/) {
		if (typeof fun != "function")
			throw new TypeError();

		var thisp = arguments[1] || this;

		this.modulePacks.forEach(function(modulePack) {
			if (modulePack.modules) // Skip core
				modulePack.modules.forEach(function(module) {
					fun.call(thisp, module);
				});
		});
	},
	
	executeModuleFunction: function(fun) {
		this.moduleRunner(function(module) {
			if (module[fun])
				module[fun](this);
		});
	},
	
	schedule: function(self, user, time, channel, waitTime, repeatTimes, fun /*, data*/) {
		var data = Array.prototype.slice.call(arguments).slice(7);
		// _self is the Lobot instance, self should be a reference back to the caller
		var _self = this;
		//_self.debug([self.name, user.name, time, channel, waitTime, repeatTimes, fun, data].join("<br>"));
		setTimeout(function() {
			[self, user, time, channel, waitTime, repeatTimes, fun, data] = fun.call(self, _self, user, time, channel, waitTime, repeatTimes, data);
			if (repeatTimes > 0 || repeatTimes < 0) // < 0 is forever! // XXX we could get rid of this, or maybe we shouldn't allow the user to edit repeatTimes?
				_self.schedule(self, user, time, channel, waitTime, --repeatTimes, fun, data);
		}, waitTime);
	},

	startup: function() {
		this.executeModuleFunction("startup");
	},
	
	help: function(helpTopic) {
		if (helpTopic)
			this.moduleRunner(function(module) {
				for (topic in module.help)
					if (topic == helpTopic)
						this.dump("<< " + topic + ": " + module.help[topic]);
			});
		else
			this.moduleRunner(function(module) {
				for (topic in module.help)
					this.dump("<< " + topic);
			});
	},
	
	told: function(user, time, channel, rawMessage) {
		this.dump(user.name + " >> " + rawMessage);
		var message = rawMessage.split(/\W/);

		this.moduleRunner(function(module) {
			if (module.told)
				module.told(this, user, time, channel, message, rawMessage);
		});
	},
	
	// Automatically choose who to talk to based on whether a user/channel exists or not
	say: function(message, user, channel, dontAutoMsg) {
		if (user && !channel)
			user.say(message);
		else
			channel.say(message, user, dontAutoMsg);
	},
	
	shutdown: function() {
		this.executeModuleFunction("shutdown");
	}
}

function Channel(self, name) {
	this.users = [];
	this.join();
	this.name = name;

	this.self = self;
};
Channel.prototype = {
	say: function(message, user, dontAutoMsg) { // XXX check message length so we don't send empty stuff
		if (user && message.length > this.self['maxInChannel']) {
			if (!dontAutoMsg) // Send the user the full message
				user.say(message);
			message = message.substr(0, this.self['maxInChannel']);
			if (!dontAutoMsg)
				message += '... (rest /msged)';
			else
				message += '... (there is more; ask me in a /msg)';
		}
		
		if (user)
			this.self.dump(this.name + " << <u>" + user.name + ": " + message + "</u>");
		else
			this.self.dump(this.name + " << <u>" + message + "</u>");
	},
	emote: function(what, user) {
		// XXX should send /me what
		if (user)
			this.self.dump(this.name + " *** <u>" + this.self.name + " " + what + " " + user.name + "</u> ***");
		else
			this.self.dump(this.name + " *** <u>" + this.self.name + " " + what + "</u> ***");
	},

	join: function() {}
}

function User(self, name) {
	this.name = name;

	this.self = self;
}
User.prototype = {
	say: function(message) {
		this.self.dump(this.name + " << <b>" + message + "</b>");
	},
	emote: function(what) {
		// XXX should send /msg /me what
		this.self.dump(this.name + " <b>*** " + what + " ***</b>");
	}
}

var helloWorld = {
	meta: {
		name: "Hello World!",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}/*, {name: "fake", version: 1}*/]
	},
	modules: [
		{
			verbs: ["hi", "hello"],
			requiresAuth: false, // Requires the user to be authenticated with the bot
			requiresDirect: false, // Requires the message to refer to the bot
			told: function(self, user, time, channel, message, rawMessage) {
				if (this.verbs.some(function(verb) {
					return this.match(new RegExp("(?:^|\\W)" + verb + "(?:\\W|$)", "i"));
				}, rawMessage)) {
					//channel.outgoingMessages.push("Hi! " + user.name);
					channel.say("<< Hi! " + user);
				}
				//self.dump(user + " " + time + " " + JSON.stringify(message));
				return;
			},
			shutdown: function() {},
			help: {
				"hi": "Testing the help system",
				"bye": "Testing the help system again",
			}
		},
		{
			verbs: ["bye", "goodbye"],
		}
	]
};

var logger = {
	meta: {
		name: "Logger",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}]
	},
	modules: [
		{
			startup: function(self) {
				self.loggedMessages = [];
				self.loggedMessages.push((new Date()) + "Logger starter");
			},
			told: function(self, user, time, channel, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			heard: function(self, user, time, channel, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			noticed: function(self, user, time, channel, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			felt: function(self, user, time, channel, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			saw: function(self, user, time, channel, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			}
		}
	]
};

// Initiate with a constructor
var bot = new Lobot("Testbot", [/*helloWorld, logger,*/ infobot]);
// Set up users and channels
var testChannel = new Channel(bot, "#blah");
bot.addChannel(testChannel);
var testUser = new User(bot, "John_Doe");
bot.addUser(testUser);
var testUser2 = new User(bot, "roger");
bot.addUser(testUser2);
var testUser3 = new User(bot, "instantbot");
bot.addUser(testUser3);


/*var testscheduler = function(self, user, time, channel, waitTime, repeatTimes, fun, data) {
	self.debug(this.name);
	self.debug("Scheduled test: " + repeatTimes + " " + ((repeatTimes == 1) ? "is" : "are") + " left");
	return [this, user, time, channel, waitTime, repeatTimes, testscheduler, data];
}
bot.schedule(testUser, testUser, new Date(), testChannel, 3000, 2, testscheduler);*/

bot.told(testUser, new Date(), testChannel, "Hello!");
bot.told(testUser, new Date(), testChannel, "This is a test!");
bot.told(testUser, new Date(), testChannel, "Another test!");
bot.told(testUser, new Date(), testChannel, "what is this");
bot.told(testUser, new Date(), null, "what is this");
//bot.debug(bot.loggedMessages.join("<br>"));
//bot.help();
//bot.help("no");
bot.told(testUser, new Date(), testChannel, "foo is bar");
bot.told(testUser, new Date(), testChannel, "geez, FOOD is BAR");
bot.told(testUser, new Date(), testChannel, "tell roger about me!");
bot.told(testUser, new Date(), testChannel, "John_Doe is awesome!!");
bot.told(testUser, new Date(), testChannel, "tell roger about me!");
bot.told(testUser, new Date(), testChannel, "tell roger2 about me!"); // A user that doesn't exist
bot.told(testUser, new Date(), testChannel, "what is food?");
bot.told(testUser, new Date(), testChannel, "no, food is good.");
bot.told(testUser, new Date(), testChannel, "what is food");
bot.told(testUser, new Date(), testChannel, "food is also healthy");
bot.told(testUser, new Date(), testChannel, "what is food!?");
bot.told(testUser, new Date(), testChannel, "what is unknown!?");
bot.told(testUser, new Date(), testChannel, "test is <reply>$who is dumb");
bot.told(testUser, new Date(), testChannel, "what is test?");
bot.told(testUser, new Date(), testChannel, "snack is <alias>food");
bot.told(testUser, new Date(), testChannel, "who is snack");

bot.told(testUser, new Date(), testChannel, "kick is <action>kicks $who!");
bot.told(testUser, new Date(), testChannel, "what is kick");
bot.told(testUser, new Date(), testChannel, "tell roger what is kick");
bot.told(testUser, new Date(), testChannel, "tell roger2 what is kick");

bot.told(testUser, new Date(), testChannel, "status");
bot.told(testUser, new Date(), null, "status"); // Direct message

/*bot.told(testUser3, new Date(), null, ":INFOBOT:QUERY <target> subject");
bot.told(testUser3, new Date(), null, ":INFOBOT:QUERY <roger> food");
bot.told(testUser2, new Date(), null, "subject is a test :)");

bot.told(testUser3, new Date(), null, ":INFOBOT:DUNNO <John_Doe> food");
bot.told(testUser3, new Date(), null, ":INFOBOT:DUNNO <John_Doe> subject2");*/

bot.told(testUser, new Date(), null, "what is food?");
bot.told(testUser, new Date(), null, "forget food");
bot.told(testUser, new Date(), null, "food?");

bot.debug("Factoids: " + JSON.stringify(bot.factoids));


/*
var A = new Lobot("A", [infobot]);
var B = new Lobot("B", [infobot]);
var C = new Lobot("C", [infobot]);
// Need "users" as bots since the bots can't actually see each other
var Au = new User(bot, "Au"); A.addUser(Au); B.addUser(Au); C.addUser(Au);
var Bu = new User(bot, "Bu"); A.addUser(Bu); B.addUser(Bu); C.addUser(Bu);
var Cu = new User(bot, "Cu"); A.addUser(Cu); B.addUser(Cu); C.addUser(Cu);
A['friendBots'] = [Bu, Cu];
B['friendBots'] = [Au, Cu];
C['friendBots'] = [Au, Bu];
var x = new User(bot, "x"); A.addUser(x); B.addUser(x); C.addUser(x);
var y = new User(bot, "y"); A.addUser(y); B.addUser(y); C.addUser(y);
var z = new User(bot, "z"); A.addUser(z); B.addUser(z); C.addUser(z);
*/

/* See http://mxr.mozilla.org/mozilla/source/webtools/mozbot/BotModules/Infobot.txt#133
 * ------- originator of private message
 * |    +--- target of private message
 * |    |
 * V    V
 * z -> A: what is foo?
 * A -> z: I have no idea.
 * A -> B: :INFOBOT:QUERY <z> foo
 * A -> C: :INFOBOT:QUERY <z> foo
 * B -> A: :INFOBOT:REPLY <x> foo =is=> bar
 * C -> A: :INFOBOT:DUNNO <C> foo
 * A -> z: B knew: foo is bar
 * A -> C: :INFOBOT:REPLY <C> foo =is=> bar
 */
/*
B.told(x, new Date(), null, "foo is bar"); // Tell B so he knows

A.told(z, new Date(), null, "what is foo?");
// A -> z: I have no idea.
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
A.told(Bu, new Date(), null, ":INFOBOT:REPLY <z> foo =is=> bar");
A.told(Cu, new Date(), null, ":INFOBOT:DUNNO <C> foo");
// A -> z: B knew: foo is bar
// A -> C: :INFOBOT:REPLY <C> foo =is=> bar
*/
/*
 * z -> A: what is foo?
 * A -> z: I have no idea.
 * A -> B: :INFOBOT:QUERY <z> foo
 * A -> C: :INFOBOT:QUERY <z> foo
 * B -> A: :INFOBOT:REPLY <x> foo =is=> <alias>bar
 * C -> A: :INFOBOT:DUNNO <C> foo
 * A -> B: :INFOBOT:QUERY <z> bar
 * A -> C: :INFOBOT:QUERY <z> bar
 * A -> C: :INFOBOT:REPLY <C> foo =is=> <alias>bar
 * B -> A: :INFOBOT:DUNNO <B> bar
 * C -> A: :INFOBOT:REPLY <x> bar =is=> baz
 * A -> z: C knew: bar is baz
 * A -> B: :INFOBOT:REPLY <B> bar =is=> baz
 */
/*
B.told(x, new Date(), null, "foo is <alias>bar"); // Tell B so he knows
C.told(x, new Date(), null, "bar is baz"); // Tell C so he knows

A.told(z, new Date(), null, "what is foo?");
// A -> z: I have no idea.
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
A.told(Bu, new Date(), null, ":INFOBOT:REPLY <z> foo =is=> <alias>bar");
A.told(Cu, new Date(), null, ":INFOBOT:DUNNO <C> foo");
// A -> C: :INFOBOT:REPLY <C> foo =is=> <alias>bar
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> bar");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> bar");
A.told(Bu, new Date(), null, ":INFOBOT:DUNNO <B> bar");
A.told(Cu, new Date(), null, ":INFOBOT:REPLY <z> bar =is=> baz");
// A -> z: C knew: bar is baz
// A -> B: :INFOBOT:REPLY <B> bar =is=> baz
*/