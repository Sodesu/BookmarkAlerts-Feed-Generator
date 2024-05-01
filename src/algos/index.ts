// index.ts
import { AppContext } from '../config';
import {
    QueryParams,
    OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton';
import * as whatsAlf from './whats-alf';

type AlgoHandler = {
    handler: (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>,
    requiresAuth: boolean
};

const algos: Record<string, AlgoHandler> = {
    [whatsAlf.shortname]: {
        handler: whatsAlf.handler,
        requiresAuth: whatsAlf.requiresAuth,  // Reflects the updated auth requirement
    },
};

export default algos;
