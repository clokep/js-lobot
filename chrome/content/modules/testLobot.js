// Initiate with a constructor
var bot = new Lobot("Testbot", [/*helloWorld, logger,*/ infobot]);
// Set up users and channels
var testChannel = new Channel(bot, "#blah");
bot.addChannel(testChannel);
var testUser = new User(bot, "John_Doe");
bot.addUser(testUser);
var testUser2 = new User(bot, "roger");
bot.addUser(testUser2);
var testUser3 = new User(bot, "instantbot");
bot.addUser(testUser3);


/*var testscheduler = function(self, user, time, channel, waitTime, repeatTimes, fun, data) {
	self.debug(this.name);
	self.debug("Scheduled test: " + repeatTimes + " " + ((repeatTimes == 1) ? "is" : "are") + " left");
	return [this, user, time, channel, waitTime, repeatTimes, testscheduler, data];
}
bot.schedule(testUser, testUser, new Date(), testChannel, 3000, 2, testscheduler);*/

bot.told(testUser, new Date(), testChannel, "Hello!");
bot.told(testUser, new Date(), testChannel, "This is a test!");
bot.told(testUser, new Date(), testChannel, "Another test!");
bot.told(testUser, new Date(), testChannel, "what is this");
bot.told(testUser, new Date(), null, "what is this");
//bot.debug(bot.loggedMessages.join("<br>"));
//bot.help();
//bot.help("no");
bot.told(testUser, new Date(), testChannel, "foo is bar");
bot.told(testUser, new Date(), testChannel, "geez, FOOD is BAR");
bot.told(testUser, new Date(), testChannel, "tell roger about me!");
bot.told(testUser, new Date(), testChannel, "John_Doe is awesome!!");
bot.told(testUser, new Date(), testChannel, "tell roger about me!");
bot.told(testUser, new Date(), testChannel, "tell roger2 about me!"); // A user that doesn't exist
bot.told(testUser, new Date(), testChannel, "what is food?");
bot.told(testUser, new Date(), testChannel, "no, food is good.");
bot.told(testUser, new Date(), testChannel, "what is food");
bot.told(testUser, new Date(), testChannel, "food is also healthy");
bot.told(testUser, new Date(), testChannel, "what is food!?");
bot.told(testUser, new Date(), testChannel, "what is unknown!?");
bot.told(testUser, new Date(), testChannel, "test is <reply>$who is dumb");
bot.told(testUser, new Date(), testChannel, "what is test?");
bot.told(testUser, new Date(), testChannel, "snack is <alias>food");
bot.told(testUser, new Date(), testChannel, "who is snack");

bot.told(testUser, new Date(), testChannel, "kick is <action>kicks $who!");
bot.told(testUser, new Date(), testChannel, "what is kick");
bot.told(testUser, new Date(), testChannel, "tell roger what is kick");
bot.told(testUser, new Date(), testChannel, "tell roger2 what is kick");

bot.told(testUser, new Date(), testChannel, "status");
bot.told(testUser, new Date(), null, "status"); // Direct message

/*bot.told(testUser3, new Date(), null, ":INFOBOT:QUERY <target> subject");
bot.told(testUser3, new Date(), null, ":INFOBOT:QUERY <roger> food");
bot.told(testUser2, new Date(), null, "subject is a test :)");

bot.told(testUser3, new Date(), null, ":INFOBOT:DUNNO <John_Doe> food");
bot.told(testUser3, new Date(), null, ":INFOBOT:DUNNO <John_Doe> subject2");*/

bot.told(testUser, new Date(), null, "what is food?");
bot.told(testUser, new Date(), null, "forget food");
bot.told(testUser, new Date(), null, "forget food");
bot.told(testUser, new Date(), null, "what is food?");


bot.told(testUser, new Date(), null, "test1 is here");
bot.told(testUser, new Date(), null, "test1 =~ s/ere/air/");

bot.debug("Factoids: " + JSON.stringify(bot.factoids));


/*
var A = new Lobot("A", [infobot]);
var B = new Lobot("B", [infobot]);
var C = new Lobot("C", [infobot]);
// Need "users" as bots since the bots can't actually see each other
var Au = new User(bot, "Au"); A.addUser(Au); B.addUser(Au); C.addUser(Au);
var Bu = new User(bot, "Bu"); A.addUser(Bu); B.addUser(Bu); C.addUser(Bu);
var Cu = new User(bot, "Cu"); A.addUser(Cu); B.addUser(Cu); C.addUser(Cu);
A['friendBots'] = [Bu, Cu];
B['friendBots'] = [Au, Cu];
C['friendBots'] = [Au, Bu];
var x = new User(bot, "x"); A.addUser(x); B.addUser(x); C.addUser(x);
var y = new User(bot, "y"); A.addUser(y); B.addUser(y); C.addUser(y);
var z = new User(bot, "z"); A.addUser(z); B.addUser(z); C.addUser(z);
*/

/* See http://mxr.mozilla.org/mozilla/source/webtools/mozbot/BotModules/Infobot.txt#133
 * ------- originator of private message
 * |    +--- target of private message
 * |    |
 * V    V
 * z -> A: what is foo?
 * A -> z: I have no idea.
 * A -> B: :INFOBOT:QUERY <z> foo
 * A -> C: :INFOBOT:QUERY <z> foo
 * B -> A: :INFOBOT:REPLY <x> foo =is=> bar
 * C -> A: :INFOBOT:DUNNO <C> foo
 * A -> z: B knew: foo is bar
 * A -> C: :INFOBOT:REPLY <C> foo =is=> bar
 */
/*
B.told(x, new Date(), null, "foo is bar"); // Tell B so he knows

A.told(z, new Date(), null, "what is foo?");
// A -> z: I have no idea.
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
A.told(Bu, new Date(), null, ":INFOBOT:REPLY <z> foo =is=> bar");
A.told(Cu, new Date(), null, ":INFOBOT:DUNNO <C> foo");
// A -> z: B knew: foo is bar
// A -> C: :INFOBOT:REPLY <C> foo =is=> bar
*/
/*
 * z -> A: what is foo?
 * A -> z: I have no idea.
 * A -> B: :INFOBOT:QUERY <z> foo
 * A -> C: :INFOBOT:QUERY <z> foo
 * B -> A: :INFOBOT:REPLY <x> foo =is=> <alias>bar
 * C -> A: :INFOBOT:DUNNO <C> foo
 * A -> B: :INFOBOT:QUERY <z> bar
 * A -> C: :INFOBOT:QUERY <z> bar
 * A -> C: :INFOBOT:REPLY <C> foo =is=> <alias>bar
 * B -> A: :INFOBOT:DUNNO <B> bar
 * C -> A: :INFOBOT:REPLY <x> bar =is=> baz
 * A -> z: C knew: bar is baz
 * A -> B: :INFOBOT:REPLY <B> bar =is=> baz
 */
/*
B.told(x, new Date(), null, "foo is <alias>bar"); // Tell B so he knows
C.told(x, new Date(), null, "bar is baz"); // Tell C so he knows

A.told(z, new Date(), null, "what is foo?");
// A -> z: I have no idea.
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> foo");
A.told(Bu, new Date(), null, ":INFOBOT:REPLY <z> foo =is=> <alias>bar");
A.told(Cu, new Date(), null, ":INFOBOT:DUNNO <C> foo");
// A -> C: :INFOBOT:REPLY <C> foo =is=> <alias>bar
B.told(Au, new Date(), null, ":INFOBOT:QUERY <z> bar");
C.told(Au, new Date(), null, ":INFOBOT:QUERY <z> bar");
A.told(Bu, new Date(), null, ":INFOBOT:DUNNO <B> bar");
A.told(Cu, new Date(), null, ":INFOBOT:REPLY <z> bar =is=> baz");
// A -> z: C knew: bar is baz
// A -> B: :INFOBOT:REPLY <B> bar =is=> baz
*/