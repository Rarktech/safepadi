export const FEEDBACK_HOOK_PROMPTS = [
    "how would you feel if Safeeely just… disappeared tomorrow? 💀\n\nrate your experience fr 👇",
    "imagine doing your next deal without Safeeely. scary or nah? 👀\n\ntap a star to tell us how we did 👇",
    "real talk — has Safeeely actually made your life easier? 🤔\n\ndrop a rating, no cap 👇",
    "no cap, how's Safeeely been treating you? 🤝\n\nbe honest with us 👇",
    "okay bestie, it's vibe check time ✨\n\nhow was your Safeeely experience? 👇",
    "it's giving… what exactly? 🤨\n\nrate your Safeeely experience fr 👇",
    "ngl we need your honest take rn — no filter, no cap 🫡\n\nhow did we do? 👇",
    "you're literally helping build the future of safe trades 💪\n\ndrop your rating so we can level up 👇",
    "the Safeeely gang needs your real opinion (yes YOU specifically) 👇",
    "if you fw Safeeely, show us some love 🙏\n\nif not, we need to know why 👇",
];

export const FEEDBACK_COMMENT_PROMPTS: Record<number, string[]> = {
    5: [
        "okay you literally ate fr 🔥\n\ndrop a quick comment? (or tap Skip)",
        "bestie said 5 stars, we're crying happy tears 😭✨\n\ntell us what made it so good?",
        "we're blushing rn ngl 🫶\n\nanything you wanna add? (or tap Skip)",
    ],
    4: [
        "4 stars, we'll take it! 👏\n\nwhat would've made it a 5 tho? 👀",
        "almost perfect, we see you 🙏\n\nwhat's the one thing we could do better?",
        "solid 4 ✨\n\ngot anything you wanna add? (or tap Skip)",
    ],
    3: [
        "a 3 means room to glow up 🌱\n\nwhat would make us better? be real with us",
        "mid? we literally can't accept that 😅\n\nwhat do we need to fix fr?",
        "3 stars = we got work to do 💪\n\ndrop your honest thoughts?",
    ],
    2: [
        "ouch, 2 stars 😔\n\nwhat went wrong fr? we actually wanna fix it",
        "we're not gonna ignore this 👀\n\nwhat happened? tell us the tea",
        "we wanna do better for you 🙏\n\nwhat's the honest truth?",
    ],
    1: [
        "oof, 1 star — that hurts but we NEED to know 😢\n\nwhat happened?",
        "we failed you and that's actually on us 😔\n\nplease tell us what went wrong fr",
        "1 star means we really messed up 💀\n\ndrop the honest truth, we can take it",
    ],
};

export const FEEDBACK_SUCCESS_MESSAGES = [
    "your feedback just made it to the team 🙏\n\nwe're actually gonna read this fr",
    "no cap, this means a lot to us 💙\n\nwe're on it",
    "bestie thank you fr fr 🫶\n\nyour feedback is gonna help us level up",
    "heard loud and clear 💯\n\nwe're taking notes",
];

export function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function getCommentPrompt(rating: number): string {
    const pool = FEEDBACK_COMMENT_PROMPTS[rating] ?? FEEDBACK_COMMENT_PROMPTS[3];
    return pickRandom(pool);
}
