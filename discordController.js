const { Client } = require('discord.js-selfbot-v13');

class DiscordAIController {
    constructor(token) {
        this.client = new Client({
            checkUpdate: false,
            partials: ['CHANNEL', 'MESSAGE', 'USER']
        });
        this.token = token;
        this.isConnected = false;
        this.typingChannels = new Set();
        this.recentMessages = [];
        this.setupClient();
    }

    setupClient() {
        console.log('🎮 Initialisation du contrôleur Discord...');

        this.client.on('ready', () => {
            console.log(`✅ Discord connecté: ${this.client.user.tag}`);
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            console.error('❌ Erreur Discord:', error);
            this.isConnected = false;
        });

        this.client.on('messageCreate', (message) => {
            // Stocker les messages récents
            this.recentMessages.unshift({
                id: message.id,
                content: message.content,
                author: message.author.tag,
                channel: message.channel.name || 'DM',
                timestamp: message.createdTimestamp,
                guild: message.guild?.name || 'DM'
            });

            // Garder seulement les 50 derniers messages
            if (this.recentMessages.length > 50) {
                this.recentMessages = this.recentMessages.slice(0, 50);
            }
        });
    }

    async connect() {
        try {
            await this.client.login(this.token);
            console.log('🔗 Connexion Discord établie');
            return true;
        } catch (error) {
            console.error('❌ Erreur connexion Discord:', error);
            return false;
        }
    }

    async disconnect() {
        try {
            await this.client.destroy();
            this.isConnected = false;
            console.log('🔌 Discord déconnecté');
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
        }
    }

    async getStatus() {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        return {
            username: this.client.user.tag,
            id: this.client.user.id,
            status: 'online',
            platform: 'desktop',
            guilds: this.client.guilds.cache.size,
            channels: this.client.channels.cache.size,
            users: this.client.users.cache.size,
            aiEnabled: true
        };
    }

    async sendMessage(target, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            let channel;

            if (target === 'current_channel') {
                // Utiliser le premier channel textuel disponible
                channel = this.client.channels.cache.find(ch => 
                    ch.type === 'GUILD_TEXT' && ch.permissionsFor(this.client.user).has('SEND_MESSAGES')
                );
                
                if (!channel) {
                    throw new Error('Aucun channel accessible trouvé');
                }
            } else {
                channel = this.client.channels.cache.get(target);
                
                if (!channel) {
                    throw new Error(`Channel ${target} non trouvé`);
                }
            }

            const message = await channel.send(content);
            console.log(`📤 Message envoyé: ${content}`);
            return message;

        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            throw error;
        }
    }

    async sendDMToUser(username, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            // Chercher l'utilisateur
            const user = this.client.users.cache.find(u => 
                u.username.toLowerCase().includes(username.toLowerCase()) ||
                u.tag.toLowerCase().includes(username.toLowerCase())
            );

            if (!user) {
                throw new Error(`Utilisateur ${username} non trouvé`);
            }

            // Créer ou trouver le DM
            const dmChannel = await user.createDM();
            const message = await dmChannel.send(content);
            
            console.log(`📩 DM envoyé à ${user.tag}: ${content}`);
            return message;

        } catch (error) {
            console.error('❌ Erreur envoi DM:', error);
            throw error;
        }
    }

    async replyToMessage(messageId, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            const message = await this.client.channels.cache
                .find(ch => ch.messages.cache.has(messageId))
                ?.messages.fetch(messageId);

            if (!message) {
                throw new Error('Message non trouvé');
            }

            const reply = await message.reply(content);
            console.log(`↩️ Réponse envoyée: ${content}`);
            return reply;

        } catch (error) {
            console.error('❌ Erreur réponse:', error);
            throw error;
        }
    }

    async reactToLastMessage(emoji) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            // Trouver le dernier message dans un channel accessible
            const channel = this.client.channels.cache.find(ch => 
                ch.type === 'GUILD_TEXT' && 
                ch.messages.cache.size > 0 &&
                ch.permissionsFor(this.client.user).has('ADD_REACTIONS')
            );

            if (!channel) {
                throw new Error('Aucun channel avec messages trouvé');
            }

            const messages = await channel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();

            if (!lastMessage) {
                throw new Error('Aucun message trouvé');
            }

            await lastMessage.react(emoji);
            console.log(`👍 Réaction ${emoji} ajoutée`);
            return true;

        } catch (error) {
            console.error('❌ Erreur réaction:', error);
            throw error;
        }
    }

    async startTyping(channelId = null) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            let channel;

            if (channelId) {
                channel = this.client.channels.cache.get(channelId);
            } else {
                // Utiliser le premier channel textuel
                channel = this.client.channels.cache.find(ch => 
                    ch.type === 'GUILD_TEXT' && ch.permissionsFor(this.client.user).has('SEND_MESSAGES')
                );
            }

            if (channel) {
                await channel.sendTyping();
                this.typingChannels.add(channel.id);
                console.log('⌨️ Statut "en train d\'écrire" activé');
                
                // Maintenir le statut
                this.maintainTypingStatus(channel);
            }

        } catch (error) {
            console.error('❌ Erreur statut typing:', error);
        }
    }

    async stopTyping(channelId = null) {
        try {
            if (channelId) {
                this.typingChannels.delete(channelId);
            } else {
                this.typingChannels.clear();
            }
            
            console.log('✅ Statut "en train d\'écrire" désactivé');
        } catch (error) {
            console.error('❌ Erreur arrêt typing:', error);
        }
    }

    maintainTypingStatus(channel) {
        // Maintenir le statut toutes les 8 secondes
        const interval = setInterval(async () => {
            if (this.typingChannels.has(channel.id)) {
                try {
                    await channel.sendTyping();
                } catch (error) {
                    clearInterval(interval);
                    this.typingChannels.delete(channel.id);
                }
            } else {
                clearInterval(interval);
            }
        }, 8000);
    }

    async getRecentMessages(limit = 10) {
        return this.recentMessages.slice(0, limit);
    }

    async getServers() {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        const servers = [];
        
        this.client.guilds.cache.forEach(guild => {
            servers.push({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                channels: guild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT').map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type
                }))
            });
        });

        return servers;
    }

    async getChannels(serverId = null) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        let channels = [];

        if (serverId) {
            const guild = this.client.guilds.cache.get(serverId);
            if (guild) {
                channels = guild.channels.cache.filter(ch => 
                    ch.type === 'GUILD_TEXT' || ch.type === 'GUILD_VOICE'
                ).map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    guild: guild.name
                }));
            }
        } else {
            channels = this.client.channels.cache.filter(ch => 
                ch.type === 'GUILD_TEXT' || ch.type === 'GUILD_VOICE' || ch.type === 'DM'
            ).map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type,
                guild: ch.guild?.name || 'DM'
            }));
        }

        return channels;
    }

    async getUserInfo(username) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        const user = this.client.users.cache.find(u => 
            u.username.toLowerCase().includes(username.toLowerCase()) ||
            u.tag.toLowerCase().includes(username.toLowerCase())
        );

        if (!user) {
            throw new Error(`Utilisateur ${username} non trouvé`);
        }

        return {
            id: user.id,
            username: user.username,
            tag: user.tag,
            discriminator: user.discriminator,
            avatar: user.displayAvatarURL(),
            bot: user.bot,
            createdTimestamp: user.createdTimestamp
        };
    }

    async uploadFile(channelId, filePath, caption = '') {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                throw new Error('Channel non trouvé');
            }

            const attachment = {
                files: [filePath]
            };

            if (caption) {
                attachment.content = caption;
            }

            const message = await channel.send(attachment);
            console.log(`📎 Fichier uploadé: ${filePath}`);
            return message;

        } catch (error) {
            console.error('❌ Erreur upload:', error);
            throw error;
        }
    }

    async joinVoiceChannel(channelId) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel || channel.type !== 'GUILD_VOICE') {
                throw new Error('Channel vocal non trouvé');
            }

            const connection = await channel.join();
            console.log(`🎤 Rejoint le channel vocal: ${channel.name}`);
            return connection;

        } catch (error) {
            console.error('❌ Erreur join vocal:', error);
            throw error;
        }
    }

    async leaveVoiceChannel() {
        try {
            if (this.client.voice?.connections?.size > 0) {
                const connection = this.client.voice.connections.first();
                await connection.destroy();
                console.log('🎤 Channel vocal quitté');
            }
        } catch (error) {
            console.error('❌ Erreur leave vocal:', error);
        }
    }

    // Méthodes utilitaires
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('fr-FR');
    }

    sanitizeContent(content) {
        // Nettoyer le contenu pour éviter les erreurs Discord
        return content
            .replace(/@everyone/g, '@\u200Beveryone')
            .replace(/@here/g, '@\u200Bhere')
            .substring(0, 2000); // Limite Discord
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    getClient() {
        return this.client;
    }
}

module.exports = DiscordAIController;
