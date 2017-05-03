///<reference path="../Common/IEventSource.ts"/>
///<reference path="../Common/PlatformEvent.ts"/>

namespace Common.Browser {

    export class ConsoleLoggingListener implements IEventListener<PlatformEvent> {
        private logLevelFilter: EventType;

        public constructor(logLevelFilter: EventType = EventType.Warning) {
            this.logLevelFilter = logLevelFilter;
        }

        public OnEvent = (event: PlatformEvent): void => {
            if (event.EventType >= this.logLevelFilter) {
                const log = this.ToString(event);

                switch (event.EventType) {
                    case EventType.Debug:
                        // tslint:disable-next-line:no-console
                        console.debug(log);
                        break;
                    case EventType.Info:
                        // tslint:disable-next-line:no-console
                        console.info(log);
                        break;
                    case EventType.Warning:
                        console.warn(log);
                        break;
                    case EventType.Error:
                        console.error(log);
                        break;
                    default:
                        // tslint:disable-next-line:no-console
                        console.log(log);
                        break;
                }
            }
        }

        private ToString = (event: PlatformEvent): string => {
            const logFragments = [
                `${event.EventTime}`,
            ];

            if (event.constructor && event.constructor.name) {
                logFragments.push(`${event.constructor.name}`);
            }

            for (const prop in event) {
                if (prop && prop !== "EventTime" && prop !== "EventType" && prop !== "EventId" && prop !== "constructor") {
                    const value = event[prop];
                    let valueToLog = "<NULL>";
                    if (value !== undefined && value !== null) {
                        if (typeof (value) === "number" || typeof (value) === "string") {
                            valueToLog = value.toString();
                        } else {
                            valueToLog = JSON.stringify(value);
                        }
                    }

                    logFragments.push(`${prop}: ${valueToLog}`);
                }

            }

            return logFragments.join(" | ");
        }
    }
}
