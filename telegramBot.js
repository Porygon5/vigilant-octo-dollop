const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

class DiscordAITelegramBot {
    constructor(token, discordController, aiProcessor) {
        this.bot = new TelegramBot(token, { polling: true });
        this.discordController = discordController;
        this.aiProcessor = aiProcessor;
        this.userStates = new Map();
        this.setupBot();
    }

    setupBot() {
        console.log('🤖 Initialisation du bot Telegram...');

        // Menu principal stylé
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🚀 *Discord AI Controller* 🤖

✨ *Bienvenue dans votre centre de contrôle Discord IA !*

🎮 *Commandes disponibles :*
• /menu - Menu principal interactif
• /status - État de Discord
• /help - Aide complète

💬 *Ou tapez simplement votre demande :*
"Répond 'salut' à Anthony0707"
"Envoie un message sur le serveur Gaming"
"Montre-moi les derniers messages"

🔥 *Interface stylée en cours de chargement...*
            `;

            this.sendStyledMessage(chatId, welcomeMessage);
            this.showMainMenu(chatId);
        });

        // Menu interactif
        this.bot.onText(/\/menu/, (msg) => {
            this.showMainMenu(msg.chat.id);
        });

        // Statut Discord
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            await this.showDiscordStatus(chatId);
        });

        // Aide
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            this.showHelp(chatId);
        });

        // Gestion des boutons inline
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;

            try {
                // Vérifier si la query est encore valide (pas trop ancienne)
                const queryAge = Date.now() - callbackQuery.message.date * 1000;
                if (queryAge < 60000) { // Moins d'1 minute
                    await this.bot.answerCallbackQuery(callbackQuery.id);
                }
            } catch (error) {
                console.error('Erreur callback query:', error.message);
                // Ignorer les erreurs de callback query anciennes
            }

            switch (data) {
                case 'quick_message':
                    this.showQuickMessageMenu(chatId);
                    break;
                case 'discord_status':
                    await this.showDiscordStatus(chatId);
                    break;
                case 'recent_messages':
                    await this.showRecentMessages(chatId);
                    break;
                case 'servers':
                    await this.showServersList(chatId);
                    break;
                case 'ai_chat':
                    this.startAIChat(chatId);
                    break;
                case 'back_to_menu':
                    this.showMainMenu(chatId);
                    break;
            }
        });

        // Traitement des messages textuels (IA)
        this.bot.on('message', async (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                await this.processAIMessage(msg);
            }
        });

        // Gestion des erreurs
        this.bot.on('error', (error) => {
            console.error('❌ Erreur bot Telegram:', error.message);
            if (error.code === 'ETELEGRAM' && error.response?.body?.description?.includes('409')) {
                console.log('⚠️ Une autre instance du bot est déjà en cours d\'exécution');
            }
        });

        // Gestion des erreurs de polling
        this.bot.on('polling_error', (error) => {
            console.error('❌ Erreur polling Telegram:', error.message);
            if (error.code === 'ETELEGRAM') {
                if (error.response?.body?.description?.includes('409')) {
                    console.log('⚠️ Conflit: Une autre instance du bot utilise déjà ce token');
                } else if (error.response?.body?.description?.includes('400')) {
                    console.log('⚠️ Erreur de requête Telegram - Ignorée');
                }
            }
        });

        console.log('✅ Bot Telegram initialisé avec succès !');
    }

    async sendStyledMessage(chatId, text, options = {}) {
        const defaultOptions = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };

        try {
            // Échapper les caractères Markdown problématiques
            const safeText = text
                .replace(/\\/g, '\\\\')  // Échapper les backslashes
                .replace(/\[/g, '\\[')   // Échapper les crochets
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')   // Échapper les parenthèses
                .replace(/\)/g, '\\)')
                .replace(/_/g, '\\_')    // Échapper les underscores
                .replace(/\*/g, '\\*')   // Échapper les astérisques
                .replace(/`/g, '\\`');   // Échapper les backticks
            
            await this.bot.sendMessage(chatId, safeText, { ...defaultOptions, ...options });
        } catch (error) {
            console.error('Erreur envoi message:', error.message);
            // Fallback sans Markdown
            const plainText = text.replace(/[*_`\[\]()]/g, '');
            await this.bot.sendMessage(chatId, plainText, { disable_web_page_preview: true });
        }
    }

    showMainMenu(chatId) {
        const menuText = `
🎯 *MENU PRINCIPAL* 🎯

Choisissez une action :
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Message Rapide', callback_data: 'quick_message' },
                    { text: '📊 Statut Discord', callback_data: 'discord_status' }
                ],
                [
                    { text: '📨 Messages Récents', callback_data: 'recent_messages' },
                    { text: '🏠 Serveurs', callback_data: 'servers' }
                ],
                [
                    { text: '🤖 Chat IA', callback_data: 'ai_chat' },
                    { text: '❓ Aide', callback_data: 'help' }
                ]
            ]
        };

        this.bot.sendMessage(chatId, menuText, {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    }

    showQuickMessageMenu(chatId) {
        const quickText = `
⚡ *MESSAGE RAPIDE* ⚡

🎯 *Actions rapides disponibles :*

• *Répondre à quelqu'un :*
  "Répond 'salut' à @username"

• *Envoyer un message :*
  "Envoie 'bonjour tout le monde' sur #general"

• *Mentionner quelqu'un :*
  "Dis à @admin de venir"

• *Réaction :*
  "Réagis avec 👍 au dernier message"

💡 *Tapez votre commande maintenant !*
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔙 Retour au Menu', callback_data: 'back_to_menu' }]
            ]
        };

        this.bot.sendMessage(chatId, quickText, {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    }

    async showDiscordStatus(chatId) {
        try {
            const status = await this.discordController.getStatus();
            
            const statusText = `
📊 *STATUT DISCORD* 📊

🤖 **Utilisateur :** ${status.username}
🆔 **ID :** \`${status.id}\`
🟢 **Statut :** ${status.status}
📱 **Plateforme :** ${status.platform}

🏠 **Serveurs :** ${status.guilds}
💬 **Channels :** ${status.channels}
👥 **Utilisateurs :** ${status.users}

⚡ **Statut IA :** ${status.aiEnabled ? '🟢 Actif' : '🔴 Inactif'}
            `;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔄 Actualiser', callback_data: 'discord_status' }],
                    [{ text: '🔙 Retour au Menu', callback_data: 'back_to_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, statusText, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            this.sendStyledMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    async showRecentMessages(chatId) {
        try {
            const messages = await this.discordController.getRecentMessages(10);
            
            let messagesText = `📨 *MESSAGES RÉCENTS* 📨\n\n`;
            
            messages.forEach((msg, index) => {
                const time = new Date(msg.timestamp).toLocaleTimeString();
                messagesText += `${index + 1}. **${msg.author}** (${time})\n`;
                messagesText += `   📍 ${msg.channel}\n`;
                messagesText += `   💬 ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔄 Actualiser', callback_data: 'recent_messages' }],
                    [{ text: '🔙 Retour au Menu', callback_data: 'back_to_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, messagesText, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            this.sendStyledMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    async showServersList(chatId) {
        try {
            const servers = await this.discordController.getServers();
            
            let serversText = `🏠 *SERVEURS DISCORD* 🏠\n\n`;
            
            servers.forEach((server, index) => {
                serversText += `${index + 1}. **${server.name}**\n`;
                serversText += `   👥 ${server.memberCount} membres\n`;
                serversText += `   📊 ${server.channels.length} channels\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔄 Actualiser', callback_data: 'servers' }],
                    [{ text: '🔙 Retour au Menu', callback_data: 'back_to_menu' }]
                ]
            };

            this.bot.sendMessage(chatId, serversText, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            this.sendStyledMessage(chatId, `❌ Erreur : ${error.message}`);
        }
    }

    startAIChat(chatId) {
        this.userStates.set(chatId, 'ai_chat');
        
        const aiText = `
🤖 *CHAT IA ACTIVÉ* 🤖

💬 *Mode IA activé ! Tapez vos commandes naturelles :*

Exemples :
• "Répond 'd'accord' à Anthony0707"
• "Envoie un message sur le serveur Gaming"
• "Montre-moi les messages de #general"
• "Réagis avec 👍 au dernier message"

🎯 *L'IA comprendra et exécutera vos demandes !*

Pour désactiver : /menu
        `;

        this.sendStyledMessage(chatId, aiText);
    }

    async processAIMessage(msg) {
        const chatId = msg.chat.id;
        const userText = msg.text;
        const userState = this.userStates.get(chatId);

        // Indicateur de frappe
        await this.bot.sendChatAction(chatId, 'typing');

        try {
            if (userState === 'ai_chat' || this.looksLikeCommand(userText)) {
                // Traitement par IA
                const response = await this.aiProcessor.processCommand(userText, chatId);
                
                if (response.success) {
                    this.sendStyledMessage(chatId, `✅ ${response.message}`);
                } else {
                    this.sendStyledMessage(chatId, `❌ ${response.message}`);
                }
            } else {
                // Message normal
                this.sendStyledMessage(chatId, `💬 Message reçu : "${userText}"\n\nUtilisez /menu pour les options avancées !`);
            }
        } catch (error) {
            this.sendStyledMessage(chatId, `❌ Erreur IA : ${error.message}`);
        }
    }

    looksLikeCommand(text) {
        const commandPatterns = [
            /répond/i,
            /envoie/i,
            /dis à/i,
            /montre/i,
            /réagis/i,
            /écris/i,
            /message/i,
            /dm/i
        ];
        
        return commandPatterns.some(pattern => pattern.test(text));
    }

    showHelp(chatId) {
        const helpText = `
❓ *AIDE COMPLÈTE* ❓

🤖 *Commandes IA Naturelles :*
• "Répond 'message' à @utilisateur"
• "Envoie 'texte' sur #channel"
• "Dis à @admin de venir"
• "Montre les messages de #general"
• "Réagis avec 👍 au dernier message"

⚡ *Actions Rapides :*
• /menu - Menu principal
• /status - Statut Discord
• /help - Cette aide

🎯 *Fonctionnalités Avancées :*
• Statut "en train d'écrire"
• Upload de fichiers
• Gestion des serveurs
• Messages en temps réel
• Interface stylée

💡 *Astuce :* L'IA comprend le langage naturel !
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔙 Retour au Menu', callback_data: 'back_to_menu' }]
            ]
        };

        this.bot.sendMessage(chatId, helpText, {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    }

    async notifyDiscordAction(action, result) {
        // Notification pour les actions Discord importantes
        console.log(`📢 Discord Action: ${action} - ${result}`);
    }
}

module.exports = DiscordAITelegramBot;
