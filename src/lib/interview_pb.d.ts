import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace preppal. */
export namespace preppal {
  /** Properties of a ClientToServerMessage. */
  interface IClientToServerMessage {
    /** ClientToServerMessage audioChunk */
    audioChunk?: preppal.IAudioChunk | null;

    /** ClientToServerMessage endRequest */
    endRequest?: preppal.IEndRequest | null;
  }

  /** Represents a ClientToServerMessage. */
  class ClientToServerMessage implements IClientToServerMessage {
    /**
     * Constructs a new ClientToServerMessage.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IClientToServerMessage);

    /** ClientToServerMessage audioChunk. */
    public audioChunk?: preppal.IAudioChunk | null;

    /** ClientToServerMessage endRequest. */
    public endRequest?: preppal.IEndRequest | null;

    /** ClientToServerMessage payload. */
    public payload?: "audioChunk" | "endRequest";

    /**
     * Creates a new ClientToServerMessage instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ClientToServerMessage instance
     */
    public static create(
      properties?: preppal.IClientToServerMessage,
    ): preppal.ClientToServerMessage;

    /**
     * Encodes the specified ClientToServerMessage message. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
     * @param message ClientToServerMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IClientToServerMessage,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ClientToServerMessage message, length delimited. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
     * @param message ClientToServerMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IClientToServerMessage,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ClientToServerMessage message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ClientToServerMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.ClientToServerMessage;

    /**
     * Decodes a ClientToServerMessage message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ClientToServerMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.ClientToServerMessage;

    /**
     * Verifies a ClientToServerMessage message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ClientToServerMessage message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ClientToServerMessage
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.ClientToServerMessage;

    /**
     * Creates a plain object from a ClientToServerMessage message. Also converts values to other types if specified.
     * @param message ClientToServerMessage
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.ClientToServerMessage,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ClientToServerMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ClientToServerMessage
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AudioChunk. */
  interface IAudioChunk {
    /** AudioChunk audioContent */
    audioContent?: Uint8Array | null;
  }

  /** Represents an AudioChunk. */
  class AudioChunk implements IAudioChunk {
    /**
     * Constructs a new AudioChunk.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IAudioChunk);

    /** AudioChunk audioContent. */
    public audioContent: Uint8Array;

    /**
     * Creates a new AudioChunk instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AudioChunk instance
     */
    public static create(properties?: preppal.IAudioChunk): preppal.AudioChunk;

    /**
     * Encodes the specified AudioChunk message. Does not implicitly {@link preppal.AudioChunk.verify|verify} messages.
     * @param message AudioChunk message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IAudioChunk,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified AudioChunk message, length delimited. Does not implicitly {@link preppal.AudioChunk.verify|verify} messages.
     * @param message AudioChunk message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IAudioChunk,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AudioChunk message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AudioChunk
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.AudioChunk;

    /**
     * Decodes an AudioChunk message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AudioChunk
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.AudioChunk;

    /**
     * Verifies an AudioChunk message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AudioChunk message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AudioChunk
     */
    public static fromObject(object: { [k: string]: any }): preppal.AudioChunk;

    /**
     * Creates a plain object from an AudioChunk message. Also converts values to other types if specified.
     * @param message AudioChunk
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.AudioChunk,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AudioChunk to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AudioChunk
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an EndRequest. */
  interface IEndRequest {}

  /** Represents an EndRequest. */
  class EndRequest implements IEndRequest {
    /**
     * Constructs a new EndRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IEndRequest);

    /**
     * Creates a new EndRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns EndRequest instance
     */
    public static create(properties?: preppal.IEndRequest): preppal.EndRequest;

    /**
     * Encodes the specified EndRequest message. Does not implicitly {@link preppal.EndRequest.verify|verify} messages.
     * @param message EndRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IEndRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified EndRequest message, length delimited. Does not implicitly {@link preppal.EndRequest.verify|verify} messages.
     * @param message EndRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IEndRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an EndRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns EndRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.EndRequest;

    /**
     * Decodes an EndRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns EndRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.EndRequest;

    /**
     * Verifies an EndRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an EndRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns EndRequest
     */
    public static fromObject(object: { [k: string]: any }): preppal.EndRequest;

    /**
     * Creates a plain object from an EndRequest message. Also converts values to other types if specified.
     * @param message EndRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.EndRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this EndRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for EndRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a ServerToClientMessage. */
  interface IServerToClientMessage {
    /** ServerToClientMessage transcriptUpdate */
    transcriptUpdate?: preppal.ITranscriptUpdate | null;

    /** ServerToClientMessage audioResponse */
    audioResponse?: preppal.IAudioResponse | null;

    /** ServerToClientMessage error */
    error?: preppal.IErrorResponse | null;

    /** ServerToClientMessage sessionEnded */
    sessionEnded?: preppal.ISessionEnded | null;
  }

  /** Represents a ServerToClientMessage. */
  class ServerToClientMessage implements IServerToClientMessage {
    /**
     * Constructs a new ServerToClientMessage.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IServerToClientMessage);

    /** ServerToClientMessage transcriptUpdate. */
    public transcriptUpdate?: preppal.ITranscriptUpdate | null;

    /** ServerToClientMessage audioResponse. */
    public audioResponse?: preppal.IAudioResponse | null;

    /** ServerToClientMessage error. */
    public error?: preppal.IErrorResponse | null;

    /** ServerToClientMessage sessionEnded. */
    public sessionEnded?: preppal.ISessionEnded | null;

    /** ServerToClientMessage payload. */
    public payload?:
      | "transcriptUpdate"
      | "audioResponse"
      | "error"
      | "sessionEnded";

    /**
     * Creates a new ServerToClientMessage instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ServerToClientMessage instance
     */
    public static create(
      properties?: preppal.IServerToClientMessage,
    ): preppal.ServerToClientMessage;

    /**
     * Encodes the specified ServerToClientMessage message. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
     * @param message ServerToClientMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IServerToClientMessage,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ServerToClientMessage message, length delimited. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
     * @param message ServerToClientMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IServerToClientMessage,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a ServerToClientMessage message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ServerToClientMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.ServerToClientMessage;

    /**
     * Decodes a ServerToClientMessage message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ServerToClientMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.ServerToClientMessage;

    /**
     * Verifies a ServerToClientMessage message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a ServerToClientMessage message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ServerToClientMessage
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.ServerToClientMessage;

    /**
     * Creates a plain object from a ServerToClientMessage message. Also converts values to other types if specified.
     * @param message ServerToClientMessage
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.ServerToClientMessage,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ServerToClientMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ServerToClientMessage
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a TranscriptUpdate. */
  interface ITranscriptUpdate {
    /** TranscriptUpdate speaker */
    speaker?: string | null;

    /** TranscriptUpdate text */
    text?: string | null;

    /** TranscriptUpdate isFinal */
    isFinal?: boolean | null;

    /** TranscriptUpdate turnComplete */
    turnComplete?: boolean | null;
  }

  /** Represents a TranscriptUpdate. */
  class TranscriptUpdate implements ITranscriptUpdate {
    /**
     * Constructs a new TranscriptUpdate.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ITranscriptUpdate);

    /** TranscriptUpdate speaker. */
    public speaker: string;

    /** TranscriptUpdate text. */
    public text: string;

    /** TranscriptUpdate isFinal. */
    public isFinal: boolean;

    /** TranscriptUpdate turnComplete. */
    public turnComplete: boolean;

    /**
     * Creates a new TranscriptUpdate instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TranscriptUpdate instance
     */
    public static create(
      properties?: preppal.ITranscriptUpdate,
    ): preppal.TranscriptUpdate;

    /**
     * Encodes the specified TranscriptUpdate message. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
     * @param message TranscriptUpdate message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ITranscriptUpdate,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified TranscriptUpdate message, length delimited. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
     * @param message TranscriptUpdate message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ITranscriptUpdate,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a TranscriptUpdate message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TranscriptUpdate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.TranscriptUpdate;

    /**
     * Decodes a TranscriptUpdate message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TranscriptUpdate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.TranscriptUpdate;

    /**
     * Verifies a TranscriptUpdate message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a TranscriptUpdate message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TranscriptUpdate
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.TranscriptUpdate;

    /**
     * Creates a plain object from a TranscriptUpdate message. Also converts values to other types if specified.
     * @param message TranscriptUpdate
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.TranscriptUpdate,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this TranscriptUpdate to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TranscriptUpdate
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an AudioResponse. */
  interface IAudioResponse {
    /** AudioResponse audioContent */
    audioContent?: Uint8Array | null;
  }

  /** Represents an AudioResponse. */
  class AudioResponse implements IAudioResponse {
    /**
     * Constructs a new AudioResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IAudioResponse);

    /** AudioResponse audioContent. */
    public audioContent: Uint8Array;

    /**
     * Creates a new AudioResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AudioResponse instance
     */
    public static create(
      properties?: preppal.IAudioResponse,
    ): preppal.AudioResponse;

    /**
     * Encodes the specified AudioResponse message. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
     * @param message AudioResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IAudioResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified AudioResponse message, length delimited. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
     * @param message AudioResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IAudioResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an AudioResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AudioResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.AudioResponse;

    /**
     * Decodes an AudioResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AudioResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.AudioResponse;

    /**
     * Verifies an AudioResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an AudioResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AudioResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.AudioResponse;

    /**
     * Creates a plain object from an AudioResponse message. Also converts values to other types if specified.
     * @param message AudioResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.AudioResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this AudioResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AudioResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ErrorResponse. */
  interface IErrorResponse {
    /** ErrorResponse code */
    code?: number | null;

    /** ErrorResponse message */
    message?: string | null;
  }

  /** Represents an ErrorResponse. */
  class ErrorResponse implements IErrorResponse {
    /**
     * Constructs a new ErrorResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IErrorResponse);

    /** ErrorResponse code. */
    public code: number;

    /** ErrorResponse message. */
    public message: string;

    /**
     * Creates a new ErrorResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ErrorResponse instance
     */
    public static create(
      properties?: preppal.IErrorResponse,
    ): preppal.ErrorResponse;

    /**
     * Encodes the specified ErrorResponse message. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
     * @param message ErrorResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IErrorResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ErrorResponse message, length delimited. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
     * @param message ErrorResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IErrorResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ErrorResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ErrorResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.ErrorResponse;

    /**
     * Decodes an ErrorResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ErrorResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.ErrorResponse;

    /**
     * Verifies an ErrorResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ErrorResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ErrorResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.ErrorResponse;

    /**
     * Creates a plain object from an ErrorResponse message. Also converts values to other types if specified.
     * @param message ErrorResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.ErrorResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ErrorResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ErrorResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SessionEnded. */
  interface ISessionEnded {
    /** SessionEnded reason */
    reason?: preppal.SessionEnded.Reason | null;
  }

  /** Represents a SessionEnded. */
  class SessionEnded implements ISessionEnded {
    /**
     * Constructs a new SessionEnded.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ISessionEnded);

    /** SessionEnded reason. */
    public reason: preppal.SessionEnded.Reason;

    /**
     * Creates a new SessionEnded instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SessionEnded instance
     */
    public static create(
      properties?: preppal.ISessionEnded,
    ): preppal.SessionEnded;

    /**
     * Encodes the specified SessionEnded message. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
     * @param message SessionEnded message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ISessionEnded,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SessionEnded message, length delimited. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
     * @param message SessionEnded message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ISessionEnded,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SessionEnded message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SessionEnded
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.SessionEnded;

    /**
     * Decodes a SessionEnded message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SessionEnded
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.SessionEnded;

    /**
     * Verifies a SessionEnded message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SessionEnded message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SessionEnded
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.SessionEnded;

    /**
     * Creates a plain object from a SessionEnded message. Also converts values to other types if specified.
     * @param message SessionEnded
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.SessionEnded,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SessionEnded to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SessionEnded
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  namespace SessionEnded {
    /** Reason enum. */
    enum Reason {
      REASON_UNSPECIFIED = 0,
      USER_INITIATED = 1,
      GEMINI_ENDED = 2,
      TIMEOUT = 3,
    }
  }

  /** Properties of a WorkerApiRequest. */
  interface IWorkerApiRequest {
    /** WorkerApiRequest getContext */
    getContext?: preppal.IGetContextRequest | null;

    /** WorkerApiRequest updateStatus */
    updateStatus?: preppal.IUpdateStatusRequest | null;

    /** WorkerApiRequest submitTranscript */
    submitTranscript?: preppal.ISubmitTranscriptRequest | null;

    /** WorkerApiRequest submitFeedback */
    submitFeedback?: preppal.ISubmitFeedbackRequest | null;
  }

  /** Represents a WorkerApiRequest. */
  class WorkerApiRequest implements IWorkerApiRequest {
    /**
     * Constructs a new WorkerApiRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IWorkerApiRequest);

    /** WorkerApiRequest getContext. */
    public getContext?: preppal.IGetContextRequest | null;

    /** WorkerApiRequest updateStatus. */
    public updateStatus?: preppal.IUpdateStatusRequest | null;

    /** WorkerApiRequest submitTranscript. */
    public submitTranscript?: preppal.ISubmitTranscriptRequest | null;

    /** WorkerApiRequest submitFeedback. */
    public submitFeedback?: preppal.ISubmitFeedbackRequest | null;

    /** WorkerApiRequest request. */
    public request?:
      | "getContext"
      | "updateStatus"
      | "submitTranscript"
      | "submitFeedback";

    /**
     * Creates a new WorkerApiRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WorkerApiRequest instance
     */
    public static create(
      properties?: preppal.IWorkerApiRequest,
    ): preppal.WorkerApiRequest;

    /**
     * Encodes the specified WorkerApiRequest message. Does not implicitly {@link preppal.WorkerApiRequest.verify|verify} messages.
     * @param message WorkerApiRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IWorkerApiRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified WorkerApiRequest message, length delimited. Does not implicitly {@link preppal.WorkerApiRequest.verify|verify} messages.
     * @param message WorkerApiRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IWorkerApiRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a WorkerApiRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WorkerApiRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.WorkerApiRequest;

    /**
     * Decodes a WorkerApiRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WorkerApiRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.WorkerApiRequest;

    /**
     * Verifies a WorkerApiRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a WorkerApiRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WorkerApiRequest
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.WorkerApiRequest;

    /**
     * Creates a plain object from a WorkerApiRequest message. Also converts values to other types if specified.
     * @param message WorkerApiRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.WorkerApiRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this WorkerApiRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for WorkerApiRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a WorkerApiResponse. */
  interface IWorkerApiResponse {
    /** WorkerApiResponse getContext */
    getContext?: preppal.IGetContextResponse | null;

    /** WorkerApiResponse updateStatus */
    updateStatus?: preppal.IUpdateStatusResponse | null;

    /** WorkerApiResponse submitTranscript */
    submitTranscript?: preppal.ISubmitTranscriptResponse | null;

    /** WorkerApiResponse submitFeedback */
    submitFeedback?: preppal.ISubmitFeedbackResponse | null;

    /** WorkerApiResponse error */
    error?: preppal.IApiError | null;
  }

  /** Represents a WorkerApiResponse. */
  class WorkerApiResponse implements IWorkerApiResponse {
    /**
     * Constructs a new WorkerApiResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IWorkerApiResponse);

    /** WorkerApiResponse getContext. */
    public getContext?: preppal.IGetContextResponse | null;

    /** WorkerApiResponse updateStatus. */
    public updateStatus?: preppal.IUpdateStatusResponse | null;

    /** WorkerApiResponse submitTranscript. */
    public submitTranscript?: preppal.ISubmitTranscriptResponse | null;

    /** WorkerApiResponse submitFeedback. */
    public submitFeedback?: preppal.ISubmitFeedbackResponse | null;

    /** WorkerApiResponse error. */
    public error?: preppal.IApiError | null;

    /** WorkerApiResponse response. */
    public response?:
      | "getContext"
      | "updateStatus"
      | "submitTranscript"
      | "submitFeedback"
      | "error";

    /**
     * Creates a new WorkerApiResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WorkerApiResponse instance
     */
    public static create(
      properties?: preppal.IWorkerApiResponse,
    ): preppal.WorkerApiResponse;

    /**
     * Encodes the specified WorkerApiResponse message. Does not implicitly {@link preppal.WorkerApiResponse.verify|verify} messages.
     * @param message WorkerApiResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IWorkerApiResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified WorkerApiResponse message, length delimited. Does not implicitly {@link preppal.WorkerApiResponse.verify|verify} messages.
     * @param message WorkerApiResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IWorkerApiResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a WorkerApiResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WorkerApiResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.WorkerApiResponse;

    /**
     * Decodes a WorkerApiResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WorkerApiResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.WorkerApiResponse;

    /**
     * Verifies a WorkerApiResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a WorkerApiResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WorkerApiResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.WorkerApiResponse;

    /**
     * Creates a plain object from a WorkerApiResponse message. Also converts values to other types if specified.
     * @param message WorkerApiResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.WorkerApiResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this WorkerApiResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for WorkerApiResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a GetContextRequest. */
  interface IGetContextRequest {
    /** GetContextRequest interviewId */
    interviewId?: string | null;
  }

  /** Represents a GetContextRequest. */
  class GetContextRequest implements IGetContextRequest {
    /**
     * Constructs a new GetContextRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IGetContextRequest);

    /** GetContextRequest interviewId. */
    public interviewId: string;

    /**
     * Creates a new GetContextRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns GetContextRequest instance
     */
    public static create(
      properties?: preppal.IGetContextRequest,
    ): preppal.GetContextRequest;

    /**
     * Encodes the specified GetContextRequest message. Does not implicitly {@link preppal.GetContextRequest.verify|verify} messages.
     * @param message GetContextRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IGetContextRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified GetContextRequest message, length delimited. Does not implicitly {@link preppal.GetContextRequest.verify|verify} messages.
     * @param message GetContextRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IGetContextRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a GetContextRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns GetContextRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.GetContextRequest;

    /**
     * Decodes a GetContextRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns GetContextRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.GetContextRequest;

    /**
     * Verifies a GetContextRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a GetContextRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns GetContextRequest
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.GetContextRequest;

    /**
     * Creates a plain object from a GetContextRequest message. Also converts values to other types if specified.
     * @param message GetContextRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.GetContextRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this GetContextRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for GetContextRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a GetContextResponse. */
  interface IGetContextResponse {
    /** GetContextResponse jobDescription */
    jobDescription?: string | null;

    /** GetContextResponse resume */
    resume?: string | null;

    /** GetContextResponse persona */
    persona?: string | null;

    /** GetContextResponse durationMs */
    durationMs?: number | null;
  }

  /** Represents a GetContextResponse. */
  class GetContextResponse implements IGetContextResponse {
    /**
     * Constructs a new GetContextResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IGetContextResponse);

    /** GetContextResponse jobDescription. */
    public jobDescription: string;

    /** GetContextResponse resume. */
    public resume: string;

    /** GetContextResponse persona. */
    public persona: string;

    /** GetContextResponse durationMs. */
    public durationMs: number;

    /**
     * Creates a new GetContextResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns GetContextResponse instance
     */
    public static create(
      properties?: preppal.IGetContextResponse,
    ): preppal.GetContextResponse;

    /**
     * Encodes the specified GetContextResponse message. Does not implicitly {@link preppal.GetContextResponse.verify|verify} messages.
     * @param message GetContextResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IGetContextResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified GetContextResponse message, length delimited. Does not implicitly {@link preppal.GetContextResponse.verify|verify} messages.
     * @param message GetContextResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IGetContextResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a GetContextResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns GetContextResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.GetContextResponse;

    /**
     * Decodes a GetContextResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns GetContextResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.GetContextResponse;

    /**
     * Verifies a GetContextResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a GetContextResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns GetContextResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.GetContextResponse;

    /**
     * Creates a plain object from a GetContextResponse message. Also converts values to other types if specified.
     * @param message GetContextResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.GetContextResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this GetContextResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for GetContextResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an UpdateStatusRequest. */
  interface IUpdateStatusRequest {
    /** UpdateStatusRequest interviewId */
    interviewId?: string | null;

    /** UpdateStatusRequest status */
    status?: preppal.InterviewStatus | null;

    /** UpdateStatusRequest endedAt */
    endedAt?: string | null;
  }

  /** Represents an UpdateStatusRequest. */
  class UpdateStatusRequest implements IUpdateStatusRequest {
    /**
     * Constructs a new UpdateStatusRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IUpdateStatusRequest);

    /** UpdateStatusRequest interviewId. */
    public interviewId: string;

    /** UpdateStatusRequest status. */
    public status: preppal.InterviewStatus;

    /** UpdateStatusRequest endedAt. */
    public endedAt: string;

    /**
     * Creates a new UpdateStatusRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UpdateStatusRequest instance
     */
    public static create(
      properties?: preppal.IUpdateStatusRequest,
    ): preppal.UpdateStatusRequest;

    /**
     * Encodes the specified UpdateStatusRequest message. Does not implicitly {@link preppal.UpdateStatusRequest.verify|verify} messages.
     * @param message UpdateStatusRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IUpdateStatusRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified UpdateStatusRequest message, length delimited. Does not implicitly {@link preppal.UpdateStatusRequest.verify|verify} messages.
     * @param message UpdateStatusRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IUpdateStatusRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an UpdateStatusRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UpdateStatusRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.UpdateStatusRequest;

    /**
     * Decodes an UpdateStatusRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UpdateStatusRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.UpdateStatusRequest;

    /**
     * Verifies an UpdateStatusRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an UpdateStatusRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UpdateStatusRequest
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.UpdateStatusRequest;

    /**
     * Creates a plain object from an UpdateStatusRequest message. Also converts values to other types if specified.
     * @param message UpdateStatusRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.UpdateStatusRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this UpdateStatusRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UpdateStatusRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** InterviewStatus enum. */
  enum InterviewStatus {
    STATUS_UNSPECIFIED = 0,
    IN_PROGRESS = 1,
    COMPLETED = 2,
    ERROR = 3,
  }

  /** Properties of an UpdateStatusResponse. */
  interface IUpdateStatusResponse {
    /** UpdateStatusResponse success */
    success?: boolean | null;
  }

  /** Represents an UpdateStatusResponse. */
  class UpdateStatusResponse implements IUpdateStatusResponse {
    /**
     * Constructs a new UpdateStatusResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IUpdateStatusResponse);

    /** UpdateStatusResponse success. */
    public success: boolean;

    /**
     * Creates a new UpdateStatusResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UpdateStatusResponse instance
     */
    public static create(
      properties?: preppal.IUpdateStatusResponse,
    ): preppal.UpdateStatusResponse;

    /**
     * Encodes the specified UpdateStatusResponse message. Does not implicitly {@link preppal.UpdateStatusResponse.verify|verify} messages.
     * @param message UpdateStatusResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IUpdateStatusResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified UpdateStatusResponse message, length delimited. Does not implicitly {@link preppal.UpdateStatusResponse.verify|verify} messages.
     * @param message UpdateStatusResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IUpdateStatusResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an UpdateStatusResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UpdateStatusResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.UpdateStatusResponse;

    /**
     * Decodes an UpdateStatusResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UpdateStatusResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.UpdateStatusResponse;

    /**
     * Verifies an UpdateStatusResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an UpdateStatusResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UpdateStatusResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.UpdateStatusResponse;

    /**
     * Creates a plain object from an UpdateStatusResponse message. Also converts values to other types if specified.
     * @param message UpdateStatusResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.UpdateStatusResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this UpdateStatusResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UpdateStatusResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SubmitTranscriptRequest. */
  interface ISubmitTranscriptRequest {
    /** SubmitTranscriptRequest interviewId */
    interviewId?: string | null;

    /** SubmitTranscriptRequest entries */
    entries?: preppal.IWorkerTranscriptEntry[] | null;

    /** SubmitTranscriptRequest endedAt */
    endedAt?: string | null;
  }

  /** Represents a SubmitTranscriptRequest. */
  class SubmitTranscriptRequest implements ISubmitTranscriptRequest {
    /**
     * Constructs a new SubmitTranscriptRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ISubmitTranscriptRequest);

    /** SubmitTranscriptRequest interviewId. */
    public interviewId: string;

    /** SubmitTranscriptRequest entries. */
    public entries: preppal.IWorkerTranscriptEntry[];

    /** SubmitTranscriptRequest endedAt. */
    public endedAt: string;

    /**
     * Creates a new SubmitTranscriptRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SubmitTranscriptRequest instance
     */
    public static create(
      properties?: preppal.ISubmitTranscriptRequest,
    ): preppal.SubmitTranscriptRequest;

    /**
     * Encodes the specified SubmitTranscriptRequest message. Does not implicitly {@link preppal.SubmitTranscriptRequest.verify|verify} messages.
     * @param message SubmitTranscriptRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ISubmitTranscriptRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SubmitTranscriptRequest message, length delimited. Does not implicitly {@link preppal.SubmitTranscriptRequest.verify|verify} messages.
     * @param message SubmitTranscriptRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ISubmitTranscriptRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SubmitTranscriptRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SubmitTranscriptRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.SubmitTranscriptRequest;

    /**
     * Decodes a SubmitTranscriptRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SubmitTranscriptRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.SubmitTranscriptRequest;

    /**
     * Verifies a SubmitTranscriptRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SubmitTranscriptRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SubmitTranscriptRequest
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.SubmitTranscriptRequest;

    /**
     * Creates a plain object from a SubmitTranscriptRequest message. Also converts values to other types if specified.
     * @param message SubmitTranscriptRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.SubmitTranscriptRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SubmitTranscriptRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SubmitTranscriptRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a WorkerTranscriptEntry. */
  interface IWorkerTranscriptEntry {
    /** WorkerTranscriptEntry speaker */
    speaker?: string | null;

    /** WorkerTranscriptEntry content */
    content?: string | null;

    /** WorkerTranscriptEntry timestamp */
    timestamp?: string | null;
  }

  /** Represents a WorkerTranscriptEntry. */
  class WorkerTranscriptEntry implements IWorkerTranscriptEntry {
    /**
     * Constructs a new WorkerTranscriptEntry.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IWorkerTranscriptEntry);

    /** WorkerTranscriptEntry speaker. */
    public speaker: string;

    /** WorkerTranscriptEntry content. */
    public content: string;

    /** WorkerTranscriptEntry timestamp. */
    public timestamp: string;

    /**
     * Creates a new WorkerTranscriptEntry instance using the specified properties.
     * @param [properties] Properties to set
     * @returns WorkerTranscriptEntry instance
     */
    public static create(
      properties?: preppal.IWorkerTranscriptEntry,
    ): preppal.WorkerTranscriptEntry;

    /**
     * Encodes the specified WorkerTranscriptEntry message. Does not implicitly {@link preppal.WorkerTranscriptEntry.verify|verify} messages.
     * @param message WorkerTranscriptEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IWorkerTranscriptEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified WorkerTranscriptEntry message, length delimited. Does not implicitly {@link preppal.WorkerTranscriptEntry.verify|verify} messages.
     * @param message WorkerTranscriptEntry message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IWorkerTranscriptEntry,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a WorkerTranscriptEntry message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns WorkerTranscriptEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.WorkerTranscriptEntry;

    /**
     * Decodes a WorkerTranscriptEntry message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns WorkerTranscriptEntry
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.WorkerTranscriptEntry;

    /**
     * Verifies a WorkerTranscriptEntry message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a WorkerTranscriptEntry message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns WorkerTranscriptEntry
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.WorkerTranscriptEntry;

    /**
     * Creates a plain object from a WorkerTranscriptEntry message. Also converts values to other types if specified.
     * @param message WorkerTranscriptEntry
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.WorkerTranscriptEntry,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this WorkerTranscriptEntry to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for WorkerTranscriptEntry
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SubmitTranscriptResponse. */
  interface ISubmitTranscriptResponse {
    /** SubmitTranscriptResponse success */
    success?: boolean | null;
  }

  /** Represents a SubmitTranscriptResponse. */
  class SubmitTranscriptResponse implements ISubmitTranscriptResponse {
    /**
     * Constructs a new SubmitTranscriptResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ISubmitTranscriptResponse);

    /** SubmitTranscriptResponse success. */
    public success: boolean;

    /**
     * Creates a new SubmitTranscriptResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SubmitTranscriptResponse instance
     */
    public static create(
      properties?: preppal.ISubmitTranscriptResponse,
    ): preppal.SubmitTranscriptResponse;

    /**
     * Encodes the specified SubmitTranscriptResponse message. Does not implicitly {@link preppal.SubmitTranscriptResponse.verify|verify} messages.
     * @param message SubmitTranscriptResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ISubmitTranscriptResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SubmitTranscriptResponse message, length delimited. Does not implicitly {@link preppal.SubmitTranscriptResponse.verify|verify} messages.
     * @param message SubmitTranscriptResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ISubmitTranscriptResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SubmitTranscriptResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SubmitTranscriptResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.SubmitTranscriptResponse;

    /**
     * Decodes a SubmitTranscriptResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SubmitTranscriptResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.SubmitTranscriptResponse;

    /**
     * Verifies a SubmitTranscriptResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SubmitTranscriptResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SubmitTranscriptResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.SubmitTranscriptResponse;

    /**
     * Creates a plain object from a SubmitTranscriptResponse message. Also converts values to other types if specified.
     * @param message SubmitTranscriptResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.SubmitTranscriptResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SubmitTranscriptResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SubmitTranscriptResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SubmitFeedbackRequest. */
  interface ISubmitFeedbackRequest {
    /** SubmitFeedbackRequest interviewId */
    interviewId?: string | null;

    /** SubmitFeedbackRequest summary */
    summary?: string | null;

    /** SubmitFeedbackRequest strengths */
    strengths?: string | null;

    /** SubmitFeedbackRequest contentAndStructure */
    contentAndStructure?: string | null;

    /** SubmitFeedbackRequest communicationAndDelivery */
    communicationAndDelivery?: string | null;

    /** SubmitFeedbackRequest presentation */
    presentation?: string | null;
  }

  /** Represents a SubmitFeedbackRequest. */
  class SubmitFeedbackRequest implements ISubmitFeedbackRequest {
    /**
     * Constructs a new SubmitFeedbackRequest.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ISubmitFeedbackRequest);

    /** SubmitFeedbackRequest interviewId. */
    public interviewId: string;

    /** SubmitFeedbackRequest summary. */
    public summary: string;

    /** SubmitFeedbackRequest strengths. */
    public strengths: string;

    /** SubmitFeedbackRequest contentAndStructure. */
    public contentAndStructure: string;

    /** SubmitFeedbackRequest communicationAndDelivery. */
    public communicationAndDelivery: string;

    /** SubmitFeedbackRequest presentation. */
    public presentation: string;

    /**
     * Creates a new SubmitFeedbackRequest instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SubmitFeedbackRequest instance
     */
    public static create(
      properties?: preppal.ISubmitFeedbackRequest,
    ): preppal.SubmitFeedbackRequest;

    /**
     * Encodes the specified SubmitFeedbackRequest message. Does not implicitly {@link preppal.SubmitFeedbackRequest.verify|verify} messages.
     * @param message SubmitFeedbackRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ISubmitFeedbackRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SubmitFeedbackRequest message, length delimited. Does not implicitly {@link preppal.SubmitFeedbackRequest.verify|verify} messages.
     * @param message SubmitFeedbackRequest message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ISubmitFeedbackRequest,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SubmitFeedbackRequest message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SubmitFeedbackRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.SubmitFeedbackRequest;

    /**
     * Decodes a SubmitFeedbackRequest message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SubmitFeedbackRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.SubmitFeedbackRequest;

    /**
     * Verifies a SubmitFeedbackRequest message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SubmitFeedbackRequest message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SubmitFeedbackRequest
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.SubmitFeedbackRequest;

    /**
     * Creates a plain object from a SubmitFeedbackRequest message. Also converts values to other types if specified.
     * @param message SubmitFeedbackRequest
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.SubmitFeedbackRequest,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SubmitFeedbackRequest to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SubmitFeedbackRequest
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of a SubmitFeedbackResponse. */
  interface ISubmitFeedbackResponse {
    /** SubmitFeedbackResponse success */
    success?: boolean | null;
  }

  /** Represents a SubmitFeedbackResponse. */
  class SubmitFeedbackResponse implements ISubmitFeedbackResponse {
    /**
     * Constructs a new SubmitFeedbackResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.ISubmitFeedbackResponse);

    /** SubmitFeedbackResponse success. */
    public success: boolean;

    /**
     * Creates a new SubmitFeedbackResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SubmitFeedbackResponse instance
     */
    public static create(
      properties?: preppal.ISubmitFeedbackResponse,
    ): preppal.SubmitFeedbackResponse;

    /**
     * Encodes the specified SubmitFeedbackResponse message. Does not implicitly {@link preppal.SubmitFeedbackResponse.verify|verify} messages.
     * @param message SubmitFeedbackResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.ISubmitFeedbackResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified SubmitFeedbackResponse message, length delimited. Does not implicitly {@link preppal.SubmitFeedbackResponse.verify|verify} messages.
     * @param message SubmitFeedbackResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.ISubmitFeedbackResponse,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes a SubmitFeedbackResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SubmitFeedbackResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.SubmitFeedbackResponse;

    /**
     * Decodes a SubmitFeedbackResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SubmitFeedbackResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.SubmitFeedbackResponse;

    /**
     * Verifies a SubmitFeedbackResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates a SubmitFeedbackResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SubmitFeedbackResponse
     */
    public static fromObject(object: {
      [k: string]: any;
    }): preppal.SubmitFeedbackResponse;

    /**
     * Creates a plain object from a SubmitFeedbackResponse message. Also converts values to other types if specified.
     * @param message SubmitFeedbackResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.SubmitFeedbackResponse,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this SubmitFeedbackResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SubmitFeedbackResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }

  /** Properties of an ApiError. */
  interface IApiError {
    /** ApiError code */
    code?: number | null;

    /** ApiError message */
    message?: string | null;
  }

  /** Represents an ApiError. */
  class ApiError implements IApiError {
    /**
     * Constructs a new ApiError.
     * @param [properties] Properties to set
     */
    constructor(properties?: preppal.IApiError);

    /** ApiError code. */
    public code: number;

    /** ApiError message. */
    public message: string;

    /**
     * Creates a new ApiError instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ApiError instance
     */
    public static create(properties?: preppal.IApiError): preppal.ApiError;

    /**
     * Encodes the specified ApiError message. Does not implicitly {@link preppal.ApiError.verify|verify} messages.
     * @param message ApiError message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(
      message: preppal.IApiError,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Encodes the specified ApiError message, length delimited. Does not implicitly {@link preppal.ApiError.verify|verify} messages.
     * @param message ApiError message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(
      message: preppal.IApiError,
      writer?: $protobuf.Writer,
    ): $protobuf.Writer;

    /**
     * Decodes an ApiError message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ApiError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(
      reader: $protobuf.Reader | Uint8Array,
      length?: number,
    ): preppal.ApiError;

    /**
     * Decodes an ApiError message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ApiError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(
      reader: $protobuf.Reader | Uint8Array,
    ): preppal.ApiError;

    /**
     * Verifies an ApiError message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): string | null;

    /**
     * Creates an ApiError message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ApiError
     */
    public static fromObject(object: { [k: string]: any }): preppal.ApiError;

    /**
     * Creates a plain object from an ApiError message. Also converts values to other types if specified.
     * @param message ApiError
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(
      message: preppal.ApiError,
      options?: $protobuf.IConversionOptions,
    ): { [k: string]: any };

    /**
     * Converts this ApiError to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ApiError
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
  }
}
