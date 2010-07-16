/**
 * Contains the source code of the Lobot class. 
 * @file sample.js
 */

/**
 * Luas�g
 * @project Lobot
 * @description A JavaScript bot for Instantbird.
 * @author Patrick Cloke
 * @version 0.1
 * @timestamp
 */
function Lobot(modulePacks) {
	this.modules = [];
	this.modulePacks = [{name: "core", version: 0.1}];
	this.addModulePacks(modulePacks);
	this.startup();
};
Lobot.prototype = {
	dump: function(str) {
		document.getElementById("console").innerHTML = document.getElementById("console").innerHTML + "<br>" + str;
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
	
	told: function(user, time, channel, rawMessage) {
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
				self.dump(user + " " + time + " " + JSON.stringify(message));
				return;
			},
			shutdown: function() {}
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
				alert(": " + self.loggedMessages);
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
bot.told("Test", new Date(), "#blah", "This is a test!");
bot.told("Test", new Date(), "#blah", "Another test!");