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

var helloWorld = {
	meta: {
		name: "Hello World!",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}/*, {name: "fake", version: 1}*/]
	},
	modules: [
		{
			requiresAuth: false, // Requires the user to be authenticated with the bot
			requiresDirect: false, // Requires the message to refer to the bot
			told: function(self, aMessage, aBuddy, aConversation, aAccount) {
				if (aMessage.originalMessage.match(/[\s^]h(e(llo|y)|i)[\s$]/i))
					self.say("Hi " + aMessage.who + "!", null, aConversation);
			},
			shutdown: function() {
			},
			help: {
				"hi": "Testing the help system",
				"bye": "Testing the help system again",
			}
		}/*,
		{ // XXX Goodbye module?
			verbs: ["bye", "goodbye"],
		}*/
	]
};

var help = {
	meta: {
		name: "Help",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}]
	},
	modules: [
		{
			verbs: ["hi", "hello"],
			told: function(self, aMessage, aBuddy, aConversation, aAccount) {
				var matches;
				if (matches = /^help\s(\S)+\s?(\S)*$/i.exec(aMessage.originalMessage))
					if (matches[2])
						self.moduleRunner(function(module) {
							for (topic in module.help)
								if (topic == matches[2])
									self.say(topic + ": " + module.help[topic], null, aConversation);
						});
					else if (matches[1])
						self.moduleRunner(function(module) {
							for (topic in module.help)
								self.say(topic, null, aConversation);
						});
					/*else
						self.say("Nothing found for " + aMessage.originalMessage);*/
			}
		}
	]
};

var logger = { // XXX this won't work at all in the current system
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
			told: function(self, user, time, conversation, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			heard: function(self, user, time, conversation, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			noticed: function(self, user, time, conversation, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			felt: function(self, user, time, conversation, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			},
			saw: function(self, user, time, conversation, message, rawMessage) {
				self.loggedMessages.push(rawMessage);
			}
		}
	]
};
