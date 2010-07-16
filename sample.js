/**
 * Contains the source code of the Lobot class. 
 * @file sample.js
 */

/**
 * Luasóg
 * @project Lobot
 * @description A JavaScript bot for Instantbird.
 * @author Patrick Cloke
 * @version 0.1
 * @timestamp
 */
function Lobot(modulePacks) {
	this.modules = [];
	this.modulePacks = [{name: "core", version: 0.1}];
	this.addModules(modulePacks);
};
Lobot.prototype = {
	/**
	 *
	 */
	addModules: function(modulePacks) {
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
				this.modulePacks = this.modulePacks.push(modulePack.meta);
			}
		}, this);
	},
	
	
	told: function(user, time, rawMessage) {
		var words = rawMessage.split(/\W/);
		alert(JSON.stringify(words));

		for (var i = 0; i < modules.length; i++)
			modules[i].told(this, user, time, channel, message, rawMessage);
	}
}

var helloWorld = {
	meta: {
		name: "Hello World!",
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}/*, {name: "fake", version: 1}*/]
	},
	modules: [
		{
			startup: function() {},
			verbs: ["hi", "hello"],
			requiresAuth: false, // Requires the user to be authenticated with the bot
			requiresDirect: false, // Requires the message to refer to the bot
			told: function() {
				return {responseText: ["", ""]};
			},
			shutdown: function() {}
		},
		{
			verbs: ["bye", "goodbye"],
		}
	]
};

// Initiate with a constructor
var bot = new Lobot([helloWorld]);
bot.told("", new Date(), "This is a test!");