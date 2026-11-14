const settings = require('../../settings');

module.exports = {
    name: 'roast',
    aliases: ['insult', 'burn'],
    category: 'fun',
    description: 'Roast someone in the group',
    usage: '.roast @user',
    react: '🔥',

    async execute(conn, mek, args, chatId) {
        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        let target = mentioned[0];
        let targetName = 'You';

        if (target) {
            targetName = '@' + target.split('@')[0];
        } else {
            target = mek.key.participant || mek.key.remoteJid;
            targetName = '@' + target.split('@')[0];
        }

        const roasts = [
            "I'd agree with you, but then we'd both be wrong.",
            "You're not stupid; you just have bad luck when thinking.",
            "You bring everyone so much joy... when you leave the room.",
            "I was going to give you a nasty look, but I see you already have one.",
            "Your secrets are safe with me. I never even listen when you talk.",
            "You're the reason the middle seat was invented.",
            "Somewhere out there is a tree tirelessly producing oxygen for you. You owe it an apology.",
            "I'm jealous of all the people that haven't met you.",
            "You're like a cloud. When you disappear, it's a beautiful day.",
            "I’d explain it to you, but I left my English-to-Dumbass dictionary at home.",
            "Your brain has too many tabs open and none of them are loading.",
            "You're the human equivalent of a pop-up ad.",
            "If ignorance is bliss, you must be the happiest person alive.",
            "You're proof that even evolution takes a coffee break sometimes.",
            "I would say you're a joke, but jokes have a punchline.",
            "You're not the dumbest person in the world, but you better hope they don't die.",
            "You're like a software update. Whenever I see you, I think, 'Not now.'",
            "I could eat a bowl of alphabet soup and spit out better arguments than you.",
            "You're the reason they put instructions on shampoo bottles.",
            "Your outfit is a perfect representation of your personality: confusing and unappealing.",
            "You have something on your chin... no, the third one down.",
            "I thought of you today. It reminded me to take out the trash.",
            "You're like a slinky. Not really good for anything, but you still bring a smile to my face when I push you down the stairs.",
            "If I wanted to kill myself, I'd climb your ego and jump to your IQ.",
            "You're so full of crap, you could fertilize a whole farm.",
            "You're the reason this group needs a 'mute' button.",
            "I don't know what your problem is, but I'll bet it's hard to pronounce.",
            "You're like a penny—two-faced and not worth much.",
            "Your face makes onions cry.",
            "You're the human version of a typo.",
            "You're like a broken pencil—pointless.",
            "I’d call you a genius, but you’d probably think that’s a type of fruit.",
            "You're not completely useless. You can always serve as a bad example.",
            "If stupid was a crime, you'd be serving a life sentence.",
            "Your family tree must be a cactus because everyone on it is a prick.",
            "You're the reason they put 'do not swallow' on shampoo bottles.",
            "You're like a traffic jam—nobody wants you, and you ruin everyone's day.",
            "You're the kind of person who would trip over a wireless network.",
            "Your life is like a math book—full of problems.",
            "You're so clueless, you probably think Taco Bell is a Mexican phone company.",
            "You're like a broken mirror—seven years of bad luck looking at you.",
            "You're the reason they had to put a warning label on a hairdryer.",
            "I’d roast you, but my mom said I’m not allowed to burn trash.",
            "You're like a plunger—always picking up crap.",
            "You're the reason why we can't have nice things.",
            "If you were a vegetable, you'd be a cabbages.",
            "You have the perfect face for radio.",
            "I'd say you're a complete idiot, but that would imply you're complete.",
            "You're like a mosquito—annoying and useless.",
            "You're so boring, you make paint drying look exciting.",
            "Your jokes are like expired milk—unwanted and sour.",
            "You're the reason why aliens won't visit Earth.",
            "You're like a spoiler—ruining everything.",
            "You're the kind of person who would lose a game of hide and seek to a blind person.",
            "You're so dumb, you thought a quarterback was a refund."
        ];

        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

        const text = `🔥 *ROAST ALERT* 🔥\n\n${targetName} ${randomRoast}\n\n${settings.footer}`;

        await conn.sendMessage(chatId, { 
            text: text, 
            mentions: [target] 
        }, { quoted: mek });
    }
};