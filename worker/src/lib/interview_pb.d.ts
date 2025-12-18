import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace preppal. */
export namespace preppal {

    /** Properties of a ClientToServerMessage. */
    interface IClientToServerMessage {

        /** ClientToServerMessage audioChunk */
        audioChunk?: (preppal.IAudioChunk|null);

        /** ClientToServerMessage endRequest */
        endRequest?: (preppal.IEndRequest|null);
    }

    /** Represents a ClientToServerMessage. */
    class ClientToServerMessage implements IClientToServerMessage {

        /**
         * Constructs a new ClientToServerMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: preppal.IClientToServerMessage);

        /** ClientToServerMessage audioChunk. */
        public audioChunk?: (preppal.IAudioChunk|null);

        /** ClientToServerMessage endRequest. */
        public endRequest?: (preppal.IEndRequest|null);

        /** ClientToServerMessage payload. */
        public payload?: ("audioChunk"|"endRequest");

        /**
         * Creates a new ClientToServerMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ClientToServerMessage instance
         */
        public static create(properties?: preppal.IClientToServerMessage): preppal.ClientToServerMessage;

        /**
         * Encodes the specified ClientToServerMessage message. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
         * @param message ClientToServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.IClientToServerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ClientToServerMessage message, length delimited. Does not implicitly {@link preppal.ClientToServerMessage.verify|verify} messages.
         * @param message ClientToServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IClientToServerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ClientToServerMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ClientToServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.ClientToServerMessage;

        /**
         * Decodes a ClientToServerMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ClientToServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.ClientToServerMessage;

        /**
         * Verifies a ClientToServerMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ClientToServerMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ClientToServerMessage
         */
        public static fromObject(object: { [k: string]: any }): preppal.ClientToServerMessage;

        /**
         * Creates a plain object from a ClientToServerMessage message. Also converts values to other types if specified.
         * @param message ClientToServerMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.ClientToServerMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        audioContent?: (Uint8Array|null);
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
        public static encode(message: preppal.IAudioChunk, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AudioChunk message, length delimited. Does not implicitly {@link preppal.AudioChunk.verify|verify} messages.
         * @param message AudioChunk message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IAudioChunk, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AudioChunk message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AudioChunk
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.AudioChunk;

        /**
         * Decodes an AudioChunk message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AudioChunk
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.AudioChunk;

        /**
         * Verifies an AudioChunk message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

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
        public static toObject(message: preppal.AudioChunk, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
    interface IEndRequest {
    }

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
        public static encode(message: preppal.IEndRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified EndRequest message, length delimited. Does not implicitly {@link preppal.EndRequest.verify|verify} messages.
         * @param message EndRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IEndRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EndRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EndRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.EndRequest;

        /**
         * Decodes an EndRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns EndRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.EndRequest;

        /**
         * Verifies an EndRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

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
        public static toObject(message: preppal.EndRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        transcriptUpdate?: (preppal.ITranscriptUpdate|null);

        /** ServerToClientMessage audioResponse */
        audioResponse?: (preppal.IAudioResponse|null);

        /** ServerToClientMessage error */
        error?: (preppal.IErrorResponse|null);

        /** ServerToClientMessage sessionEnded */
        sessionEnded?: (preppal.ISessionEnded|null);
    }

    /** Represents a ServerToClientMessage. */
    class ServerToClientMessage implements IServerToClientMessage {

        /**
         * Constructs a new ServerToClientMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: preppal.IServerToClientMessage);

        /** ServerToClientMessage transcriptUpdate. */
        public transcriptUpdate?: (preppal.ITranscriptUpdate|null);

        /** ServerToClientMessage audioResponse. */
        public audioResponse?: (preppal.IAudioResponse|null);

        /** ServerToClientMessage error. */
        public error?: (preppal.IErrorResponse|null);

        /** ServerToClientMessage sessionEnded. */
        public sessionEnded?: (preppal.ISessionEnded|null);

        /** ServerToClientMessage payload. */
        public payload?: ("transcriptUpdate"|"audioResponse"|"error"|"sessionEnded");

        /**
         * Creates a new ServerToClientMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerToClientMessage instance
         */
        public static create(properties?: preppal.IServerToClientMessage): preppal.ServerToClientMessage;

        /**
         * Encodes the specified ServerToClientMessage message. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
         * @param message ServerToClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.IServerToClientMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerToClientMessage message, length delimited. Does not implicitly {@link preppal.ServerToClientMessage.verify|verify} messages.
         * @param message ServerToClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IServerToClientMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerToClientMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerToClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.ServerToClientMessage;

        /**
         * Decodes a ServerToClientMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ServerToClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.ServerToClientMessage;

        /**
         * Verifies a ServerToClientMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerToClientMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerToClientMessage
         */
        public static fromObject(object: { [k: string]: any }): preppal.ServerToClientMessage;

        /**
         * Creates a plain object from a ServerToClientMessage message. Also converts values to other types if specified.
         * @param message ServerToClientMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.ServerToClientMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        speaker?: (string|null);

        /** TranscriptUpdate text */
        text?: (string|null);

        /** TranscriptUpdate isFinal */
        isFinal?: (boolean|null);

        /** TranscriptUpdate turnComplete */
        turnComplete?: (boolean|null);
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
        public static create(properties?: preppal.ITranscriptUpdate): preppal.TranscriptUpdate;

        /**
         * Encodes the specified TranscriptUpdate message. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
         * @param message TranscriptUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.ITranscriptUpdate, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TranscriptUpdate message, length delimited. Does not implicitly {@link preppal.TranscriptUpdate.verify|verify} messages.
         * @param message TranscriptUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.ITranscriptUpdate, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TranscriptUpdate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TranscriptUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.TranscriptUpdate;

        /**
         * Decodes a TranscriptUpdate message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TranscriptUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.TranscriptUpdate;

        /**
         * Verifies a TranscriptUpdate message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TranscriptUpdate message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TranscriptUpdate
         */
        public static fromObject(object: { [k: string]: any }): preppal.TranscriptUpdate;

        /**
         * Creates a plain object from a TranscriptUpdate message. Also converts values to other types if specified.
         * @param message TranscriptUpdate
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.TranscriptUpdate, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        audioContent?: (Uint8Array|null);
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
        public static create(properties?: preppal.IAudioResponse): preppal.AudioResponse;

        /**
         * Encodes the specified AudioResponse message. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
         * @param message AudioResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.IAudioResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AudioResponse message, length delimited. Does not implicitly {@link preppal.AudioResponse.verify|verify} messages.
         * @param message AudioResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IAudioResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AudioResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AudioResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.AudioResponse;

        /**
         * Decodes an AudioResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AudioResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.AudioResponse;

        /**
         * Verifies an AudioResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AudioResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AudioResponse
         */
        public static fromObject(object: { [k: string]: any }): preppal.AudioResponse;

        /**
         * Creates a plain object from an AudioResponse message. Also converts values to other types if specified.
         * @param message AudioResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.AudioResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        code?: (number|null);

        /** ErrorResponse message */
        message?: (string|null);
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
        public static create(properties?: preppal.IErrorResponse): preppal.ErrorResponse;

        /**
         * Encodes the specified ErrorResponse message. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
         * @param message ErrorResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.IErrorResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ErrorResponse message, length delimited. Does not implicitly {@link preppal.ErrorResponse.verify|verify} messages.
         * @param message ErrorResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.IErrorResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ErrorResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ErrorResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.ErrorResponse;

        /**
         * Decodes an ErrorResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ErrorResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.ErrorResponse;

        /**
         * Verifies an ErrorResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ErrorResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ErrorResponse
         */
        public static fromObject(object: { [k: string]: any }): preppal.ErrorResponse;

        /**
         * Creates a plain object from an ErrorResponse message. Also converts values to other types if specified.
         * @param message ErrorResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.ErrorResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
        reason?: (preppal.SessionEnded.Reason|null);
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
        public static create(properties?: preppal.ISessionEnded): preppal.SessionEnded;

        /**
         * Encodes the specified SessionEnded message. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
         * @param message SessionEnded message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: preppal.ISessionEnded, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionEnded message, length delimited. Does not implicitly {@link preppal.SessionEnded.verify|verify} messages.
         * @param message SessionEnded message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: preppal.ISessionEnded, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionEnded message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SessionEnded
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): preppal.SessionEnded;

        /**
         * Decodes a SessionEnded message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SessionEnded
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): preppal.SessionEnded;

        /**
         * Verifies a SessionEnded message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionEnded message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionEnded
         */
        public static fromObject(object: { [k: string]: any }): preppal.SessionEnded;

        /**
         * Creates a plain object from a SessionEnded message. Also converts values to other types if specified.
         * @param message SessionEnded
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: preppal.SessionEnded, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
            TIMEOUT = 3
        }
    }
}
