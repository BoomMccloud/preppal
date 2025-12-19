/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader,
  $Writer = $protobuf.Writer,
  $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const preppal = ($root.preppal = (() => {
  /**
   * Namespace preppal.
   * @exports preppal
   * @namespace
   */
  const preppal = {};

  preppal.ClientToServerMessage = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
    let $oneOfFields;

    /**
     * ClientToServerMessage payload.
     * @member {"audioChunk"|"endRequest"|undefined} payload
     * @memberof preppal.ClientToServerMessage
     * @instance
     */
    Object.defineProperty(ClientToServerMessage.prototype, "payload", {
      get: $util.oneOfGetter(($oneOfFields = ["audioChunk", "endRequest"])),
      set: $util.oneOfSetter($oneOfFields),
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
      if (!writer) writer = $Writer.create();
      if (
        message.audioChunk != null &&
        Object.hasOwnProperty.call(message, "audioChunk")
      )
        $root.preppal.AudioChunk.encode(
          message.audioChunk,
          writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
        ).ldelim();
      if (
        message.endRequest != null &&
        Object.hasOwnProperty.call(message, "endRequest")
      )
        $root.preppal.EndRequest.encode(
          message.endRequest,
          writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
        ).ldelim();
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
    ClientToServerMessage.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.ClientToServerMessage();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.audioChunk = $root.preppal.AudioChunk.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 2: {
            message.endRequest = $root.preppal.EndRequest.decode(
              reader,
              reader.uint32(),
            );
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      let properties = {};
      if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
        properties.payload = 1;
        {
          let error = $root.preppal.AudioChunk.verify(message.audioChunk);
          if (error) return "audioChunk." + error;
        }
      }
      if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
        if (properties.payload === 1) return "payload: multiple values";
        properties.payload = 1;
        {
          let error = $root.preppal.EndRequest.verify(message.endRequest);
          if (error) return "endRequest." + error;
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
      if (object instanceof $root.preppal.ClientToServerMessage) return object;
      let message = new $root.preppal.ClientToServerMessage();
      if (object.audioChunk != null) {
        if (typeof object.audioChunk !== "object")
          throw TypeError(
            ".preppal.ClientToServerMessage.audioChunk: object expected",
          );
        message.audioChunk = $root.preppal.AudioChunk.fromObject(
          object.audioChunk,
        );
      }
      if (object.endRequest != null) {
        if (typeof object.endRequest !== "object")
          throw TypeError(
            ".preppal.ClientToServerMessage.endRequest: object expected",
          );
        message.endRequest = $root.preppal.EndRequest.fromObject(
          object.endRequest,
        );
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
      if (!options) options = {};
      let object = {};
      if (message.audioChunk != null && message.hasOwnProperty("audioChunk")) {
        object.audioChunk = $root.preppal.AudioChunk.toObject(
          message.audioChunk,
          options,
        );
        if (options.oneofs) object.payload = "audioChunk";
      }
      if (message.endRequest != null && message.hasOwnProperty("endRequest")) {
        object.endRequest = $root.preppal.EndRequest.toObject(
          message.endRequest,
          options,
        );
        if (options.oneofs) object.payload = "endRequest";
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

  preppal.AudioChunk = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
      if (!writer) writer = $Writer.create();
      if (
        message.audioContent != null &&
        Object.hasOwnProperty.call(message, "audioContent")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).bytes(message.audioContent);
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.AudioChunk();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      if (
        message.audioContent != null &&
        message.hasOwnProperty("audioContent")
      )
        if (
          !(
            (message.audioContent &&
              typeof message.audioContent.length === "number") ||
            $util.isString(message.audioContent)
          )
        )
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
      if (object instanceof $root.preppal.AudioChunk) return object;
      let message = new $root.preppal.AudioChunk();
      if (object.audioContent != null)
        if (typeof object.audioContent === "string")
          $util.base64.decode(
            object.audioContent,
            (message.audioContent = $util.newBuffer(
              $util.base64.length(object.audioContent),
            )),
            0,
          );
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
      if (!options) options = {};
      let object = {};
      if (options.defaults)
        if (options.bytes === String) object.audioContent = "";
        else {
          object.audioContent = [];
          if (options.bytes !== Array)
            object.audioContent = $util.newBuffer(object.audioContent);
        }
      if (
        message.audioContent != null &&
        message.hasOwnProperty("audioContent")
      )
        object.audioContent =
          options.bytes === String
            ? $util.base64.encode(
                message.audioContent,
                0,
                message.audioContent.length,
              )
            : options.bytes === Array
              ? Array.prototype.slice.call(message.audioContent)
              : message.audioContent;
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

  preppal.EndRequest = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
      if (!writer) writer = $Writer.create();
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.EndRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      if (object instanceof $root.preppal.EndRequest) return object;
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

  preppal.ServerToClientMessage = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
    let $oneOfFields;

    /**
     * ServerToClientMessage payload.
     * @member {"transcriptUpdate"|"audioResponse"|"error"|"sessionEnded"|undefined} payload
     * @memberof preppal.ServerToClientMessage
     * @instance
     */
    Object.defineProperty(ServerToClientMessage.prototype, "payload", {
      get: $util.oneOfGetter(
        ($oneOfFields = [
          "transcriptUpdate",
          "audioResponse",
          "error",
          "sessionEnded",
        ]),
      ),
      set: $util.oneOfSetter($oneOfFields),
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
      if (!writer) writer = $Writer.create();
      if (
        message.transcriptUpdate != null &&
        Object.hasOwnProperty.call(message, "transcriptUpdate")
      )
        $root.preppal.TranscriptUpdate.encode(
          message.transcriptUpdate,
          writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
        ).ldelim();
      if (
        message.audioResponse != null &&
        Object.hasOwnProperty.call(message, "audioResponse")
      )
        $root.preppal.AudioResponse.encode(
          message.audioResponse,
          writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
        ).ldelim();
      if (message.error != null && Object.hasOwnProperty.call(message, "error"))
        $root.preppal.ErrorResponse.encode(
          message.error,
          writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
        ).ldelim();
      if (
        message.sessionEnded != null &&
        Object.hasOwnProperty.call(message, "sessionEnded")
      )
        $root.preppal.SessionEnded.encode(
          message.sessionEnded,
          writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
        ).ldelim();
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
    ServerToClientMessage.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.ServerToClientMessage();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.transcriptUpdate = $root.preppal.TranscriptUpdate.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 2: {
            message.audioResponse = $root.preppal.AudioResponse.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 3: {
            message.error = $root.preppal.ErrorResponse.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 4: {
            message.sessionEnded = $root.preppal.SessionEnded.decode(
              reader,
              reader.uint32(),
            );
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      let properties = {};
      if (
        message.transcriptUpdate != null &&
        message.hasOwnProperty("transcriptUpdate")
      ) {
        properties.payload = 1;
        {
          let error = $root.preppal.TranscriptUpdate.verify(
            message.transcriptUpdate,
          );
          if (error) return "transcriptUpdate." + error;
        }
      }
      if (
        message.audioResponse != null &&
        message.hasOwnProperty("audioResponse")
      ) {
        if (properties.payload === 1) return "payload: multiple values";
        properties.payload = 1;
        {
          let error = $root.preppal.AudioResponse.verify(message.audioResponse);
          if (error) return "audioResponse." + error;
        }
      }
      if (message.error != null && message.hasOwnProperty("error")) {
        if (properties.payload === 1) return "payload: multiple values";
        properties.payload = 1;
        {
          let error = $root.preppal.ErrorResponse.verify(message.error);
          if (error) return "error." + error;
        }
      }
      if (
        message.sessionEnded != null &&
        message.hasOwnProperty("sessionEnded")
      ) {
        if (properties.payload === 1) return "payload: multiple values";
        properties.payload = 1;
        {
          let error = $root.preppal.SessionEnded.verify(message.sessionEnded);
          if (error) return "sessionEnded." + error;
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
      if (object instanceof $root.preppal.ServerToClientMessage) return object;
      let message = new $root.preppal.ServerToClientMessage();
      if (object.transcriptUpdate != null) {
        if (typeof object.transcriptUpdate !== "object")
          throw TypeError(
            ".preppal.ServerToClientMessage.transcriptUpdate: object expected",
          );
        message.transcriptUpdate = $root.preppal.TranscriptUpdate.fromObject(
          object.transcriptUpdate,
        );
      }
      if (object.audioResponse != null) {
        if (typeof object.audioResponse !== "object")
          throw TypeError(
            ".preppal.ServerToClientMessage.audioResponse: object expected",
          );
        message.audioResponse = $root.preppal.AudioResponse.fromObject(
          object.audioResponse,
        );
      }
      if (object.error != null) {
        if (typeof object.error !== "object")
          throw TypeError(
            ".preppal.ServerToClientMessage.error: object expected",
          );
        message.error = $root.preppal.ErrorResponse.fromObject(object.error);
      }
      if (object.sessionEnded != null) {
        if (typeof object.sessionEnded !== "object")
          throw TypeError(
            ".preppal.ServerToClientMessage.sessionEnded: object expected",
          );
        message.sessionEnded = $root.preppal.SessionEnded.fromObject(
          object.sessionEnded,
        );
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
      if (!options) options = {};
      let object = {};
      if (
        message.transcriptUpdate != null &&
        message.hasOwnProperty("transcriptUpdate")
      ) {
        object.transcriptUpdate = $root.preppal.TranscriptUpdate.toObject(
          message.transcriptUpdate,
          options,
        );
        if (options.oneofs) object.payload = "transcriptUpdate";
      }
      if (
        message.audioResponse != null &&
        message.hasOwnProperty("audioResponse")
      ) {
        object.audioResponse = $root.preppal.AudioResponse.toObject(
          message.audioResponse,
          options,
        );
        if (options.oneofs) object.payload = "audioResponse";
      }
      if (message.error != null && message.hasOwnProperty("error")) {
        object.error = $root.preppal.ErrorResponse.toObject(
          message.error,
          options,
        );
        if (options.oneofs) object.payload = "error";
      }
      if (
        message.sessionEnded != null &&
        message.hasOwnProperty("sessionEnded")
      ) {
        object.sessionEnded = $root.preppal.SessionEnded.toObject(
          message.sessionEnded,
          options,
        );
        if (options.oneofs) object.payload = "sessionEnded";
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

  preppal.TranscriptUpdate = (function () {
    /**
     * Properties of a TranscriptUpdate.
     * @memberof preppal
     * @interface ITranscriptUpdate
     * @property {string|null} [speaker] TranscriptUpdate speaker
     * @property {string|null} [text] TranscriptUpdate text
     * @property {boolean|null} [isFinal] TranscriptUpdate isFinal
     * @property {boolean|null} [turnComplete] TranscriptUpdate turnComplete
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
     * TranscriptUpdate turnComplete.
     * @member {boolean} turnComplete
     * @memberof preppal.TranscriptUpdate
     * @instance
     */
    TranscriptUpdate.prototype.turnComplete = false;

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
      if (!writer) writer = $Writer.create();
      if (
        message.speaker != null &&
        Object.hasOwnProperty.call(message, "speaker")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.speaker);
      if (message.text != null && Object.hasOwnProperty.call(message, "text"))
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.text);
      if (
        message.isFinal != null &&
        Object.hasOwnProperty.call(message, "isFinal")
      )
        writer.uint32(/* id 3, wireType 0 =*/ 24).bool(message.isFinal);
      if (
        message.turnComplete != null &&
        Object.hasOwnProperty.call(message, "turnComplete")
      )
        writer.uint32(/* id 4, wireType 0 =*/ 32).bool(message.turnComplete);
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
    TranscriptUpdate.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.TranscriptUpdate();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
          case 4: {
            message.turnComplete = reader.bool();
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
        if (!$util.isString(message.speaker)) return "speaker: string expected";
      if (message.text != null && message.hasOwnProperty("text"))
        if (!$util.isString(message.text)) return "text: string expected";
      if (message.isFinal != null && message.hasOwnProperty("isFinal"))
        if (typeof message.isFinal !== "boolean")
          return "isFinal: boolean expected";
      if (
        message.turnComplete != null &&
        message.hasOwnProperty("turnComplete")
      )
        if (typeof message.turnComplete !== "boolean")
          return "turnComplete: boolean expected";
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
      if (object instanceof $root.preppal.TranscriptUpdate) return object;
      let message = new $root.preppal.TranscriptUpdate();
      if (object.speaker != null) message.speaker = String(object.speaker);
      if (object.text != null) message.text = String(object.text);
      if (object.isFinal != null) message.isFinal = Boolean(object.isFinal);
      if (object.turnComplete != null)
        message.turnComplete = Boolean(object.turnComplete);
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
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.speaker = "";
        object.text = "";
        object.isFinal = false;
        object.turnComplete = false;
      }
      if (message.speaker != null && message.hasOwnProperty("speaker"))
        object.speaker = message.speaker;
      if (message.text != null && message.hasOwnProperty("text"))
        object.text = message.text;
      if (message.isFinal != null && message.hasOwnProperty("isFinal"))
        object.isFinal = message.isFinal;
      if (
        message.turnComplete != null &&
        message.hasOwnProperty("turnComplete")
      )
        object.turnComplete = message.turnComplete;
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

  preppal.AudioResponse = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
      if (!writer) writer = $Writer.create();
      if (
        message.audioContent != null &&
        Object.hasOwnProperty.call(message, "audioContent")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).bytes(message.audioContent);
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.AudioResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      if (
        message.audioContent != null &&
        message.hasOwnProperty("audioContent")
      )
        if (
          !(
            (message.audioContent &&
              typeof message.audioContent.length === "number") ||
            $util.isString(message.audioContent)
          )
        )
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
      if (object instanceof $root.preppal.AudioResponse) return object;
      let message = new $root.preppal.AudioResponse();
      if (object.audioContent != null)
        if (typeof object.audioContent === "string")
          $util.base64.decode(
            object.audioContent,
            (message.audioContent = $util.newBuffer(
              $util.base64.length(object.audioContent),
            )),
            0,
          );
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
      if (!options) options = {};
      let object = {};
      if (options.defaults)
        if (options.bytes === String) object.audioContent = "";
        else {
          object.audioContent = [];
          if (options.bytes !== Array)
            object.audioContent = $util.newBuffer(object.audioContent);
        }
      if (
        message.audioContent != null &&
        message.hasOwnProperty("audioContent")
      )
        object.audioContent =
          options.bytes === String
            ? $util.base64.encode(
                message.audioContent,
                0,
                message.audioContent.length,
              )
            : options.bytes === Array
              ? Array.prototype.slice.call(message.audioContent)
              : message.audioContent;
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

  preppal.ErrorResponse = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
      if (!writer) writer = $Writer.create();
      if (message.code != null && Object.hasOwnProperty.call(message, "code"))
        writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.code);
      if (
        message.message != null &&
        Object.hasOwnProperty.call(message, "message")
      )
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.message);
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.ErrorResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
        if (!$util.isInteger(message.code)) return "code: integer expected";
      if (message.message != null && message.hasOwnProperty("message"))
        if (!$util.isString(message.message)) return "message: string expected";
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
      if (object instanceof $root.preppal.ErrorResponse) return object;
      let message = new $root.preppal.ErrorResponse();
      if (object.code != null) message.code = object.code | 0;
      if (object.message != null) message.message = String(object.message);
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
      if (!options) options = {};
      let object = {};
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

  preppal.SessionEnded = (function () {
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
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
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
      if (!writer) writer = $Writer.create();
      if (
        message.reason != null &&
        Object.hasOwnProperty.call(message, "reason")
      )
        writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.reason);
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
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.SessionEnded();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
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
      if (object instanceof $root.preppal.SessionEnded) return object;
      let message = new $root.preppal.SessionEnded();
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
      if (!options) options = {};
      let object = {};
      if (options.defaults)
        object.reason = options.enums === String ? "REASON_UNSPECIFIED" : 0;
      if (message.reason != null && message.hasOwnProperty("reason"))
        object.reason =
          options.enums === String
            ? $root.preppal.SessionEnded.Reason[message.reason] === undefined
              ? message.reason
              : $root.preppal.SessionEnded.Reason[message.reason]
            : message.reason;
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
    SessionEnded.Reason = (function () {
      const valuesById = {},
        values = Object.create(valuesById);
      values[(valuesById[0] = "REASON_UNSPECIFIED")] = 0;
      values[(valuesById[1] = "USER_INITIATED")] = 1;
      values[(valuesById[2] = "GEMINI_ENDED")] = 2;
      values[(valuesById[3] = "TIMEOUT")] = 3;
      return values;
    })();

    return SessionEnded;
  })();

  preppal.WorkerApiRequest = (function () {
    /**
     * Properties of a WorkerApiRequest.
     * @memberof preppal
     * @interface IWorkerApiRequest
     * @property {preppal.IGetContextRequest|null} [getContext] WorkerApiRequest getContext
     * @property {preppal.IUpdateStatusRequest|null} [updateStatus] WorkerApiRequest updateStatus
     * @property {preppal.ISubmitTranscriptRequest|null} [submitTranscript] WorkerApiRequest submitTranscript
     * @property {preppal.ISubmitFeedbackRequest|null} [submitFeedback] WorkerApiRequest submitFeedback
     */

    /**
     * Constructs a new WorkerApiRequest.
     * @memberof preppal
     * @classdesc Represents a WorkerApiRequest.
     * @implements IWorkerApiRequest
     * @constructor
     * @param {preppal.IWorkerApiRequest=} [properties] Properties to set
     */
    function WorkerApiRequest(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * WorkerApiRequest getContext.
     * @member {preppal.IGetContextRequest|null|undefined} getContext
     * @memberof preppal.WorkerApiRequest
     * @instance
     */
    WorkerApiRequest.prototype.getContext = null;

    /**
     * WorkerApiRequest updateStatus.
     * @member {preppal.IUpdateStatusRequest|null|undefined} updateStatus
     * @memberof preppal.WorkerApiRequest
     * @instance
     */
    WorkerApiRequest.prototype.updateStatus = null;

    /**
     * WorkerApiRequest submitTranscript.
     * @member {preppal.ISubmitTranscriptRequest|null|undefined} submitTranscript
     * @memberof preppal.WorkerApiRequest
     * @instance
     */
    WorkerApiRequest.prototype.submitTranscript = null;

    /**
     * WorkerApiRequest submitFeedback.
     * @member {preppal.ISubmitFeedbackRequest|null|undefined} submitFeedback
     * @memberof preppal.WorkerApiRequest
     * @instance
     */
    WorkerApiRequest.prototype.submitFeedback = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * WorkerApiRequest request.
     * @member {"getContext"|"updateStatus"|"submitTranscript"|"submitFeedback"|undefined} request
     * @memberof preppal.WorkerApiRequest
     * @instance
     */
    Object.defineProperty(WorkerApiRequest.prototype, "request", {
      get: $util.oneOfGetter(
        ($oneOfFields = [
          "getContext",
          "updateStatus",
          "submitTranscript",
          "submitFeedback",
        ]),
      ),
      set: $util.oneOfSetter($oneOfFields),
    });

    /**
     * Creates a new WorkerApiRequest instance using the specified properties.
     * @function create
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {preppal.IWorkerApiRequest=} [properties] Properties to set
     * @returns {preppal.WorkerApiRequest} WorkerApiRequest instance
     */
    WorkerApiRequest.create = function create(properties) {
      return new WorkerApiRequest(properties);
    };

    /**
     * Encodes the specified WorkerApiRequest message. Does not implicitly {@link preppal.WorkerApiRequest.verify|verify} messages.
     * @function encode
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {preppal.IWorkerApiRequest} message WorkerApiRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerApiRequest.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.getContext != null &&
        Object.hasOwnProperty.call(message, "getContext")
      )
        $root.preppal.GetContextRequest.encode(
          message.getContext,
          writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
        ).ldelim();
      if (
        message.updateStatus != null &&
        Object.hasOwnProperty.call(message, "updateStatus")
      )
        $root.preppal.UpdateStatusRequest.encode(
          message.updateStatus,
          writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
        ).ldelim();
      if (
        message.submitTranscript != null &&
        Object.hasOwnProperty.call(message, "submitTranscript")
      )
        $root.preppal.SubmitTranscriptRequest.encode(
          message.submitTranscript,
          writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
        ).ldelim();
      if (
        message.submitFeedback != null &&
        Object.hasOwnProperty.call(message, "submitFeedback")
      )
        $root.preppal.SubmitFeedbackRequest.encode(
          message.submitFeedback,
          writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
        ).ldelim();
      return writer;
    };

    /**
     * Encodes the specified WorkerApiRequest message, length delimited. Does not implicitly {@link preppal.WorkerApiRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {preppal.IWorkerApiRequest} message WorkerApiRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerApiRequest.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a WorkerApiRequest message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.WorkerApiRequest} WorkerApiRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerApiRequest.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.WorkerApiRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.getContext = $root.preppal.GetContextRequest.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 2: {
            message.updateStatus = $root.preppal.UpdateStatusRequest.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 3: {
            message.submitTranscript =
              $root.preppal.SubmitTranscriptRequest.decode(
                reader,
                reader.uint32(),
              );
            break;
          }
          case 4: {
            message.submitFeedback = $root.preppal.SubmitFeedbackRequest.decode(
              reader,
              reader.uint32(),
            );
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
     * Decodes a WorkerApiRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.WorkerApiRequest} WorkerApiRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerApiRequest.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a WorkerApiRequest message.
     * @function verify
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    WorkerApiRequest.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      let properties = {};
      if (message.getContext != null && message.hasOwnProperty("getContext")) {
        properties.request = 1;
        {
          let error = $root.preppal.GetContextRequest.verify(
            message.getContext,
          );
          if (error) return "getContext." + error;
        }
      }
      if (
        message.updateStatus != null &&
        message.hasOwnProperty("updateStatus")
      ) {
        if (properties.request === 1) return "request: multiple values";
        properties.request = 1;
        {
          let error = $root.preppal.UpdateStatusRequest.verify(
            message.updateStatus,
          );
          if (error) return "updateStatus." + error;
        }
      }
      if (
        message.submitTranscript != null &&
        message.hasOwnProperty("submitTranscript")
      ) {
        if (properties.request === 1) return "request: multiple values";
        properties.request = 1;
        {
          let error = $root.preppal.SubmitTranscriptRequest.verify(
            message.submitTranscript,
          );
          if (error) return "submitTranscript." + error;
        }
      }
      if (
        message.submitFeedback != null &&
        message.hasOwnProperty("submitFeedback")
      ) {
        if (properties.request === 1) return "request: multiple values";
        properties.request = 1;
        {
          let error = $root.preppal.SubmitFeedbackRequest.verify(
            message.submitFeedback,
          );
          if (error) return "submitFeedback." + error;
        }
      }
      return null;
    };

    /**
     * Creates a WorkerApiRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.WorkerApiRequest} WorkerApiRequest
     */
    WorkerApiRequest.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.WorkerApiRequest) return object;
      let message = new $root.preppal.WorkerApiRequest();
      if (object.getContext != null) {
        if (typeof object.getContext !== "object")
          throw TypeError(
            ".preppal.WorkerApiRequest.getContext: object expected",
          );
        message.getContext = $root.preppal.GetContextRequest.fromObject(
          object.getContext,
        );
      }
      if (object.updateStatus != null) {
        if (typeof object.updateStatus !== "object")
          throw TypeError(
            ".preppal.WorkerApiRequest.updateStatus: object expected",
          );
        message.updateStatus = $root.preppal.UpdateStatusRequest.fromObject(
          object.updateStatus,
        );
      }
      if (object.submitTranscript != null) {
        if (typeof object.submitTranscript !== "object")
          throw TypeError(
            ".preppal.WorkerApiRequest.submitTranscript: object expected",
          );
        message.submitTranscript =
          $root.preppal.SubmitTranscriptRequest.fromObject(
            object.submitTranscript,
          );
      }
      if (object.submitFeedback != null) {
        if (typeof object.submitFeedback !== "object")
          throw TypeError(
            ".preppal.WorkerApiRequest.submitFeedback: object expected",
          );
        message.submitFeedback = $root.preppal.SubmitFeedbackRequest.fromObject(
          object.submitFeedback,
        );
      }
      return message;
    };

    /**
     * Creates a plain object from a WorkerApiRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {preppal.WorkerApiRequest} message WorkerApiRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    WorkerApiRequest.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (message.getContext != null && message.hasOwnProperty("getContext")) {
        object.getContext = $root.preppal.GetContextRequest.toObject(
          message.getContext,
          options,
        );
        if (options.oneofs) object.request = "getContext";
      }
      if (
        message.updateStatus != null &&
        message.hasOwnProperty("updateStatus")
      ) {
        object.updateStatus = $root.preppal.UpdateStatusRequest.toObject(
          message.updateStatus,
          options,
        );
        if (options.oneofs) object.request = "updateStatus";
      }
      if (
        message.submitTranscript != null &&
        message.hasOwnProperty("submitTranscript")
      ) {
        object.submitTranscript =
          $root.preppal.SubmitTranscriptRequest.toObject(
            message.submitTranscript,
            options,
          );
        if (options.oneofs) object.request = "submitTranscript";
      }
      if (
        message.submitFeedback != null &&
        message.hasOwnProperty("submitFeedback")
      ) {
        object.submitFeedback = $root.preppal.SubmitFeedbackRequest.toObject(
          message.submitFeedback,
          options,
        );
        if (options.oneofs) object.request = "submitFeedback";
      }
      return object;
    };

    /**
     * Converts this WorkerApiRequest to JSON.
     * @function toJSON
     * @memberof preppal.WorkerApiRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    WorkerApiRequest.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for WorkerApiRequest
     * @function getTypeUrl
     * @memberof preppal.WorkerApiRequest
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    WorkerApiRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.WorkerApiRequest";
    };

    return WorkerApiRequest;
  })();

  preppal.WorkerApiResponse = (function () {
    /**
     * Properties of a WorkerApiResponse.
     * @memberof preppal
     * @interface IWorkerApiResponse
     * @property {preppal.IGetContextResponse|null} [getContext] WorkerApiResponse getContext
     * @property {preppal.IUpdateStatusResponse|null} [updateStatus] WorkerApiResponse updateStatus
     * @property {preppal.ISubmitTranscriptResponse|null} [submitTranscript] WorkerApiResponse submitTranscript
     * @property {preppal.ISubmitFeedbackResponse|null} [submitFeedback] WorkerApiResponse submitFeedback
     * @property {preppal.IApiError|null} [error] WorkerApiResponse error
     */

    /**
     * Constructs a new WorkerApiResponse.
     * @memberof preppal
     * @classdesc Represents a WorkerApiResponse.
     * @implements IWorkerApiResponse
     * @constructor
     * @param {preppal.IWorkerApiResponse=} [properties] Properties to set
     */
    function WorkerApiResponse(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * WorkerApiResponse getContext.
     * @member {preppal.IGetContextResponse|null|undefined} getContext
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    WorkerApiResponse.prototype.getContext = null;

    /**
     * WorkerApiResponse updateStatus.
     * @member {preppal.IUpdateStatusResponse|null|undefined} updateStatus
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    WorkerApiResponse.prototype.updateStatus = null;

    /**
     * WorkerApiResponse submitTranscript.
     * @member {preppal.ISubmitTranscriptResponse|null|undefined} submitTranscript
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    WorkerApiResponse.prototype.submitTranscript = null;

    /**
     * WorkerApiResponse submitFeedback.
     * @member {preppal.ISubmitFeedbackResponse|null|undefined} submitFeedback
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    WorkerApiResponse.prototype.submitFeedback = null;

    /**
     * WorkerApiResponse error.
     * @member {preppal.IApiError|null|undefined} error
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    WorkerApiResponse.prototype.error = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * WorkerApiResponse response.
     * @member {"getContext"|"updateStatus"|"submitTranscript"|"submitFeedback"|"error"|undefined} response
     * @memberof preppal.WorkerApiResponse
     * @instance
     */
    Object.defineProperty(WorkerApiResponse.prototype, "response", {
      get: $util.oneOfGetter(
        ($oneOfFields = [
          "getContext",
          "updateStatus",
          "submitTranscript",
          "submitFeedback",
          "error",
        ]),
      ),
      set: $util.oneOfSetter($oneOfFields),
    });

    /**
     * Creates a new WorkerApiResponse instance using the specified properties.
     * @function create
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {preppal.IWorkerApiResponse=} [properties] Properties to set
     * @returns {preppal.WorkerApiResponse} WorkerApiResponse instance
     */
    WorkerApiResponse.create = function create(properties) {
      return new WorkerApiResponse(properties);
    };

    /**
     * Encodes the specified WorkerApiResponse message. Does not implicitly {@link preppal.WorkerApiResponse.verify|verify} messages.
     * @function encode
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {preppal.IWorkerApiResponse} message WorkerApiResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerApiResponse.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.getContext != null &&
        Object.hasOwnProperty.call(message, "getContext")
      )
        $root.preppal.GetContextResponse.encode(
          message.getContext,
          writer.uint32(/* id 1, wireType 2 =*/ 10).fork(),
        ).ldelim();
      if (
        message.updateStatus != null &&
        Object.hasOwnProperty.call(message, "updateStatus")
      )
        $root.preppal.UpdateStatusResponse.encode(
          message.updateStatus,
          writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
        ).ldelim();
      if (
        message.submitTranscript != null &&
        Object.hasOwnProperty.call(message, "submitTranscript")
      )
        $root.preppal.SubmitTranscriptResponse.encode(
          message.submitTranscript,
          writer.uint32(/* id 3, wireType 2 =*/ 26).fork(),
        ).ldelim();
      if (
        message.submitFeedback != null &&
        Object.hasOwnProperty.call(message, "submitFeedback")
      )
        $root.preppal.SubmitFeedbackResponse.encode(
          message.submitFeedback,
          writer.uint32(/* id 4, wireType 2 =*/ 34).fork(),
        ).ldelim();
      if (message.error != null && Object.hasOwnProperty.call(message, "error"))
        $root.preppal.ApiError.encode(
          message.error,
          writer.uint32(/* id 5, wireType 2 =*/ 42).fork(),
        ).ldelim();
      return writer;
    };

    /**
     * Encodes the specified WorkerApiResponse message, length delimited. Does not implicitly {@link preppal.WorkerApiResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {preppal.IWorkerApiResponse} message WorkerApiResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerApiResponse.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a WorkerApiResponse message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.WorkerApiResponse} WorkerApiResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerApiResponse.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.WorkerApiResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.getContext = $root.preppal.GetContextResponse.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 2: {
            message.updateStatus = $root.preppal.UpdateStatusResponse.decode(
              reader,
              reader.uint32(),
            );
            break;
          }
          case 3: {
            message.submitTranscript =
              $root.preppal.SubmitTranscriptResponse.decode(
                reader,
                reader.uint32(),
              );
            break;
          }
          case 4: {
            message.submitFeedback =
              $root.preppal.SubmitFeedbackResponse.decode(
                reader,
                reader.uint32(),
              );
            break;
          }
          case 5: {
            message.error = $root.preppal.ApiError.decode(
              reader,
              reader.uint32(),
            );
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
     * Decodes a WorkerApiResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.WorkerApiResponse} WorkerApiResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerApiResponse.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a WorkerApiResponse message.
     * @function verify
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    WorkerApiResponse.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      let properties = {};
      if (message.getContext != null && message.hasOwnProperty("getContext")) {
        properties.response = 1;
        {
          let error = $root.preppal.GetContextResponse.verify(
            message.getContext,
          );
          if (error) return "getContext." + error;
        }
      }
      if (
        message.updateStatus != null &&
        message.hasOwnProperty("updateStatus")
      ) {
        if (properties.response === 1) return "response: multiple values";
        properties.response = 1;
        {
          let error = $root.preppal.UpdateStatusResponse.verify(
            message.updateStatus,
          );
          if (error) return "updateStatus." + error;
        }
      }
      if (
        message.submitTranscript != null &&
        message.hasOwnProperty("submitTranscript")
      ) {
        if (properties.response === 1) return "response: multiple values";
        properties.response = 1;
        {
          let error = $root.preppal.SubmitTranscriptResponse.verify(
            message.submitTranscript,
          );
          if (error) return "submitTranscript." + error;
        }
      }
      if (
        message.submitFeedback != null &&
        message.hasOwnProperty("submitFeedback")
      ) {
        if (properties.response === 1) return "response: multiple values";
        properties.response = 1;
        {
          let error = $root.preppal.SubmitFeedbackResponse.verify(
            message.submitFeedback,
          );
          if (error) return "submitFeedback." + error;
        }
      }
      if (message.error != null && message.hasOwnProperty("error")) {
        if (properties.response === 1) return "response: multiple values";
        properties.response = 1;
        {
          let error = $root.preppal.ApiError.verify(message.error);
          if (error) return "error." + error;
        }
      }
      return null;
    };

    /**
     * Creates a WorkerApiResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.WorkerApiResponse} WorkerApiResponse
     */
    WorkerApiResponse.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.WorkerApiResponse) return object;
      let message = new $root.preppal.WorkerApiResponse();
      if (object.getContext != null) {
        if (typeof object.getContext !== "object")
          throw TypeError(
            ".preppal.WorkerApiResponse.getContext: object expected",
          );
        message.getContext = $root.preppal.GetContextResponse.fromObject(
          object.getContext,
        );
      }
      if (object.updateStatus != null) {
        if (typeof object.updateStatus !== "object")
          throw TypeError(
            ".preppal.WorkerApiResponse.updateStatus: object expected",
          );
        message.updateStatus = $root.preppal.UpdateStatusResponse.fromObject(
          object.updateStatus,
        );
      }
      if (object.submitTranscript != null) {
        if (typeof object.submitTranscript !== "object")
          throw TypeError(
            ".preppal.WorkerApiResponse.submitTranscript: object expected",
          );
        message.submitTranscript =
          $root.preppal.SubmitTranscriptResponse.fromObject(
            object.submitTranscript,
          );
      }
      if (object.submitFeedback != null) {
        if (typeof object.submitFeedback !== "object")
          throw TypeError(
            ".preppal.WorkerApiResponse.submitFeedback: object expected",
          );
        message.submitFeedback =
          $root.preppal.SubmitFeedbackResponse.fromObject(
            object.submitFeedback,
          );
      }
      if (object.error != null) {
        if (typeof object.error !== "object")
          throw TypeError(".preppal.WorkerApiResponse.error: object expected");
        message.error = $root.preppal.ApiError.fromObject(object.error);
      }
      return message;
    };

    /**
     * Creates a plain object from a WorkerApiResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {preppal.WorkerApiResponse} message WorkerApiResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    WorkerApiResponse.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (message.getContext != null && message.hasOwnProperty("getContext")) {
        object.getContext = $root.preppal.GetContextResponse.toObject(
          message.getContext,
          options,
        );
        if (options.oneofs) object.response = "getContext";
      }
      if (
        message.updateStatus != null &&
        message.hasOwnProperty("updateStatus")
      ) {
        object.updateStatus = $root.preppal.UpdateStatusResponse.toObject(
          message.updateStatus,
          options,
        );
        if (options.oneofs) object.response = "updateStatus";
      }
      if (
        message.submitTranscript != null &&
        message.hasOwnProperty("submitTranscript")
      ) {
        object.submitTranscript =
          $root.preppal.SubmitTranscriptResponse.toObject(
            message.submitTranscript,
            options,
          );
        if (options.oneofs) object.response = "submitTranscript";
      }
      if (
        message.submitFeedback != null &&
        message.hasOwnProperty("submitFeedback")
      ) {
        object.submitFeedback = $root.preppal.SubmitFeedbackResponse.toObject(
          message.submitFeedback,
          options,
        );
        if (options.oneofs) object.response = "submitFeedback";
      }
      if (message.error != null && message.hasOwnProperty("error")) {
        object.error = $root.preppal.ApiError.toObject(message.error, options);
        if (options.oneofs) object.response = "error";
      }
      return object;
    };

    /**
     * Converts this WorkerApiResponse to JSON.
     * @function toJSON
     * @memberof preppal.WorkerApiResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    WorkerApiResponse.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for WorkerApiResponse
     * @function getTypeUrl
     * @memberof preppal.WorkerApiResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    WorkerApiResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.WorkerApiResponse";
    };

    return WorkerApiResponse;
  })();

  preppal.GetContextRequest = (function () {
    /**
     * Properties of a GetContextRequest.
     * @memberof preppal
     * @interface IGetContextRequest
     * @property {string|null} [interviewId] GetContextRequest interviewId
     */

    /**
     * Constructs a new GetContextRequest.
     * @memberof preppal
     * @classdesc Represents a GetContextRequest.
     * @implements IGetContextRequest
     * @constructor
     * @param {preppal.IGetContextRequest=} [properties] Properties to set
     */
    function GetContextRequest(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * GetContextRequest interviewId.
     * @member {string} interviewId
     * @memberof preppal.GetContextRequest
     * @instance
     */
    GetContextRequest.prototype.interviewId = "";

    /**
     * Creates a new GetContextRequest instance using the specified properties.
     * @function create
     * @memberof preppal.GetContextRequest
     * @static
     * @param {preppal.IGetContextRequest=} [properties] Properties to set
     * @returns {preppal.GetContextRequest} GetContextRequest instance
     */
    GetContextRequest.create = function create(properties) {
      return new GetContextRequest(properties);
    };

    /**
     * Encodes the specified GetContextRequest message. Does not implicitly {@link preppal.GetContextRequest.verify|verify} messages.
     * @function encode
     * @memberof preppal.GetContextRequest
     * @static
     * @param {preppal.IGetContextRequest} message GetContextRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetContextRequest.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.interviewId != null &&
        Object.hasOwnProperty.call(message, "interviewId")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.interviewId);
      return writer;
    };

    /**
     * Encodes the specified GetContextRequest message, length delimited. Does not implicitly {@link preppal.GetContextRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.GetContextRequest
     * @static
     * @param {preppal.IGetContextRequest} message GetContextRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetContextRequest.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a GetContextRequest message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.GetContextRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.GetContextRequest} GetContextRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetContextRequest.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.GetContextRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.interviewId = reader.string();
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
     * Decodes a GetContextRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.GetContextRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.GetContextRequest} GetContextRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetContextRequest.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a GetContextRequest message.
     * @function verify
     * @memberof preppal.GetContextRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    GetContextRequest.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        if (!$util.isString(message.interviewId))
          return "interviewId: string expected";
      return null;
    };

    /**
     * Creates a GetContextRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.GetContextRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.GetContextRequest} GetContextRequest
     */
    GetContextRequest.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.GetContextRequest) return object;
      let message = new $root.preppal.GetContextRequest();
      if (object.interviewId != null)
        message.interviewId = String(object.interviewId);
      return message;
    };

    /**
     * Creates a plain object from a GetContextRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.GetContextRequest
     * @static
     * @param {preppal.GetContextRequest} message GetContextRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    GetContextRequest.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) object.interviewId = "";
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        object.interviewId = message.interviewId;
      return object;
    };

    /**
     * Converts this GetContextRequest to JSON.
     * @function toJSON
     * @memberof preppal.GetContextRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    GetContextRequest.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for GetContextRequest
     * @function getTypeUrl
     * @memberof preppal.GetContextRequest
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    GetContextRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.GetContextRequest";
    };

    return GetContextRequest;
  })();

  preppal.GetContextResponse = (function () {
    /**
     * Properties of a GetContextResponse.
     * @memberof preppal
     * @interface IGetContextResponse
     * @property {string|null} [jobDescription] GetContextResponse jobDescription
     * @property {string|null} [resume] GetContextResponse resume
     * @property {string|null} [persona] GetContextResponse persona
     * @property {number|null} [durationMs] GetContextResponse durationMs
     */

    /**
     * Constructs a new GetContextResponse.
     * @memberof preppal
     * @classdesc Represents a GetContextResponse.
     * @implements IGetContextResponse
     * @constructor
     * @param {preppal.IGetContextResponse=} [properties] Properties to set
     */
    function GetContextResponse(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * GetContextResponse jobDescription.
     * @member {string} jobDescription
     * @memberof preppal.GetContextResponse
     * @instance
     */
    GetContextResponse.prototype.jobDescription = "";

    /**
     * GetContextResponse resume.
     * @member {string} resume
     * @memberof preppal.GetContextResponse
     * @instance
     */
    GetContextResponse.prototype.resume = "";

    /**
     * GetContextResponse persona.
     * @member {string} persona
     * @memberof preppal.GetContextResponse
     * @instance
     */
    GetContextResponse.prototype.persona = "";

    /**
     * GetContextResponse durationMs.
     * @member {number} durationMs
     * @memberof preppal.GetContextResponse
     * @instance
     */
    GetContextResponse.prototype.durationMs = 0;

    /**
     * Creates a new GetContextResponse instance using the specified properties.
     * @function create
     * @memberof preppal.GetContextResponse
     * @static
     * @param {preppal.IGetContextResponse=} [properties] Properties to set
     * @returns {preppal.GetContextResponse} GetContextResponse instance
     */
    GetContextResponse.create = function create(properties) {
      return new GetContextResponse(properties);
    };

    /**
     * Encodes the specified GetContextResponse message. Does not implicitly {@link preppal.GetContextResponse.verify|verify} messages.
     * @function encode
     * @memberof preppal.GetContextResponse
     * @static
     * @param {preppal.IGetContextResponse} message GetContextResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetContextResponse.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.jobDescription != null &&
        Object.hasOwnProperty.call(message, "jobDescription")
      )
        writer
          .uint32(/* id 1, wireType 2 =*/ 10)
          .string(message.jobDescription);
      if (
        message.resume != null &&
        Object.hasOwnProperty.call(message, "resume")
      )
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.resume);
      if (
        message.persona != null &&
        Object.hasOwnProperty.call(message, "persona")
      )
        writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.persona);
      if (
        message.durationMs != null &&
        Object.hasOwnProperty.call(message, "durationMs")
      )
        writer.uint32(/* id 4, wireType 0 =*/ 32).int32(message.durationMs);
      return writer;
    };

    /**
     * Encodes the specified GetContextResponse message, length delimited. Does not implicitly {@link preppal.GetContextResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.GetContextResponse
     * @static
     * @param {preppal.IGetContextResponse} message GetContextResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetContextResponse.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a GetContextResponse message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.GetContextResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.GetContextResponse} GetContextResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetContextResponse.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.GetContextResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.jobDescription = reader.string();
            break;
          }
          case 2: {
            message.resume = reader.string();
            break;
          }
          case 3: {
            message.persona = reader.string();
            break;
          }
          case 4: {
            message.durationMs = reader.int32();
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
     * Decodes a GetContextResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.GetContextResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.GetContextResponse} GetContextResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetContextResponse.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a GetContextResponse message.
     * @function verify
     * @memberof preppal.GetContextResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    GetContextResponse.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (
        message.jobDescription != null &&
        message.hasOwnProperty("jobDescription")
      )
        if (!$util.isString(message.jobDescription))
          return "jobDescription: string expected";
      if (message.resume != null && message.hasOwnProperty("resume"))
        if (!$util.isString(message.resume)) return "resume: string expected";
      if (message.persona != null && message.hasOwnProperty("persona"))
        if (!$util.isString(message.persona)) return "persona: string expected";
      if (message.durationMs != null && message.hasOwnProperty("durationMs"))
        if (!$util.isInteger(message.durationMs))
          return "durationMs: integer expected";
      return null;
    };

    /**
     * Creates a GetContextResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.GetContextResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.GetContextResponse} GetContextResponse
     */
    GetContextResponse.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.GetContextResponse) return object;
      let message = new $root.preppal.GetContextResponse();
      if (object.jobDescription != null)
        message.jobDescription = String(object.jobDescription);
      if (object.resume != null) message.resume = String(object.resume);
      if (object.persona != null) message.persona = String(object.persona);
      if (object.durationMs != null) message.durationMs = object.durationMs | 0;
      return message;
    };

    /**
     * Creates a plain object from a GetContextResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.GetContextResponse
     * @static
     * @param {preppal.GetContextResponse} message GetContextResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    GetContextResponse.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.jobDescription = "";
        object.resume = "";
        object.persona = "";
        object.durationMs = 0;
      }
      if (
        message.jobDescription != null &&
        message.hasOwnProperty("jobDescription")
      )
        object.jobDescription = message.jobDescription;
      if (message.resume != null && message.hasOwnProperty("resume"))
        object.resume = message.resume;
      if (message.persona != null && message.hasOwnProperty("persona"))
        object.persona = message.persona;
      if (message.durationMs != null && message.hasOwnProperty("durationMs"))
        object.durationMs = message.durationMs;
      return object;
    };

    /**
     * Converts this GetContextResponse to JSON.
     * @function toJSON
     * @memberof preppal.GetContextResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    GetContextResponse.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for GetContextResponse
     * @function getTypeUrl
     * @memberof preppal.GetContextResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    GetContextResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.GetContextResponse";
    };

    return GetContextResponse;
  })();

  preppal.UpdateStatusRequest = (function () {
    /**
     * Properties of an UpdateStatusRequest.
     * @memberof preppal
     * @interface IUpdateStatusRequest
     * @property {string|null} [interviewId] UpdateStatusRequest interviewId
     * @property {preppal.InterviewStatus|null} [status] UpdateStatusRequest status
     * @property {string|null} [endedAt] UpdateStatusRequest endedAt
     */

    /**
     * Constructs a new UpdateStatusRequest.
     * @memberof preppal
     * @classdesc Represents an UpdateStatusRequest.
     * @implements IUpdateStatusRequest
     * @constructor
     * @param {preppal.IUpdateStatusRequest=} [properties] Properties to set
     */
    function UpdateStatusRequest(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * UpdateStatusRequest interviewId.
     * @member {string} interviewId
     * @memberof preppal.UpdateStatusRequest
     * @instance
     */
    UpdateStatusRequest.prototype.interviewId = "";

    /**
     * UpdateStatusRequest status.
     * @member {preppal.InterviewStatus} status
     * @memberof preppal.UpdateStatusRequest
     * @instance
     */
    UpdateStatusRequest.prototype.status = 0;

    /**
     * UpdateStatusRequest endedAt.
     * @member {string} endedAt
     * @memberof preppal.UpdateStatusRequest
     * @instance
     */
    UpdateStatusRequest.prototype.endedAt = "";

    /**
     * Creates a new UpdateStatusRequest instance using the specified properties.
     * @function create
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {preppal.IUpdateStatusRequest=} [properties] Properties to set
     * @returns {preppal.UpdateStatusRequest} UpdateStatusRequest instance
     */
    UpdateStatusRequest.create = function create(properties) {
      return new UpdateStatusRequest(properties);
    };

    /**
     * Encodes the specified UpdateStatusRequest message. Does not implicitly {@link preppal.UpdateStatusRequest.verify|verify} messages.
     * @function encode
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {preppal.IUpdateStatusRequest} message UpdateStatusRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UpdateStatusRequest.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.interviewId != null &&
        Object.hasOwnProperty.call(message, "interviewId")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.interviewId);
      if (
        message.status != null &&
        Object.hasOwnProperty.call(message, "status")
      )
        writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.status);
      if (
        message.endedAt != null &&
        Object.hasOwnProperty.call(message, "endedAt")
      )
        writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.endedAt);
      return writer;
    };

    /**
     * Encodes the specified UpdateStatusRequest message, length delimited. Does not implicitly {@link preppal.UpdateStatusRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {preppal.IUpdateStatusRequest} message UpdateStatusRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UpdateStatusRequest.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an UpdateStatusRequest message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.UpdateStatusRequest} UpdateStatusRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UpdateStatusRequest.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.UpdateStatusRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.interviewId = reader.string();
            break;
          }
          case 2: {
            message.status = reader.int32();
            break;
          }
          case 3: {
            message.endedAt = reader.string();
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
     * Decodes an UpdateStatusRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.UpdateStatusRequest} UpdateStatusRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UpdateStatusRequest.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an UpdateStatusRequest message.
     * @function verify
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    UpdateStatusRequest.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        if (!$util.isString(message.interviewId))
          return "interviewId: string expected";
      if (message.status != null && message.hasOwnProperty("status"))
        switch (message.status) {
          default:
            return "status: enum value expected";
          case 0:
          case 1:
          case 2:
          case 3:
            break;
        }
      if (message.endedAt != null && message.hasOwnProperty("endedAt"))
        if (!$util.isString(message.endedAt)) return "endedAt: string expected";
      return null;
    };

    /**
     * Creates an UpdateStatusRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.UpdateStatusRequest} UpdateStatusRequest
     */
    UpdateStatusRequest.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.UpdateStatusRequest) return object;
      let message = new $root.preppal.UpdateStatusRequest();
      if (object.interviewId != null)
        message.interviewId = String(object.interviewId);
      switch (object.status) {
        default:
          if (typeof object.status === "number") {
            message.status = object.status;
            break;
          }
          break;
        case "STATUS_UNSPECIFIED":
        case 0:
          message.status = 0;
          break;
        case "IN_PROGRESS":
        case 1:
          message.status = 1;
          break;
        case "COMPLETED":
        case 2:
          message.status = 2;
          break;
        case "ERROR":
        case 3:
          message.status = 3;
          break;
      }
      if (object.endedAt != null) message.endedAt = String(object.endedAt);
      return message;
    };

    /**
     * Creates a plain object from an UpdateStatusRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {preppal.UpdateStatusRequest} message UpdateStatusRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    UpdateStatusRequest.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.interviewId = "";
        object.status = options.enums === String ? "STATUS_UNSPECIFIED" : 0;
        object.endedAt = "";
      }
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        object.interviewId = message.interviewId;
      if (message.status != null && message.hasOwnProperty("status"))
        object.status =
          options.enums === String
            ? $root.preppal.InterviewStatus[message.status] === undefined
              ? message.status
              : $root.preppal.InterviewStatus[message.status]
            : message.status;
      if (message.endedAt != null && message.hasOwnProperty("endedAt"))
        object.endedAt = message.endedAt;
      return object;
    };

    /**
     * Converts this UpdateStatusRequest to JSON.
     * @function toJSON
     * @memberof preppal.UpdateStatusRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    UpdateStatusRequest.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for UpdateStatusRequest
     * @function getTypeUrl
     * @memberof preppal.UpdateStatusRequest
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    UpdateStatusRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.UpdateStatusRequest";
    };

    return UpdateStatusRequest;
  })();

  /**
   * InterviewStatus enum.
   * @name preppal.InterviewStatus
   * @enum {number}
   * @property {number} STATUS_UNSPECIFIED=0 STATUS_UNSPECIFIED value
   * @property {number} IN_PROGRESS=1 IN_PROGRESS value
   * @property {number} COMPLETED=2 COMPLETED value
   * @property {number} ERROR=3 ERROR value
   */
  preppal.InterviewStatus = (function () {
    const valuesById = {},
      values = Object.create(valuesById);
    values[(valuesById[0] = "STATUS_UNSPECIFIED")] = 0;
    values[(valuesById[1] = "IN_PROGRESS")] = 1;
    values[(valuesById[2] = "COMPLETED")] = 2;
    values[(valuesById[3] = "ERROR")] = 3;
    return values;
  })();

  preppal.UpdateStatusResponse = (function () {
    /**
     * Properties of an UpdateStatusResponse.
     * @memberof preppal
     * @interface IUpdateStatusResponse
     * @property {boolean|null} [success] UpdateStatusResponse success
     */

    /**
     * Constructs a new UpdateStatusResponse.
     * @memberof preppal
     * @classdesc Represents an UpdateStatusResponse.
     * @implements IUpdateStatusResponse
     * @constructor
     * @param {preppal.IUpdateStatusResponse=} [properties] Properties to set
     */
    function UpdateStatusResponse(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * UpdateStatusResponse success.
     * @member {boolean} success
     * @memberof preppal.UpdateStatusResponse
     * @instance
     */
    UpdateStatusResponse.prototype.success = false;

    /**
     * Creates a new UpdateStatusResponse instance using the specified properties.
     * @function create
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {preppal.IUpdateStatusResponse=} [properties] Properties to set
     * @returns {preppal.UpdateStatusResponse} UpdateStatusResponse instance
     */
    UpdateStatusResponse.create = function create(properties) {
      return new UpdateStatusResponse(properties);
    };

    /**
     * Encodes the specified UpdateStatusResponse message. Does not implicitly {@link preppal.UpdateStatusResponse.verify|verify} messages.
     * @function encode
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {preppal.IUpdateStatusResponse} message UpdateStatusResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UpdateStatusResponse.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.success != null &&
        Object.hasOwnProperty.call(message, "success")
      )
        writer.uint32(/* id 1, wireType 0 =*/ 8).bool(message.success);
      return writer;
    };

    /**
     * Encodes the specified UpdateStatusResponse message, length delimited. Does not implicitly {@link preppal.UpdateStatusResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {preppal.IUpdateStatusResponse} message UpdateStatusResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UpdateStatusResponse.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an UpdateStatusResponse message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.UpdateStatusResponse} UpdateStatusResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UpdateStatusResponse.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.UpdateStatusResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.success = reader.bool();
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
     * Decodes an UpdateStatusResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.UpdateStatusResponse} UpdateStatusResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UpdateStatusResponse.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an UpdateStatusResponse message.
     * @function verify
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    UpdateStatusResponse.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.success != null && message.hasOwnProperty("success"))
        if (typeof message.success !== "boolean")
          return "success: boolean expected";
      return null;
    };

    /**
     * Creates an UpdateStatusResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.UpdateStatusResponse} UpdateStatusResponse
     */
    UpdateStatusResponse.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.UpdateStatusResponse) return object;
      let message = new $root.preppal.UpdateStatusResponse();
      if (object.success != null) message.success = Boolean(object.success);
      return message;
    };

    /**
     * Creates a plain object from an UpdateStatusResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {preppal.UpdateStatusResponse} message UpdateStatusResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    UpdateStatusResponse.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) object.success = false;
      if (message.success != null && message.hasOwnProperty("success"))
        object.success = message.success;
      return object;
    };

    /**
     * Converts this UpdateStatusResponse to JSON.
     * @function toJSON
     * @memberof preppal.UpdateStatusResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    UpdateStatusResponse.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for UpdateStatusResponse
     * @function getTypeUrl
     * @memberof preppal.UpdateStatusResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    UpdateStatusResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.UpdateStatusResponse";
    };

    return UpdateStatusResponse;
  })();

  preppal.SubmitTranscriptRequest = (function () {
    /**
     * Properties of a SubmitTranscriptRequest.
     * @memberof preppal
     * @interface ISubmitTranscriptRequest
     * @property {string|null} [interviewId] SubmitTranscriptRequest interviewId
     * @property {Array.<preppal.IWorkerTranscriptEntry>|null} [entries] SubmitTranscriptRequest entries
     * @property {string|null} [endedAt] SubmitTranscriptRequest endedAt
     */

    /**
     * Constructs a new SubmitTranscriptRequest.
     * @memberof preppal
     * @classdesc Represents a SubmitTranscriptRequest.
     * @implements ISubmitTranscriptRequest
     * @constructor
     * @param {preppal.ISubmitTranscriptRequest=} [properties] Properties to set
     */
    function SubmitTranscriptRequest(properties) {
      this.entries = [];
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * SubmitTranscriptRequest interviewId.
     * @member {string} interviewId
     * @memberof preppal.SubmitTranscriptRequest
     * @instance
     */
    SubmitTranscriptRequest.prototype.interviewId = "";

    /**
     * SubmitTranscriptRequest entries.
     * @member {Array.<preppal.IWorkerTranscriptEntry>} entries
     * @memberof preppal.SubmitTranscriptRequest
     * @instance
     */
    SubmitTranscriptRequest.prototype.entries = $util.emptyArray;

    /**
     * SubmitTranscriptRequest endedAt.
     * @member {string} endedAt
     * @memberof preppal.SubmitTranscriptRequest
     * @instance
     */
    SubmitTranscriptRequest.prototype.endedAt = "";

    /**
     * Creates a new SubmitTranscriptRequest instance using the specified properties.
     * @function create
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {preppal.ISubmitTranscriptRequest=} [properties] Properties to set
     * @returns {preppal.SubmitTranscriptRequest} SubmitTranscriptRequest instance
     */
    SubmitTranscriptRequest.create = function create(properties) {
      return new SubmitTranscriptRequest(properties);
    };

    /**
     * Encodes the specified SubmitTranscriptRequest message. Does not implicitly {@link preppal.SubmitTranscriptRequest.verify|verify} messages.
     * @function encode
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {preppal.ISubmitTranscriptRequest} message SubmitTranscriptRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitTranscriptRequest.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.interviewId != null &&
        Object.hasOwnProperty.call(message, "interviewId")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.interviewId);
      if (message.entries != null && message.entries.length)
        for (let i = 0; i < message.entries.length; ++i)
          $root.preppal.WorkerTranscriptEntry.encode(
            message.entries[i],
            writer.uint32(/* id 2, wireType 2 =*/ 18).fork(),
          ).ldelim();
      if (
        message.endedAt != null &&
        Object.hasOwnProperty.call(message, "endedAt")
      )
        writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.endedAt);
      return writer;
    };

    /**
     * Encodes the specified SubmitTranscriptRequest message, length delimited. Does not implicitly {@link preppal.SubmitTranscriptRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {preppal.ISubmitTranscriptRequest} message SubmitTranscriptRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitTranscriptRequest.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SubmitTranscriptRequest message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.SubmitTranscriptRequest} SubmitTranscriptRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitTranscriptRequest.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.SubmitTranscriptRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.interviewId = reader.string();
            break;
          }
          case 2: {
            if (!(message.entries && message.entries.length))
              message.entries = [];
            message.entries.push(
              $root.preppal.WorkerTranscriptEntry.decode(
                reader,
                reader.uint32(),
              ),
            );
            break;
          }
          case 3: {
            message.endedAt = reader.string();
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
     * Decodes a SubmitTranscriptRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.SubmitTranscriptRequest} SubmitTranscriptRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitTranscriptRequest.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SubmitTranscriptRequest message.
     * @function verify
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SubmitTranscriptRequest.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        if (!$util.isString(message.interviewId))
          return "interviewId: string expected";
      if (message.entries != null && message.hasOwnProperty("entries")) {
        if (!Array.isArray(message.entries)) return "entries: array expected";
        for (let i = 0; i < message.entries.length; ++i) {
          let error = $root.preppal.WorkerTranscriptEntry.verify(
            message.entries[i],
          );
          if (error) return "entries." + error;
        }
      }
      if (message.endedAt != null && message.hasOwnProperty("endedAt"))
        if (!$util.isString(message.endedAt)) return "endedAt: string expected";
      return null;
    };

    /**
     * Creates a SubmitTranscriptRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.SubmitTranscriptRequest} SubmitTranscriptRequest
     */
    SubmitTranscriptRequest.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.SubmitTranscriptRequest)
        return object;
      let message = new $root.preppal.SubmitTranscriptRequest();
      if (object.interviewId != null)
        message.interviewId = String(object.interviewId);
      if (object.entries) {
        if (!Array.isArray(object.entries))
          throw TypeError(
            ".preppal.SubmitTranscriptRequest.entries: array expected",
          );
        message.entries = [];
        for (let i = 0; i < object.entries.length; ++i) {
          if (typeof object.entries[i] !== "object")
            throw TypeError(
              ".preppal.SubmitTranscriptRequest.entries: object expected",
            );
          message.entries[i] = $root.preppal.WorkerTranscriptEntry.fromObject(
            object.entries[i],
          );
        }
      }
      if (object.endedAt != null) message.endedAt = String(object.endedAt);
      return message;
    };

    /**
     * Creates a plain object from a SubmitTranscriptRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {preppal.SubmitTranscriptRequest} message SubmitTranscriptRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SubmitTranscriptRequest.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.arrays || options.defaults) object.entries = [];
      if (options.defaults) {
        object.interviewId = "";
        object.endedAt = "";
      }
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        object.interviewId = message.interviewId;
      if (message.entries && message.entries.length) {
        object.entries = [];
        for (let j = 0; j < message.entries.length; ++j)
          object.entries[j] = $root.preppal.WorkerTranscriptEntry.toObject(
            message.entries[j],
            options,
          );
      }
      if (message.endedAt != null && message.hasOwnProperty("endedAt"))
        object.endedAt = message.endedAt;
      return object;
    };

    /**
     * Converts this SubmitTranscriptRequest to JSON.
     * @function toJSON
     * @memberof preppal.SubmitTranscriptRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SubmitTranscriptRequest.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SubmitTranscriptRequest
     * @function getTypeUrl
     * @memberof preppal.SubmitTranscriptRequest
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SubmitTranscriptRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.SubmitTranscriptRequest";
    };

    return SubmitTranscriptRequest;
  })();

  preppal.WorkerTranscriptEntry = (function () {
    /**
     * Properties of a WorkerTranscriptEntry.
     * @memberof preppal
     * @interface IWorkerTranscriptEntry
     * @property {string|null} [speaker] WorkerTranscriptEntry speaker
     * @property {string|null} [content] WorkerTranscriptEntry content
     * @property {string|null} [timestamp] WorkerTranscriptEntry timestamp
     */

    /**
     * Constructs a new WorkerTranscriptEntry.
     * @memberof preppal
     * @classdesc Represents a WorkerTranscriptEntry.
     * @implements IWorkerTranscriptEntry
     * @constructor
     * @param {preppal.IWorkerTranscriptEntry=} [properties] Properties to set
     */
    function WorkerTranscriptEntry(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * WorkerTranscriptEntry speaker.
     * @member {string} speaker
     * @memberof preppal.WorkerTranscriptEntry
     * @instance
     */
    WorkerTranscriptEntry.prototype.speaker = "";

    /**
     * WorkerTranscriptEntry content.
     * @member {string} content
     * @memberof preppal.WorkerTranscriptEntry
     * @instance
     */
    WorkerTranscriptEntry.prototype.content = "";

    /**
     * WorkerTranscriptEntry timestamp.
     * @member {string} timestamp
     * @memberof preppal.WorkerTranscriptEntry
     * @instance
     */
    WorkerTranscriptEntry.prototype.timestamp = "";

    /**
     * Creates a new WorkerTranscriptEntry instance using the specified properties.
     * @function create
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {preppal.IWorkerTranscriptEntry=} [properties] Properties to set
     * @returns {preppal.WorkerTranscriptEntry} WorkerTranscriptEntry instance
     */
    WorkerTranscriptEntry.create = function create(properties) {
      return new WorkerTranscriptEntry(properties);
    };

    /**
     * Encodes the specified WorkerTranscriptEntry message. Does not implicitly {@link preppal.WorkerTranscriptEntry.verify|verify} messages.
     * @function encode
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {preppal.IWorkerTranscriptEntry} message WorkerTranscriptEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerTranscriptEntry.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.speaker != null &&
        Object.hasOwnProperty.call(message, "speaker")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.speaker);
      if (
        message.content != null &&
        Object.hasOwnProperty.call(message, "content")
      )
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.content);
      if (
        message.timestamp != null &&
        Object.hasOwnProperty.call(message, "timestamp")
      )
        writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.timestamp);
      return writer;
    };

    /**
     * Encodes the specified WorkerTranscriptEntry message, length delimited. Does not implicitly {@link preppal.WorkerTranscriptEntry.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {preppal.IWorkerTranscriptEntry} message WorkerTranscriptEntry message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    WorkerTranscriptEntry.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a WorkerTranscriptEntry message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.WorkerTranscriptEntry} WorkerTranscriptEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerTranscriptEntry.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.WorkerTranscriptEntry();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.speaker = reader.string();
            break;
          }
          case 2: {
            message.content = reader.string();
            break;
          }
          case 3: {
            message.timestamp = reader.string();
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
     * Decodes a WorkerTranscriptEntry message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.WorkerTranscriptEntry} WorkerTranscriptEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    WorkerTranscriptEntry.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a WorkerTranscriptEntry message.
     * @function verify
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    WorkerTranscriptEntry.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.speaker != null && message.hasOwnProperty("speaker"))
        if (!$util.isString(message.speaker)) return "speaker: string expected";
      if (message.content != null && message.hasOwnProperty("content"))
        if (!$util.isString(message.content)) return "content: string expected";
      if (message.timestamp != null && message.hasOwnProperty("timestamp"))
        if (!$util.isString(message.timestamp))
          return "timestamp: string expected";
      return null;
    };

    /**
     * Creates a WorkerTranscriptEntry message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.WorkerTranscriptEntry} WorkerTranscriptEntry
     */
    WorkerTranscriptEntry.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.WorkerTranscriptEntry) return object;
      let message = new $root.preppal.WorkerTranscriptEntry();
      if (object.speaker != null) message.speaker = String(object.speaker);
      if (object.content != null) message.content = String(object.content);
      if (object.timestamp != null)
        message.timestamp = String(object.timestamp);
      return message;
    };

    /**
     * Creates a plain object from a WorkerTranscriptEntry message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {preppal.WorkerTranscriptEntry} message WorkerTranscriptEntry
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    WorkerTranscriptEntry.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.speaker = "";
        object.content = "";
        object.timestamp = "";
      }
      if (message.speaker != null && message.hasOwnProperty("speaker"))
        object.speaker = message.speaker;
      if (message.content != null && message.hasOwnProperty("content"))
        object.content = message.content;
      if (message.timestamp != null && message.hasOwnProperty("timestamp"))
        object.timestamp = message.timestamp;
      return object;
    };

    /**
     * Converts this WorkerTranscriptEntry to JSON.
     * @function toJSON
     * @memberof preppal.WorkerTranscriptEntry
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    WorkerTranscriptEntry.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for WorkerTranscriptEntry
     * @function getTypeUrl
     * @memberof preppal.WorkerTranscriptEntry
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    WorkerTranscriptEntry.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.WorkerTranscriptEntry";
    };

    return WorkerTranscriptEntry;
  })();

  preppal.SubmitTranscriptResponse = (function () {
    /**
     * Properties of a SubmitTranscriptResponse.
     * @memberof preppal
     * @interface ISubmitTranscriptResponse
     * @property {boolean|null} [success] SubmitTranscriptResponse success
     */

    /**
     * Constructs a new SubmitTranscriptResponse.
     * @memberof preppal
     * @classdesc Represents a SubmitTranscriptResponse.
     * @implements ISubmitTranscriptResponse
     * @constructor
     * @param {preppal.ISubmitTranscriptResponse=} [properties] Properties to set
     */
    function SubmitTranscriptResponse(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * SubmitTranscriptResponse success.
     * @member {boolean} success
     * @memberof preppal.SubmitTranscriptResponse
     * @instance
     */
    SubmitTranscriptResponse.prototype.success = false;

    /**
     * Creates a new SubmitTranscriptResponse instance using the specified properties.
     * @function create
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {preppal.ISubmitTranscriptResponse=} [properties] Properties to set
     * @returns {preppal.SubmitTranscriptResponse} SubmitTranscriptResponse instance
     */
    SubmitTranscriptResponse.create = function create(properties) {
      return new SubmitTranscriptResponse(properties);
    };

    /**
     * Encodes the specified SubmitTranscriptResponse message. Does not implicitly {@link preppal.SubmitTranscriptResponse.verify|verify} messages.
     * @function encode
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {preppal.ISubmitTranscriptResponse} message SubmitTranscriptResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitTranscriptResponse.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.success != null &&
        Object.hasOwnProperty.call(message, "success")
      )
        writer.uint32(/* id 1, wireType 0 =*/ 8).bool(message.success);
      return writer;
    };

    /**
     * Encodes the specified SubmitTranscriptResponse message, length delimited. Does not implicitly {@link preppal.SubmitTranscriptResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {preppal.ISubmitTranscriptResponse} message SubmitTranscriptResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitTranscriptResponse.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SubmitTranscriptResponse message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.SubmitTranscriptResponse} SubmitTranscriptResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitTranscriptResponse.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.SubmitTranscriptResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.success = reader.bool();
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
     * Decodes a SubmitTranscriptResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.SubmitTranscriptResponse} SubmitTranscriptResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitTranscriptResponse.decodeDelimited = function decodeDelimited(
      reader,
    ) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SubmitTranscriptResponse message.
     * @function verify
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SubmitTranscriptResponse.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.success != null && message.hasOwnProperty("success"))
        if (typeof message.success !== "boolean")
          return "success: boolean expected";
      return null;
    };

    /**
     * Creates a SubmitTranscriptResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.SubmitTranscriptResponse} SubmitTranscriptResponse
     */
    SubmitTranscriptResponse.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.SubmitTranscriptResponse)
        return object;
      let message = new $root.preppal.SubmitTranscriptResponse();
      if (object.success != null) message.success = Boolean(object.success);
      return message;
    };

    /**
     * Creates a plain object from a SubmitTranscriptResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {preppal.SubmitTranscriptResponse} message SubmitTranscriptResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SubmitTranscriptResponse.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) object.success = false;
      if (message.success != null && message.hasOwnProperty("success"))
        object.success = message.success;
      return object;
    };

    /**
     * Converts this SubmitTranscriptResponse to JSON.
     * @function toJSON
     * @memberof preppal.SubmitTranscriptResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SubmitTranscriptResponse.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SubmitTranscriptResponse
     * @function getTypeUrl
     * @memberof preppal.SubmitTranscriptResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SubmitTranscriptResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.SubmitTranscriptResponse";
    };

    return SubmitTranscriptResponse;
  })();

  preppal.SubmitFeedbackRequest = (function () {
    /**
     * Properties of a SubmitFeedbackRequest.
     * @memberof preppal
     * @interface ISubmitFeedbackRequest
     * @property {string|null} [interviewId] SubmitFeedbackRequest interviewId
     * @property {string|null} [summary] SubmitFeedbackRequest summary
     * @property {string|null} [strengths] SubmitFeedbackRequest strengths
     * @property {string|null} [contentAndStructure] SubmitFeedbackRequest contentAndStructure
     * @property {string|null} [communicationAndDelivery] SubmitFeedbackRequest communicationAndDelivery
     * @property {string|null} [presentation] SubmitFeedbackRequest presentation
     */

    /**
     * Constructs a new SubmitFeedbackRequest.
     * @memberof preppal
     * @classdesc Represents a SubmitFeedbackRequest.
     * @implements ISubmitFeedbackRequest
     * @constructor
     * @param {preppal.ISubmitFeedbackRequest=} [properties] Properties to set
     */
    function SubmitFeedbackRequest(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * SubmitFeedbackRequest interviewId.
     * @member {string} interviewId
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.interviewId = "";

    /**
     * SubmitFeedbackRequest summary.
     * @member {string} summary
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.summary = "";

    /**
     * SubmitFeedbackRequest strengths.
     * @member {string} strengths
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.strengths = "";

    /**
     * SubmitFeedbackRequest contentAndStructure.
     * @member {string} contentAndStructure
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.contentAndStructure = "";

    /**
     * SubmitFeedbackRequest communicationAndDelivery.
     * @member {string} communicationAndDelivery
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.communicationAndDelivery = "";

    /**
     * SubmitFeedbackRequest presentation.
     * @member {string} presentation
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     */
    SubmitFeedbackRequest.prototype.presentation = "";

    /**
     * Creates a new SubmitFeedbackRequest instance using the specified properties.
     * @function create
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {preppal.ISubmitFeedbackRequest=} [properties] Properties to set
     * @returns {preppal.SubmitFeedbackRequest} SubmitFeedbackRequest instance
     */
    SubmitFeedbackRequest.create = function create(properties) {
      return new SubmitFeedbackRequest(properties);
    };

    /**
     * Encodes the specified SubmitFeedbackRequest message. Does not implicitly {@link preppal.SubmitFeedbackRequest.verify|verify} messages.
     * @function encode
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {preppal.ISubmitFeedbackRequest} message SubmitFeedbackRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitFeedbackRequest.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.interviewId != null &&
        Object.hasOwnProperty.call(message, "interviewId")
      )
        writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.interviewId);
      if (
        message.summary != null &&
        Object.hasOwnProperty.call(message, "summary")
      )
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.summary);
      if (
        message.strengths != null &&
        Object.hasOwnProperty.call(message, "strengths")
      )
        writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.strengths);
      if (
        message.contentAndStructure != null &&
        Object.hasOwnProperty.call(message, "contentAndStructure")
      )
        writer
          .uint32(/* id 4, wireType 2 =*/ 34)
          .string(message.contentAndStructure);
      if (
        message.communicationAndDelivery != null &&
        Object.hasOwnProperty.call(message, "communicationAndDelivery")
      )
        writer
          .uint32(/* id 5, wireType 2 =*/ 42)
          .string(message.communicationAndDelivery);
      if (
        message.presentation != null &&
        Object.hasOwnProperty.call(message, "presentation")
      )
        writer.uint32(/* id 6, wireType 2 =*/ 50).string(message.presentation);
      return writer;
    };

    /**
     * Encodes the specified SubmitFeedbackRequest message, length delimited. Does not implicitly {@link preppal.SubmitFeedbackRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {preppal.ISubmitFeedbackRequest} message SubmitFeedbackRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitFeedbackRequest.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SubmitFeedbackRequest message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.SubmitFeedbackRequest} SubmitFeedbackRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitFeedbackRequest.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.SubmitFeedbackRequest();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.interviewId = reader.string();
            break;
          }
          case 2: {
            message.summary = reader.string();
            break;
          }
          case 3: {
            message.strengths = reader.string();
            break;
          }
          case 4: {
            message.contentAndStructure = reader.string();
            break;
          }
          case 5: {
            message.communicationAndDelivery = reader.string();
            break;
          }
          case 6: {
            message.presentation = reader.string();
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
     * Decodes a SubmitFeedbackRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.SubmitFeedbackRequest} SubmitFeedbackRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitFeedbackRequest.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SubmitFeedbackRequest message.
     * @function verify
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SubmitFeedbackRequest.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        if (!$util.isString(message.interviewId))
          return "interviewId: string expected";
      if (message.summary != null && message.hasOwnProperty("summary"))
        if (!$util.isString(message.summary)) return "summary: string expected";
      if (message.strengths != null && message.hasOwnProperty("strengths"))
        if (!$util.isString(message.strengths))
          return "strengths: string expected";
      if (
        message.contentAndStructure != null &&
        message.hasOwnProperty("contentAndStructure")
      )
        if (!$util.isString(message.contentAndStructure))
          return "contentAndStructure: string expected";
      if (
        message.communicationAndDelivery != null &&
        message.hasOwnProperty("communicationAndDelivery")
      )
        if (!$util.isString(message.communicationAndDelivery))
          return "communicationAndDelivery: string expected";
      if (
        message.presentation != null &&
        message.hasOwnProperty("presentation")
      )
        if (!$util.isString(message.presentation))
          return "presentation: string expected";
      return null;
    };

    /**
     * Creates a SubmitFeedbackRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.SubmitFeedbackRequest} SubmitFeedbackRequest
     */
    SubmitFeedbackRequest.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.SubmitFeedbackRequest) return object;
      let message = new $root.preppal.SubmitFeedbackRequest();
      if (object.interviewId != null)
        message.interviewId = String(object.interviewId);
      if (object.summary != null) message.summary = String(object.summary);
      if (object.strengths != null)
        message.strengths = String(object.strengths);
      if (object.contentAndStructure != null)
        message.contentAndStructure = String(object.contentAndStructure);
      if (object.communicationAndDelivery != null)
        message.communicationAndDelivery = String(
          object.communicationAndDelivery,
        );
      if (object.presentation != null)
        message.presentation = String(object.presentation);
      return message;
    };

    /**
     * Creates a plain object from a SubmitFeedbackRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {preppal.SubmitFeedbackRequest} message SubmitFeedbackRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SubmitFeedbackRequest.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) {
        object.interviewId = "";
        object.summary = "";
        object.strengths = "";
        object.contentAndStructure = "";
        object.communicationAndDelivery = "";
        object.presentation = "";
      }
      if (message.interviewId != null && message.hasOwnProperty("interviewId"))
        object.interviewId = message.interviewId;
      if (message.summary != null && message.hasOwnProperty("summary"))
        object.summary = message.summary;
      if (message.strengths != null && message.hasOwnProperty("strengths"))
        object.strengths = message.strengths;
      if (
        message.contentAndStructure != null &&
        message.hasOwnProperty("contentAndStructure")
      )
        object.contentAndStructure = message.contentAndStructure;
      if (
        message.communicationAndDelivery != null &&
        message.hasOwnProperty("communicationAndDelivery")
      )
        object.communicationAndDelivery = message.communicationAndDelivery;
      if (
        message.presentation != null &&
        message.hasOwnProperty("presentation")
      )
        object.presentation = message.presentation;
      return object;
    };

    /**
     * Converts this SubmitFeedbackRequest to JSON.
     * @function toJSON
     * @memberof preppal.SubmitFeedbackRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SubmitFeedbackRequest.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SubmitFeedbackRequest
     * @function getTypeUrl
     * @memberof preppal.SubmitFeedbackRequest
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SubmitFeedbackRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.SubmitFeedbackRequest";
    };

    return SubmitFeedbackRequest;
  })();

  preppal.SubmitFeedbackResponse = (function () {
    /**
     * Properties of a SubmitFeedbackResponse.
     * @memberof preppal
     * @interface ISubmitFeedbackResponse
     * @property {boolean|null} [success] SubmitFeedbackResponse success
     */

    /**
     * Constructs a new SubmitFeedbackResponse.
     * @memberof preppal
     * @classdesc Represents a SubmitFeedbackResponse.
     * @implements ISubmitFeedbackResponse
     * @constructor
     * @param {preppal.ISubmitFeedbackResponse=} [properties] Properties to set
     */
    function SubmitFeedbackResponse(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * SubmitFeedbackResponse success.
     * @member {boolean} success
     * @memberof preppal.SubmitFeedbackResponse
     * @instance
     */
    SubmitFeedbackResponse.prototype.success = false;

    /**
     * Creates a new SubmitFeedbackResponse instance using the specified properties.
     * @function create
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {preppal.ISubmitFeedbackResponse=} [properties] Properties to set
     * @returns {preppal.SubmitFeedbackResponse} SubmitFeedbackResponse instance
     */
    SubmitFeedbackResponse.create = function create(properties) {
      return new SubmitFeedbackResponse(properties);
    };

    /**
     * Encodes the specified SubmitFeedbackResponse message. Does not implicitly {@link preppal.SubmitFeedbackResponse.verify|verify} messages.
     * @function encode
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {preppal.ISubmitFeedbackResponse} message SubmitFeedbackResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitFeedbackResponse.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (
        message.success != null &&
        Object.hasOwnProperty.call(message, "success")
      )
        writer.uint32(/* id 1, wireType 0 =*/ 8).bool(message.success);
      return writer;
    };

    /**
     * Encodes the specified SubmitFeedbackResponse message, length delimited. Does not implicitly {@link preppal.SubmitFeedbackResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {preppal.ISubmitFeedbackResponse} message SubmitFeedbackResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SubmitFeedbackResponse.encodeDelimited = function encodeDelimited(
      message,
      writer,
    ) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SubmitFeedbackResponse message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.SubmitFeedbackResponse} SubmitFeedbackResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitFeedbackResponse.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.SubmitFeedbackResponse();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
        switch (tag >>> 3) {
          case 1: {
            message.success = reader.bool();
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
     * Decodes a SubmitFeedbackResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.SubmitFeedbackResponse} SubmitFeedbackResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SubmitFeedbackResponse.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SubmitFeedbackResponse message.
     * @function verify
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SubmitFeedbackResponse.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.success != null && message.hasOwnProperty("success"))
        if (typeof message.success !== "boolean")
          return "success: boolean expected";
      return null;
    };

    /**
     * Creates a SubmitFeedbackResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.SubmitFeedbackResponse} SubmitFeedbackResponse
     */
    SubmitFeedbackResponse.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.SubmitFeedbackResponse) return object;
      let message = new $root.preppal.SubmitFeedbackResponse();
      if (object.success != null) message.success = Boolean(object.success);
      return message;
    };

    /**
     * Creates a plain object from a SubmitFeedbackResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {preppal.SubmitFeedbackResponse} message SubmitFeedbackResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SubmitFeedbackResponse.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
      if (options.defaults) object.success = false;
      if (message.success != null && message.hasOwnProperty("success"))
        object.success = message.success;
      return object;
    };

    /**
     * Converts this SubmitFeedbackResponse to JSON.
     * @function toJSON
     * @memberof preppal.SubmitFeedbackResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SubmitFeedbackResponse.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SubmitFeedbackResponse
     * @function getTypeUrl
     * @memberof preppal.SubmitFeedbackResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SubmitFeedbackResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.SubmitFeedbackResponse";
    };

    return SubmitFeedbackResponse;
  })();

  preppal.ApiError = (function () {
    /**
     * Properties of an ApiError.
     * @memberof preppal
     * @interface IApiError
     * @property {number|null} [code] ApiError code
     * @property {string|null} [message] ApiError message
     */

    /**
     * Constructs a new ApiError.
     * @memberof preppal
     * @classdesc Represents an ApiError.
     * @implements IApiError
     * @constructor
     * @param {preppal.IApiError=} [properties] Properties to set
     */
    function ApiError(properties) {
      if (properties)
        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
          if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]];
    }

    /**
     * ApiError code.
     * @member {number} code
     * @memberof preppal.ApiError
     * @instance
     */
    ApiError.prototype.code = 0;

    /**
     * ApiError message.
     * @member {string} message
     * @memberof preppal.ApiError
     * @instance
     */
    ApiError.prototype.message = "";

    /**
     * Creates a new ApiError instance using the specified properties.
     * @function create
     * @memberof preppal.ApiError
     * @static
     * @param {preppal.IApiError=} [properties] Properties to set
     * @returns {preppal.ApiError} ApiError instance
     */
    ApiError.create = function create(properties) {
      return new ApiError(properties);
    };

    /**
     * Encodes the specified ApiError message. Does not implicitly {@link preppal.ApiError.verify|verify} messages.
     * @function encode
     * @memberof preppal.ApiError
     * @static
     * @param {preppal.IApiError} message ApiError message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ApiError.encode = function encode(message, writer) {
      if (!writer) writer = $Writer.create();
      if (message.code != null && Object.hasOwnProperty.call(message, "code"))
        writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.code);
      if (
        message.message != null &&
        Object.hasOwnProperty.call(message, "message")
      )
        writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.message);
      return writer;
    };

    /**
     * Encodes the specified ApiError message, length delimited. Does not implicitly {@link preppal.ApiError.verify|verify} messages.
     * @function encodeDelimited
     * @memberof preppal.ApiError
     * @static
     * @param {preppal.IApiError} message ApiError message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ApiError.encodeDelimited = function encodeDelimited(message, writer) {
      return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ApiError message from the specified reader or buffer.
     * @function decode
     * @memberof preppal.ApiError
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {preppal.ApiError} ApiError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ApiError.decode = function decode(reader, length, error) {
      if (!(reader instanceof $Reader)) reader = $Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length,
        message = new $root.preppal.ApiError();
      while (reader.pos < end) {
        let tag = reader.uint32();
        if (tag === error) break;
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
     * Decodes an ApiError message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof preppal.ApiError
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {preppal.ApiError} ApiError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ApiError.decodeDelimited = function decodeDelimited(reader) {
      if (!(reader instanceof $Reader)) reader = new $Reader(reader);
      return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ApiError message.
     * @function verify
     * @memberof preppal.ApiError
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ApiError.verify = function verify(message) {
      if (typeof message !== "object" || message === null)
        return "object expected";
      if (message.code != null && message.hasOwnProperty("code"))
        if (!$util.isInteger(message.code)) return "code: integer expected";
      if (message.message != null && message.hasOwnProperty("message"))
        if (!$util.isString(message.message)) return "message: string expected";
      return null;
    };

    /**
     * Creates an ApiError message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof preppal.ApiError
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {preppal.ApiError} ApiError
     */
    ApiError.fromObject = function fromObject(object) {
      if (object instanceof $root.preppal.ApiError) return object;
      let message = new $root.preppal.ApiError();
      if (object.code != null) message.code = object.code | 0;
      if (object.message != null) message.message = String(object.message);
      return message;
    };

    /**
     * Creates a plain object from an ApiError message. Also converts values to other types if specified.
     * @function toObject
     * @memberof preppal.ApiError
     * @static
     * @param {preppal.ApiError} message ApiError
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ApiError.toObject = function toObject(message, options) {
      if (!options) options = {};
      let object = {};
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
     * Converts this ApiError to JSON.
     * @function toJSON
     * @memberof preppal.ApiError
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ApiError.prototype.toJSON = function toJSON() {
      return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ApiError
     * @function getTypeUrl
     * @memberof preppal.ApiError
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ApiError.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
      if (typeUrlPrefix === undefined) {
        typeUrlPrefix = "type.googleapis.com";
      }
      return typeUrlPrefix + "/preppal.ApiError";
    };

    return ApiError;
  })();

  return preppal;
})());

export { $root as default };
