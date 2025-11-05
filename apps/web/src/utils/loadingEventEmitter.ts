// apps/web/src/utils/loadingEventEmitter.ts
import mitt from 'mitt';

type Events = {
  start: void;
  end: void;
};

export const loadingEventEmitter = mitt<Events>();
