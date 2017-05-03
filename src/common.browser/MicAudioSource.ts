/// <reference path="..\common\Promise.ts" />
/// <reference path="..\common\RiffPcmEncoder.ts" />
/// <reference path="..\common\Stream.ts" />
/// <reference path="..\common\Events.ts" />
/// <reference path="..\common\IAudioSource.ts" />
/// <reference path="..\common\EventSource.ts"/>
/// <reference path="..\common\PlatformEvent.ts"/>
/// <reference path="..\common\AudioSourceEvents.ts"/>
/// <reference path="..\common\GuidGenerator.ts"/>
/// <reference path="IRecorder.ts" />

namespace Common.Browser {

    export class MicAudioSource implements IAudioSource {

        private streams: IStringDictionary<Stream<ArrayBuffer>> = {};

        private id: string;

        private events: EventSource<PlatformEvent>;

        private initializeDeferral: Deferred<boolean>;

        private recorder: IRecorder;

        private mediaStream: MediaStream;

        public constructor(recorder: IRecorder, audioSourceId?: string) {
            this.id = audioSourceId ? audioSourceId : GuidGenerator.CreateGuidWithNoDash();
            this.events = new EventSource();
            this.recorder = recorder;
        }

        public TurnOn = (): Promise<boolean> => {
            if (this.initializeDeferral) {
                return this.initializeDeferral.Promise();
            }

            this.initializeDeferral = new Deferred<boolean>();
            window.navigator.getUserMedia = (
                navigator.getUserMedia ||
                // tslint:disable-next-line:no-string-literal
                navigator["webkitGetUserMedia"] ||
                // tslint:disable-next-line:no-string-literal
                navigator["mozGetUserMedia"] ||
                // tslint:disable-next-line:no-string-literal
                navigator["msGetUserMedia"]
            );

            if (!window.navigator.getUserMedia) {
                const errorMsg = "Browser doesnot support getUserMedia.";
                this.initializeDeferral.Reject(errorMsg);
                this.OnEvent(new AudioSourceErrorEvent(errorMsg, "")); // mic initialized error - no streamid at this point
            } else {
                this.OnEvent(new AudioSourceInitializingEvent(this.id)); // no stream id
                window.navigator.getUserMedia(
                    { audio: true },
                    (mediaStream: MediaStream) => {
                        this.mediaStream = mediaStream;
                        this.OnEvent(new AudioSourceReadyEvent(this.id));
                        this.initializeDeferral.Resolve(true);

                    }, (error: MediaStreamError) => {
                        const errorMsg = `Error occured processing the user media stream. ${error}`;
                        this.initializeDeferral.Reject(errorMsg);
                        this.OnEvent(new AudioSourceErrorEvent(this.id, errorMsg));
                    });
            }

            return this.initializeDeferral.Promise();
        }

        public Id = (): string => {
            return this.id;
        }

        public Attach = (audioNodeId: string): Promise<IAudioStreamNode> => {
            this.OnEvent(new AudioStreamNodeAttachingEvent(this.id, audioNodeId));

            return this.Listen(audioNodeId).OnSuccessContinueWith<IAudioStreamNode>(
                (streamReader: StreamReader<ArrayBuffer>) => {
                    this.OnEvent(new AudioStreamNodeAttachedEvent(this.id, audioNodeId));
                    return {
                        Detach: () => {
                            streamReader.Close();
                            delete this.streams[audioNodeId];
                            this.OnEvent(new AudioStreamNodeDetachedEvent(this.id, audioNodeId));
                            this.TurnOff();
                        },
                        Id: () =>  {
                            return audioNodeId;
                        },
                        Read: () => {
                            return streamReader.Read();
                        },
                    };
                });
        }

        public Detach = (audioNodeId: string): void => {
            if (audioNodeId && this.streams[audioNodeId]) {
                this.streams[audioNodeId].Close();
                delete this.streams[audioNodeId];
                this.OnEvent(new AudioStreamNodeDetachedEvent(this.id, audioNodeId));
            }
        }

        public TurnOff = (): Promise<boolean> => {
            for (const streamId in this.streams) {
                if (streamId) {
                    const stream = this.streams[streamId];
                    if (stream) {
                        stream.Close();
                    }
                }
            }

            this.recorder.ReleaseMediaResources();

            this.OnEvent(new AudioSourceOffEvent(this.id)); // no stream now
            this.initializeDeferral = null;
            return PromiseHelper.FromResult(true);
        }

        public get Events(): EventSource<AudioSourceEvent> {
            return this.events;
        }

        private Listen = (audioNodeId: string): Promise<StreamReader<ArrayBuffer>> => {
            return this.TurnOn()
                .OnSuccessContinueWith<StreamReader<ArrayBuffer>>((_: boolean) => {
                    const stream = new Stream<ArrayBuffer>(audioNodeId);
                    this.streams[audioNodeId] = stream;

                    try {
                        this.recorder.Record(this.mediaStream, stream);
                    } catch (error) {
                        const errorMsg = `Error occured processing the user media stream. ${error}`;
                        this.initializeDeferral.Reject(errorMsg);
                        this.OnEvent(new AudioStreamNodeErrorEvent(this.id, audioNodeId, error));
                    }

                    return stream.GetReader();
                });
        }

        private OnEvent = (event: AudioSourceEvent): void => {
            this.events.OnEvent(event);
            Common.Events.Instance.OnEvent(event);
        }
    }
}
