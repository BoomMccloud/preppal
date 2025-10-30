/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.interview_prep = (function() {

    /**
     * Namespace interview_prep.
     * @exports interview_prep
     * @namespace
     */
    var interview_prep = {};

    interview_prep.v1 = (function() {

        /**
         * Namespace v1.
         * @memberof interview_prep
         * @namespace
         */
        var v1 = {};

        v1.ClientToServerMessage = (function() {

            /**
             * Properties of a ClientToServerMessage.
             * @memberof interview_prep.v1
             * @interface IClientToServerMessage
             * @property {interview_prep.v1.IStartRequest|null} [startRequest] ClientToServerMessage startRequest
             * @property {interview_prep.v1.IAudioChunk|null} [audioChunk] ClientToServerMessage audioChunk
             * @property {interview_prep.v1.IEndRequest|null} [endRequest] ClientToServerMessage endRequest
             */

            /**
             * Constructs a new ClientToServerMessage.
             * @memberof interview_prep.v1
             * @classdesc Represents a ClientToServerMessage.
             * @implements IClientToServerMessage
             * @constructor
             * @param {interview_prep.v1.IClientToServerMessage=} [properties] Properties to set
             */
            function ClientToServerMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ClientToServerMessage startRequest.
             * @member {interview_prep.v1.IStartRequest|null|undefined} startRequest
             * @memberof interview_prep.v1.ClientToServerMessage
             * @instance
             */
            ClientToServerMessage.prototype.startRequest = null;

            /**
             * ClientToServerMessage audioChunk.
             * @member {interview_prep.v1.IAudioChunk|null|undefined} audioChunk
             * @memberof interview_prep.v1.ClientToServerMessage
             * @instance
             */
            ClientToServerMessage.prototype.audioChunk = null;

            /**
             * ClientToServerMessage endRequest.
             * @member {interview_prep.v1.IEndRequest|null|undefined} endRequest
             * @memberof interview_prep.v1.ClientToServerMessage
             * @instance
             */
            ClientToServerMessage.prototype.endRequest = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * ClientToServerMessage payload.
             * @member {"startRequest"|"audioChunk"|"endRequest"|undefined} payload
             * @memberof interview_prep.v1.ClientToServerMessage
             * @instance
             */
            Object.defineProperty(ClientToServerMessage.prototype, "payload", {
                get: $util.oneOfGetter($oneOfFields = ["startRequest", "audioChunk", "endRequest"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new ClientToServerMessage instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {interview_prep.v1.IClientToServerMessage=} [properties] Properties to set
             * @returns {interview_prep.v1.ClientToServerMessage} ClientToServerMessage instance
             */
            ClientToServerMessage.create = function create(properties) {
                return new ClientToServerMessage(properties);
            };

            /**
             * Encodes the specified ClientToServerMessage message. Does not implicitly {@link interview_prep.v1.ClientToServerMessage.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {interview_prep.v1.IClientToServerMessage} message ClientToServerMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClientToServerMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.startRequest != null && Object.hasOwnProperty.call(message, "startRequest"))
                    $root.interview_prep.v1.StartRequest.encode(message.startRequest, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.audioChunk != null && Object.hasOwnProperty.call(message, "audioChunk"))
                    $root.interview_prep.v1.AudioChunk.encode(message.audioChunk, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.endRequest != null && Object.hasOwnProperty.call(message, "endRequest"))
                    $root.interview_prep.v1.EndRequest.encode(message.endRequest, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ClientToServerMessage message, length delimited. Does not implicitly {@link interview_prep.v1.ClientToServerMessage.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {interview_prep.v1.IClientToServerMessage} message ClientToServerMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ClientToServerMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ClientToServerMessage message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.ClientToServerMessage} ClientToServerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClientToServerMessage.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.ClientToServerMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.startRequest = $root.interview_prep.v1.StartRequest.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.audioChunk = $root.interview_prep.v1.AudioChunk.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.endRequest = $root.interview_prep.v1.EndRequest.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ClientToServerMessage message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.ClientToServerMessage} ClientToServerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ClientToServerMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ClientToServerMessage message.
             * @function verify
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ClientToServerMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message.startRequest != null && message.hasOwnProperty("startRequest")) {
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.StartRequest.verify(message.startRequest);
                        if (error)
                            return "startRequest." + error;
                    }
                }
                if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.AudioChunk.verify(message.audioChunk);
                        if (error)
                            return "audioChunk." + error;
                    }
                }
                if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.EndRequest.verify(message.endRequest);
                        if (error)
                            return "endRequest." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a ClientToServerMessage message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.ClientToServerMessage} ClientToServerMessage
             */
            ClientToServerMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.ClientToServerMessage)
                    return object;
                var message = new $root.interview_prep.v1.ClientToServerMessage();
                if (object.startRequest != null) {
                    if (typeof object.startRequest !== "object")
                        throw TypeError(".interview_prep.v1.ClientToServerMessage.startRequest: object expected");
                    message.startRequest = $root.interview_prep.v1.StartRequest.fromObject(object.startRequest);
                }
                if (object.audioChunk != null) {
                    if (typeof object.audioChunk !== "object")
                        throw TypeError(".interview_prep.v1.ClientToServerMessage.audioChunk: object expected");
                    message.audioChunk = $root.interview_prep.v1.AudioChunk.fromObject(object.audioChunk);
                }
                if (object.endRequest != null) {
                    if (typeof object.endRequest !== "object")
                        throw TypeError(".interview_prep.v1.ClientToServerMessage.endRequest: object expected");
                    message.endRequest = $root.interview_prep.v1.EndRequest.fromObject(object.endRequest);
                }
                return message;
            };

            /**
             * Creates a plain object from a ClientToServerMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {interview_prep.v1.ClientToServerMessage} message ClientToServerMessage
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ClientToServerMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (message.startRequest != null && message.hasOwnProperty("startRequest")) {
                    object.startRequest = $root.interview_prep.v1.StartRequest.toObject(message.startRequest, options);
                    if (options.oneofs)
                        object.payload = "startRequest";
                }
                if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                    object.audioChunk = $root.interview_prep.v1.AudioChunk.toObject(message.audioChunk, options);
                    if (options.oneofs)
                        object.payload = "audioChunk";
                }
                if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
                    object.endRequest = $root.interview_prep.v1.EndRequest.toObject(message.endRequest, options);
                    if (options.oneofs)
                        object.payload = "endRequest";
                }
                return object;
            };

            /**
             * Converts this ClientToServerMessage to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.ClientToServerMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ClientToServerMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ClientToServerMessage
             * @function getTypeUrl
             * @memberof interview_prep.v1.ClientToServerMessage
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ClientToServerMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.ClientToServerMessage";
            };

            return ClientToServerMessage;
        })();

        v1.ServerToClientMessage = (function() {

            /**
             * Properties of a ServerToClientMessage.
             * @memberof interview_prep.v1
             * @interface IServerToClientMessage
             * @property {interview_prep.v1.IStartResponse|null} [startResponse] ServerToClientMessage startResponse
             * @property {interview_prep.v1.IAudioChunk|null} [audioChunk] ServerToClientMessage audioChunk
             * @property {interview_prep.v1.IPartialTranscript|null} [partialTranscript] ServerToClientMessage partialTranscript
             * @property {interview_prep.v1.ISessionEnded|null} [sessionEnded] ServerToClientMessage sessionEnded
             * @property {interview_prep.v1.IError|null} [error] ServerToClientMessage error
             */

            /**
             * Constructs a new ServerToClientMessage.
             * @memberof interview_prep.v1
             * @classdesc Represents a ServerToClientMessage.
             * @implements IServerToClientMessage
             * @constructor
             * @param {interview_prep.v1.IServerToClientMessage=} [properties] Properties to set
             */
            function ServerToClientMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ServerToClientMessage startResponse.
             * @member {interview_prep.v1.IStartResponse|null|undefined} startResponse
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            ServerToClientMessage.prototype.startResponse = null;

            /**
             * ServerToClientMessage audioChunk.
             * @member {interview_prep.v1.IAudioChunk|null|undefined} audioChunk
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            ServerToClientMessage.prototype.audioChunk = null;

            /**
             * ServerToClientMessage partialTranscript.
             * @member {interview_prep.v1.IPartialTranscript|null|undefined} partialTranscript
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            ServerToClientMessage.prototype.partialTranscript = null;

            /**
             * ServerToClientMessage sessionEnded.
             * @member {interview_prep.v1.ISessionEnded|null|undefined} sessionEnded
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            ServerToClientMessage.prototype.sessionEnded = null;

            /**
             * ServerToClientMessage error.
             * @member {interview_prep.v1.IError|null|undefined} error
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            ServerToClientMessage.prototype.error = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * ServerToClientMessage payload.
             * @member {"startResponse"|"audioChunk"|"partialTranscript"|"sessionEnded"|"error"|undefined} payload
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             */
            Object.defineProperty(ServerToClientMessage.prototype, "payload", {
                get: $util.oneOfGetter($oneOfFields = ["startResponse", "audioChunk", "partialTranscript", "sessionEnded", "error"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Creates a new ServerToClientMessage instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {interview_prep.v1.IServerToClientMessage=} [properties] Properties to set
             * @returns {interview_prep.v1.ServerToClientMessage} ServerToClientMessage instance
             */
            ServerToClientMessage.create = function create(properties) {
                return new ServerToClientMessage(properties);
            };

            /**
             * Encodes the specified ServerToClientMessage message. Does not implicitly {@link interview_prep.v1.ServerToClientMessage.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {interview_prep.v1.IServerToClientMessage} message ServerToClientMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ServerToClientMessage.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.startResponse != null && Object.hasOwnProperty.call(message, "startResponse"))
                    $root.interview_prep.v1.StartResponse.encode(message.startResponse, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.audioChunk != null && Object.hasOwnProperty.call(message, "audioChunk"))
                    $root.interview_prep.v1.AudioChunk.encode(message.audioChunk, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.partialTranscript != null && Object.hasOwnProperty.call(message, "partialTranscript"))
                    $root.interview_prep.v1.PartialTranscript.encode(message.partialTranscript, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.sessionEnded != null && Object.hasOwnProperty.call(message, "sessionEnded"))
                    $root.interview_prep.v1.SessionEnded.encode(message.sessionEnded, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                    $root.interview_prep.v1.Error.encode(message.error, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ServerToClientMessage message, length delimited. Does not implicitly {@link interview_prep.v1.ServerToClientMessage.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {interview_prep.v1.IServerToClientMessage} message ServerToClientMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ServerToClientMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a ServerToClientMessage message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.ServerToClientMessage} ServerToClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ServerToClientMessage.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.ServerToClientMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.startResponse = $root.interview_prep.v1.StartResponse.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.audioChunk = $root.interview_prep.v1.AudioChunk.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.partialTranscript = $root.interview_prep.v1.PartialTranscript.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.sessionEnded = $root.interview_prep.v1.SessionEnded.decode(reader, reader.uint32());
                            break;
                        }
                    case 5: {
                            message.error = $root.interview_prep.v1.Error.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ServerToClientMessage message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.ServerToClientMessage} ServerToClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ServerToClientMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ServerToClientMessage message.
             * @function verify
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ServerToClientMessage.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                var properties = {};
                if (message.startResponse != null && message.hasOwnProperty("startResponse")) {
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.StartResponse.verify(message.startResponse);
                        if (error)
                            return "startResponse." + error;
                    }
                }
                if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.AudioChunk.verify(message.audioChunk);
                        if (error)
                            return "audioChunk." + error;
                    }
                }
                if (message.partialTranscript != null && message.hasOwnProperty("partialTranscript")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.PartialTranscript.verify(message.partialTranscript);
                        if (error)
                            return "partialTranscript." + error;
                    }
                }
                if (message.sessionEnded != null && message.hasOwnProperty("sessionEnded")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.SessionEnded.verify(message.sessionEnded);
                        if (error)
                            return "sessionEnded." + error;
                    }
                }
                if (message.error != null && message.hasOwnProperty("error")) {
                    if (properties.payload === 1)
                        return "payload: multiple values";
                    properties.payload = 1;
                    {
                        var error = $root.interview_prep.v1.Error.verify(message.error);
                        if (error)
                            return "error." + error;
                    }
                }
                return null;
            };

            /**
             * Creates a ServerToClientMessage message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.ServerToClientMessage} ServerToClientMessage
             */
            ServerToClientMessage.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.ServerToClientMessage)
                    return object;
                var message = new $root.interview_prep.v1.ServerToClientMessage();
                if (object.startResponse != null) {
                    if (typeof object.startResponse !== "object")
                        throw TypeError(".interview_prep.v1.ServerToClientMessage.startResponse: object expected");
                    message.startResponse = $root.interview_prep.v1.StartResponse.fromObject(object.startResponse);
                }
                if (object.audioChunk != null) {
                    if (typeof object.audioChunk !== "object")
                        throw TypeError(".interview_prep.v1.ServerToClientMessage.audioChunk: object expected");
                    message.audioChunk = $root.interview_prep.v1.AudioChunk.fromObject(object.audioChunk);
                }
                if (object.partialTranscript != null) {
                    if (typeof object.partialTranscript !== "object")
                        throw TypeError(".interview_prep.v1.ServerToClientMessage.partialTranscript: object expected");
                    message.partialTranscript = $root.interview_prep.v1.PartialTranscript.fromObject(object.partialTranscript);
                }
                if (object.sessionEnded != null) {
                    if (typeof object.sessionEnded !== "object")
                        throw TypeError(".interview_prep.v1.ServerToClientMessage.sessionEnded: object expected");
                    message.sessionEnded = $root.interview_prep.v1.SessionEnded.fromObject(object.sessionEnded);
                }
                if (object.error != null) {
                    if (typeof object.error !== "object")
                        throw TypeError(".interview_prep.v1.ServerToClientMessage.error: object expected");
                    message.error = $root.interview_prep.v1.Error.fromObject(object.error);
                }
                return message;
            };

            /**
             * Creates a plain object from a ServerToClientMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {interview_prep.v1.ServerToClientMessage} message ServerToClientMessage
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ServerToClientMessage.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (message.startResponse != null && message.hasOwnProperty("startResponse")) {
                    object.startResponse = $root.interview_prep.v1.StartResponse.toObject(message.startResponse, options);
                    if (options.oneofs)
                        object.payload = "startResponse";
                }
                if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                    object.audioChunk = $root.interview_prep.v1.AudioChunk.toObject(message.audioChunk, options);
                    if (options.oneofs)
                        object.payload = "audioChunk";
                }
                if (message.partialTranscript != null && message.hasOwnProperty("partialTranscript")) {
                    object.partialTranscript = $root.interview_prep.v1.PartialTranscript.toObject(message.partialTranscript, options);
                    if (options.oneofs)
                        object.payload = "partialTranscript";
                }
                if (message.sessionEnded != null && message.hasOwnProperty("sessionEnded")) {
                    object.sessionEnded = $root.interview_prep.v1.SessionEnded.toObject(message.sessionEnded, options);
                    if (options.oneofs)
                        object.payload = "sessionEnded";
                }
                if (message.error != null && message.hasOwnProperty("error")) {
                    object.error = $root.interview_prep.v1.Error.toObject(message.error, options);
                    if (options.oneofs)
                        object.payload = "error";
                }
                return object;
            };

            /**
             * Converts this ServerToClientMessage to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.ServerToClientMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ServerToClientMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ServerToClientMessage
             * @function getTypeUrl
             * @memberof interview_prep.v1.ServerToClientMessage
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ServerToClientMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.ServerToClientMessage";
            };

            return ServerToClientMessage;
        })();

        v1.StartRequest = (function() {

            /**
             * Properties of a StartRequest.
             * @memberof interview_prep.v1
             * @interface IStartRequest
             * @property {string|null} [authToken] StartRequest authToken
             * @property {string|null} [interviewId] StartRequest interviewId
             * @property {interview_prep.v1.IAudioConfig|null} [audioConfig] StartRequest audioConfig
             */

            /**
             * Constructs a new StartRequest.
             * @memberof interview_prep.v1
             * @classdesc Represents a StartRequest.
             * @implements IStartRequest
             * @constructor
             * @param {interview_prep.v1.IStartRequest=} [properties] Properties to set
             */
            function StartRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * StartRequest authToken.
             * @member {string} authToken
             * @memberof interview_prep.v1.StartRequest
             * @instance
             */
            StartRequest.prototype.authToken = "";

            /**
             * StartRequest interviewId.
             * @member {string} interviewId
             * @memberof interview_prep.v1.StartRequest
             * @instance
             */
            StartRequest.prototype.interviewId = "";

            /**
             * StartRequest audioConfig.
             * @member {interview_prep.v1.IAudioConfig|null|undefined} audioConfig
             * @memberof interview_prep.v1.StartRequest
             * @instance
             */
            StartRequest.prototype.audioConfig = null;

            /**
             * Creates a new StartRequest instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {interview_prep.v1.IStartRequest=} [properties] Properties to set
             * @returns {interview_prep.v1.StartRequest} StartRequest instance
             */
            StartRequest.create = function create(properties) {
                return new StartRequest(properties);
            };

            /**
             * Encodes the specified StartRequest message. Does not implicitly {@link interview_prep.v1.StartRequest.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {interview_prep.v1.IStartRequest} message StartRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StartRequest.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.authToken != null && Object.hasOwnProperty.call(message, "authToken"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.authToken);
                if (message.interviewId != null && Object.hasOwnProperty.call(message, "interviewId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.interviewId);
                if (message.audioConfig != null && Object.hasOwnProperty.call(message, "audioConfig"))
                    $root.interview_prep.v1.AudioConfig.encode(message.audioConfig, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified StartRequest message, length delimited. Does not implicitly {@link interview_prep.v1.StartRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {interview_prep.v1.IStartRequest} message StartRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StartRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a StartRequest message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.StartRequest} StartRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StartRequest.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.StartRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.authToken = reader.string();
                            break;
                        }
                    case 2: {
                            message.interviewId = reader.string();
                            break;
                        }
                    case 3: {
                            message.audioConfig = $root.interview_prep.v1.AudioConfig.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a StartRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.StartRequest} StartRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StartRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a StartRequest message.
             * @function verify
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            StartRequest.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.authToken != null && message.hasOwnProperty("authToken"))
                    if (!$util.isString(message.authToken))
                        return "authToken: string expected";
                if (message.interviewId != null && message.hasOwnProperty("interviewId"))
                    if (!$util.isString(message.interviewId))
                        return "interviewId: string expected";
                if (message.audioConfig != null && message.hasOwnProperty("audioConfig")) {
                    var error = $root.interview_prep.v1.AudioConfig.verify(message.audioConfig);
                    if (error)
                        return "audioConfig." + error;
                }
                return null;
            };

            /**
             * Creates a StartRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.StartRequest} StartRequest
             */
            StartRequest.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.StartRequest)
                    return object;
                var message = new $root.interview_prep.v1.StartRequest();
                if (object.authToken != null)
                    message.authToken = String(object.authToken);
                if (object.interviewId != null)
                    message.interviewId = String(object.interviewId);
                if (object.audioConfig != null) {
                    if (typeof object.audioConfig !== "object")
                        throw TypeError(".interview_prep.v1.StartRequest.audioConfig: object expected");
                    message.audioConfig = $root.interview_prep.v1.AudioConfig.fromObject(object.audioConfig);
                }
                return message;
            };

            /**
             * Creates a plain object from a StartRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {interview_prep.v1.StartRequest} message StartRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            StartRequest.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.authToken = "";
                    object.interviewId = "";
                    object.audioConfig = null;
                }
                if (message.authToken != null && message.hasOwnProperty("authToken"))
                    object.authToken = message.authToken;
                if (message.interviewId != null && message.hasOwnProperty("interviewId"))
                    object.interviewId = message.interviewId;
                if (message.audioConfig != null && message.hasOwnProperty("audioConfig"))
                    object.audioConfig = $root.interview_prep.v1.AudioConfig.toObject(message.audioConfig, options);
                return object;
            };

            /**
             * Converts this StartRequest to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.StartRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            StartRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for StartRequest
             * @function getTypeUrl
             * @memberof interview_prep.v1.StartRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            StartRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.StartRequest";
            };

            return StartRequest;
        })();

        v1.StartResponse = (function() {

            /**
             * Properties of a StartResponse.
             * @memberof interview_prep.v1
             * @interface IStartResponse
             * @property {string|null} [sessionId] StartResponse sessionId
             */

            /**
             * Constructs a new StartResponse.
             * @memberof interview_prep.v1
             * @classdesc Represents a StartResponse.
             * @implements IStartResponse
             * @constructor
             * @param {interview_prep.v1.IStartResponse=} [properties] Properties to set
             */
            function StartResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * StartResponse sessionId.
             * @member {string} sessionId
             * @memberof interview_prep.v1.StartResponse
             * @instance
             */
            StartResponse.prototype.sessionId = "";

            /**
             * Creates a new StartResponse instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {interview_prep.v1.IStartResponse=} [properties] Properties to set
             * @returns {interview_prep.v1.StartResponse} StartResponse instance
             */
            StartResponse.create = function create(properties) {
                return new StartResponse(properties);
            };

            /**
             * Encodes the specified StartResponse message. Does not implicitly {@link interview_prep.v1.StartResponse.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {interview_prep.v1.IStartResponse} message StartResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StartResponse.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.sessionId != null && Object.hasOwnProperty.call(message, "sessionId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
                return writer;
            };

            /**
             * Encodes the specified StartResponse message, length delimited. Does not implicitly {@link interview_prep.v1.StartResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {interview_prep.v1.IStartResponse} message StartResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            StartResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a StartResponse message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.StartResponse} StartResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StartResponse.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.StartResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.sessionId = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a StartResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.StartResponse} StartResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            StartResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a StartResponse message.
             * @function verify
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            StartResponse.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.sessionId != null && message.hasOwnProperty("sessionId"))
                    if (!$util.isString(message.sessionId))
                        return "sessionId: string expected";
                return null;
            };

            /**
             * Creates a StartResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.StartResponse} StartResponse
             */
            StartResponse.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.StartResponse)
                    return object;
                var message = new $root.interview_prep.v1.StartResponse();
                if (object.sessionId != null)
                    message.sessionId = String(object.sessionId);
                return message;
            };

            /**
             * Creates a plain object from a StartResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {interview_prep.v1.StartResponse} message StartResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            StartResponse.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    object.sessionId = "";
                if (message.sessionId != null && message.hasOwnProperty("sessionId"))
                    object.sessionId = message.sessionId;
                return object;
            };

            /**
             * Converts this StartResponse to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.StartResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            StartResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for StartResponse
             * @function getTypeUrl
             * @memberof interview_prep.v1.StartResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            StartResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.StartResponse";
            };

            return StartResponse;
        })();

        v1.AudioChunk = (function() {

            /**
             * Properties of an AudioChunk.
             * @memberof interview_prep.v1
             * @interface IAudioChunk
             * @property {Uint8Array|null} [audioContent] AudioChunk audioContent
             */

            /**
             * Constructs a new AudioChunk.
             * @memberof interview_prep.v1
             * @classdesc Represents an AudioChunk.
             * @implements IAudioChunk
             * @constructor
             * @param {interview_prep.v1.IAudioChunk=} [properties] Properties to set
             */
            function AudioChunk(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AudioChunk audioContent.
             * @member {Uint8Array} audioContent
             * @memberof interview_prep.v1.AudioChunk
             * @instance
             */
            AudioChunk.prototype.audioContent = $util.newBuffer([]);

            /**
             * Creates a new AudioChunk instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {interview_prep.v1.IAudioChunk=} [properties] Properties to set
             * @returns {interview_prep.v1.AudioChunk} AudioChunk instance
             */
            AudioChunk.create = function create(properties) {
                return new AudioChunk(properties);
            };

            /**
             * Encodes the specified AudioChunk message. Does not implicitly {@link interview_prep.v1.AudioChunk.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {interview_prep.v1.IAudioChunk} message AudioChunk message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AudioChunk.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.audioContent != null && Object.hasOwnProperty.call(message, "audioContent"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.audioContent);
                return writer;
            };

            /**
             * Encodes the specified AudioChunk message, length delimited. Does not implicitly {@link interview_prep.v1.AudioChunk.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {interview_prep.v1.IAudioChunk} message AudioChunk message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AudioChunk.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AudioChunk message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.AudioChunk} AudioChunk
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AudioChunk.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.AudioChunk();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.audioContent = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an AudioChunk message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.AudioChunk} AudioChunk
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AudioChunk.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AudioChunk message.
             * @function verify
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AudioChunk.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.audioContent != null && message.hasOwnProperty("audioContent"))
                    if (!(message.audioContent && typeof message.audioContent.length === "number" || $util.isString(message.audioContent)))
                        return "audioContent: buffer expected";
                return null;
            };

            /**
             * Creates an AudioChunk message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.AudioChunk} AudioChunk
             */
            AudioChunk.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.AudioChunk)
                    return object;
                var message = new $root.interview_prep.v1.AudioChunk();
                if (object.audioContent != null)
                    if (typeof object.audioContent === "string")
                        $util.base64.decode(object.audioContent, message.audioContent = $util.newBuffer($util.base64.length(object.audioContent)), 0);
                    else if (object.audioContent.length >= 0)
                        message.audioContent = object.audioContent;
                return message;
            };

            /**
             * Creates a plain object from an AudioChunk message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {interview_prep.v1.AudioChunk} message AudioChunk
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AudioChunk.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults)
                    if (options.bytes === String)
                        object.audioContent = "";
                    else {
                        object.audioContent = [];
                        if (options.bytes !== Array)
                            object.audioContent = $util.newBuffer(object.audioContent);
                    }
                if (message.audioContent != null && message.hasOwnProperty("audioContent"))
                    object.audioContent = options.bytes === String ? $util.base64.encode(message.audioContent, 0, message.audioContent.length) : options.bytes === Array ? Array.prototype.slice.call(message.audioContent) : message.audioContent;
                return object;
            };

            /**
             * Converts this AudioChunk to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.AudioChunk
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AudioChunk.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AudioChunk
             * @function getTypeUrl
             * @memberof interview_prep.v1.AudioChunk
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AudioChunk.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.AudioChunk";
            };

            return AudioChunk;
        })();

        v1.EndRequest = (function() {

            /**
             * Properties of an EndRequest.
             * @memberof interview_prep.v1
             * @interface IEndRequest
             */

            /**
             * Constructs a new EndRequest.
             * @memberof interview_prep.v1
             * @classdesc Represents an EndRequest.
             * @implements IEndRequest
             * @constructor
             * @param {interview_prep.v1.IEndRequest=} [properties] Properties to set
             */
            function EndRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Creates a new EndRequest instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {interview_prep.v1.IEndRequest=} [properties] Properties to set
             * @returns {interview_prep.v1.EndRequest} EndRequest instance
             */
            EndRequest.create = function create(properties) {
                return new EndRequest(properties);
            };

            /**
             * Encodes the specified EndRequest message. Does not implicitly {@link interview_prep.v1.EndRequest.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {interview_prep.v1.IEndRequest} message EndRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EndRequest.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Encodes the specified EndRequest message, length delimited. Does not implicitly {@link interview_prep.v1.EndRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {interview_prep.v1.IEndRequest} message EndRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EndRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an EndRequest message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.EndRequest} EndRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EndRequest.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.EndRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EndRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.EndRequest} EndRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EndRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EndRequest message.
             * @function verify
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EndRequest.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                return null;
            };

            /**
             * Creates an EndRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.EndRequest} EndRequest
             */
            EndRequest.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.EndRequest)
                    return object;
                return new $root.interview_prep.v1.EndRequest();
            };

            /**
             * Creates a plain object from an EndRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {interview_prep.v1.EndRequest} message EndRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EndRequest.toObject = function toObject() {
                return {};
            };

            /**
             * Converts this EndRequest to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.EndRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EndRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EndRequest
             * @function getTypeUrl
             * @memberof interview_prep.v1.EndRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EndRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.EndRequest";
            };

            return EndRequest;
        })();

        v1.PartialTranscript = (function() {

            /**
             * Properties of a PartialTranscript.
             * @memberof interview_prep.v1
             * @interface IPartialTranscript
             * @property {string|null} [text] PartialTranscript text
             * @property {interview_prep.v1.Speaker|null} [speaker] PartialTranscript speaker
             * @property {boolean|null} [isFinal] PartialTranscript isFinal
             */

            /**
             * Constructs a new PartialTranscript.
             * @memberof interview_prep.v1
             * @classdesc Represents a PartialTranscript.
             * @implements IPartialTranscript
             * @constructor
             * @param {interview_prep.v1.IPartialTranscript=} [properties] Properties to set
             */
            function PartialTranscript(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PartialTranscript text.
             * @member {string} text
             * @memberof interview_prep.v1.PartialTranscript
             * @instance
             */
            PartialTranscript.prototype.text = "";

            /**
             * PartialTranscript speaker.
             * @member {interview_prep.v1.Speaker} speaker
             * @memberof interview_prep.v1.PartialTranscript
             * @instance
             */
            PartialTranscript.prototype.speaker = 0;

            /**
             * PartialTranscript isFinal.
             * @member {boolean} isFinal
             * @memberof interview_prep.v1.PartialTranscript
             * @instance
             */
            PartialTranscript.prototype.isFinal = false;

            /**
             * Creates a new PartialTranscript instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {interview_prep.v1.IPartialTranscript=} [properties] Properties to set
             * @returns {interview_prep.v1.PartialTranscript} PartialTranscript instance
             */
            PartialTranscript.create = function create(properties) {
                return new PartialTranscript(properties);
            };

            /**
             * Encodes the specified PartialTranscript message. Does not implicitly {@link interview_prep.v1.PartialTranscript.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {interview_prep.v1.IPartialTranscript} message PartialTranscript message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PartialTranscript.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.text);
                if (message.speaker != null && Object.hasOwnProperty.call(message, "speaker"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.speaker);
                if (message.isFinal != null && Object.hasOwnProperty.call(message, "isFinal"))
                    writer.uint32(/* id 3, wireType 0 =*/24).bool(message.isFinal);
                return writer;
            };

            /**
             * Encodes the specified PartialTranscript message, length delimited. Does not implicitly {@link interview_prep.v1.PartialTranscript.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {interview_prep.v1.IPartialTranscript} message PartialTranscript message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PartialTranscript.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a PartialTranscript message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.PartialTranscript} PartialTranscript
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PartialTranscript.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.PartialTranscript();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.text = reader.string();
                            break;
                        }
                    case 2: {
                            message.speaker = reader.int32();
                            break;
                        }
                    case 3: {
                            message.isFinal = reader.bool();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PartialTranscript message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.PartialTranscript} PartialTranscript
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PartialTranscript.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PartialTranscript message.
             * @function verify
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PartialTranscript.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.text != null && message.hasOwnProperty("text"))
                    if (!$util.isString(message.text))
                        return "text: string expected";
                if (message.speaker != null && message.hasOwnProperty("speaker"))
                    switch (message.speaker) {
                    default:
                        return "speaker: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                if (message.isFinal != null && message.hasOwnProperty("isFinal"))
                    if (typeof message.isFinal !== "boolean")
                        return "isFinal: boolean expected";
                return null;
            };

            /**
             * Creates a PartialTranscript message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.PartialTranscript} PartialTranscript
             */
            PartialTranscript.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.PartialTranscript)
                    return object;
                var message = new $root.interview_prep.v1.PartialTranscript();
                if (object.text != null)
                    message.text = String(object.text);
                switch (object.speaker) {
                default:
                    if (typeof object.speaker === "number") {
                        message.speaker = object.speaker;
                        break;
                    }
                    break;
                case "SPEAKER_UNSPECIFIED":
                case 0:
                    message.speaker = 0;
                    break;
                case "USER":
                case 1:
                    message.speaker = 1;
                    break;
                case "AI":
                case 2:
                    message.speaker = 2;
                    break;
                }
                if (object.isFinal != null)
                    message.isFinal = Boolean(object.isFinal);
                return message;
            };

            /**
             * Creates a plain object from a PartialTranscript message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {interview_prep.v1.PartialTranscript} message PartialTranscript
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PartialTranscript.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.text = "";
                    object.speaker = options.enums === String ? "SPEAKER_UNSPECIFIED" : 0;
                    object.isFinal = false;
                }
                if (message.text != null && message.hasOwnProperty("text"))
                    object.text = message.text;
                if (message.speaker != null && message.hasOwnProperty("speaker"))
                    object.speaker = options.enums === String ? $root.interview_prep.v1.Speaker[message.speaker] === undefined ? message.speaker : $root.interview_prep.v1.Speaker[message.speaker] : message.speaker;
                if (message.isFinal != null && message.hasOwnProperty("isFinal"))
                    object.isFinal = message.isFinal;
                return object;
            };

            /**
             * Converts this PartialTranscript to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.PartialTranscript
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PartialTranscript.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PartialTranscript
             * @function getTypeUrl
             * @memberof interview_prep.v1.PartialTranscript
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PartialTranscript.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.PartialTranscript";
            };

            return PartialTranscript;
        })();

        v1.SessionEnded = (function() {

            /**
             * Properties of a SessionEnded.
             * @memberof interview_prep.v1
             * @interface ISessionEnded
             * @property {interview_prep.v1.SessionEnded.Reason|null} [reason] SessionEnded reason
             * @property {string|null} [message] SessionEnded message
             */

            /**
             * Constructs a new SessionEnded.
             * @memberof interview_prep.v1
             * @classdesc Represents a SessionEnded.
             * @implements ISessionEnded
             * @constructor
             * @param {interview_prep.v1.ISessionEnded=} [properties] Properties to set
             */
            function SessionEnded(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SessionEnded reason.
             * @member {interview_prep.v1.SessionEnded.Reason} reason
             * @memberof interview_prep.v1.SessionEnded
             * @instance
             */
            SessionEnded.prototype.reason = 0;

            /**
             * SessionEnded message.
             * @member {string} message
             * @memberof interview_prep.v1.SessionEnded
             * @instance
             */
            SessionEnded.prototype.message = "";

            /**
             * Creates a new SessionEnded instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {interview_prep.v1.ISessionEnded=} [properties] Properties to set
             * @returns {interview_prep.v1.SessionEnded} SessionEnded instance
             */
            SessionEnded.create = function create(properties) {
                return new SessionEnded(properties);
            };

            /**
             * Encodes the specified SessionEnded message. Does not implicitly {@link interview_prep.v1.SessionEnded.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {interview_prep.v1.ISessionEnded} message SessionEnded message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SessionEnded.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.reason);
                if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                return writer;
            };

            /**
             * Encodes the specified SessionEnded message, length delimited. Does not implicitly {@link interview_prep.v1.SessionEnded.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {interview_prep.v1.ISessionEnded} message SessionEnded message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SessionEnded.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a SessionEnded message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.SessionEnded} SessionEnded
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SessionEnded.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.SessionEnded();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.reason = reader.int32();
                            break;
                        }
                    case 2: {
                            message.message = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SessionEnded message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.SessionEnded} SessionEnded
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SessionEnded.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SessionEnded message.
             * @function verify
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SessionEnded.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.reason != null && message.hasOwnProperty("reason"))
                    switch (message.reason) {
                    default:
                        return "reason: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                if (message.message != null && message.hasOwnProperty("message"))
                    if (!$util.isString(message.message))
                        return "message: string expected";
                return null;
            };

            /**
             * Creates a SessionEnded message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.SessionEnded} SessionEnded
             */
            SessionEnded.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.SessionEnded)
                    return object;
                var message = new $root.interview_prep.v1.SessionEnded();
                switch (object.reason) {
                default:
                    if (typeof object.reason === "number") {
                        message.reason = object.reason;
                        break;
                    }
                    break;
                case "REASON_UNSPECIFIED":
                case 0:
                    message.reason = 0;
                    break;
                case "USER_INITIATED":
                case 1:
                    message.reason = 1;
                    break;
                case "AI_INITIATED":
                case 2:
                    message.reason = 2;
                    break;
                case "TIMEOUT":
                case 3:
                    message.reason = 3;
                    break;
                case "INTERNAL_ERROR":
                case 4:
                    message.reason = 4;
                    break;
                }
                if (object.message != null)
                    message.message = String(object.message);
                return message;
            };

            /**
             * Creates a plain object from a SessionEnded message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {interview_prep.v1.SessionEnded} message SessionEnded
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SessionEnded.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.reason = options.enums === String ? "REASON_UNSPECIFIED" : 0;
                    object.message = "";
                }
                if (message.reason != null && message.hasOwnProperty("reason"))
                    object.reason = options.enums === String ? $root.interview_prep.v1.SessionEnded.Reason[message.reason] === undefined ? message.reason : $root.interview_prep.v1.SessionEnded.Reason[message.reason] : message.reason;
                if (message.message != null && message.hasOwnProperty("message"))
                    object.message = message.message;
                return object;
            };

            /**
             * Converts this SessionEnded to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.SessionEnded
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SessionEnded.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SessionEnded
             * @function getTypeUrl
             * @memberof interview_prep.v1.SessionEnded
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SessionEnded.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.SessionEnded";
            };

            /**
             * Reason enum.
             * @name interview_prep.v1.SessionEnded.Reason
             * @enum {number}
             * @property {number} REASON_UNSPECIFIED=0 REASON_UNSPECIFIED value
             * @property {number} USER_INITIATED=1 USER_INITIATED value
             * @property {number} AI_INITIATED=2 AI_INITIATED value
             * @property {number} TIMEOUT=3 TIMEOUT value
             * @property {number} INTERNAL_ERROR=4 INTERNAL_ERROR value
             */
            SessionEnded.Reason = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "REASON_UNSPECIFIED"] = 0;
                values[valuesById[1] = "USER_INITIATED"] = 1;
                values[valuesById[2] = "AI_INITIATED"] = 2;
                values[valuesById[3] = "TIMEOUT"] = 3;
                values[valuesById[4] = "INTERNAL_ERROR"] = 4;
                return values;
            })();

            return SessionEnded;
        })();

        v1.Error = (function() {

            /**
             * Properties of an Error.
             * @memberof interview_prep.v1
             * @interface IError
             * @property {number|null} [code] Error code
             * @property {string|null} [message] Error message
             */

            /**
             * Constructs a new Error.
             * @memberof interview_prep.v1
             * @classdesc Represents an Error.
             * @implements IError
             * @constructor
             * @param {interview_prep.v1.IError=} [properties] Properties to set
             */
            function Error(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Error code.
             * @member {number} code
             * @memberof interview_prep.v1.Error
             * @instance
             */
            Error.prototype.code = 0;

            /**
             * Error message.
             * @member {string} message
             * @memberof interview_prep.v1.Error
             * @instance
             */
            Error.prototype.message = "";

            /**
             * Creates a new Error instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.Error
             * @static
             * @param {interview_prep.v1.IError=} [properties] Properties to set
             * @returns {interview_prep.v1.Error} Error instance
             */
            Error.create = function create(properties) {
                return new Error(properties);
            };

            /**
             * Encodes the specified Error message. Does not implicitly {@link interview_prep.v1.Error.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.Error
             * @static
             * @param {interview_prep.v1.IError} message Error message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Error.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                return writer;
            };

            /**
             * Encodes the specified Error message, length delimited. Does not implicitly {@link interview_prep.v1.Error.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.Error
             * @static
             * @param {interview_prep.v1.IError} message Error message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Error.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an Error message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.Error
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.Error} Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Error.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.Error();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.message = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an Error message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.Error
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.Error} Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Error.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an Error message.
             * @function verify
             * @memberof interview_prep.v1.Error
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Error.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.code != null && message.hasOwnProperty("code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.message != null && message.hasOwnProperty("message"))
                    if (!$util.isString(message.message))
                        return "message: string expected";
                return null;
            };

            /**
             * Creates an Error message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.Error
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.Error} Error
             */
            Error.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.Error)
                    return object;
                var message = new $root.interview_prep.v1.Error();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.message != null)
                    message.message = String(object.message);
                return message;
            };

            /**
             * Creates a plain object from an Error message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.Error
             * @static
             * @param {interview_prep.v1.Error} message Error
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Error.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.message = "";
                }
                if (message.code != null && message.hasOwnProperty("code"))
                    object.code = message.code;
                if (message.message != null && message.hasOwnProperty("message"))
                    object.message = message.message;
                return object;
            };

            /**
             * Converts this Error to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.Error
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Error.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Error
             * @function getTypeUrl
             * @memberof interview_prep.v1.Error
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Error.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.Error";
            };

            return Error;
        })();

        v1.AudioConfig = (function() {

            /**
             * Properties of an AudioConfig.
             * @memberof interview_prep.v1
             * @interface IAudioConfig
             * @property {interview_prep.v1.AudioConfig.AudioEncoding|null} [encoding] AudioConfig encoding
             * @property {number|null} [sampleRateHertz] AudioConfig sampleRateHertz
             */

            /**
             * Constructs a new AudioConfig.
             * @memberof interview_prep.v1
             * @classdesc Represents an AudioConfig.
             * @implements IAudioConfig
             * @constructor
             * @param {interview_prep.v1.IAudioConfig=} [properties] Properties to set
             */
            function AudioConfig(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AudioConfig encoding.
             * @member {interview_prep.v1.AudioConfig.AudioEncoding} encoding
             * @memberof interview_prep.v1.AudioConfig
             * @instance
             */
            AudioConfig.prototype.encoding = 0;

            /**
             * AudioConfig sampleRateHertz.
             * @member {number} sampleRateHertz
             * @memberof interview_prep.v1.AudioConfig
             * @instance
             */
            AudioConfig.prototype.sampleRateHertz = 0;

            /**
             * Creates a new AudioConfig instance using the specified properties.
             * @function create
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {interview_prep.v1.IAudioConfig=} [properties] Properties to set
             * @returns {interview_prep.v1.AudioConfig} AudioConfig instance
             */
            AudioConfig.create = function create(properties) {
                return new AudioConfig(properties);
            };

            /**
             * Encodes the specified AudioConfig message. Does not implicitly {@link interview_prep.v1.AudioConfig.verify|verify} messages.
             * @function encode
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {interview_prep.v1.IAudioConfig} message AudioConfig message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AudioConfig.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.encoding != null && Object.hasOwnProperty.call(message, "encoding"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.encoding);
                if (message.sampleRateHertz != null && Object.hasOwnProperty.call(message, "sampleRateHertz"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.sampleRateHertz);
                return writer;
            };

            /**
             * Encodes the specified AudioConfig message, length delimited. Does not implicitly {@link interview_prep.v1.AudioConfig.verify|verify} messages.
             * @function encodeDelimited
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {interview_prep.v1.IAudioConfig} message AudioConfig message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AudioConfig.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes an AudioConfig message from the specified reader or buffer.
             * @function decode
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {interview_prep.v1.AudioConfig} AudioConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AudioConfig.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.interview_prep.v1.AudioConfig();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.encoding = reader.int32();
                            break;
                        }
                    case 2: {
                            message.sampleRateHertz = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an AudioConfig message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {interview_prep.v1.AudioConfig} AudioConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AudioConfig.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an AudioConfig message.
             * @function verify
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            AudioConfig.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.encoding != null && message.hasOwnProperty("encoding"))
                    switch (message.encoding) {
                    default:
                        return "encoding: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                if (message.sampleRateHertz != null && message.hasOwnProperty("sampleRateHertz"))
                    if (!$util.isInteger(message.sampleRateHertz))
                        return "sampleRateHertz: integer expected";
                return null;
            };

            /**
             * Creates an AudioConfig message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {interview_prep.v1.AudioConfig} AudioConfig
             */
            AudioConfig.fromObject = function fromObject(object) {
                if (object instanceof $root.interview_prep.v1.AudioConfig)
                    return object;
                var message = new $root.interview_prep.v1.AudioConfig();
                switch (object.encoding) {
                default:
                    if (typeof object.encoding === "number") {
                        message.encoding = object.encoding;
                        break;
                    }
                    break;
                case "ENCODING_UNSPECIFIED":
                case 0:
                    message.encoding = 0;
                    break;
                case "LINEAR_PCM":
                case 1:
                    message.encoding = 1;
                    break;
                }
                if (object.sampleRateHertz != null)
                    message.sampleRateHertz = object.sampleRateHertz | 0;
                return message;
            };

            /**
             * Creates a plain object from an AudioConfig message. Also converts values to other types if specified.
             * @function toObject
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {interview_prep.v1.AudioConfig} message AudioConfig
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            AudioConfig.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.encoding = options.enums === String ? "ENCODING_UNSPECIFIED" : 0;
                    object.sampleRateHertz = 0;
                }
                if (message.encoding != null && message.hasOwnProperty("encoding"))
                    object.encoding = options.enums === String ? $root.interview_prep.v1.AudioConfig.AudioEncoding[message.encoding] === undefined ? message.encoding : $root.interview_prep.v1.AudioConfig.AudioEncoding[message.encoding] : message.encoding;
                if (message.sampleRateHertz != null && message.hasOwnProperty("sampleRateHertz"))
                    object.sampleRateHertz = message.sampleRateHertz;
                return object;
            };

            /**
             * Converts this AudioConfig to JSON.
             * @function toJSON
             * @memberof interview_prep.v1.AudioConfig
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            AudioConfig.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for AudioConfig
             * @function getTypeUrl
             * @memberof interview_prep.v1.AudioConfig
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            AudioConfig.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/interview_prep.v1.AudioConfig";
            };

            /**
             * AudioEncoding enum.
             * @name interview_prep.v1.AudioConfig.AudioEncoding
             * @enum {number}
             * @property {number} ENCODING_UNSPECIFIED=0 ENCODING_UNSPECIFIED value
             * @property {number} LINEAR_PCM=1 LINEAR_PCM value
             */
            AudioConfig.AudioEncoding = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "ENCODING_UNSPECIFIED"] = 0;
                values[valuesById[1] = "LINEAR_PCM"] = 1;
                return values;
            })();

            return AudioConfig;
        })();

        /**
         * Speaker enum.
         * @name interview_prep.v1.Speaker
         * @enum {number}
         * @property {number} SPEAKER_UNSPECIFIED=0 SPEAKER_UNSPECIFIED value
         * @property {number} USER=1 USER value
         * @property {number} AI=2 AI value
         */
        v1.Speaker = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SPEAKER_UNSPECIFIED"] = 0;
            values[valuesById[1] = "USER"] = 1;
            values[valuesById[2] = "AI"] = 2;
            return values;
        })();

        return v1;
    })();

    return interview_prep;
})();

module.exports = $root;
