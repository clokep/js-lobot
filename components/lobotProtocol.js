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

// Register chrome:// & resource:// URIs
{
	// <https://developer.mozilla.org/en/XPConnect/xpcshell/HOWTO>
	// <https://bugzilla.mozilla.org/show_bug.cgi?id=546628>
	let Cc = Components.classes;
	let Ci = Components.interfaces;

	// Register resource://app/ URI
	let ios = Cc["@mozilla.org/network/io-service;1"]
				 .getService(Ci.nsIIOService);
	let resHandler = ios.getProtocolHandler("resource")
						.QueryInterface(Ci.nsIResProtocolHandler);
	let mozDir = Cc["@mozilla.org/file/directory_service;1"]
					.getService(Ci.nsIProperties)
					.get("CurProcD", Ci.nsILocalFile);
	let mozDirURI = ios.newFileURI(mozDir);
	resHandler.setSubstitution("app", mozDirURI);

	// register chrome://* URIs
	let cr = Cc["@mozilla.org/chrome/chrome-registry;1"]
				.getService(Ci.nsIChromeRegistry);
	cr.checkForNewChrome();
}

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://app/modules/jsProtoHelper.jsm");
Components.utils.import("resource://lobot/lobot.jsm");

const Ci = Components.interfaces;

function Conversation(aAccount) {
	this._init(aAccount);
}
Conversation.prototype = {
	_disconnected: false,
	_setDisconnected: function() {
		this._disconnected = true;
	},
	close: function() {
		if (!this._disconnected)
			this.account.disconnect(true);
	},
	sendMsg: function (aMsg) {
		if (this._disconnected) {
			this.writeMessage("Lobot",
							  "This message could not be sent because the conversation is no longer active: " + aMsg,
							  {system: true, error: true});
			return;
		}

		this.writeMessage("You", aMsg, {outgoing: true});
		this.account.lobot.told(this.account, this, new Message("You", aMsg, {outgoing: true}));
	},

	get name() "Lobot"
};
Conversation.prototype.__proto__ = GenericConversationPrototype;

function Account(aProtoInstance, aKey, aName) {
	this._init(aProtoInstance, aKey, aName);
	this.lobot = new Lobot([helloWorld, logger]);
}
Account.prototype = {
	connect: function() {
		this.base.connecting();
		// do something here
		this.base.connected();
		let self = this;
		setTimeout(function() {
			self._conv = new Conversation(self);
			self._conv.writeMessage("Lobot", "You are now talking to Lobot.", {system: true});
			// Probably want out to output a bunch of stuff here
		}, 0);
	},
	_conv: null,
	disconnect: function(aSilent) {
		this.base.disconnecting(this._base.NO_ERROR, "");
		if (!aSilent)
			this._conv.writeMessage("Lobot", "You have disconnected.", {system: true});
		if (this._conv) {
			this._conv._setDisconnected();
			delete this._conv;
		}
		this.base.disconnected();
	}

};
Account.prototype.__proto__ = GenericAccountPrototype;

function lobotProtocol() {}
lobotProtocol.prototype = {
	get name() "Lobot",
	//loadAccount: function(aKey) new Account(this, aKey),
	//createAccount: function(aName, aKey) new Account(this, aKey, aName),
	getAccount: function(aKey, aName) new Account(this, aKey, aName),
	classID: Components.ID("{a04b520c-0a0a-441e-8dab-6adc5b7a7587}"),
};
lobotProtocol.prototype.__proto__ = GenericProtocolPrototype;

var NSGetModule = XPCOMUtils.generateNSGetModule([lobotProtocol]);
