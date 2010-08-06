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
 *   XXX Should probably but infobot.bm contributors here
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

var EXPORTED_SYMBOLS = ["infobot"];

// See http://www.infobot.org/samplesrc/0.45.3/README
// 
var infobot = {
	meta: {
		name: "Infobot",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}]
	},
	modules: [{
		help: {
			'infobot' : 'Keeps track of factoids and returns them on request. ' +
				'To set factoids, just tell me something in the form \'apple is a company\' or \'apples are fruit\'. ' +
				'To find out about something, say \'apple?\' or \'what are apples\'. ' +
				'To correct me, you can use any of: \'no, apple is a fruit\', \'apple =~ s/company/fruit/\', or \'apple is also a fruit\'. ' +
				'To make me forget a factoid, \'forget apple\'. ' +
				'You can use \'|\' to separate several alternative answers.',
			'who' : 'If a definition contains $who, then it will be replaced by the name of the person who asked the question.',
			'reply' : 'If a definition starts with <reply> then when responding the initial prefix will be skipped. ' +
				'e.g., \'apples are <reply>mm, apples\' will mean that \'what are apples\' will get the response \'mm, apples\'.',
			'action' : 'If a definition starts with <action> then when responding the definition will be used as an action. ' +
				'e.g., \'apples are <action>eats one\' will mean that \'what are apples\' will get the response \'* bot eats one\'.',
			'alias' : 'If a definition starts with <alias> then it will be treated as a symlink to whatever follows. ' +
				'e.g., \'crab apples are <alias>apples\' and \'apples are fruit\' will mean that \'what are crab apples\' will get the response \'apples are fruit\'.',
			'status' : 'Reports on how many factoids are in the database.',
			'tell' : 'Make me tell someone something. e.g., \'tell pikachu what apples are\' or \'tell fred about me\'.',
			'literal' : 'To find out exactly what is stored for an entry apples, you would say to me: literal apples',
			'remember' : 'If you are having trouble making me remember something (for example \'well, foo is bar\' ' +
				'getting treated as \'foo\' is \'bar\'), then you can prefix your statement with \'remember:\' ' +
				'(following the \'no,\' if you are changing an entry). For example, \'remember: well, foo is bar\'. ' +
				'Note that \'well, foo?\' is treated as \'what is foo\' not is \'what is well, foo\', so this is not always useful.',
			'no' : 'To correct an entry, prefix your statement with \'no,\'. ' +
				'For example, \'no, I am good\' to correct your entry from \'is bad\' to \'is good\'. :-)'
		},
		startup: function(self) {
			self['factoids'] = {'is' : {}, 'are' : {}};
			self['autoLearn'] = ['*']; // in the auto* variables, '*' means 'all channels'
			self['autoHelp'] = [];
			self['autoEdit'] = [];
			self['neverLearn'] = []; // the never* variables override the auto* variables
			self['neverHelp'] = [];
			self['neverEdit'] = [];
			self['eagerToHelp'] = true; // whether to even need the "?" on questions
			self['autoIgnore'] = []; // list of nicks for which to always turn off auto*
			self['teachers'] = []; // list of users who may teach, leave blank to allow anyone to teach
			self['factoidPositions'] = {'is': [], 'are': []};
			self['friendBots'] = [];
			self['prefixes'] = ['', 'I have heard that ', '', 'Maybe ', 'I seem to recall that ', '', 'iirc, ', '',
								'Was it not... er, someone, who said: ', '', 'Well, ', 'um... ', 'Oh, I know this one! ',
								'', 'everyone knows that! ', '', 'hmm... I think ', 'well, duh. '];
			self['researchNotes'] = {};
			self['pruneDelay'] = 120; // how frequently to look through the research notes and remove expired items
			self['queryTimeToLive'] = 600; // queries can be remembered up to ten minutes by default
			self['dunnoTimeToLive'] = 604800; // DUNNO queries can be remembered up to a week by default
			self['noIdeaDelay'] = 2000; // how long to wait before admitting lack of knowledge
			self['questions'] = 0; // how many questions there have been since the last load
			self['edits'] = 0; // how many edits (learning, editing, forgetting) there have been since the last load
			self['interbots'] = 0; // how many times we have spoken with other bots
		},

		// Helper functions
		factoidExists: function(self, database, subject) {
			return !!(self.factoids[database] && self.factoids[database][subject]);
		},
		addFactoid: function(self, database, subject, object) {
			if (!self.factoids[database])
				self.factoids[database] = [];
			self.factoids[database][subject] = object;
		},
		
		// JavaScript port of infobot.bm
		told: function(self, aMessage, aBuddy, aConversation, aAccount) {
			let matches;
			let message = self.decodeHTMLEntities(aMessage.originalMessage);

			if ((matches = (new XRegExp("^\\s*status[?\\s]*$", "si").exec(message)))) {
				var sum = this.countFactoids(self);
				var questions = self['questions'] == 1 ? "1 question" : self['questions'] + " questions";
				var edits = self['edits'] == 1 ? "1 edit" : self['edits'] + " edits";
				var interbots = self['interbots'] == 1 ? "1 time" : self['interbots'] + " times";
				var friends = self['friendBots'].length == 1 ? '1 bot friend' : self['friendBots'].length + ' bot friends';
				self.say("I have " + sum + " factoids in my database and " +
							friends + " to help me answer questions. Since the"
							+ " last reload, I've been asked " + questions + ","
							+ " performed " + edits + ", and spoken with other "
							+ "bots " + interbots + ".",
						 aBuddy,
						 aConversation,
						 aAccount);
			} else if (!aConversation.isChat && (matches = /^:INFOBOT:DUNNO <(\S+)> (.*)$/.exec(message))) { 
				if (user.name != self.name)
					this.receivedDunno(self, aMessage, aBuddy, aConversation, aAccount, matches[1], matches[2]);
			} else if (!aConversation.isChat && (matches = /^:INFOBOT:QUERY <(\S+)> (.*)$/.exec(message))) {
				if (user.name != self.name)
					this.receivedQuery(self, aMessage, aBuddy, aConversation, aAccount, matches[2], matches[1]);
			} else if (!aConversation.isChat && (matches = /^:INFOBOT:REPLY <(\S+)> (.+?) =(is|are)?=> (.*)$/.exec(message))) {
				if (user.name != self.name)
					this.receivedReply(self, aMessage, aBuddy, aConversation, aAccount, matches[3], matches[2], matches[1], matches[4]);
			} else if ((matches = /^\s*literal\s+(.+?)\s*$/.exec(message)))
				this.literal(self, aMessage, aBuddy, aConversation, aAccount, matches[1]);
			else
				return !this.doFactoidCheck(self, aMessage, aBuddy, aConversation, aAccount, true, false);
			return false; // we've dealt with it, no need to do anything else.
		},

		baffled: function(self, aAccount, aConversation, aMessage, direct) { // XXX check this
			return !this.doFactoidCheck(self, aMessage, aBuddy, aConversation, aAccount, direct, true);
			return false; // we've dealt with it, no need to do anything else.
		},

		heard: function(self, aAccount, aConversation, aMessage) { // XXX check this
			return !this.doFactoidCheck(self, aMessage, aBuddy, aConversation, aAccount, false, false);
			return false; // we've dealt with it, no need to do anything else.
		},

		doFactoidCheck: function(self, aMessage, aBuddy, aConversation, aAccount, direct, baffled) {
			let matches, shortMessage;
			let message = self.decodeHTMLEntities(aMessage.originalMessage);
			if (matches = (new XRegExp(
					"^\\s* (?:\\w+[:.!\\s]+\\s+)?\
					(?:(?:well|and|or|yes|[uh]+m*|o+[oh]*[k]+(?:a+y+)?|still|well|so|a+h+|o+h+)[:,.!?\\s]+|)*\
					(?:(?:geez?|boy|du+des?|golly|gosh|wow|whee|wo+ho+)[:,.!\\s]+|)*\
					(?:(?:heya?|hello|hi)(?:\\s+there)?(?:\\s+peoples?|\\s+kids?|\\s+folks?)[:,!.?\\s]+)*\
					(?:(?:geez?|boy|du+des?|golly|gosh|wow|whee|wo+ho+)[:,.!\\s]+|)*\
					(?:tell\\s+me[,\\s]+)?\
					(?:(?:(?:stupid\\s+)?q(?:uestion)?|basically)[:,.!\\s]+)*\
					(?:tell\\s+me[,\\s]+)?\
					(?:(?:does\\s+)?(?:any|ne)\\s*(?:1|one|body)\\s+know[,\\s]+|)?\
					(.*)\
					\\s*$", "six"
				)).exec(message)) {
				shortMessage = matches[1];
			}
			self.debug("message: " + message);
			self.debug("shortMessage: " + shortMessage);
			
			if ((new XRegExp("^\\s*Sorry,\\sI've\\sno\\sidea\\swh(?:o|at).+$", "si")).test(message)) {
				return;
			} else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+about\\s+me(?:[,\\s]+please)?[\\s!?.]*$","si")).exec(message)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 null, // database
								 aAccount.name, // what
								 direct,
								 matches[1]); // who
			} else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+about\\s+(.+?)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 null, // database
								 matches[2], // what
								 direct,
								 matches[1]); // who
			} else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+(?:what|who|where)\\s+(?:am\\s+I|I\\s+am)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 'is', // database
								 aAccount.name, // what
								 direct,
								 matches[1]); // who
			} else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+(?:what|who|where)\\s+(is|are)\\s+(.+?)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[2].toLowerCase(), // database
								 matches[3], // what
								 direct,
								 matches[1]); // who
			} else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+(?:what|who|where)\\s+(.+?)\\s+(is|are)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[3].toLowerCase(), // database
								 matches[2], // what
								 direct,
								 matches[1]); // who
			} else if (matches = (new XRegExp("^\\s*(.+?)\\s*=~\\s*s?\\/(.+?)\\/(.*?)\\/(i)?(g)?(i)?\\s*$", "si")).exec(message)) {
				this.editFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[1], // subject
								 matches[2], // first part to remove
								 matches[3], // second part to remove
								 !!matches[5],
								 !!(matches[4] || matches[6]), // case insensitive?
								 direct);
			} else if (matches = (new XRegExp("^\\s*forget\\s+(?:about\s+)?me\\s*$", "si")).exec(message)) {
				this.forgetFactoid(self,
								   aMessage,
								   aBuddy,
								   aConversation,
								   aAccount,
								   aAccount.name,
								   direct);
			} else if (matches = (new XRegExp("^\\s*forget\\s+(?:about\\s+)?(.+?)\\s*$", "si")).exec(message)) {
				this.forgetFactoid(self,
								   aMessage,
								   aBuddy,
								   aConversation,
								   aAccount,
								   matches[1],
								   direct);
			} else if (matches = (new XRegExp("^(?:what|where|who)\
											   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)?\
											   \\s+ (is|are) \\s+ (.+?) [?!\\s]* $", "six")).exec(shortMessage)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[1].toLowerCase(), // is/are (optional)
								 matches[2], // subject
								 direct);
			} else if (matches = (new XRegExp("^(?:(?:where|how)\
											   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)?\
											   \\s+ can \\s+ (?:i|one|s?he|we) \\s+ (?:find|learn|read)\
											   (?:\\s+about)?\
											   | how\\s+about\
											   | what\\'?s)\
											   \\s+ (.+?) [?!\\s]* $", "six")).exec(shortMessage)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 null, // is/are (optional)
								 matches[1], // subject
								 direct);
			} else if (matches = (new XRegExp("^(.+?) \s+ (is|are) \s+ (?:what|where|who) [?!\s]* $", "six")).exec(shortMessage)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[2].toLowerCase(), // is/are (optional)
								 matches[1], // subject
								 direct);
			} else if (matches = (new XRegExp("^(?:what|where|who)\
											   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)? \\s+\
											   (?:am\\s+I|I\\s+am) [?\\s]* $", "six")).exec(shortMessage)) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 'is', // am => is
								 aAccount.name, // subject
								 direct);
			} else if (matches = (new XRegExp("^(no\\s*, (\\s*" + self.name + "\\s*,)? \\s+)? (?:remember\\s*:\\s+)? (.+?) \\s+ (is|are) \\s+ (also\\s+)? (.*?[^?\\s]) \\s* $", "six")).exec(shortMessage)) {
				// the "remember:" prefix can be used to delimit the start of the actual content, if necessary.
				this.setFactoid(self,
								aMessage,
								aBuddy,
								aConversation,
								aAccount,
								!!(matches[1] && (direct || matches[2])), // replace existing answer?
								matches[3], // subject
								matches[4].toLowerCase(), // is/are
								!!matches[5], // add to existing answer?
								matches[6], // object
								!!(direct || matches[2]));
			} else if (matches = (new XRegExp("^(no\\s*, (?:\\s*" + self.name + "\\s*,)? \\s+)? (?:remember\\s*:\\s+)? I \\s+ am \\s+ (also\\s+)? (.+?) $", "six")).exec(shortMessage)) {
				// the "remember:" prefix can be used to delimit the start of the actual content, if necessary.
				this.setFactoid(self,
								aMessage,
								aBuddy,
								aConversation,
								aAccount,
								!!matches[1], // replace existing answer?
								aAccount.name, // subject
								'is', // I am = Foo is
								!!matches[2], // add to existing answer?
								matches[3], // object
								direct);
			} else if ((!direct || baffled) && (matches = (new XRegExp("^(.+?)\\s+(is|are)[?\\s]*(\\?)?[?\\s]*$", "si")).exec(shortMessage))) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 matches[2].toLowerCase(), // is/are (optional)
								 matches[1], // subject
								 direct);
				if (matches[3] || (baffled && self['eagerToHelp'])); // XXX This doesn't do anything
			} else if ((!direct || baffled) && (matches = (new XRegExp("^(.+?)[?!.\\s]*(\\?)?[?!.\\s]*$", "si")).exec(shortMessage))) {
				this.giveFactoid(self,
								 aMessage,
								 aBuddy,
								 aConversation,
								 aAccount,
								 null, // is/are (optional)
								 matches[1], // subject
								 direct)
				if (matches[2] || (baffled && self['eagerToHelp']));
			} else // XXX what do we do with this
				return false;
			return true;
		},

		setFactoid: function(self, aMessage, aBuddy, aConversation, aAccount, replace, subject, database, add, object, direct, fromBot) {
			if (direct || this.allowed(aMessage.who, aConversation.name, 'Learn')) {
				teacher: {
					if (self['teachers'].length) {
						for each (teacher in self['teachers'])
							if (teacher == aMessage.who)
								break teacher;
						return false;
					}
				}
				// update the database
				if (!replace)
					subject = this.canonicalizeFactoid(self, database, subject);
				else {
					var oldSubject = this.canonicalizeFactoid(self, database, subject);
					if (this.factoidExists(self, database, oldSubject))
						delete self.factoids[database][oldSubject];
				}
				if (replace || !this.factoidExists(self, database, subject)) {
					self.debug("Learning that " + subject + " " + database + " '" + object + "'.");
					this.addFactoid(self, database, subject, object);
				} else if (!add) {
					var what = self.factoids[database][subject].split('|');
					// XXX local $" = '\' or \'';
					if (!fromBot) // XXX I think I changed logic in here.
						if (what && what[0] == object) {
							if (direct)
								self.say('Yep, that\'s what I thought. Thanks for confirming it.', aBuddy, aConversation, aAccount);
						} else
							// XXX "that's one of the alternatives, sure..."
							if (direct)
								self.say("But " + subject + " " + database + " '" + what + "'...", aBuddy, aConversation, aAccount);
					return false; // failed to update database
				} else {
					self.debug("Learning that " + subject + " " + database + " also '" + object + "'.");
					self.factoids[database][subject] += "|" + object;
				}
				if (!fromBot)
					if (direct)
						self.say('ok', aBuddy, aConversation, aAccount);
				if (self['researchNotes'][subject.toLowerCase()]) {
					var queue = self['researchNotes'][subject.toLowerCase()];
					for each (entry in queue) {
						[messageE, buddyE, conversationE, accountE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE] = entry;
						if (typeE == 'QUERY') {
							if ((targetE && aMessage.who != targetE) ||
								(aMessage.who != messageE.who &&
								(!aConversation.isChat || aConversation.name != conversationE.name))) {
								[how, what, propagated] = this.getFactoid(self, messageE, buddyE, conversationE, accountE, databaseE, subjectE,
																				 targetE, directE, visitedAliasesE, user.name);
								if (how) {
									if (targetE)
										self.debug("I now know what '" + subject + "' " + database + ", so telling " + targetE + ", since " + messageE.who + " told me to.");
									else
										self.debug("I now know what '" + subject + "' " + database + ", so telling " + messageE.who + " who wanted to know.");
									this.factoidSay(self, messageE, buddyE, conversationE, accountE, how, what, directE, targetE);
									entry[1] = 'OLD';
								} else
									// either propagated, or database doesn't match requested database, or internal error
									self.debug("I now know what '" + subject + "' " + database + ", but for some reason that " +
												"didn't help me help " + messageE.who + " who needed to know what '" + subjectE + "' " + databaseE + ".");
							}
						} else if (typeE == 'DUNNO') {
							var who = targetE ? targetE : messageE.who;
							userE.say(":INFOBOT:REPLY <" + who + "> " + subject + " =" + database + "=> " + self.factoids[database][subject]);
							entry[1] = 'OLD';
						}
					}
				}
				self['edits']++;
				return true;
			} else {
				return false;
			}
		},

		giveFactoid: function(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct, target) {
			if (direct || this.allowed(aMessage.who, aConversation.name, 'Help')) {
				if ((new RegExp("^" + aAccount.name + "$", "i")).test(target)) {
					if (direct)
						self.say('Oh, yeah, great idea, get me to talk to myself.', aBuddy, aConversation, aAccount);
				} else {
					if (subject == 'you') {
						// first, skip some words that are handled by other commonly-used modules
						// in particular, 'who are you' is handled by Greeting.bm
						return;
					}
					self['questions']++;
					[how, what, propagated] = this.getFactoid(self, aMessage, aBuddy, aConversation, aAccount, database, subject, target, direct);
					if (!how) {
						this.scheduleNoIdea(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct, propagated); // XXX Check this
					} else {
						self.debug("Telling " + aMessage.who + " about " + subject + ".");
						this.factoidSay(self, aMessage, aBuddy, aConversation, aAccount, how, what, direct, target);
					}
				}
			}
		},

		literal: function(aMessage, aBuddy, aConversation, aAccount, subject) {
			var is = this.canonicalizeFactoid(self, 'is', subject);
			var are = this.canonicalizeFactoid(self, 'are', subject);
			if (is || are) {
				if (self.factoids['is'][is]) {
					var what = self.factoids['is'][is].split('|').join("\' or \'");
					self.say(is + " is '" + what + "'.", aBuddy, aConversation, aAccount);
				}
				if (self.factoids['are'][are]) {
					var what = self.factoids['are'][are].split('|').join("\' or \'");
					self.say(are + " are '" + what + "'.", aBuddy, aConversation, aAccount);
				}
			} else
				self.say("I have no record of anything called '" + subject + "'.", aBuddy, aConversation, aAccount);
		},

		scheduleNoIdea: function(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct, propagated) {
			if (propagated)
				self.schedule(this, aMessage, aBuddy, aConversation, aAccount, self['noIdeaDelay'], 1, this.scheduled, 'noIdea', database, subject, direct, propagated);
			else
				this.noIdea(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct);
		},

		getFactoid: function(self, aMessage, aBuddy, aConversation, aAccount, originalDatabase, subject, target, direct, visitedAliases, friend) { // self.research
			if (!visitedAliases)
				visitedAliases = [];
			var database;
			[database, subject] = this.findFactoid(self, originalDatabase, subject);
			if (this.factoidExists(self, database, subject)) {
				var alternatives = self.factoids[database][subject].split('|');
				var answer;
				if (alternatives) {
					if (!self['factoidPositions'][database][subject]
						|| self['factoidPositions'][database][subject] >= alternatives.length) {
						self['factoidPositions'][database][subject] = 0;
					}
					answer = alternatives[self['factoidPositions'][database][subject]];
					self['factoidPositions'][database][subject]++;
				} else
					answer = alternatives[0];
				var who = target ? target : aMessage.who;
				answer = answer.replace(/\$who/g, who);
				var matches;
				if (matches = /^<alias>(.*)$/.exec(answer)) {
					if (visitedAliases[matches[1]])
						return ['msg', "see " + subject, false];
					else {
						visitedAliases[subject]++;
						[how, what, propagated] = this.getFactoid(self, aMessage, aBuddy, aConversation, aAccount, null, matches[1], target, direct, visitedAliases);
						if (!how)
							return ['msg', "see " + matches[1], propagated];
						else
							return [how, what, propagated];
					}
				} else if (matches = /^<action>/.exec(answer)) {
					answer = answer.replace(/^<action>\s*/, '');
					return ['me', answer, false];
				} else {
					if (matches = /^<reply>/.exec(answer))
						answer = answer.replace(/^<reply>\s*/, '');
					else {
						// pick a 'random' prefix
						var prefix = self['prefixes'][aMessage.time % self['prefixes'].length];
						if (who.toLowerCase() == subject.toLowerCase())
							answer = prefix + "you are " + answer;
						else
							answer = prefix + subject + " " + database + " " + answer;
						if (friend)
							answer = friend + " knew: " + answer;
					}
					return ['msg', answer, false];
				}
			} else // we have no idea what this is
				return [null, null, this.research(self, aMessage, aBuddy, aConversation, aAccount, originalDatabase, subject, target, direct, visitedAliases)];
		},

		canonicalizeFactoid: function(self, database, subject) {
			if (!this.factoidExists(self, database, subject))
				for (key in self.factoids[database])
					if (key.toLowerCase() == subject.toLowerCase())
						return key;
			return subject;
		},

		findFactoid: function(self, database, subject) {
			if (!database) {
				database = 'is';
				subject = this.canonicalizeFactoid(self, 'is', subject);
				if (!self.factoids['is'][subject]) {
					subject = this.canonicalizeFactoid(self, 'are', subject);
					if (self.factoids['are'][subject])
						database = 'are';
				}
			} else
				subject = this.canonicalizeFactoid(self, database, subject);
			return [database, subject];
		},

		editFactoid: function(self, aMessage, aBuddy, aConversation, aAccount, subject, search, replace, global, caseInsensitive, direct) { // XXX this probably breaks
			if (direct || this.allowed(aMessage.who, aConversation.name, 'Edit')) {
				var database;
				[database, subject] = this.findFactoid(self, database, subject);
				if (!this.factoidExists(self, database, subject)) {
					self.say("Er, I don't know about this " + subject + " thingy...", aBuddy, aConversation, aAccount);
					return;
				}
				self.debug("Editing the " + subject + " entry.");
				var output = [];
				for each (factoid in self.factoids[database][subject].split('|')) {
					var flags = global ? "g" : "";
					flags += caseInsensitive ? "i" : "";
					search = XRegExp.isRegExp(new XRegExp(search, flags)) ? (new XRegExp(search, flags)) : search;
					factoid = factoid.replace(search, replace);
					output.push(factoid);
				}
				self.factoids[database][subject] = output.join('|');
				if (direct)
					self.say('ok', aBuddy, aConversation, aAccount);
				self['edits']++;
			}
		},

		forgetFactoid: function(self, aAccount, aConversation, aMessage, subject, direct) {
			if (direct || this.allowed(aMessage.who, aConversation.name, 'Edit')) {
				var count = 0;
				var database;
				for each (db  in ['is', 'are']) {
					[database, subject] = this.findFactoid(self, db, subject);
					if (this.factoidExists(self, database, subject)) {
						delete self.factoids[database][subject];
						count++;
					}
				}
				if (count) {
					if (direct)
						self.say("I've forgotten what I knew about '" + subject + "'.", aBuddy, aConversation, aAccount);
					self['edits']++;
				} else
					if (direct)
						self.say("I never knew anything about '" + subject + "' in the first place!", aBuddy, aConversation, aAccount);
			}
		},

		// interbot communications
		research: function(self, aMessage, aBuddy, aConversation, aAccount, database, subject, target, direct, visitedAliases) {
			if (!self['friendBots'].length) {
				// no bots to ask, bail out
				return false;
			}
			// now check that we need to ask the bots about it:
			var asked = 0;
			if (!self['researchNotes'][subject])
				self['researchNotes'][subject] = [];
			else {
				// XXX Why was this labeled "entry"?
				for each (entry in self['researchNotes'][subject.toLowerCase()]) {
					[messageE, buddyE, conversationE, accountE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE] = entry;
					if (typeE == 'QUERY') {
						asked++; // at least one bot was already asked quite recently
						if ((targetE && target.toLowerCase() == targetE.toLowerCase()) || // XXX Might have a bug in infobot.bm
							(!targetE && user.name.toLowerCase() == userE.name.toLowerCase())) {
							// already queued
							return true;
						}
					}
				}
			}
			// remember to tell these people about subject if we ever find out about it:
			var entry = [user, time, channel, 'QUERY', database, subject, target, direct, visitedAliases];
			if (!self['researchNotes'][subject.toLowerCase()])
				self['researchNotes'][subject.toLowerCase()] = [];
			self['researchNotes'][subject.toLowerCase()].push(entry);
			var who = target ? target : user.name;
			if (!asked) {
				// not yet asked, so ask each bot about subject
				for each (bot in self['friendBots']) {
					if (bot.name == user.name)
						continue;
					bot.say(":INFOBOT:QUERY <" + who + "> " + subject);
				}
				self['interbots']++;
				return entry; // return reference to entry so that we can check if it has been replied or not
			} else
				return asked;
		},

		receivedReply: function(self, aMessage, aBuddy, aConversation, aAccount, subject, target, object) {
			self['interbots']++;
			if (!this.setFactoid(self, user, channel, 0, subject, database, 0, object, 1, 1)
				&& self['researchNotes'][subject.toLowerCase()]) {
				// we didn't believe user, but we might as well tell any users
				// that were wondering.
				for each (entry in self['researchNotes'][subject.toLowerCase()]) {
					[userE, timeE, channelE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE] = entry;
					if (typeE == 'QUERY')
						self.factoidSay(userE.name, channelE, 'msg', "According to " + userE.name + ", " + subject + " " + database + " '" + object + "'.", directE, targetE);
					else if (typeE == 'DUNNO') {
						var who = targetE ? targetE : userE.name;
						userE.say(":INFOBOT:REPLY <" + who + " +> " + subject + " =" + database + "=> " + object);
					}
					entry[1] = 'OLD';
				}
			}
		},

		receivedQuery: function(self, aMessage, aBuddy, aConversation, aAccount, subject, target) {
			self['interbots']++;
			if (!this.tellBot(self, aMessage, aBuddy, aConversation, aAccount, subject, target))
				// in the spirit of embrace-and-extend, we're going to say that
				// :INFOBOT:DUNNO means "I don't know, but if you ever find
				// out, please tell me".
				user.say(":INFOBOT:DUNNO <" + self.name + "> " + subject);
		},

		receivedDunno: function(self, aMessage, aBuddy, aConversation, aAccount, time, target, subject) {
			self['interbots']++;
			if (!this.tellBot(self, aMessage, aBuddy, aConversation, aAccount, subject, target))
				// store the request
				var entry = [aMessage, aBuddy, aConversation, aAccount, 'DUNNO', null, subject, target, false, {}];
				if (!self['researchNotes'][subject.toLowerCase()])
					self['researchNotes'][subject.toLowerCase()] = [entry];
				else
					self['researchNotes'][subject.toLowerCase()].push(entry);
		},

		tellBot: function(self, aMessage, aBuddy, aConversation, aAccount, subject, target) {
			var count = 0;
			var database;
			for each (db in ['is', 'are']) {
				[database, subject] = this.findFactoid(self, db, subject);
				if (this.factoidExists(self, database, subject)) {
					user.say(":INFOBOT:REPLY <" + target + "> " + subject + " =" + database + "=> " + self.factoids[database][subject]);
					count++;
				}
			}
			return count;
		},

		scheduled: function(self, aMessage, aBuddy, aConversation, aAccount, waitTime, repeatTimes/*, data*/) {
			self.debug("SCHEDULED RAN");
			var data = Array.prototype.slice.call(arguments).slice(6);
			if (data[0] == 'pruneInfobot') {
				var now = time;
				for (key in self['researchNotes']) {
					var _new = [];
					for each (entry in self['researchNotes'][key]) {
						var [messageE, buddyE, conversationE, accountE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE] = entry;
						if ((typeE == 'QUERY' && (now - timeE) < self['queryTimeToLive']) ||
							(typeE == 'DUNNO' && (now - timeE) < self['dunnoTimeToLive'])) {
							_new.pushpush(entry);
						}
					}
					if (_new)
						self['researchNotes'][key] = _new;
					else
						delete self['researchNotes'][key];
				}
			} else if (data[0] == 'noIdea') {
				var [_null, database, subject, direct, propagated] = data;
				delete _null;
				var [messageE, buddyE, conversationE, accountE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = propagated;
				// in theory, userE = user, channelE = channel,
				// databaseE = database, subjectE = subject, targetE depends
				// on if this was triggered by a tell, directE = direct,
				// visitedAliasesE is opaque, and timeE is opaque.
				if (typeE != 'OLD')
					this.noIdea(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct);
			}/* else
				self.scheduled(event, data); // XXX What do we do here?*/
			return [this, aMessage, aBuddy, aConversation, aAccount, waitTime, repeatTimes, this.scheduled, data];
		},

		// internal helper routines

		factoidSay: function(self, aMessage, aBuddy, aConversation, aAccount, how, what, direct, targetName) {
			if (targetName)
				if (target = self.getUser(targetName)) {
					self.say("told " + target.name, aBuddy, aConversation, aAccount);
					if (how == 'me')
						target.emote(what);
					else if (what.length)
						target.say(user.name + " wanted you to know: " + what);
				} else
					self.say("Sorry, I've no idea who " + targetName + " is.", aBuddy, aConversation, aAccount);
			else if (how == 'me')
				channel.emote(what);
			else
				if (direct)
					self.say(what, aBuddy, aConversation, aAccount);
				else
					channel.say(what, user);
		},

		countFactoids: function(self) {
			var sum = 0;
			for each (database in self.factoids)
				for each (factoid in database)
					sum++;
			return sum;
		},

		allowed: function(buddyName, conversationName, type) {
			if (!conversationName.length) {
				for each (buddy in this['autoIgnore'])
					if (buddyName == buddy)
						return false;
				for each (conversation in this["never" + type])
					if (conversation == '*' || conversationName == conversation)
						return false;
				for each (conversation in this["auto" + type])
					if (conversation == '*' || conversationName == conversation)
						return true;
			}
			return false;
		},

		noIdea: function(self, aMessage, aBuddy, aConversation, aAccount, database, subject, direct) {
			if (subject.toLowerCase() == user.name.toLowerCase())
				if (direct)
					self.say("Sorry, I've no idea who you are.", aBuddy, aConversation, aAccount);
			else {
				if (!database)
					database = 'might be';
				if (direct)
					self.say("Sorry, I've no idea what '" + subject + "' " + database + ".", aBuddy, aConversation, aAccount);
			}
		}
	}]
};