import { PostHog } from 'posthog-node';
import { toDistinctId, scrubProperties } from '@safepal/shared';

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
    if (client !== undefined) return client;
    client = process.env.POSTHOG_KEY
        ? new PostHog(process.env.POSTHOG_KEY, {
            host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
            flushAt: 20,
            flushInterval: 10000,
        })
        : null;
    return client;
}

export function track(distinctId: string, event: string, properties: Record<string, any> = {}): void {
    const posthog = getClient();
    if (!posthog) return;
    posthog.capture({
        distinctId: toDistinctId(distinctId),
        event,
        properties: scrubProperties(properties),
    });
}

export function identify(distinctId: string, properties: Record<string, any> = {}): void {
    const posthog = getClient();
    if (!posthog) return;
    posthog.identify({
        distinctId: toDistinctId(distinctId),
        properties: scrubProperties(properties),
    });
}

export function shutdownPostHog(): Promise<void> {
    return client ? client.shutdown() : Promise.resolve();
}
