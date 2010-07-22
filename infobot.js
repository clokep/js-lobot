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
			startUp: function(self) {
				this.factoids = [];
			},

			told: function(self, user, time, channel, message, rawMessage) {
				this.doFactoidCheck(self, user, time, channel, rawMessage, true);
			},

			doFactoidCheck: function(self, user, time, channel, message, direct) {
				var parsedMessage, shortMessage;
				if (parsedMessage = (new XRegExp(
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
					shortMessage = parsedMessage[1];
				}
				self.debug("message: " + message);
				self.debug("shortMessage: " + shortMessage);
				
				if ((new XRegExp("^\\s*Sorry,\\sI've\\sno\\sidea\\swh(?:o|at).+$", "si")).test(message)) {
					return;
				} else if (parsedMessage = (new XRegExp("^\\s*tell\\s+(\\S+)\\s+about\\s+me(?:[,\\s]+please)?[\\s!?.]*$","si")).exec(message)) {
					self.giveFactoid(self,
									 user,
									 channel,
									 user.name, // what
									 direct,
									 parsedMessage[1]); // who
				}/* else if (parsedMessage =~ /^\s*tell\s+(\S+)\s+about\s+(.+?)(?:[,\s]+please)?[\s!?.]*$/osi) {
					$self->GiveFactoid($event,
					undef, # database
					$2, # what
					$direct,
					$1); # who
				} else if (parsedMessage =~ /^\s*tell\s+(\S+)\s+(?:what|who|where)\s+(?:am\s+I|I\s+am)(?:[,\s]+please)?[\s!?.]*$/osi) {
					$self->GiveFactoid($event,
					'is', # database
					$event->{'from'}, # what
					$direct,
					$1); # who
				}*/

			},

			giveFactoid: function(self, user, channel, subject, direct, target) {
				if (direct || this.allowed(user.name, channel.name, 'Help')) {
					if ((new XRegExp("^" + self.name + "$", "i")).test(target)) {
						this.targettedSay(user, channel, 'Oh, yeah, great idea, get me to talk to myself.', direct);
						//channel.outgoingMessages.push(user.name + ': Oh, yeah, great idea, get me to talk to myself.');
					} else {
						if (subject == 'you') {
							// first, skip some words that are handled by other commonly-used modules
							// in particular, 'who are you' is handled by Greeting.bm
							return;
						}
						//self['questions']++; // XXX Do we want to do this?
						[how, what, propagated] = this.getFactoid(self, user, channel, database, subject, target, direct);
						if (!how) {
							//this.scheduleNoIdea(event, database, subject, direct, propagated); // XXX Todo
						} else {
							self.debug("Telling " + user.name + " about " + subject + ".");
							this.factoidSay(event, how, what, direct, target);
						}
					}
				}
			},

			literal: function(user, channel, subject) {
				var is = this.canonicalizeFactoid('is', subject);
				var are = this.canonicalizeFactoid('are', subject);
				if (is || are) {
					if (this.factoids['is'][is]) {
						var what = this.factoids['is'][is].split('|').join("\' or \'");
						this.targettedSay(user, channel, is + " is '" + what + "'.", true);
						//channel.outgoingMessages.push(userName + ": " + is + " is '" + what + "'.");
					}
					if (this.factoids['are'][are]) {
						var what = this.factoids['are'][are].split('|').join("\' or \'");
						this.targettedSay(user, channel, are + " are '" + what + "'.", true);
						//channel.outgoingMessages.push(userName + ": " + are + " are '" + what + "'.");
					}
				} else {
					this.targettedSay(user, channel, "I have no record of anything called '" + subject + "'.", true);
					//channel.outgoingMessages.push(userName + ": I have no record of anything called '" + subject + "'.");
				}
			},

			scheduleNoIdea: function(self, event, database, subject, direct, propagated) {
				// XXX Todo
				/*if (ref($propagated)) {
					self.schedule($event, self['noIdeaDelay'], 1, 'noIdea', $database, $subject, $direct, $propagated);
				} else {
					this.noIdea($event, $database, $subject, $direct);
				}*/
			},

			getFactoid: function(self, user, channel, originalDatabase, subject, target, direct, visitedAliases, friend) {
				if (!visitedAliases)
					visitedAliases = [];
				var database;
				[database, subject] = this.findFactoid(originalDatabase, subject);
				if (this.factoids[database][subject]) {
					var alternatives = this.factoids[database][subject].split('|');
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
					if (matches = (new XRegExp("^<alias>(.*)$")).match(answer)) {
						if (visitedAliases[matches[1]])
							return ('msg', "see " + subject, 0);
						else {
							visitedAliases[subject]++;
							[how, what, propagated] = this.getFactoid(event, undef, matches[1], target, direct, visitedAliases);
							if (!how)
								return ['msg', "see " + matches[1], propagated];
							else
								return [how, what, propagated];
						}
					} else if (matches = (new XRegExp("^<action>")).match(answer)) {
						answer = answer.replace(/^<action>\s*/, '');
						return ['me', answer, false];
					} else {
						if (matches = (new XRegExp("^<reply>")).match(answer))
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

			canonicalizeFactoid: function(database, subject) {
				if (!this.factoids[database][subject])
					for (key in this.factoids[database])
						if (key.toLowerCase() == subject.toLowerCase())
							return key;
			},

			findFactoid: function(database, subject) {
				if (!database) {
					database = 'is';
					subject = this.canonicalizeFactoid('is', subject);
					if (!this.factoids['is'][subject]) {
						subject = this.canonicalizeFactoid('are', subject);
						if (this.factoids['are'][subject])
							$database = 'are';
					}
				} else
					subject = this.canonicalizeFactoid(database, subject);
				return [database, subject];
			},

			// internal helper routines

			factoidSay: function(self, event, how, what, direct, target) {
				if (target) {
					this.targettedSay(event, "told " + target, true);
					var helper = user.name;
					if (how == 'me')
						self.directEmote(target, channel, what);
					else if (what.length)
						self.directSay(event, helper + " wanted you to know: " + what);
				} else if (how == 'me') {
					self.emote(event, what);
				} else {
					if (channel.name == '' || what.length < self['maxInChannel'])
						this.targettedSay(event, what, true);
					else {
						if (direct) {
							this.targettedSay(event, substr(what, 0, self['maxInChannel']) + '... (rest /msged)' , true);
							self.directSay(event, what);
						} else
							this.targettedSay(event, substr(what, 0, self['maxInChannel']) + '... (there is more; ask me in a /msg)' , true);
					}
				}
			},

			targettedSay: function(user, channel, message, direct) {
				if (direct && message.length)
					channel.say(channel, user.name + ": " + message);
			},

			countFactoids: function(self) { // XXX do we want to do this?
				var sum = 0;
				for each (factoid in this.factoids)
					sum += factoid.length;
				return sum;
			},

			allowed: function(userName, channelName, type) {
				if (!channelName.length) {
					// XXX converted from perl, do we care about this?
					for each (user in this['autoIgnore'])
						if (userName == user)
							return 0;
					for each (channel in this["never" + type])
						if (channel == '*' || channelName == channel)
							return 0;
					for each (channel in this["auto" + type])
						if (channel == '*' || channelName == channel)
							return 1;
				}
				return 0;
			},

			noIdea: function(self, event, database, subject, direct) {
				if (subject.toLowerCase() == user.name.toLowerCase())
					this.targettedSay(event, "Sorry, I've no idea who you are.", direct);
				else {
					if (!database)
						database = 'might be';
					this.targettedSay(event, "Sorry, I've no idea what '" + subject + "' " + database + ".", direct);
				}
			}
		}
	]
};