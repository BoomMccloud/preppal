import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace interview_prep. */
export namespace interview_prep {

    /** Namespace v1. */
    namespace v1 {

        /** Properties of a ClientToServerMessage. */
        interface IClientToServerMessage {

            /** ClientToServerMessage startRequest */
            startRequest?: (interview_prep.v1.IStartRequest|null);

            /** ClientToServerMessage audioChunk */
            audioChunk?: (interview_prep.v1.IAudioChunk|null);

            /** ClientToServerMessage endRequest */
            endRequest?: (interview_prep.v1.IEndRequest|null);
        }

        /** Represents a ClientToServerMessage. */
        class ClientToServerMessage implements IClientToServerMessage {

            /**
             * Constructs a new ClientToServerMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IClientToServerMessage);

            /** ClientToServerMessage startRequest. */
            public startRequest?: (interview_prep.v1.IStartRequest|null);

            /** ClientToServerMessage audioChunk. */
            public audioChunk?: (interview_prep.v1.IAudioChunk|null);

            /** ClientToServerMessage endRequest. */
            public endRequest?: (interview_prep.v1.IEndRequest|null);

            /** ClientToServerMessage payload. */
            public payload?: ("startRequest"|"audioChunk"|"endRequest");

            /**
             * Creates a new ClientToServerMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ClientToServerMessage instance
             */
            public static create(properties?: interview_prep.v1.IClientToServerMessage): interview_prep.v1.ClientToServerMessage;

            /**
             * Encodes the specified ClientToServerMessage message. Does not implicitly {@link interview_prep.v1.ClientToServerMessage.verify|verify} messages.
             * @param message ClientToServerMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IClientToServerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ClientToServerMessage message, length delimited. Does not implicitly {@link interview_prep.v1.ClientToServerMessage.verify|verify} messages.
             * @param message ClientToServerMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IClientToServerMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ClientToServerMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ClientToServerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.ClientToServerMessage;

            /**
             * Decodes a ClientToServerMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ClientToServerMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.ClientToServerMessage;

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
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.ClientToServerMessage;

            /**
             * Creates a plain object from a ClientToServerMessage message. Also converts values to other types if specified.
             * @param message ClientToServerMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.ClientToServerMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

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

        /** Properties of a ServerToClientMessage. */
        interface IServerToClientMessage {

            /** ServerToClientMessage startResponse */
            startResponse?: (interview_prep.v1.IStartResponse|null);

            /** ServerToClientMessage audioChunk */
            audioChunk?: (interview_prep.v1.IAudioChunk|null);

            /** ServerToClientMessage partialTranscript */
            partialTranscript?: (interview_prep.v1.IPartialTranscript|null);

            /** ServerToClientMessage sessionEnded */
            sessionEnded?: (interview_prep.v1.ISessionEnded|null);

            /** ServerToClientMessage error */
            error?: (interview_prep.v1.IError|null);
        }

        /** Represents a ServerToClientMessage. */
        class ServerToClientMessage implements IServerToClientMessage {

            /**
             * Constructs a new ServerToClientMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IServerToClientMessage);

            /** ServerToClientMessage startResponse. */
            public startResponse?: (interview_prep.v1.IStartResponse|null);

            /** ServerToClientMessage audioChunk. */
            public audioChunk?: (interview_prep.v1.IAudioChunk|null);

            /** ServerToClientMessage partialTranscript. */
            public partialTranscript?: (interview_prep.v1.IPartialTranscript|null);

            /** ServerToClientMessage sessionEnded. */
            public sessionEnded?: (interview_prep.v1.ISessionEnded|null);

            /** ServerToClientMessage error. */
            public error?: (interview_prep.v1.IError|null);

            /** ServerToClientMessage payload. */
            public payload?: ("startResponse"|"audioChunk"|"partialTranscript"|"sessionEnded"|"error");

            /**
             * Creates a new ServerToClientMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ServerToClientMessage instance
             */
            public static create(properties?: interview_prep.v1.IServerToClientMessage): interview_prep.v1.ServerToClientMessage;

            /**
             * Encodes the specified ServerToClientMessage message. Does not implicitly {@link interview_prep.v1.ServerToClientMessage.verify|verify} messages.
             * @param message ServerToClientMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IServerToClientMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ServerToClientMessage message, length delimited. Does not implicitly {@link interview_prep.v1.ServerToClientMessage.verify|verify} messages.
             * @param message ServerToClientMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IServerToClientMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ServerToClientMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ServerToClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.ServerToClientMessage;

            /**
             * Decodes a ServerToClientMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ServerToClientMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.ServerToClientMessage;

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
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.ServerToClientMessage;

            /**
             * Creates a plain object from a ServerToClientMessage message. Also converts values to other types if specified.
             * @param message ServerToClientMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.ServerToClientMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

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

        /** Properties of a StartRequest. */
        interface IStartRequest {

            /** StartRequest authToken */
            authToken?: (string|null);

            /** StartRequest interviewId */
            interviewId?: (string|null);

            /** StartRequest audioConfig */
            audioConfig?: (interview_prep.v1.IAudioConfig|null);
        }

        /** Represents a StartRequest. */
        class StartRequest implements IStartRequest {

            /**
             * Constructs a new StartRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IStartRequest);

            /** StartRequest authToken. */
            public authToken: string;

            /** StartRequest interviewId. */
            public interviewId: string;

            /** StartRequest audioConfig. */
            public audioConfig?: (interview_prep.v1.IAudioConfig|null);

            /**
             * Creates a new StartRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns StartRequest instance
             */
            public static create(properties?: interview_prep.v1.IStartRequest): interview_prep.v1.StartRequest;

            /**
             * Encodes the specified StartRequest message. Does not implicitly {@link interview_prep.v1.StartRequest.verify|verify} messages.
             * @param message StartRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IStartRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified StartRequest message, length delimited. Does not implicitly {@link interview_prep.v1.StartRequest.verify|verify} messages.
             * @param message StartRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IStartRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a StartRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns StartRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.StartRequest;

            /**
             * Decodes a StartRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns StartRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.StartRequest;

            /**
             * Verifies a StartRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a StartRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns StartRequest
             */
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.StartRequest;

            /**
             * Creates a plain object from a StartRequest message. Also converts values to other types if specified.
             * @param message StartRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.StartRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this StartRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for StartRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a StartResponse. */
        interface IStartResponse {

            /** StartResponse sessionId */
            sessionId?: (string|null);
        }

        /** Represents a StartResponse. */
        class StartResponse implements IStartResponse {

            /**
             * Constructs a new StartResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IStartResponse);

            /** StartResponse sessionId. */
            public sessionId: string;

            /**
             * Creates a new StartResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns StartResponse instance
             */
            public static create(properties?: interview_prep.v1.IStartResponse): interview_prep.v1.StartResponse;

            /**
             * Encodes the specified StartResponse message. Does not implicitly {@link interview_prep.v1.StartResponse.verify|verify} messages.
             * @param message StartResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IStartResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified StartResponse message, length delimited. Does not implicitly {@link interview_prep.v1.StartResponse.verify|verify} messages.
             * @param message StartResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IStartResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a StartResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns StartResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.StartResponse;

            /**
             * Decodes a StartResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns StartResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.StartResponse;

            /**
             * Verifies a StartResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a StartResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns StartResponse
             */
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.StartResponse;

            /**
             * Creates a plain object from a StartResponse message. Also converts values to other types if specified.
             * @param message StartResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.StartResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this StartResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for StartResponse
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
            constructor(properties?: interview_prep.v1.IAudioChunk);

            /** AudioChunk audioContent. */
            public audioContent: Uint8Array;

            /**
             * Creates a new AudioChunk instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AudioChunk instance
             */
            public static create(properties?: interview_prep.v1.IAudioChunk): interview_prep.v1.AudioChunk;

            /**
             * Encodes the specified AudioChunk message. Does not implicitly {@link interview_prep.v1.AudioChunk.verify|verify} messages.
             * @param message AudioChunk message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IAudioChunk, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AudioChunk message, length delimited. Does not implicitly {@link interview_prep.v1.AudioChunk.verify|verify} messages.
             * @param message AudioChunk message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IAudioChunk, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AudioChunk message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AudioChunk
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.AudioChunk;

            /**
             * Decodes an AudioChunk message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AudioChunk
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.AudioChunk;

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
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.AudioChunk;

            /**
             * Creates a plain object from an AudioChunk message. Also converts values to other types if specified.
             * @param message AudioChunk
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.AudioChunk, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
            constructor(properties?: interview_prep.v1.IEndRequest);

            /**
             * Creates a new EndRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EndRequest instance
             */
            public static create(properties?: interview_prep.v1.IEndRequest): interview_prep.v1.EndRequest;

            /**
             * Encodes the specified EndRequest message. Does not implicitly {@link interview_prep.v1.EndRequest.verify|verify} messages.
             * @param message EndRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IEndRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EndRequest message, length delimited. Does not implicitly {@link interview_prep.v1.EndRequest.verify|verify} messages.
             * @param message EndRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IEndRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EndRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EndRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.EndRequest;

            /**
             * Decodes an EndRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EndRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.EndRequest;

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
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.EndRequest;

            /**
             * Creates a plain object from an EndRequest message. Also converts values to other types if specified.
             * @param message EndRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.EndRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

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

        /** Properties of a PartialTranscript. */
        interface IPartialTranscript {

            /** PartialTranscript text */
            text?: (string|null);

            /** PartialTranscript speaker */
            speaker?: (interview_prep.v1.Speaker|null);

            /** PartialTranscript isFinal */
            isFinal?: (boolean|null);
        }

        /** Represents a PartialTranscript. */
        class PartialTranscript implements IPartialTranscript {

            /**
             * Constructs a new PartialTranscript.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IPartialTranscript);

            /** PartialTranscript text. */
            public text: string;

            /** PartialTranscript speaker. */
            public speaker: interview_prep.v1.Speaker;

            /** PartialTranscript isFinal. */
            public isFinal: boolean;

            /**
             * Creates a new PartialTranscript instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PartialTranscript instance
             */
            public static create(properties?: interview_prep.v1.IPartialTranscript): interview_prep.v1.PartialTranscript;

            /**
             * Encodes the specified PartialTranscript message. Does not implicitly {@link interview_prep.v1.PartialTranscript.verify|verify} messages.
             * @param message PartialTranscript message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IPartialTranscript, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PartialTranscript message, length delimited. Does not implicitly {@link interview_prep.v1.PartialTranscript.verify|verify} messages.
             * @param message PartialTranscript message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IPartialTranscript, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PartialTranscript message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PartialTranscript
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.PartialTranscript;

            /**
             * Decodes a PartialTranscript message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PartialTranscript
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.PartialTranscript;

            /**
             * Verifies a PartialTranscript message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PartialTranscript message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PartialTranscript
             */
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.PartialTranscript;

            /**
             * Creates a plain object from a PartialTranscript message. Also converts values to other types if specified.
             * @param message PartialTranscript
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.PartialTranscript, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PartialTranscript to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PartialTranscript
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SessionEnded. */
        interface ISessionEnded {

            /** SessionEnded reason */
            reason?: (interview_prep.v1.SessionEnded.Reason|null);

            /** SessionEnded message */
            message?: (string|null);
        }

        /** Represents a SessionEnded. */
        class SessionEnded implements ISessionEnded {

            /**
             * Constructs a new SessionEnded.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.ISessionEnded);

            /** SessionEnded reason. */
            public reason: interview_prep.v1.SessionEnded.Reason;

            /** SessionEnded message. */
            public message: string;

            /**
             * Creates a new SessionEnded instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SessionEnded instance
             */
            public static create(properties?: interview_prep.v1.ISessionEnded): interview_prep.v1.SessionEnded;

            /**
             * Encodes the specified SessionEnded message. Does not implicitly {@link interview_prep.v1.SessionEnded.verify|verify} messages.
             * @param message SessionEnded message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.ISessionEnded, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SessionEnded message, length delimited. Does not implicitly {@link interview_prep.v1.SessionEnded.verify|verify} messages.
             * @param message SessionEnded message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.ISessionEnded, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SessionEnded message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SessionEnded
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.SessionEnded;

            /**
             * Decodes a SessionEnded message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SessionEnded
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.SessionEnded;

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
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.SessionEnded;

            /**
             * Creates a plain object from a SessionEnded message. Also converts values to other types if specified.
             * @param message SessionEnded
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.SessionEnded, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
                AI_INITIATED = 2,
                TIMEOUT = 3,
                INTERNAL_ERROR = 4
            }
        }

        /** Properties of an Error. */
        interface IError {

            /** Error code */
            code?: (number|null);

            /** Error message */
            message?: (string|null);
        }

        /** Represents an Error. */
        class Error implements IError {

            /**
             * Constructs a new Error.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IError);

            /** Error code. */
            public code: number;

            /** Error message. */
            public message: string;

            /**
             * Creates a new Error instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Error instance
             */
            public static create(properties?: interview_prep.v1.IError): interview_prep.v1.Error;

            /**
             * Encodes the specified Error message. Does not implicitly {@link interview_prep.v1.Error.verify|verify} messages.
             * @param message Error message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IError, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Error message, length delimited. Does not implicitly {@link interview_prep.v1.Error.verify|verify} messages.
             * @param message Error message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IError, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an Error message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.Error;

            /**
             * Decodes an Error message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Error
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.Error;

            /**
             * Verifies an Error message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an Error message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Error
             */
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.Error;

            /**
             * Creates a plain object from an Error message. Also converts values to other types if specified.
             * @param message Error
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.Error, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Error to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Error
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an AudioConfig. */
        interface IAudioConfig {

            /** AudioConfig encoding */
            encoding?: (interview_prep.v1.AudioConfig.AudioEncoding|null);

            /** AudioConfig sampleRateHertz */
            sampleRateHertz?: (number|null);
        }

        /** Represents an AudioConfig. */
        class AudioConfig implements IAudioConfig {

            /**
             * Constructs a new AudioConfig.
             * @param [properties] Properties to set
             */
            constructor(properties?: interview_prep.v1.IAudioConfig);

            /** AudioConfig encoding. */
            public encoding: interview_prep.v1.AudioConfig.AudioEncoding;

            /** AudioConfig sampleRateHertz. */
            public sampleRateHertz: number;

            /**
             * Creates a new AudioConfig instance using the specified properties.
             * @param [properties] Properties to set
             * @returns AudioConfig instance
             */
            public static create(properties?: interview_prep.v1.IAudioConfig): interview_prep.v1.AudioConfig;

            /**
             * Encodes the specified AudioConfig message. Does not implicitly {@link interview_prep.v1.AudioConfig.verify|verify} messages.
             * @param message AudioConfig message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: interview_prep.v1.IAudioConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AudioConfig message, length delimited. Does not implicitly {@link interview_prep.v1.AudioConfig.verify|verify} messages.
             * @param message AudioConfig message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: interview_prep.v1.IAudioConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AudioConfig message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AudioConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): interview_prep.v1.AudioConfig;

            /**
             * Decodes an AudioConfig message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AudioConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): interview_prep.v1.AudioConfig;

            /**
             * Verifies an AudioConfig message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an AudioConfig message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns AudioConfig
             */
            public static fromObject(object: { [k: string]: any }): interview_prep.v1.AudioConfig;

            /**
             * Creates a plain object from an AudioConfig message. Also converts values to other types if specified.
             * @param message AudioConfig
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: interview_prep.v1.AudioConfig, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this AudioConfig to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for AudioConfig
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        namespace AudioConfig {

            /** AudioEncoding enum. */
            enum AudioEncoding {
                ENCODING_UNSPECIFIED = 0,
                LINEAR_PCM = 1
            }
        }

        /** Speaker enum. */
        enum Speaker {
            SPEAKER_UNSPECIFIED = 0,
            USER = 1,
            AI = 2
        }
    }
}
