/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.preppal = (function() {

    /**
     * Namespace preppal.
     * @exports preppal
     * @namespace
     */
    var preppal = {};

    preppal.ClientToServerMessage = (function() {

        /**
         * Properties of a ClientToServerMessage.
         * @memberof preppal
         * @interface IClientToServerMessage
         * @property {preppal.IAudioChunk|null} [audioChunk] ClientToServerMessage audioChunk
         * @property {preppal.IEndRequest|null} [endRequest] ClientToServerMessage endRequest
         */

        /**
         * Constructs a new ClientToServerMessage.
         * @memberof preppal
         * @classdesc Represents a ClientToServerMessage.
         * @implements IClientToServerMessage
         * @constructor
         * @param {preppal.IClientToServerMessage=} [properties] Properties to set
         */
        function ClientToServerMessage(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ClientToServerMessage audioChunk.
         * @member {preppal.IAudioChunk|null|undefined} audioChunk
         * @memberof preppal.ClientToServerMessage
         * @instance
         */
        ClientToServerMessage.prototype.audioChunk = null;

        /**
         * ClientToServerMessage endRequest.
         * @member {preppal.IEndRequest|null|undefined} endRequest
         * @memberof preppal.ClientToServerMessage
         * @instance
         */
        ClientToServerMessage.prototype.endRequest = null;

        // OneOf field names bound to virtual getters and setters
        var $oneOfFields;

        /**
         * ClientToServerMessage payload.
         * @member {"audioChunk"|"endRequest"|undefined} payload
         * @memberof preppal.ClientToServerMessage
         * @instance
         */
        Object.defineProperty(ClientToServerMessage.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["audioChunk", "endRequest"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ClientToServerMessage instance using the specified properties.
         * @function create
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {preppal.IClientToServerMessage=} [properties] Properties to set
         * @returns {preppal.ClientToServerMessage} ClientToServerMessage instance
         */
        ClientToServerMessage.create = function create(properties) {
            return new ClientToServerMessage(properties);
        };

        /**
         * Encodes the specified ClientToServerMessage message. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
         * @function encode
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {preppal.IClientToServerMessage} message ClientToServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientToServerMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.audioChunk != null && Object.hasOwnProperty.call(message, "audioChunk"))
                $root.preppal.AudioChunk.encode(message.audioChunk, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.endRequest != null && Object.hasOwnProperty.call(message, "endRequest"))
                $root.preppal.EndRequest.encode(message.endRequest, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ClientToServerMessage message, length delimited. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {preppal.IClientToServerMessage} message ClientToServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientToServerMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ClientToServerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.ClientToServerMessage} ClientToServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientToServerMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.ClientToServerMessage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.audioChunk = $root.preppal.AudioChunk.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.endRequest = $root.preppal.EndRequest.decode(reader, reader.uint32());
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
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.ClientToServerMessage} ClientToServerMessage
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
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ClientToServerMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            var properties = {};
            if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                properties.payload = 1;
                {
                    var error = $root.preppal.AudioChunk.verify(message.audioChunk);
                    if (error)
                        return "audioChunk." + error;
                }
            }
            if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    var error = $root.preppal.EndRequest.verify(message.endRequest);
                    if (error)
                        return "endRequest." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ClientToServerMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.ClientToServerMessage} ClientToServerMessage
         */
        ClientToServerMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.ClientToServerMessage)
                return object;
            var message = new $root.preppal.ClientToServerMessage();
            if (object.audioChunk != null) {
                if (typeof object.audioChunk !== "object")
                    throw TypeError(".preppal.ClientToServerMessage.audioChunk: object expected");
                message.audioChunk = $root.preppal.AudioChunk.fromObject(object.audioChunk);
            }
            if (object.endRequest != null) {
                if (typeof object.endRequest !== "object")
                    throw TypeError(".preppal.ClientToServerMessage.endRequest: object expected");
                message.endRequest = $root.preppal.EndRequest.fromObject(object.endRequest);
            }
            return message;
        };

        /**
         * Creates a plain object from a ClientToServerMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {preppal.ClientToServerMessage} message ClientToServerMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ClientToServerMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
                object.audioChunk = $root.preppal.AudioChunk.toObject(message.audioChunk, options);
                if (options.oneofs)
                    object.payload = "audioChunk";
            }
            if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
                object.endRequest = $root.preppal.EndRequest.toObject(message.endRequest, options);
                if (options.oneofs)
                    object.payload = "endRequest";
            }
            return object;
        };

        /**
         * Converts this ClientToServerMessage to JSON.
         * @function toJSON
         * @memberof preppal.ClientToServerMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ClientToServerMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ClientToServerMessage
         * @function getTypeUrl
         * @memberof preppal.ClientToServerMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ClientToServerMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.ClientToServerMessage";
        };

        return ClientToServerMessage;
    })();

    preppal.AudioChunk = (function() {

        /**
         * Properties of an AudioChunk.
         * @memberof preppal
         * @interface IAudioChunk
         * @property {Uint8Array|null} [audioContent] AudioChunk audioContent
         */

        /**
         * Constructs a new AudioChunk.
         * @memberof preppal
         * @classdesc Represents an AudioChunk.
         * @implements IAudioChunk
         * @constructor
         * @param {preppal.IAudioChunk=} [properties] Properties to set
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
         * @memberof preppal.AudioChunk
         * @instance
         */
        AudioChunk.prototype.audioContent = $util.newBuffer([]);

        /**
         * Creates a new AudioChunk instance using the specified properties.
         * @function create
         * @memberof preppal.AudioChunk
         * @static
         * @param {preppal.IAudioChunk=} [properties] Properties to set
         * @returns {preppal.AudioChunk} AudioChunk instance
         */
        AudioChunk.create = function create(properties) {
            return new AudioChunk(properties);
        };

        /**
         * Encodes the specified AudioChunk message. Does not implicitly {@link preppal.AudioChunk.verify|verify} messages.
         * @function encode
         * @memberof preppal.AudioChunk
         * @static
         * @param {preppal.IAudioChunk} message AudioChunk message or plain object to encode
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
         * Encodes the specified AudioChunk message, length delimited. Does not implicitly {@link preppal.AudioChunk.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.AudioChunk
         * @static
         * @param {preppal.IAudioChunk} message AudioChunk message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AudioChunk.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AudioChunk message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.AudioChunk
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.AudioChunk} AudioChunk
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AudioChunk.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.AudioChunk();
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
         * @memberof preppal.AudioChunk
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.AudioChunk} AudioChunk
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
         * @memberof preppal.AudioChunk
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
         * @memberof preppal.AudioChunk
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.AudioChunk} AudioChunk
         */
        AudioChunk.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.AudioChunk)
                return object;
            var message = new $root.preppal.AudioChunk();
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
         * @memberof preppal.AudioChunk
         * @static
         * @param {preppal.AudioChunk} message AudioChunk
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
         * @memberof preppal.AudioChunk
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AudioChunk.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AudioChunk
         * @function getTypeUrl
         * @memberof preppal.AudioChunk
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AudioChunk.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.AudioChunk";
        };

        return AudioChunk;
    })();

    preppal.EndRequest = (function() {

        /**
         * Properties of an EndRequest.
         * @memberof preppal
         * @interface IEndRequest
         */

        /**
         * Constructs a new EndRequest.
         * @memberof preppal
         * @classdesc Represents an EndRequest.
         * @implements IEndRequest
         * @constructor
         * @param {preppal.IEndRequest=} [properties] Properties to set
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
         * @memberof preppal.EndRequest
         * @static
         * @param {preppal.IEndRequest=} [properties] Properties to set
         * @returns {preppal.EndRequest} EndRequest instance
         */
        EndRequest.create = function create(properties) {
            return new EndRequest(properties);
        };

        /**
         * Encodes the specified EndRequest message. Does not implicitly {@link preppal.EndRequest.verify|verify} messages.
         * @function encode
         * @memberof preppal.EndRequest
         * @static
         * @param {preppal.IEndRequest} message EndRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EndRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified EndRequest message, length delimited. Does not implicitly {@link preppal.EndRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.EndRequest
         * @static
         * @param {preppal.IEndRequest} message EndRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EndRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an EndRequest message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.EndRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.EndRequest} EndRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EndRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.EndRequest();
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
         * @memberof preppal.EndRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.EndRequest} EndRequest
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
         * @memberof preppal.EndRequest
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
         * @memberof preppal.EndRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.EndRequest} EndRequest
         */
        EndRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.EndRequest)
                return object;
            return new $root.preppal.EndRequest();
        };

        /**
         * Creates a plain object from an EndRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.EndRequest
         * @static
         * @param {preppal.EndRequest} message EndRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EndRequest.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this EndRequest to JSON.
         * @function toJSON
         * @memberof preppal.EndRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EndRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for EndRequest
         * @function getTypeUrl
         * @memberof preppal.EndRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        EndRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.EndRequest";
        };

        return EndRequest;
    })();

    preppal.ServerToClientMessage = (function() {

        /**
         * Properties of a ServerToClientMessage.
         * @memberof preppal
         * @interface IServerToClientMessage
         * @property {preppal.ITranscriptUpdate|null} [transcriptUpdate] ServerToClientMessage transcriptUpdate
         * @property {preppal.IAudioResponse|null} [audioResponse] ServerToClientMessage audioResponse
         * @property {preppal.IErrorResponse|null} [error] ServerToClientMessage error
         * @property {preppal.ISessionEnded|null} [sessionEnded] ServerToClientMessage sessionEnded
         */

        /**
         * Constructs a new ServerToClientMessage.
         * @memberof preppal
         * @classdesc Represents a ServerToClientMessage.
         * @implements IServerToClientMessage
         * @constructor
         * @param {preppal.IServerToClientMessage=} [properties] Properties to set
         */
        function ServerToClientMessage(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ServerToClientMessage transcriptUpdate.
         * @member {preppal.ITranscriptUpdate|null|undefined} transcriptUpdate
         * @memberof preppal.ServerToClientMessage
         * @instance
         */
        ServerToClientMessage.prototype.transcriptUpdate = null;

        /**
         * ServerToClientMessage audioResponse.
         * @member {preppal.IAudioResponse|null|undefined} audioResponse
         * @memberof preppal.ServerToClientMessage
         * @instance
         */
        ServerToClientMessage.prototype.audioResponse = null;

        /**
         * ServerToClientMessage error.
         * @member {preppal.IErrorResponse|null|undefined} error
         * @memberof preppal.ServerToClientMessage
         * @instance
         */
        ServerToClientMessage.prototype.error = null;

        /**
         * ServerToClientMessage sessionEnded.
         * @member {preppal.ISessionEnded|null|undefined} sessionEnded
         * @memberof preppal.ServerToClientMessage
         * @instance
         */
        ServerToClientMessage.prototype.sessionEnded = null;

        // OneOf field names bound to virtual getters and setters
        var $oneOfFields;

        /**
         * ServerToClientMessage payload.
         * @member {"transcriptUpdate"|"audioResponse"|"error"|"sessionEnded"|undefined} payload
         * @memberof preppal.ServerToClientMessage
         * @instance
         */
        Object.defineProperty(ServerToClientMessage.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["transcriptUpdate", "audioResponse", "error", "sessionEnded"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ServerToClientMessage instance using the specified properties.
         * @function create
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {preppal.IServerToClientMessage=} [properties] Properties to set
         * @returns {preppal.ServerToClientMessage} ServerToClientMessage instance
         */
        ServerToClientMessage.create = function create(properties) {
            return new ServerToClientMessage(properties);
        };

        /**
         * Encodes the specified ServerToClientMessage message. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
         * @function encode
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {preppal.IServerToClientMessage} message ServerToClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerToClientMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.transcriptUpdate != null && Object.hasOwnProperty.call(message, "transcriptUpdate"))
                $root.preppal.TranscriptUpdate.encode(message.transcriptUpdate, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.audioResponse != null && Object.hasOwnProperty.call(message, "audioResponse"))
                $root.preppal.AudioResponse.encode(message.audioResponse, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                $root.preppal.ErrorResponse.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.sessionEnded != null && Object.hasOwnProperty.call(message, "sessionEnded"))
                $root.preppal.SessionEnded.encode(message.sessionEnded, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified ServerToClientMessage message, length delimited. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {preppal.IServerToClientMessage} message ServerToClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerToClientMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ServerToClientMessage message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.ServerToClientMessage} ServerToClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerToClientMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.ServerToClientMessage();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.transcriptUpdate = $root.preppal.TranscriptUpdate.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.audioResponse = $root.preppal.AudioResponse.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.error = $root.preppal.ErrorResponse.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.sessionEnded = $root.preppal.SessionEnded.decode(reader, reader.uint32());
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
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.ServerToClientMessage} ServerToClientMessage
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
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ServerToClientMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            var properties = {};
            if (message.transcriptUpdate != null && message.hasOwnProperty("transcriptUpdate")) {
                properties.payload = 1;
                {
                    var error = $root.preppal.TranscriptUpdate.verify(message.transcriptUpdate);
                    if (error)
                        return "transcriptUpdate." + error;
                }
            }
            if (message.audioResponse != null && message.hasOwnProperty("audioResponse")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    var error = $root.preppal.AudioResponse.verify(message.audioResponse);
                    if (error)
                        return "audioResponse." + error;
                }
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    var error = $root.preppal.ErrorResponse.verify(message.error);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.sessionEnded != null && message.hasOwnProperty("sessionEnded")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    var error = $root.preppal.SessionEnded.verify(message.sessionEnded);
                    if (error)
                        return "sessionEnded." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ServerToClientMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.ServerToClientMessage} ServerToClientMessage
         */
        ServerToClientMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.ServerToClientMessage)
                return object;
            var message = new $root.preppal.ServerToClientMessage();
            if (object.transcriptUpdate != null) {
                if (typeof object.transcriptUpdate !== "object")
                    throw TypeError(".preppal.ServerToClientMessage.transcriptUpdate: object expected");
                message.transcriptUpdate = $root.preppal.TranscriptUpdate.fromObject(object.transcriptUpdate);
            }
            if (object.audioResponse != null) {
                if (typeof object.audioResponse !== "object")
                    throw TypeError(".preppal.ServerToClientMessage.audioResponse: object expected");
                message.audioResponse = $root.preppal.AudioResponse.fromObject(object.audioResponse);
            }
            if (object.error != null) {
                if (typeof object.error !== "object")
                    throw TypeError(".preppal.ServerToClientMessage.error: object expected");
                message.error = $root.preppal.ErrorResponse.fromObject(object.error);
            }
            if (object.sessionEnded != null) {
                if (typeof object.sessionEnded !== "object")
                    throw TypeError(".preppal.ServerToClientMessage.sessionEnded: object expected");
                message.sessionEnded = $root.preppal.SessionEnded.fromObject(object.sessionEnded);
            }
            return message;
        };

        /**
         * Creates a plain object from a ServerToClientMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {preppal.ServerToClientMessage} message ServerToClientMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ServerToClientMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (message.transcriptUpdate != null && message.hasOwnProperty("transcriptUpdate")) {
                object.transcriptUpdate = $root.preppal.TranscriptUpdate.toObject(message.transcriptUpdate, options);
                if (options.oneofs)
                    object.payload = "transcriptUpdate";
            }
            if (message.audioResponse != null && message.hasOwnProperty("audioResponse")) {
                object.audioResponse = $root.preppal.AudioResponse.toObject(message.audioResponse, options);
                if (options.oneofs)
                    object.payload = "audioResponse";
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                object.error = $root.preppal.ErrorResponse.toObject(message.error, options);
                if (options.oneofs)
                    object.payload = "error";
            }
            if (message.sessionEnded != null && message.hasOwnProperty("sessionEnded")) {
                object.sessionEnded = $root.preppal.SessionEnded.toObject(message.sessionEnded, options);
                if (options.oneofs)
                    object.payload = "sessionEnded";
            }
            return object;
        };

        /**
         * Converts this ServerToClientMessage to JSON.
         * @function toJSON
         * @memberof preppal.ServerToClientMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ServerToClientMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ServerToClientMessage
         * @function getTypeUrl
         * @memberof preppal.ServerToClientMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ServerToClientMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.ServerToClientMessage";
        };

        return ServerToClientMessage;
    })();

    preppal.TranscriptUpdate = (function() {

        /**
         * Properties of a TranscriptUpdate.
         * @memberof preppal
         * @interface ITranscriptUpdate
         * @property {string|null} [speaker] TranscriptUpdate speaker
         * @property {string|null} [text] TranscriptUpdate text
         * @property {boolean|null} [isFinal] TranscriptUpdate isFinal
         */

        /**
         * Constructs a new TranscriptUpdate.
         * @memberof preppal
         * @classdesc Represents a TranscriptUpdate.
         * @implements ITranscriptUpdate
         * @constructor
         * @param {preppal.ITranscriptUpdate=} [properties] Properties to set
         */
        function TranscriptUpdate(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TranscriptUpdate speaker.
         * @member {string} speaker
         * @memberof preppal.TranscriptUpdate
         * @instance
         */
        TranscriptUpdate.prototype.speaker = "";

        /**
         * TranscriptUpdate text.
         * @member {string} text
         * @memberof preppal.TranscriptUpdate
         * @instance
         */
        TranscriptUpdate.prototype.text = "";

        /**
         * TranscriptUpdate isFinal.
         * @member {boolean} isFinal
         * @memberof preppal.TranscriptUpdate
         * @instance
         */
        TranscriptUpdate.prototype.isFinal = false;

        /**
         * Creates a new TranscriptUpdate instance using the specified properties.
         * @function create
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {preppal.ITranscriptUpdate=} [properties] Properties to set
         * @returns {preppal.TranscriptUpdate} TranscriptUpdate instance
         */
        TranscriptUpdate.create = function create(properties) {
            return new TranscriptUpdate(properties);
        };

        /**
         * Encodes the specified TranscriptUpdate message. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
         * @function encode
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {preppal.ITranscriptUpdate} message TranscriptUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TranscriptUpdate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.speaker != null && Object.hasOwnProperty.call(message, "speaker"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.speaker);
            if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
            if (message.isFinal != null && Object.hasOwnProperty.call(message, "isFinal"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.isFinal);
            return writer;
        };

        /**
         * Encodes the specified TranscriptUpdate message, length delimited. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {preppal.ITranscriptUpdate} message TranscriptUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TranscriptUpdate.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TranscriptUpdate message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.TranscriptUpdate} TranscriptUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TranscriptUpdate.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.TranscriptUpdate();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.speaker = reader.string();
                        break;
                    }
                case 2: {
                        message.text = reader.string();
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
         * Decodes a TranscriptUpdate message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.TranscriptUpdate} TranscriptUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TranscriptUpdate.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TranscriptUpdate message.
         * @function verify
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TranscriptUpdate.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.speaker != null && message.hasOwnProperty("speaker"))
                if (!$util.isString(message.speaker))
                    return "speaker: string expected";
            if (message.text != null && message.hasOwnProperty("text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.isFinal != null && message.hasOwnProperty("isFinal"))
                if (typeof message.isFinal !== "boolean")
                    return "isFinal: boolean expected";
            return null;
        };

        /**
         * Creates a TranscriptUpdate message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.TranscriptUpdate} TranscriptUpdate
         */
        TranscriptUpdate.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.TranscriptUpdate)
                return object;
            var message = new $root.preppal.TranscriptUpdate();
            if (object.speaker != null)
                message.speaker = String(object.speaker);
            if (object.text != null)
                message.text = String(object.text);
            if (object.isFinal != null)
                message.isFinal = Boolean(object.isFinal);
            return message;
        };

        /**
         * Creates a plain object from a TranscriptUpdate message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {preppal.TranscriptUpdate} message TranscriptUpdate
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TranscriptUpdate.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.speaker = "";
                object.text = "";
                object.isFinal = false;
            }
            if (message.speaker != null && message.hasOwnProperty("speaker"))
                object.speaker = message.speaker;
            if (message.text != null && message.hasOwnProperty("text"))
                object.text = message.text;
            if (message.isFinal != null && message.hasOwnProperty("isFinal"))
                object.isFinal = message.isFinal;
            return object;
        };

        /**
         * Converts this TranscriptUpdate to JSON.
         * @function toJSON
         * @memberof preppal.TranscriptUpdate
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TranscriptUpdate.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TranscriptUpdate
         * @function getTypeUrl
         * @memberof preppal.TranscriptUpdate
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TranscriptUpdate.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.TranscriptUpdate";
        };

        return TranscriptUpdate;
    })();

    preppal.AudioResponse = (function() {

        /**
         * Properties of an AudioResponse.
         * @memberof preppal
         * @interface IAudioResponse
         * @property {Uint8Array|null} [audioContent] AudioResponse audioContent
         */

        /**
         * Constructs a new AudioResponse.
         * @memberof preppal
         * @classdesc Represents an AudioResponse.
         * @implements IAudioResponse
         * @constructor
         * @param {preppal.IAudioResponse=} [properties] Properties to set
         */
        function AudioResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AudioResponse audioContent.
         * @member {Uint8Array} audioContent
         * @memberof preppal.AudioResponse
         * @instance
         */
        AudioResponse.prototype.audioContent = $util.newBuffer([]);

        /**
         * Creates a new AudioResponse instance using the specified properties.
         * @function create
         * @memberof preppal.AudioResponse
         * @static
         * @param {preppal.IAudioResponse=} [properties] Properties to set
         * @returns {preppal.AudioResponse} AudioResponse instance
         */
        AudioResponse.create = function create(properties) {
            return new AudioResponse(properties);
        };

        /**
         * Encodes the specified AudioResponse message. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
         * @function encode
         * @memberof preppal.AudioResponse
         * @static
         * @param {preppal.IAudioResponse} message AudioResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AudioResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.audioContent != null && Object.hasOwnProperty.call(message, "audioContent"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.audioContent);
            return writer;
        };

        /**
         * Encodes the specified AudioResponse message, length delimited. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.AudioResponse
         * @static
         * @param {preppal.IAudioResponse} message AudioResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AudioResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AudioResponse message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.AudioResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.AudioResponse} AudioResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AudioResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.AudioResponse();
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
         * Decodes an AudioResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof preppal.AudioResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.AudioResponse} AudioResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AudioResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AudioResponse message.
         * @function verify
         * @memberof preppal.AudioResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AudioResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.audioContent != null && message.hasOwnProperty("audioContent"))
                if (!(message.audioContent && typeof message.audioContent.length === "number" || $util.isString(message.audioContent)))
                    return "audioContent: buffer expected";
            return null;
        };

        /**
         * Creates an AudioResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.AudioResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.AudioResponse} AudioResponse
         */
        AudioResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.AudioResponse)
                return object;
            var message = new $root.preppal.AudioResponse();
            if (object.audioContent != null)
                if (typeof object.audioContent === "string")
                    $util.base64.decode(object.audioContent, message.audioContent = $util.newBuffer($util.base64.length(object.audioContent)), 0);
                else if (object.audioContent.length >= 0)
                    message.audioContent = object.audioContent;
            return message;
        };

        /**
         * Creates a plain object from an AudioResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.AudioResponse
         * @static
         * @param {preppal.AudioResponse} message AudioResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AudioResponse.toObject = function toObject(message, options) {
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
         * Converts this AudioResponse to JSON.
         * @function toJSON
         * @memberof preppal.AudioResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AudioResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AudioResponse
         * @function getTypeUrl
         * @memberof preppal.AudioResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AudioResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.AudioResponse";
        };

        return AudioResponse;
    })();

    preppal.ErrorResponse = (function() {

        /**
         * Properties of an ErrorResponse.
         * @memberof preppal
         * @interface IErrorResponse
         * @property {number|null} [code] ErrorResponse code
         * @property {string|null} [message] ErrorResponse message
         */

        /**
         * Constructs a new ErrorResponse.
         * @memberof preppal
         * @classdesc Represents an ErrorResponse.
         * @implements IErrorResponse
         * @constructor
         * @param {preppal.IErrorResponse=} [properties] Properties to set
         */
        function ErrorResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ErrorResponse code.
         * @member {number} code
         * @memberof preppal.ErrorResponse
         * @instance
         */
        ErrorResponse.prototype.code = 0;

        /**
         * ErrorResponse message.
         * @member {string} message
         * @memberof preppal.ErrorResponse
         * @instance
         */
        ErrorResponse.prototype.message = "";

        /**
         * Creates a new ErrorResponse instance using the specified properties.
         * @function create
         * @memberof preppal.ErrorResponse
         * @static
         * @param {preppal.IErrorResponse=} [properties] Properties to set
         * @returns {preppal.ErrorResponse} ErrorResponse instance
         */
        ErrorResponse.create = function create(properties) {
            return new ErrorResponse(properties);
        };

        /**
         * Encodes the specified ErrorResponse message. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
         * @function encode
         * @memberof preppal.ErrorResponse
         * @static
         * @param {preppal.IErrorResponse} message ErrorResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            return writer;
        };

        /**
         * Encodes the specified ErrorResponse message, length delimited. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.ErrorResponse
         * @static
         * @param {preppal.IErrorResponse} message ErrorResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an ErrorResponse message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.ErrorResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.ErrorResponse} ErrorResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.ErrorResponse();
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
         * Decodes an ErrorResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof preppal.ErrorResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.ErrorResponse} ErrorResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ErrorResponse message.
         * @function verify
         * @memberof preppal.ErrorResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ErrorResponse.verify = function verify(message) {
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
         * Creates an ErrorResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.ErrorResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.ErrorResponse} ErrorResponse
         */
        ErrorResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.ErrorResponse)
                return object;
            var message = new $root.preppal.ErrorResponse();
            if (object.code != null)
                message.code = object.code | 0;
            if (object.message != null)
                message.message = String(object.message);
            return message;
        };

        /**
         * Creates a plain object from an ErrorResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.ErrorResponse
         * @static
         * @param {preppal.ErrorResponse} message ErrorResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ErrorResponse.toObject = function toObject(message, options) {
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
         * Converts this ErrorResponse to JSON.
         * @function toJSON
         * @memberof preppal.ErrorResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ErrorResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ErrorResponse
         * @function getTypeUrl
         * @memberof preppal.ErrorResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ErrorResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.ErrorResponse";
        };

        return ErrorResponse;
    })();

    preppal.SessionEnded = (function() {

        /**
         * Properties of a SessionEnded.
         * @memberof preppal
         * @interface ISessionEnded
         * @property {preppal.SessionEnded.Reason|null} [reason] SessionEnded reason
         */

        /**
         * Constructs a new SessionEnded.
         * @memberof preppal
         * @classdesc Represents a SessionEnded.
         * @implements ISessionEnded
         * @constructor
         * @param {preppal.ISessionEnded=} [properties] Properties to set
         */
        function SessionEnded(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SessionEnded reason.
         * @member {preppal.SessionEnded.Reason} reason
         * @memberof preppal.SessionEnded
         * @instance
         */
        SessionEnded.prototype.reason = 0;

        /**
         * Creates a new SessionEnded instance using the specified properties.
         * @function create
         * @memberof preppal.SessionEnded
         * @static
         * @param {preppal.ISessionEnded=} [properties] Properties to set
         * @returns {preppal.SessionEnded} SessionEnded instance
         */
        SessionEnded.create = function create(properties) {
            return new SessionEnded(properties);
        };

        /**
         * Encodes the specified SessionEnded message. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
         * @function encode
         * @memberof preppal.SessionEnded
         * @static
         * @param {preppal.ISessionEnded} message SessionEnded message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionEnded.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.reason);
            return writer;
        };

        /**
         * Encodes the specified SessionEnded message, length delimited. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
         * @function encodeDelimited
         * @memberof preppal.SessionEnded
         * @static
         * @param {preppal.ISessionEnded} message SessionEnded message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionEnded.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SessionEnded message from the specified reader or buffer.
         * @function decode
         * @memberof preppal.SessionEnded
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {preppal.SessionEnded} SessionEnded
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionEnded.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.preppal.SessionEnded();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.reason = reader.int32();
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
         * @memberof preppal.SessionEnded
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {preppal.SessionEnded} SessionEnded
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
         * @memberof preppal.SessionEnded
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
                    break;
                }
            return null;
        };

        /**
         * Creates a SessionEnded message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof preppal.SessionEnded
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {preppal.SessionEnded} SessionEnded
         */
        SessionEnded.fromObject = function fromObject(object) {
            if (object instanceof $root.preppal.SessionEnded)
                return object;
            var message = new $root.preppal.SessionEnded();
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
            case "GEMINI_ENDED":
            case 2:
                message.reason = 2;
                break;
            case "TIMEOUT":
            case 3:
                message.reason = 3;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a SessionEnded message. Also converts values to other types if specified.
         * @function toObject
         * @memberof preppal.SessionEnded
         * @static
         * @param {preppal.SessionEnded} message SessionEnded
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionEnded.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.reason = options.enums === String ? "REASON_UNSPECIFIED" : 0;
            if (message.reason != null && message.hasOwnProperty("reason"))
                object.reason = options.enums === String ? $root.preppal.SessionEnded.Reason[message.reason] === undefined ? message.reason : $root.preppal.SessionEnded.Reason[message.reason] : message.reason;
            return object;
        };

        /**
         * Converts this SessionEnded to JSON.
         * @function toJSON
         * @memberof preppal.SessionEnded
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionEnded.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SessionEnded
         * @function getTypeUrl
         * @memberof preppal.SessionEnded
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SessionEnded.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/preppal.SessionEnded";
        };

        /**
         * Reason enum.
         * @name preppal.SessionEnded.Reason
         * @enum {number}
         * @property {number} REASON_UNSPECIFIED=0 REASON_UNSPECIFIED value
         * @property {number} USER_INITIATED=1 USER_INITIATED value
         * @property {number} GEMINI_ENDED=2 GEMINI_ENDED value
         * @property {number} TIMEOUT=3 TIMEOUT value
         */
        SessionEnded.Reason = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "REASON_UNSPECIFIED"] = 0;
            values[valuesById[1] = "USER_INITIATED"] = 1;
            values[valuesById[2] = "GEMINI_ENDED"] = 2;
            values[valuesById[3] = "TIMEOUT"] = 3;
            return values;
        })();

        return SessionEnded;
    })();

    return preppal;
})();

module.exports = $root;
