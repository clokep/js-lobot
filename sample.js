function Lobot(username, modules) {
	this.modules = [];
	this.username = username;
};
Lobot.prototype = {
	addModules: function(modulePacks) {
		// Load each module into the list
		for each (modulePack in modulePacks) {
			var metRequirements = true;
			if (modulePack.requires)
				metRequirements = false;
				for (requirement in modulePack.requires)
					if (!(requirement in this.modules))
						break;
			if (metRequirements)
				this.modules = this.modules.concat(modulePack);
		}
		
		// Check requirements and run start up
		/*var requirementsMet = false;
		while (!requirementsMet)
			for (var i = 0; i < this.modules.length; i++) {
				var module = this.modules[i];
				if (module.requires)
					for (requirement in module.requires)
						if(!(requirement in this.modules)) {
							this.modules = this.modules.splice(i,1); // Remove this element
							break;
						}
			}
		for each (module in this.modules)
			module.startup();*/
		alert(this.modules.length);
	},
	told: function(user, time, message) {
		message = message.toLowerCase();
		var words = message.split(/\b/);
		
		for each (module in modules) {
			if (words[0] in module.verbs) {
				var response = module.onMessage();

				return true;
			}
		}
	}
}


// Initiate with a constructor
var bot = new Lobot(/* Optionally an array of modules */);

bot.addModules([helloWorld]);

var helloWorld = {
	[
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