window.WAPI = {};

/**
 * Serializes a raw object
 *
 * Selenium likes to strip "private" properties (not sure why)
 * This function adds a wapi_ prefix to all property names so they don't disappear
 *
 * This function naively ignores non primitive types
 *
 * @param rawObj Object to serialize
 * @returns {{}}
 * @private
 */
window.WAPI._serializeRawObj = function (rawObj) {
    let obj = {};
    for (const property in rawObj) {
        if (rawObj[property] !== Object(rawObj[property])) {
            obj["wapi_" + property] = rawObj[property];
        }
    }

    return obj;
};

/**
 * Serializes a chat object
 *
 * @param rawChat Chat object
 * @returns {{}}
 */
window.WAPI.serializeChat = function (rawChat) {
    let chat = {};

    let name = null;
    if (rawChat.__x_name !== undefined) {
        name = rawChat.__x_name;
    } else {
        if (rawChat.__x_formattedName !== undefined) {
            name = rawChat.__x_formattedName;
        } else {
            if (rawChat.__x_formattedTitle !== undefined) {
                name = rawChat.__x_formattedTitle;
            }
        }
    }

    chat.name = name;
    chat.id = rawChat.__x_id;
    chat.isGroup = rawChat.isGroup;
    chat._raw = WAPI._serializeRawObj(rawChat);

    return chat;
};

/**
 * Serializes a message object
 *
 * @param rawMessage Message object
 * @param sender Sender object
 * @returns {{}}
 */
window.WAPI.serializeMessage = function (rawMessage, sender) {
    let message = {};
    message.content = rawMessage.__x_body;
    message.timestamp = rawMessage.__x_t;
    message.sender = sender;
    message._raw = WAPI._serializeRawObj(rawMessage);

    return message;
};

/**
 * Gets list of contacts
 *
 * @returns {Array}
 */
window.WAPI.getContacts = function () {
    const contacts = window.Store.Contact.models;

    let output = [];

    for (const contact in contacts) {
        if (contacts[contact].isMyContact === true) {
            output.push(WAPI.serializeChat(contacts[contact]));
        }
    }

    console.log(output[0]._raw);

    return output;
};

/**
 * Gets object representing the logged in user
 *
 * @returns {{}}
 */
window.WAPI.getMe = function () {
    const contacts = window.Store.Contact.models;

    const rawMe = contacts.find((contact, _, __) => contact.__x_formattedName === "You", contacts);

    return WAPI.serializeChat(rawMe);
};

window.WAPI._getChat = function(id) {
    const chats = Store.Chat.models;

    return chats.find((contact, _, __) => contact.__x_id === id, chats);
};

window.WAPI.getChat = (id) => WAPI.serializeChat(WAPI._getChat(id));

window.WAPI.getAllMessagesInChat = function (id, includeMe) {
    const chat = WAPI._getChat(id);

    let output = [];

    const messages = chat.msgs.models;
    for (const i in messages) {
        if (i === "remove") {
            continue;
        }

        const messageObj = messages[i];

        if (messageObj.__x_isNotification) {
            // System message
            // (i.e. "Messages you send to this chat and calls are now secured with end-to-end encryption...")
            continue;
        }

        if (messageObj.id.fromMe === false || includeMe) {
            let sender = WAPI.serializeChat(messageObj.__x_senderObj);
            let message = WAPI.serializeMessage(messageObj, sender);

            output.push(message);
        }
    }

    last_read[chat.__x_formattedTitle] = Math.floor(Date.now() / 1000);

    return output;
};