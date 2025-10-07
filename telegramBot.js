const TelegramBot = require('node-telegram-bot-api');

class UltraTelegramBot {
    constructor(token, discordController, aiProcessor) {
        this.bot = new TelegramBot(token, { polling: true });
        this.discordController = discordController;
        this.aiProcessor = aiProcessor;
        this.userContexts = new Map();
        this.setupBot();
    }

    setupBot() {
        console.log('🤖 Initialisation du Bot Telegram Ultra-Riche...');

        // Commande /start
        this.bot.onText(/\/start/, (msg) => {
            this.showWelcome(msg.chat.id);
        });

        // Commande /menu
        this.bot.onText(/\/menu/, (msg) => {
            this.showMainMenu(msg.chat.id);
        });

        // Commande /status
        this.bot.onText(/\/status/, async (msg) => {
            await this.showStatus(msg.chat.id);
        });

        // Commande /friends
        this.bot.onText(/\/friends/, async (msg) => {
            await this.showFriends(msg.chat.id);
        });

        // Commande /servers
        this.bot.onText(/\/servers/, async (msg) => {
            await this.showServers(msg.chat.id);
        });

        // Commande /help
        this.bot.onText(/\/help/, (msg) => {
            this.showHelp(msg.chat.id);
        });

        // Commande /clear
        this.bot.onText(/\/clear/, (msg) => {
            this.aiProcessor.clearConversation(msg.chat.id);
            this.sendMessage(msg.chat.id, '🗑️ Historique de conversation effacé !');
        });

        // Gestion des boutons callback
        this.bot.on('callback_query', async (query) => {
            await this.handleCallback(query);
        });

        // Traitement des messages
        this.bot.on('message', async (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                await this.handleUserMessage(msg);
            }
        });

        // Gestion des erreurs
        this.bot.on('error', (error) => {
            if (!error.message.includes('ETELEGRAM')) {
                console.error('❌ Erreur Telegram:', error.message);
            }
        });

        this.bot.on('polling_error', (error) => {
            if (!error.message.includes('409') && !error.message.includes('400')) {
                console.error('❌ Erreur polling:', error.message);
            }
        });

        console.log('✅ Bot Telegram initialisé !');
    }

    // ========== AFFICHAGE DES MENUS ==========
    
    showWelcome(chatId) {
        const welcome = `
🎉 *BIENVENUE DANS DISCORD AI MASTER* 🎉

🚀 Le contrôleur Discord le plus puissant du monde !

🔥 *Fonctionnalités :*
✅ Envoyer des messages et DMs
✅ Ajouter/retirer des amis
✅ Rejoindre/quitter des serveurs
✅ Réagir aux messages
✅ Changer de statut
✅ Et bien plus encore...

🧠 *IA Ultra-Réaliste :*
Parlez naturellement, l'IA comprend tout !

📱 *Tapez /menu pour commencer*
        `;

        this.sendMessage(chatId, welcome);
    }

    showMainMenu(chatId) {
        const menu = `
🎯 *MENU PRINCIPAL*

Choisissez une action :
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Envoyer Message', callback_data: 'action_message' },
                    { text: '👥 Gérer Amis', callback_data: 'action_friends' }
                ],
                [
                    { text: '🏠 Gérer Serveurs', callback_data: 'action_servers' },
                    { text: '📨 Messages Récents', callback_data: 'action_recent' }
                ],
                [
                    { text: '⚙️ Paramètres', callback_data: 'action_settings' },
                    { text: '📊 Statut Discord', callback_data: 'action_status' }
                ],
                [
                    { text: '🤖 Mode IA', callback_data: 'action_ai' },
                    { text: '❓ Aide', callback_data: 'action_help' }
                ]
            ]
        };

        this.bot.sendMessage(chatId, menu, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    async showStatus(chatId) {
        try {
            const connected = this.discordController.getConnectionStatus();
            
            if (!connected) {
                this.sendMessage(chatId, '❌ Discord déconnecté !');
                return;
            }

            const client = this.discordController.getClient();
            const friends = await this.discordController.getFriends();
            const servers = await this.discordController.getAllServers();

            const status = `
📊 *STATUT DISCORD*

👤 *Compte :* ${client.user.tag}
🆔 *ID :* \`${client.user.id}\`

📈 *Statistiques :*
👥 Amis : ${friends.length}
🏠 Serveurs : ${servers.length}
💬 Channels : ${client.channels.cache.size}

🟢 *Statut :* En ligne
⚡ *IA :* Activée

🔋 *Requêtes IA :* ${this.aiProcessor.getStats().requestsUsed}
💰 *Coût estimé :* $${this.aiProcessor.getStats().estimatedCost}
            `;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔄 Actualiser', callback_data: 'action_status' }],
                    [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, status, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            this.sendMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    async showFriends(chatId) {
        try {
            const friends = await this.discordController.getFriends();

            if (friends.length === 0) {
                this.sendMessage(chatId, '😔 Vous n\'avez pas encore d\'amis');
                return;
            }

            let friendsList = `👥 *VOS AMIS* (${friends.length})\n\n`;

            friends.forEach((friend, index) => {
                friendsList += `${index + 1}. **${friend.tag}**\n`;
                friendsList += `   ID: \`${friend.id}\`\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '➕ Ajouter Ami', callback_data: 'action_add_friend' }],
                    [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, friendsList, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            this.sendMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    async showServers(chatId) {
        try {
            const servers = await this.discordController.getAllServers();

            if (servers.length === 0) {
                this.sendMessage(chatId, '😔 Vous n\'êtes sur aucun serveur');
                return;
            }

            let serversList = `🏠 *VOS SERVEURS* (${servers.length})\n\n`;

            servers.forEach((server, index) => {
                serversList += `${index + 1}. **${server.name}**\n`;
                serversList += `   👥 ${server.memberCount} membres\n`;
                serversList += `   ID: \`${server.id}\`\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '➕ Rejoindre Serveur', callback_data: 'action_join_server' }],
                    [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, serversList, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            this.sendMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    showHelp(chatId) {
        const help = `
❓ *GUIDE D'UTILISATION*

🎯 *Commandes Naturelles IA :*

📨 *Messages :*
• "Envoie un DM à username avec le message..."
• "Dis bonjour à username sur Discord"
• "Écris à username : ton message ici"

👥 *Amis :*
• "Ajoute username en ami"
• "Retire username de mes amis"
• "Montre-moi mes amis"

🏠 *Serveurs :*
• "Rejoins le serveur avec le code XXX"
• "Quitte le serveur YYY"
• "Montre mes serveurs"

⚡ *Actions Rapides :*
• "Réagis avec 👍 au dernier message"
• "Change mon statut en occupé"
• "Montre les messages récents"

🧠 *L'IA comprend le langage naturel !*
Parlez comme à un humain, elle s'adapte.

📱 *Commandes :*
/menu - Menu principal
/status - Statut Discord
/friends - Liste des amis
/servers - Liste des serveurs
/clear - Effacer l'historique IA
/help - Cette aide
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
            ]
        };

        this.bot.sendMessage(chatId, help, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    // ========== GESTION DES CALLBACKS ==========
    
    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const data = query.data;

        try {
            await this.bot.answerCallbackQuery(query.id);
        } catch (error) {
            // Ignorer les erreurs de callback anciennes
        }

        switch (data) {
            case 'action_menu':
                this.showMainMenu(chatId);
                break;
            case 'action_message':
                this.promptSendMessage(chatId);
                break;
            case 'action_friends':
                await this.showFriends(chatId);
                break;
            case 'action_servers':
                await this.showServers(chatId);
                break;
            case 'action_recent':
                await this.showRecentMessages(chatId);
                break;
            case 'action_settings':
                this.showSettings(chatId);
                break;
            case 'action_status':
                await this.showStatus(chatId);
                break;
            case 'action_ai':
                this.activateAIMode(chatId);
                break;
            case 'action_help':
                this.showHelp(chatId);
                break;
            case 'action_add_friend':
                this.promptAddFriend(chatId);
                break;
            case 'action_join_server':
                this.promptJoinServer(chatId);
                break;
        }
    }

    // ========== INTERACTIONS UTILISATEUR ==========
    
    promptSendMessage(chatId) {
        this.userContexts.set(chatId, { mode: 'send_message' });
        this.sendMessage(chatId, '💬 *Envoi de Message*\n\nQui voulez-vous contacter et que voulez-vous dire ?\n\nExemple: "Envoie à @username : Salut ça va ?"');
    }

    promptAddFriend(chatId) {
        this.userContexts.set(chatId, { mode: 'add_friend' });
        this.sendMessage(chatId, '👥 *Ajout d\'Ami*\n\nQuel est le nom d\'utilisateur à ajouter ?\n\nExemple: "username" ou "Ajoute username en ami"');
    }

    promptJoinServer(chatId) {
        this.userContexts.set(chatId, { mode: 'join_server' });
        this.sendMessage(chatId, '🏠 *Rejoindre un Serveur*\n\nQuel est le code d\'invitation ?\n\nExemple: "discord.gg/XXXXX" ou juste "XXXXX"');
    }

    activateAIMode(chatId) {
        this.userContexts.set(chatId, { mode: 'ai_active' });
        this.sendMessage(chatId, `
🤖 *MODE IA ACTIVÉ*

L'IA est maintenant à votre écoute !
Parlez naturellement, elle comprendra.

💡 *Exemples :*
• "Ajoute John en ami puis dis-lui bonjour"
• "Rejoins ce serveur et envoie un message sur #général"
• "Montre-moi les derniers messages de mes amis"

Pour désactiver : /menu
        `);
    }

    async showRecentMessages(chatId) {
        try {
            const messages = this.discordController.messageHistory.slice(0, 10);

            if (messages.length === 0) {
                this.sendMessage(chatId, '📭 Aucun message récent');
                return;
            }

            let messageText = `📨 *MESSAGES RÉCENTS*\n\n`;

            messages.forEach((msg, index) => {
                const time = new Date(msg.timestamp).toLocaleTimeString('fr-FR');
                messageText += `${index + 1}. **${msg.author}** (${time})\n`;
                messageText += `   📍 ${msg.channel}\n`;
                messageText += `   💬 ${msg.content.substring(0, 80)}...\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔄 Actualiser', callback_data: 'action_recent' }],
                    [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, messageText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            this.sendMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    showSettings(chatId) {
        const settings = `
⚙️ *PARAMÈTRES*

🧠 *IA :*
• Modèle : ${process.env.AI_MODEL}
• Tokens max : ${process.env.AI_MAX_TOKENS}
• Température : ${process.env.AI_TEMPERATURE}

🔋 *Utilisation :*
• Requêtes : ${this.aiProcessor.getStats().requestsUsed}
• Coût : $${this.aiProcessor.getStats().estimatedCost}

📱 *Actions :*
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🗑️ Effacer Historique IA', callback_data: 'action_clear_history' }],
                [{ text: '🔙 Menu Principal', callback_data: 'action_menu' }]
            ]
        };

        this.bot.sendMessage(chatId, settings, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    }

    // ========== TRAITEMENT DES MESSAGES ==========
    
    async handleUserMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        // Indicateur de frappe
        await this.bot.sendChatAction(chatId, 'typing');

        const context = this.userContexts.get(chatId);

        // Mode IA toujours actif par défaut
        if (!context || context.mode === 'ai_active' || this.looksLikeCommand(text)) {
            await this.processWithAI(chatId, text);
        } else {
            // Contextes spécifiques
            await this.handleContextMessage(chatId, text, context);
        }
    }

    async processWithAI(chatId, text) {
        try {
            console.log(`🧠 Traitement IA pour: "${text}"`);
            
            const response = await this.aiProcessor.processCommand(text, chatId);
            
            if (response.success) {
                this.sendMessage(chatId, `✅ ${response.message}`);
                
                // Afficher les détails si disponibles
                if (response.results && response.results.length > 0) {
                    const details = response.results
                        .filter(r => r.success !== false)
                        .map(r => `• ${r.action}: ${r.message}`)
                        .join('\n');
                    
                    if (details) {
                        this.sendMessage(chatId, `📝 Détails:\n${details}`);
                    }
                }
            } else {
                this.sendMessage(chatId, `❌ ${response.message}`);
            }

        } catch (error) {
            console.error('Erreur traitement IA:', error);
            this.sendMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    async handleContextMessage(chatId, text, context) {
        // Gérer les contextes spécifiques
        // À implémenter si nécessaire
        await this.processWithAI(chatId, text);
    }

    looksLikeCommand(text) {
        const patterns = [
            /envoie|envoye|envois/i,
            /dis|dit/i,
            /ajoute|rajoute/i,
            /rejoins|join/i,
            /montre|affiche/i,
            /réagis|react/i,
            /change|modifie/i
        ];
        
        return patterns.some(p => p.test(text));
    }

    // ========== UTILITAIRES ==========
    
    async sendMessage(chatId, text) {
        try {
            // Échapper les caractères Markdown
            const safeText = text
                .replace(/\\/g, '\\\\')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)');
            
            await this.bot.sendMessage(chatId, safeText, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });
        } catch (error) {
            // Fallback sans Markdown
            const plainText = text.replace(/[*_`\[\]()]/g, '');
            await this.bot.sendMessage(chatId, plainText);
        }
    }
}

module.exports = UltraTelegramBot;