function Lobot(modulePacks) {
	this.modules = [];
	this.modulePacks = [{name: "core", author: "Patrick Cloke", version: 0.1}];
	this.addModulePacks(modulePacks);
	this.startup();
	
	this.users = [];
	this.channels = [];
};
Lobot.prototype = {
	/*
	 * Utilities
	 */
	dump: function(str) {
		document.getElementById("console").innerHTML += str + "<br>";
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
				
			if (metRequirements) {
				this.modules = this.modules.concat(modulePack.modules);
				this.modulePacks.push(modulePack.meta);
			}
		}, this);
	},
	
	executeModuleFunction: function(fcn) {
		this.modules.forEach(function(module) {
			if (module[fcn])
				module[fcn](this);
		}, this);
	},

	startup: function() {
		this.executeModuleFunction("startup");
	},
	
	help: function(helpTopic) {
		if (helpTopic)
			this.modules.forEach(function(module) {
				for (topic in module.help)
					if (topic == helpTopic)
						this.dump("<< " + topic + ": " + module.help[topic]);
			}, this);
		else
			this.modules.forEach(function(module) {
				for (topic in module.help)
					this.dump("<< " + topic);
			}, this);
	},
	
	told: function(user, time, channel, rawMessage) {
		this.dump(">> " + rawMessage);
		var message = rawMessage.split(/\W/);

		for (var i = 0; i < this.modules.length; i++)
			if (this.modules[i].told)
				this.modules[i].told(this, user, time, channel, message, rawMessage);
	},
	
	shutdown: function() {
		this.executeModuleFunction("shutdown");
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
			startup: function() {},
			verbs: ["hi", "hello"],
			requiresAuth: false, // Requires the user to be authenticated with the bot
			requiresDirect: false, // Requires the message to refer to the bot
			told: function(self, user, time, channel, message, rawMessage) {
				if (this.verbs.some(function(verb) {
					return this.match(new RegExp("(?:^|\\W)" + verb + "(?:\\W|$)", "i"));
				}, rawMessage)) {
					//channel.outgoingMessages.push("Hi! " + user.name);
					self.dump("<< Hi! " + user);
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
				dump("[" + self.loggedMessages + "]");
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
var bot = new Lobot([helloWorld, logger]);
bot.told("Test", new Date(), "#blah", "Hello!");
bot.told("Test", new Date(), "#blah", "This is a test!");
bot.told("Test", new Date(), "#blah", "Another test!");
bot.dump("<i>Debug: " + bot.loggedMessages + "</i>");
bot.help();
bot.help("hi");