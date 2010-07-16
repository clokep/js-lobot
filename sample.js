function Lobot(username, modules) {
	this.modules = [];
	this.username = username;
};
Lobot.prototype = {
	onMessageReceive: function(user, time, message) {
		message = message.toLowerCase();
		let words = message.split(/\b/);
		
		for each (module in modules) {
			if (words[0] in module.verbs) {
				let response = module.onMessage();

				return true;
			}
		}
	},
	loadModules: function(modulePacks) {
		for each (modulePack in modulePacks)
			for each (module in modulePack) {
				this.modules.push(module);
				this.modules[modules.length - 1].onStartUp();
			}
	}
}


// Initiate with a constructor
let bot = new Lobot(/* Optionally an array of modules */);

lobot.addModule(helloWorld);

let helloWorld = {
	[{
		onStartUp: function() {},
		verbs: ["hi", "hello"],
		requiresAuth: false, // Requires the user to be authenticated with the bot
		requiresDirect: false, // Requires the message to refer to the bot
		onMessage: function() {
			return {responseText: ["", ""], 
		}
		onShutDown: function() {}
	},
	{
		startUp: function() {},
		verbs: ["bye", "goodbye"],
		requiresAuth: false;

		shutDown: function() {}
	}]
};