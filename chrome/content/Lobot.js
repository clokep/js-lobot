/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Lobot, released 2010.
 *
 * The Initial Developer of the Original Code is
 * Patrick Cloke <clokep@gmail.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

function Lobot(modulePacks) {
	// Lobot framework
	this.name = "Lobot"; // XXX Needs to be moved to an account basis
	this.modules = [];
	this.modulePacks = [{name: "core", author: "Patrick Cloke", version: 0.1}];
	this.addModulePacks(modulePacks);

	this.startup();

	// Keep track of "stuff"
	this.users = [new Buddy(this, this.name)];
	this.conversations = [];
	this.accounts = [];
	
	// Some configuration options
	this['maxInConversation'] = 200; // beyond this answers are /msged
};
Lobot.prototype = {
	globalNotifications: [
		"account-added",
		"account-updated",
		"account-removed",
		"account-connected",
		"account-signin-on",
		"account-connecting",
		"account-disconnecting",
		"account-disconnected",
		"account-progress",
		"account-connect-error",
		"account-list-updated",
		"status-changed",
		"autologin-processed",
		"purple-quit",
		"new-conversation",
		"new-text",
		"buddy-added",
		"buddy-signed-on",
		"buddy-signed-off",
		"buddy-removed",
		"buddy-deleted",
		"buddy-away",
		"buddy-idle",
		"buddy-alias"
	],

	purpleIConversationNotifications: [
		"new-text",
		"update-conv-title"
	],
	purpleIConvIMNotifications: [
		"update-typing",
		"update-buddy-status"
	],
	purpleIConvChatNotifications: [
		"chat-update-topic",
		"chat-buddy-add",
		"chat-buddy-remove",
		"chat-buddy-update"
	],
	
	registerObservers: function() {
		let observerService = Components.classes["@mozilla.org/observer-service;1"]
									 .getService(Components.interfaces.nsIObserverService);

		let self = this;
		self.globalNotifications.forEach(function (aTopic) {
			observerService.addObserver(self, aTopic, false);
		});
	},
	
	// nsIObserver
	observe: function(aSubject, aTopic, aMsg) {
		//alert(aTopic);
		switch (aTopic) {
			case "account-added":
			case "account-updated":
			case "account-removed":
			case "account-connected":
			case "account-signin-on":
			case "account-connecting":
			case "account-disconnecting":
			case "account-disconnected":
			case "account-progress":
			case "account-connect-error":
			case "account-list-updated":
			case "status-changed":
			case "autologin-processed":
			case "purple-quit":
				// Do nothing
				break;
			case "new-conversation":
				let self = this;
				let notifications = self.purpleIConversationNotifications.concat(
					aSubject.isChat ? self.purpleIConvChatNotifications : self.purpleIConvIMNotifications
				);
				/*notifications.forEach(function (aTopic) {
					obsSvc.addObserver(self, aTopic, false);
				});*/
				break;
			case "new-text":
				this.receivedText(aSubject);
				break;
			case "buddy-added":
			case "buddy-signed-on":
			case "buddy-signed-off":
			case "buddy-removed":
			case "buddy-deleted":
			case "buddy-away":
			case "buddy-idle":
			case "buddy-alias":
				// Do nothing
				break;
			default:
				// Do nothing
				break;
		}
	},
	
	receivedText: function(aMessage) {
		alert(aMessage.containsNick + " " + aMessage.notification + " " + aMessage.system);
		if (!aMessage.containsNick && !aMessage.system)
			this.told(aMessage.conversation.account, aMessage.conversation, aSubject);
		else if (!aSubject.system)
			this.heard(aMessage.conversation.account, aMessage.conversation, aSubject);
	},

	/*
	 * Utilities
	 */
	dump: function(aConversation, aStr) {
		aConversation.writeMessage("Lobot",
								   aStr,
								   {incoming: true});
	},
	debug: function (aConversation, aStr) {
		aConversation.writeMessage("Lobot-Debug",
								   aStr,
								   {
									   incoming: true,
									   system: true,
									   noLinkification: true
								   });
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
	
	addBuddy: function(user) {
		this.users[user.name] = user;
	},
	
	getBuddy: function(userName) {
		if (this.users[userName])
			return this.users[userName];
		else // Try to find a case insensitive version and return it
			for (var key in this.users)
				if (key.toLowerCase() == userName.toLowerCase())
					return this.users[key];
	},
	
	addConversation: function(aConversation) {
		this.conversations[aConversation.name] = new Conversation(aConversation);
		// XXX Find all users in this conversation and add them
		//this.users[buddy.name] = new Buddy(aConversation.buddy);
	},

	removeConversation: function(aConversation) {
		delete this.conversations[aConversation.name];
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
	
	// Execute a function in each module if it exists
	executeModuleFunction: function(fun) {
		this.moduleRunner(function(module) {
			if (module[fun])
				module[fun](this);
		});
	},
	
	schedule: function(self, user, time, conversation, waitTime, repeatTimes, fun /*, data*/) {
		var data = Array.prototype.slice.call(arguments).slice(7);
		// _self is the Lobot instance, self should be a reference back to the caller
		var _self = this;
		//_self.debug([self.name, user.name, time, conversation, waitTime, repeatTimes, fun, data].join("<br>"));
		setTimeout(function() {
			[self, user, time, conversation, waitTime, repeatTimes, fun, data] = fun.call(self, _self, user, time, conversation, waitTime, repeatTimes, data);
			if (repeatTimes > 0 || repeatTimes < 0) // < 0 is forever! // XXX we could get rid of this, or maybe we shouldn't allow the user to edit repeatTimes?
				_self.schedule(self, user, time, conversation, waitTime, --repeatTimes, fun, data);
		}, waitTime);
	},

	startup: function() {
		this.executeModuleFunction("startup");
	},
	
	help: function(aConversation, aHelpTopic) {
		if (aHelpTopic)
			this.moduleRunner(function(module) {
				for (topic in module.help)
					if (topic == aHelpTopic)
						this.dump(aConversation, topic + ": " + module.help[topic]);
			});
		else
			this.moduleRunner(function(module) {
				for (topic in module.help)
					this.dump(aConversation, topic);
			});
	},
	
	told: function(aAccount, aConversation, aMessage) {
		this.moduleRunner(function(module) {
			if (module.told)
				module.told(this, aAccount, aConversation, aMessage);
		});
	},

	heard: function(aAccount, aConversation, aMessage) {
		this.moduleRunner(function(module) {
			if (module.heard)
				module.heard(this, aAccount, aConversation, aMessage);
		});
	},
	
	// Automatically choose who to talk to based on whether a user/conversation exists or not
	say: function(message, user, conversation, dontAutoMsg) {
		if (user && !conversation)
			user.say(message);
		else
			conversation.say(message, user, dontAutoMsg);
	},
	
	shutdown: function() {
		this.executeModuleFunction("shutdown");
	}
}

function Conversation(self, name) {
	this.users = [];
	this.join();
	this.name = name;

	this.self = self;
};
Conversation.prototype = {
	say: function(message, user, dontAutoMsg) { // XXX check message length so we don't send empty stuff
		if (user && message.length > this.self['maxInConversation']) {
			if (!dontAutoMsg) // Send the user the full message
				user.say(message);
			message = message.substr(0, this.self['maxInConversation']);
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

function Buddy(self, name) {
	this.name = name;

	this.self = self;
}
Buddy.prototype = {
	say: function(message) {
		this.self.dump(this.name + " << <b>" + message + "</b>");
	},
	emote: function(what) {
		// XXX should send /msg /me what
		this.self.dump(this.name + " <b>*** " + what + " ***</b>");
	}
}