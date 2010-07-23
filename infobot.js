// See http://www.infobot.org/samplesrc/0.45.3/README
// 
var infobot = {
	meta: {
		name: "Infobot",
		version: 0.1,
		author: "Patrick Cloke",
		requires: [{name: "core", version: 0}]
	},
	modules: [
		{
			startup: function(self) {
				self.factoids = [];
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
				self['researchNotes'] = [];
				self['pruneDelay'] = 120; // how frequently to look through the research notes and remove expired items
				self['queryTimeToLive'] = 600; // queries can be remembered up to ten minutes by default
				self['dunnoTimeToLive'] = 604800; // DUNNO queries can be remembered up to a week by default
				self['noIdeaDelay'] = 2; // how long to wait before admitting lack of knowledge
				self['questions'] = 0; // how many questions there have been since the last load
				self['edits'] = 0; // how many edits (learning, editing, forgetting) there have been since the last load
				self['interbots'] = 0; // how many times we have spoken with other bots
				self['maxInChannel'] = 200; // beyond this answers are /msged
			},

			told: function(self, user, time, channel, message, rawMessage) { // XXX barely started
				self.debug(this.doFactoidCheck(self, user, time, channel, rawMessage, true));
			},

			factoidExists: function(database, subject) {
				return self.factoids[database] && self.factoids[database][subject];
			},
			addFactoid: function(database, subject, object) {
				if (!self.factoids[database])
					self.factoids[database] = [];
				self.factoids[database][subject] = object;
			},

			doFactoidCheck: function(self, user, time, channel, message, direct, baffled) { // XXX Not done
				self.dump(self.factoids);
				var matches, shortMessage;
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
				
				if ((new XRegExp("^\\s*Sorry,\\sI've\\sno\\sidea\\swh(?:o|at).+$", "si")).test(message))
					return;
				else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+about\\s+me(?:[,\\s]+please)?[\\s!?.]*$","si")).exec(message))
					this.giveFactoid(self,
									 user,
									 channel,
									 user.name, // what
									 direct,
									 matches[1]); // who
				else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+about\\s+(.+?)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message))
					this.giveFactoid(self,
									  user,
									  channel,
									  null, // database
									  matches[2], // what
									  direct,
									  matches[1]); // who
				else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+(?:what|who|where)\\s+(?:am\\s+I|I\\s+am)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message))
					this.giveFactoid(self,
									 user,
									 channel,
									 'is', // database
									 user.name, // what
									 direct,
									 matches[1]); // who
				else if (matches = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+(?:what|who|where)\\s+(is|are)\\s+(.+?)(?:[,\\s]+please)?[\\s!?.]*$", "si")).exec(message))
					this.giveFactoid(self,
									 user,
									 channel,
									 matches[2].toLowerCase(), // database
									 matches[3], // what
									 direct,
									 matches[1]); // who
				else if (matches = (new XRegExp("^\s*tell\s+(\S+)\s+(?:what|who|where)\s+(.+?)\s+(is|are)(?:[,\s]+please)?[\s!?.]*$", "si")).exec(message))
					this.giveFactoid(self,
									 user,
									 channel,
									 matches[3].toLowerCase(), // database
									 matches[2], // what
									 direct,
									 matches[1]); // who
				else if (matches = (new XRegExp("^\s*(.+?)\s*=~\s*s?\/(.+?)\/(.*?)\/(i)?(g)?(i)?\s*$", "si")).exec(message))
					this.editFactoid(self,
									 user,
									 channel,
									 matches[1], // subject
									 matches[2], // first part to remove
									 matches[3], // second part to remove
									 !!matches[5],
									 !!(matches[4] || matches[6]), // case insensitive?
									 direct);
				else if (matches = (new XRegExp("^\s*forget\s+(?:about\s+)?me\s*$", "si")).exec(message))
					this.forgetFactoid(self,
									   user,
									   channel,
									   user.name,
									   direct);
				else if (matches = (new XRegExp("^\s*forget\s+(?:about\s+)?(.+?)\s*$", "si")).exec(message))
					this.forgetFactoid(self,
									   user,
									   channel,
									   matches[1],
									   direct);
				else if (matches = (new XRegExp("^(?:what|where|who)\
												   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)?\
												   \\s+ (is|are) \\s+ (.+?) [?!\\s]* $", "six")).exec(shortMessage))
					this.giveFactoid(self,
									 user,
									 channel,
									 matches[1].toLowerCase(), // is/are (optional)
									 matches[2], // subject
									 direct);
				else if (matches = (new XRegExp("^(?:(?:where|how)\
												   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)?\
												   \\s+ can \\s+ (?:i|one|s?he|we) \\s+ (?:find|learn|read)\
												   (?:\\s+about)?\
												   | how\\s+about\
												   | what\\'?s)\
												   \\s+ (.+?) [?!\\s]* $", "six")).exec(shortMessage))
					this.giveFactoid(self,
									 user,
									 channel,
									 null, // is/are (optional)
									 matches[1], // subject
									 direct);
				else if (matches = (new XRegExp("^(.+?) \s+ (is|are) \s+ (?:what|where|who) [?!\s]* $", "six")).exec(shortMessage))
					this.giveFactoid(self,
									 user,
									 channel,
									 matches[2].toLowerCase(), // is/are (optional)
									 matches[1], // subject
									 direct);
				else if (matches = (new XRegExp("^(?:what|where|who)\
												   (?:\\s+the\\s+hell|\\s+on\\s+earth|\\s+the\\s+fuck)? \\s+\
												   (?:am\\s+I|I\\s+am) [?\\s]* $", "six")).exec(shortMessage))
					this.giveFactoid(self,
									 user,
									 channel,
									 'is', // am => is
									 user.name, // subject
									 direct);
				else if (matches = (new XRegExp("^(no\\s*, (\\s*" + self.name + "\\s*,)? \\s+)? (?:remember\\s*:\\s+)? (.+?) \\s+ (is|are) \\s+ (also\\s+)? (.*?[^?\\s]) \\s* $", "six")).exec(shortMessage))
					// the "remember:" prefix can be used to delimit the start of the actual content, if necessary.
					this.setFactoid(self,
									user,
									channel,
									!!(matches[1] && (direct || matches[2])), // replace existing answer?
								    matches[3], // subject
									matches[4].toLowerCase(), // is/are
									!!matches[5], // add to existing answer?
									matches[6], // object
									!!(direct || matches[2]));
				else if (matches = (new XRegExp("^(no\\s*, (?:\\s*" + self.name + "\\s*,)? \\s+)? (?:remember\\s*:\\s+)? I \\s+ am \\s+ (also\\s+)? (.+?) $", "six")).exec(shortMessage)) {
					// the "remember:" prefix can be used to delimit the start of the actual content, if necessary.
					this.setFactoid(self,
									user,
									channel,
									!!matches[1], // replace existing answer?
									user.name, // subject
									'is', // I am = Foo is
									!!matches[2], // add to existing answer?
									matches[3], // object
									direct);
				} else if ((!direct || baffled) && (matches = (new XRegExp("^(.+?)\\s+(is|are)[?\\s]*(\\?)?[?\\s]*$", "si")).exec(shortMessage))) {
					this.giveFactoid(self,
									 user,
									 channel,
									 matches[2].toLowerCase(), // is/are (optional)
									 matches[1], // subject
									 direct);
					if (matches[3] || (baffled && self['eagerToHelp'])); // XXX This doesn't do anything
				} else if ((!direct || baffled) && (matches = (new XRegExp("^(.+?)[?!.\\s]*(\\?)?[?!.\\s]*$", "si")).exec(shortMessage))) {
					this.giveFactoid(self,
									 user,
									 channel,
									 null, // is/are (optional)
									 matches[1], // subject
									 direct)
					if (matches[2] || (baffled && self['eagerToHelp']));
				} else
					return 0;
				return 1;
			},

			setFactoid: function(self, user, channel, replace, subject, database, add, object, direct, fromBot) {
				if (direct || this.allowed(user.name, channel.name, 'Learn')) {
					teacher: {
						if (self['teachers']) {
							for each (teacher in self['teachers'])
								if (teacher == user.name)
									break teacher;
							return false;
						}
					}
					// update the database
					if (!replace)
						subject = this.canonicalizeFactoid(database, subject);
					else {
						var oldSubject = this.anonicalizeFactoid(database, subject);
						if (this.factoidExists(database, oldSubject)) {
							delete factoids[database][oldSubject];
						}
					}
					if (replace || !this.factoidExists(database, subject)) {
						self.debug("Learning that " + subject + " " + database + " '" + object + "'.");
						this.addFactoid(database, subject, object);
					} else if (!add) {
						var what = self.factoids[database][subject].split('|');
						// XXX local $" = '\' or \'';
						if (!fromBot) {
							if (what && what[0] == object) {
								this.targettedSay(user.name, channel, 'Yep, that\'s what I thought. Thanks for confirming it.', direct);
							} else {
								// XXX "that's one of the alternatives, sure..."
								this.targettedSay(user.name, channel, "But " + subject + " " + database + " '" + what + "'...", direct);
							}
						}
						return false; // failed to update database
					} else {
						self.debug("Learning that " + subject + " " + database + " also '" + object + "'.");
						self.factoids[database][subject] += "|" + object;
					}
					if (!fromBot)
						this.targettedSay(user.name, channel, 'ok', direct);
					if (self['researchNotes'][subject.toLowerCase()]) {
						var queue = self['researchNotes'][subject.toLowerCase()];
						for each (entry in queue) {
							[userE, channelE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = entry;
							if (typeE == 'QUERY') {
								if ((targetE && user.name != targetE) ||
									(user.name != userE.name &&
									 (channel.name == '' || channel.name != channelE.name))) {
									[how, what, propagated] = this.getFactoid(eventE, databaseE, subjectE,
																					 targetE, directE, visitedAliasesE, user.name);
									if (how) {
										if (targetE)
											self.debug("I now know what '" + subject + "' " + database + ", so telling " + targetE + ", since " + userE.name + " told me to.");
										else
											selfdebug("I now know what '" + subject + "' " + database + ", so telling " + userE.name + " who wanted to know.");
										self.factoidsay(userE, channelE, how, what, directE, targetE);
										entry[1] = 'OLD';
									} else {
										// either propagated, or database doesn't match requested database, or internal error
										$self.debug("I now know what '" + subject + "' " + database + ", but for some reason that " +
													 "didn't help me help " + userE.name + " who needed to know what '" + subjectE + "' " + databaseE + ".");
									}
								}
							} else if (typeE == 'DUNNO') {
								var who = targetE ? targetE : userE.name;
								self.directSay(userE, channelE, ":INFOBOT:REPLY <" + who + "> " + subject + " =" + database + "=> " + factoids[database][subject]);
								entry[1] = 'OLD';
							}
						}
					}
					//self['edits']++; // XXX Do we want to do this?
					return true;
				} else {
					return false;
				}
			},

			giveFactoid: function(self, user, channel, database, subject, direct, target) {
				if (direct || this.allowed(user.name, channel.name, 'Help')) {
					if ((new RegExp("^" + self.name + "$", "i")).test(target)) {
						this.targettedSay(user.name, channel, 'Oh, yeah, great idea, get me to talk to myself.', direct);
					} else {
						if (subject == 'you') {
							// first, skip some words that are handled by other commonly-used modules
							// in particular, 'who are you' is handled by Greeting.bm
							return;
						}
						//self['questions']++; // XXX Do we want to do this?
						[how, what, propagated] = this.getFactoid(self, user, channel, database, subject, target, direct);
						if (!how)
							this.scheduleNoIdea(self, user, channel, database, subject, direct, propagated); // XXX Check this
						else {
							self.debug("Telling " + user.name + " about " + subject + ".");
							self.factoidsay(self, user, channel, how, what, direct, target);
						}
					}
				}
			},

			literal: function(user, channel, subject) { // DONE
				var is = this.canonicalizeFactoid('is', subject);
				var are = this.canonicalizeFactoid('are', subject);
				if (is || are) {
					if (self.factoids['is'][is]) {
						var what = self.factoids['is'][is].split('|').join("\' or \'");
						this.targettedSay(user.name, channel, is + " is '" + what + "'.", true);
					}
					if (self.factoids['are'][are]) {
						var what = self.factoids['are'][are].split('|').join("\' or \'");
						this.targettedSay(user.name, channel, are + " are '" + what + "'.", true);
					}
				} else {
					this.targettedSay(user.name, channel, "I have no record of anything called '" + subject + "'.", true);
				}
			},

			scheduleNoIdea: function(self, user, channel, database, subject, direct, propagated) { // XXX schedule?
				if (propagated)
					self.schedule(user, channel, self['noIdeaDelay'], 1, 'noIdea', database, subject, direct, propagated);
				else
					this.noIdea(self, user.name, channel, database, subject, direct);
			},

			getFactoid: function(self, user, channel, originalDatabase, subject, target, direct, visitedAliases, friend) { // self.research
				if (!visitedAliases)
					visitedAliases = [];
				var database;
				[database, subject] = this.findFactoid(originalDatabase, subject);
				if (self.factoids[database][subject]) {
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
					var who = target ? target : user.name;
					answer = answer.replace(/\$who/g, who);
					var matches;
					if (matches = /^<alias>(.*)$/.match(answer)) {
						if (visitedAliases[matches[1]])
							return ['msg', "see " + subject, false];
						else {
							visitedAliases[subject]++;
							[how, what, propagated] = this.getFactoid(self, null, null, matches[1], target, direct, visitedAliases);
							if (!how)
								return ['msg', "see " + matches[1], propagated];
							else
								return [how, what, propagated];
						}
					} else if (matches = /^<action>/.match(answer)) {
						answer = answer.replace(/^<action>\s*/, '');
						return ['me', answer, false];
					} else {
						if (matches = /^<reply>/.match(answer))
							answer = answer.replace(/^<reply>\s*/, '');
						else {
							// pick a 'random' prefix
							var prefix = self['prefixes'][time % self['prefixes'].length];
							if (who.toLowerCase() == subject.toLowerCase())
								answer = prefix + "you are " + $answer;
							else
								answer = prefix + subject + " " + database + " " + answer;
							if (friend)
								answer = friend + " knew: " + answer;
						}
						return ['msg', answer, false];
					}
				} else // we have no idea what this is
					return [null, null, this.research(event, originalDatabase, subject, target, direct, visitedAliases)];
			},

			canonicalizeFactoid: function(database, subject) { // DONE
				if (self.factoids[database] && self.factoids[database][subject])
					for (key in self.factoids[database])
						if (key.toLowerCase() == subject.toLowerCase())
							subject = key;
				return subject;
			},

			findFactoid: function(database, subject) { // DONE
				if (!database) {
					database = 'is';
					subject = this.canonicalizeFactoid('is', subject);
					if (!self.factoids['is'][subject]) {
						subject = this.canonicalizeFactoid('are', subject);
						if (self.factoids['are'][subject])
							$database = 'are';
					}
				} else
					subject = this.canonicalizeFactoid(database, subject);
				return [database, subject];
			},

			editFactoid: function(self, userName, channel, subject, search, replace, global, caseInsensitive, direct) {
				if (direct || this.allowed(userName, channel.name, 'Edit')) {
					var database;
					[database, subject] = this.findFactoid(database, subject);
					if (!factoids[database][subject]) {
						this.targettedSay(userName, channel, "Er, I don't know about this $subject thingy...", direct);
						return;
					}
					self.debug("Editing the " + subject + " entry.");
					var output = [];
					for each (factoid in factoids[database][subject].split('|')) {
						search = this.sanitizeRegexp(search);
						if (global && caseInsensitive)
							factoid = factoid.replace((new RegExp(search, "gi"), replace)); // XXX Check these
						else if (global)
							factoid = factoid.replace((new RegExp(search, "g"), replace));
						else if (caseInsensitive)
							factoid = factoid.replace((new RegExp(search, "i"), replace));
						else
							factoid = factoid.replace((new RegExp(search), replace));
						output.push(factoid);
					}
					factoids[database][subject] = output.join('|');
					this.targettedSay(userName, channel, 'ok', direct);
					//self['edits']++; // XXX Do we want to do this?
				}
			},

			forgetFactoid: function(self, userName, channel, subject, direct) {
				if (direct || this.allowed(userName, channel, 'Edit')) {
					var count = 0;
					var database;
					for each (db  in ['is', 'are']) {
						[database, subject] = this.findFactoid(db, subject);
						if (factoids[database][subject]) {
							delete factoids[database][subject];
							count++;
						}
					}
					if ($count) {
						this.targettedSay(userName, channel, "I've forgotten what I knew about '$subject'.", direct);
						//self['edits']++; // XXX Do we want to do this?
					} else
						this.targettedSay(userName, channel, "I never knew anything about '$subject' in the first place!", direct);
				}
			},

			// interbot communications
			research: function(self, user, channel, time, database, subject, target, direct, visitedAliases) {
				if (!self['friendBots'].length) {
					// no bots to ask, bail out
					return 0;
				}
				// now check that we need to ask the bots about it:
				var asked = 0;
				if (!self['researchNotes'][subject])
					self['researchNotes'][subject] = [];
				else {
					//entry: foreach my $entry (@{$self->{'researchNotes'}->{lc($subject)}}) { // XXX Why is there a label?
					for each (entry in self['researchNotes'][subject.toLowerCase()]) {
						[eventE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = entry;
						if (typeE == 'QUERY') {
							asked++; // at least one bot was already asked quite recently
							if ((targetE && target.toLowerCase() == targetE.toLowerCase()) || // XXX Might have a bug in infobot.bm
								(!targetE && user.name.toLowerCase() == userE.name.toLowerCase())) {
								// already queued
								return 1;
							}
						}
					}
				}
				// remember to tell these people about $subject if we ever find out about it:
				var entry = [user, channel, 'QUERY', database, subject, target, direct, visitedAliases, time];
				self['researchNotes'][subject.toLowerCase()].push(entry);
				var who = target ? target : user.name;
				if (!asked) {
					// not yet asked, so ask each bot about $subject
					for each (bot in self['friendBots']) {
						if (bot == user.name)
							continue;
						self.directSay(bot, channel, ":INFOBOT:QUERY <" + who + "> " + subject);
					}
					//self['interbots']++; // XXX Do we want to do this?
					return entry; // return reference to entry so that we can check if it has been replied or not
				} else
					return asked;
			},

			receivedReply: function(self, event, database, subject, target, object) { // XXX set factoid
				//self['interbots']++; // XXX Do we want to do this?
				if (!this.setFactoid(event, 0, subject, database, 0, object, 1, 1)
					&& self['researchNotes'][subject.toLowerCase()]) {
					// we didn't believe $event->{'from'}, but we might as well
					// tell any users that were wondering.
					for each (entry in self['researchNotes'][subject.toLowerCase()]) {
						[userE, channelE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = entry;
						if (typeE == 'QUERY')
							self.factoidsay(userE.name, channelE, 'msg', "According to " + userE.name + ", " + subject + " " + database + " '" + object + "'.", directE, targetE);
						else if (typeE == 'DUNNO') {
							var who = targetE ? targetE : userE.name;
							self.directSay(userE, channelE, ":INFOBOT:REPLY <" + who + " +> " + subject + " =" + database + "=> " + object);
						}
						entry[1] = 'OLD';
					}
				}
			},

			receivedQuery: function(self, user, channel, subject, target) {
				//self['interbots']++; // XXX Do we want to do this?
				if (!this.tellBot(user, channel, subject, target)) {
					// in the spirit of embrace-and-extend, we're going to say that
					// :INFOBOT:DUNNO means "I don't know, but if you ever find
					// out, please tell me".
					self.directSay(user, channel, ":INFOBOT:DUNNO <" + self.name + "> " + subject);
				}
			},

			receivedDunno: function(self, user, channel, time, target, subject) {
				//self['interbots']++; // XXX Do we want to do this?
				if (!this.tellBot(event, subject, target)) {
					// store the request
					self['researchNotes'][subject.toLowerCase()].push([event, 'DUNNO', null, _$1, target, 0, {}, time]); // What is the $1 referring to
				}
			},

			tellBot: function(self, user, channel, subject, target) { // DONE
				var count = 0;
				var database;
				for each (db in ['is', 'are']) {
					[database, subject] = this.findFactoid(db, subject);
					if (factoids[database][subject]) {
						self.directSay(user, channel, ":INFOBOT:REPLY <" + target + "> " + subject + " =" + database + "=> " + factoids[database][subject]);
						count++;
					}
				}
				return count;
			},

			scheduled: function(self, user, channel, time, data) {
				if (data[0] == 'pruneInfobot') {
					var now = time;
					for (key in self['researchNotes']) {
						var _new = [];
						for each (entry in self['researchNotes'][key]) {
							var [eventE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = entry;
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
					[_null, database, subject, direct, propagated] = data;
					delete _null;
					[userE, channelE, typeE, databaseE, subjectE, targetE, directE, visitedAliasesE, timeE] = propagated;
					// in theory, eventE = event, databaseE = database,
					// subjectE = subject, targetE depends on if this was
					// triggered by a tell, directE = direct, visitedAliasesE is
					// opaque, and timeE is opaque.
					if (typeE != 'OLD')
						this.noIdea(user, channel, database, subject, direct);
				} else
					self.scheduled(event, data); // XXX What do we do here?
			},

			// internal helper routines

			factoidSay: function(self, user, channel, how, what, direct, target) { // XXX self.directSay? self.directEmote?
				if (target) {
					this.targettedSay(user.name, channel, "told " + target, true);
					if (how == 'me')
						self.directEmote(target, channel, what);
					else if (what.length)
						self.directSay(user, channel, user.name + " wanted you to know: " + what);
				} else if (how == 'me')
					self.emote(event, what);
				else {
					if (channel.name == '' || what.length < self['maxInChannel'])
						this.targettedSay(user.name, channel, what, true);
					else {
						if (direct) {
							this.targettedSay(user.name, channel, substr(what, 0, self['maxInChannel']) + '... (rest /msged)' , true);
							self.directSay(user, channel, what);
						} else
							this.targettedSay(user.name, channel, substr(what, 0, self['maxInChannel']) + '... (there is more; ask me in a /msg)' , true);
					}
				}
			},

			targettedSay: function(userName, channel, message, direct) { // DONE
				if (direct && message.length)
					channel.say(userName + ": " + message);
			},

			countFactoids: function(self) { // DONE
				// XXX do we want to do this?
				var sum = 0;
				for each (factoid in self.factoids)
					sum += factoid.length;
				return sum;
			},

			allowed: function(userName, channelName, type) { // DONE
				if (!channelName.length) {
					// XXX converted from perl, do we care about this?
					for each (user in this['autoIgnore'])
						if (userName == user)
							return false;
					for each (channel in this["never" + type])
						if (channel == '*' || channelName == channel)
							return false;
					for each (channel in this["auto" + type])
						if (channel == '*' || channelName == channel)
							return true;
				}
				return false;
			},

			noIdea: function(self, userName, channel, database, subject, direct) { // DONE
				if (subject.toLowerCase() == userName.toLowerCase())
					this.targettedSay(userName, channel, "Sorry, I've no idea who you are.", direct);
				else {
					if (!database)
						database = 'might be';
					this.targettedSay(userName, channel, "Sorry, I've no idea what '" + subject + "' " + database + ".", direct);
				}
			}
		}
	]
};