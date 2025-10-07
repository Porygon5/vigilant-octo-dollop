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
        this.lastUsedChannel = null; // Stocker le dernier channel utilisé
        this.setupClient();
    }

    setupClient() {
        console.log('🎮 Initialisation du contrôleur Discord...');

        this.client.on('ready', () => {
            console.log(`✅ Discord connecté: ${this.client.user.tag}`);
            this.isConnected = true;
            
            // Trouver un channel par défaut au démarrage
            const defaultChannel = this.client.channels.cache.find(ch => 
                (ch.type === 'GUILD_TEXT' || ch.type === 0) && 
                ch.permissionsFor(this.client.user)?.has('SEND_MESSAGES')
            );
            
            if (defaultChannel) {
                this.lastUsedChannel = defaultChannel;
                console.log(`📍 Channel par défaut: ${defaultChannel.name}`);
            }
        });

        this.client.on('error', (error) => {
            console.error('❌ Erreur Discord:', error.message);
            this.isConnected = false;
        });

        this.client.on('messageCreate', (message) => {
            // Stocker les messages récents et mettre à jour le dernier channel
            if (message.channel.type === 'GUILD_TEXT' || message.channel.type === 0) {
                this.lastUsedChannel = message.channel;
            }
            
            this.recentMessages.unshift({
                id: message.id,
                content: message.content,
                author: message.author.tag,
                channel: message.channel.name || 'DM',
                channelId: message.channel.id,
                timestamp: message.createdTimestamp,
                guild: message.guild?.name || 'DM'
            });

            if (this.recentMessages.length > 50) {
                this.recentMessages = this.recentMessages.slice(0, 50);
            }
        });
    }

    async connect() {
        try {
            await this.client.login(this.token);
            // Attendre que le client soit vraiment prêt
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('🔗 Connexion Discord établie');
            return true;
        } catch (error) {
            console.error('❌ Erreur connexion Discord:', error.message);
            return false;
        }
    }

    async disconnect() {
        try {
            await this.client.destroy();
            this.isConnected = false;
            console.log('🔌 Discord déconnecté');
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error.message);
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
            aiEnabled: true,
            lastChannel: this.lastUsedChannel?.name || 'Aucun'
        };
    }

    async sendMessage(target, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            let channel;

            if (target === 'current_channel') {
                // Utiliser le dernier channel où un message a été vu
                channel = this.lastUsedChannel;
                
                if (!channel) {
                    // Si pas de lastUsedChannel, chercher dans les messages récents
                    if (this.recentMessages.length > 0) {
                        const lastMsg = this.recentMessages[0];
                        channel = this.client.channels.cache.get(lastMsg.channelId);
                    }
                }
                
                if (!channel) {
                    // Dernière option : premier channel accessible
                    channel = this.client.channels.cache.find(ch => 
                        (ch.type === 'GUILD_TEXT' || ch.type === 0) && 
                        ch.permissionsFor(this.client.user)?.has('SEND_MESSAGES')
                    );
                }
                
                if (!channel) {
                    throw new Error('Aucun channel accessible trouvé. Essayez d\'abord d\'envoyer un message manuellement sur Discord pour que le bot détecte un channel.');
                }
            } else {
                channel = this.client.channels.cache.get(target);
                
                if (!channel) {
                    // Essayer de trouver par nom
                    channel = this.client.channels.cache.find(ch => 
                        ch.name?.toLowerCase().includes(target.toLowerCase())
                    );
                }
                
                if (!channel) {
                    throw new Error(`Channel "${target}" non trouvé. Channels disponibles: ${
                        Array.from(this.client.channels.cache.values())
                            .filter(ch => ch.name)
                            .map(ch => ch.name)
                            .slice(0, 5)
                            .join(', ')
                    }`);
                }
            }

            const message = await channel.send(content);
            this.lastUsedChannel = channel;
            console.log(`📤 Message envoyé sur ${channel.name}: ${content.substring(0, 50)}`);
            return message;

        } catch (error) {
            console.error('❌ Erreur envoi message:', error.message);
            throw error;
        }
    }

    async sendDMToUser(username, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            // Nettoyer le username (enlever les # et discriminateurs)
            const cleanUsername = username.replace(/[#@]/g, '').split('#')[0].toLowerCase();
            
            // Chercher dans le cache d'abord
            let user = this.client.users.cache.find(u => {
                const usernameLower = u.username.toLowerCase();
                const tagLower = u.tag.toLowerCase();
                return usernameLower.includes(cleanUsername) || 
                       tagLower.includes(cleanUsername);
            });

            // Si pas trouvé dans le cache, chercher dans les messages récents
            if (!user && this.recentMessages.length > 0) {
                const recentMsg = this.recentMessages.find(msg => 
                    msg.author.toLowerCase().includes(cleanUsername)
                );
                
                if (recentMsg) {
                    const authorTag = recentMsg.author;
                    user = this.client.users.cache.find(u => u.tag === authorTag);
                }
            }

            if (!user) {
                throw new Error(`Utilisateur "${username}" non trouvé. Utilisateurs récents: ${
                    [...new Set(this.recentMessages.map(m => m.author))].slice(0, 3).join(', ')
                }`);
            }

            const dmChannel = await user.createDM();
            const message = await dmChannel.send(content);
            
            console.log(`📩 DM envoyé à ${user.tag}: ${content}`);
            return message;

        } catch (error) {
            console.error('❌ Erreur envoi DM:', error.message);
            throw error;
        }
    }

    async reactToLastMessage(emoji) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            if (this.recentMessages.length === 0) {
                throw new Error('Aucun message récent en mémoire');
            }

            const lastMsg = this.recentMessages[0];
            const channel = this.client.channels.cache.get(lastMsg.channelId);
            
            if (!channel) {
                throw new Error('Channel du dernier message non trouvé');
            }

            const message = await channel.messages.fetch(lastMsg.id);
            await message.react(emoji);
            
            console.log(`👍 Réaction ${emoji} ajoutée au message de ${lastMsg.author}`);
            return true;

        } catch (error) {
            console.error('❌ Erreur réaction:', error.message);
            throw error;
        }
    }

    async startTyping(channelId = null) {
        if (!this.isConnected) {
            return;
        }

        try {
            let channel;

            if (channelId) {
                channel = this.client.channels.cache.get(channelId);
            } else {
                channel = this.lastUsedChannel;
            }

            if (channel && channel.sendTyping) {
                await channel.sendTyping();
                this.typingChannels.add(channel.id);
                console.log('⌨️ Statut "en train d\'écrire" activé');
            }

        } catch (error) {
            console.error('❌ Erreur statut typing:', error.message);
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
            console.error('❌ Erreur arrêt typing:', error.message);
        }
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
            const textChannels = guild.channels.cache.filter(ch => 
                ch.type === 'GUILD_TEXT' || ch.type === 0
            );
            
            servers.push({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                channels: textChannels.map(ch => ({
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
                channels = guild.channels.cache
                    .filter(ch => ch.type === 'GUILD_TEXT' || ch.type === 'GUILD_VOICE' || ch.type === 0 || ch.type === 2)
                    .map(ch => ({
                        id: ch.id,
                        name: ch.name,
                        type: ch.type,
                        guild: guild.name
                    }));
            }
        } else {
            channels = this.client.channels.cache
                .filter(ch => ch.name) // Filtrer ceux qui ont un nom
                .map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    guild: ch.guild?.name || 'DM'
                }));
        }

        return Array.from(channels);
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    getClient() {
        return this.client;
    }
}

module.exports = DiscordAIController;