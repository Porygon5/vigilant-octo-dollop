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
        this.lastUsedChannel = null;
        this.setupClient();
    }

    setupClient() {
        console.log('🎮 Initialisation du contrôleur Discord...');

        this.client.on('ready', () => {
            console.log(`✅ Discord connecté: ${this.client.user.tag}`);
            this.isConnected = true;
            
            // Trouver un channel par défaut au démarrage
            const defaultChannel = this.client.channels.cache.find(ch => {
                if (ch.type !== 'GUILD_TEXT' && ch.type !== 0) return false;
                const permissions = ch.permissionsFor(this.client.user);
                return permissions && 
                       permissions.has('SEND_MESSAGES') && 
                       permissions.has('VIEW_CHANNEL');
            });
            
            if (defaultChannel) {
                this.lastUsedChannel = defaultChannel;
                console.log(`📍 Channel par défaut: ${defaultChannel.name}`);
            } else {
                console.log('⚠️ Aucun channel par défaut trouvé - configurez-en un avec /setchannel');
            }
        });

        this.client.on('error', (error) => {
            console.error('❌ Erreur Discord:', error.message);
            this.isConnected = false;
        });

        this.client.on('messageCreate', (message) => {
            // Stocker les messages récents et mettre à jour le dernier channel
            if (message.channel.type === 'GUILD_TEXT' || message.channel.type === 0) {
                const permissions = message.channel.permissionsFor(this.client.user);
                if (permissions && permissions.has('SEND_MESSAGES')) {
                    this.lastUsedChannel = message.channel;
                }
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

    getAvailableChannelsList() {
        const channels = Array.from(this.client.channels.cache.values())
            .filter(ch => {
                if (!ch.name) return false;
                const permissions = ch.permissionsFor(this.client.user);
                return permissions && 
                       permissions.has('SEND_MESSAGES') && 
                       permissions.has('VIEW_CHANNEL');
            })
            .map(ch => `#${ch.name}`)
            .slice(0, 10);
        
        return channels.length > 0 ? channels.join(', ') : 'Aucun';
    }

    async sendMessage(target, content) {
        if (!this.isConnected) {
            throw new Error('Discord non connecté');
        }

        try {
            let channel;

            if (target === 'current_channel') {
                // 1. Essayer lastUsedChannel
                channel = this.lastUsedChannel;
                
                // 2. Si pas de lastUsedChannel, chercher dans les messages récents
                if (!channel && this.recentMessages.length > 0) {
                    const lastMsg = this.recentMessages[0];
                    channel = this.client.channels.cache.get(lastMsg.channelId);
                    
                    // Vérifier les permissions
                    if (channel) {
                        const permissions = channel.permissionsFor(this.client.user);
                        if (!permissions || !permissions.has('SEND_MESSAGES')) {
                            channel = null;
                        }
                    }
                }
                
                // 3. Si toujours rien, trouver le PREMIER channel ACCESSIBLE
                if (!channel) {
                    channel = this.client.channels.cache.find(ch => {
                        if (ch.type !== 'GUILD_TEXT' && ch.type !== 0) return false;
                        const permissions = ch.permissionsFor(this.client.user);
                        return permissions && 
                               permissions.has('SEND_MESSAGES') && 
                               permissions.has('VIEW_CHANNEL');
                    });
                }
                
                if (!channel) {
                    throw new Error(`❌ Aucun channel accessible trouvé !

📋 Solutions :
1. Envoyez un message sur Discord manuellement
2. Utilisez /setchannel dans Telegram pour voir les channels
3. Définissez un channel : /setdefault [CHANNEL_ID]

💡 Channels disponibles : ${this.getAvailableChannelsList()}`);
                }
            } else {
                // Recherche par ID ou nom
                channel = this.client.channels.cache.get(target);
                
                if (!channel) {
                    channel = this.client.channels.cache.find(ch => 
                        ch.name?.toLowerCase().includes(target.toLowerCase())
                    );
                }
                
                if (!channel) {
                    throw new Error(`Channel "${target}" non trouvé. Channels disponibles : ${this.getAvailableChannelsList()}`);
                }
            }

            // Vérifier les permissions avant d'envoyer
            const permissions = channel.permissionsFor(this.client.user);
            if (!permissions || !permissions.has('SEND_MESSAGES')) {
                throw new Error(`❌ Pas de permission SEND_MESSAGES sur #${channel.name}

🔧 Vérifiez que vous avez les droits sur ce channel Discord.
💡 Channels accessibles : ${this.getAvailableChannelsList()}`);
            }

            const message = await channel.send(content);
            this.lastUsedChannel = channel;
            console.log(`✅ Message envoyé sur #${channel.name}: ${content.substring(0, 50)}`);
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
            const cleanUsername = username.replace(/[#@]/g, '').split('#')[0].toLowerCase();
            
            let user = this.client.users.cache.find(u => {
                const usernameLower = u.username.toLowerCase();
                const tagLower = u.tag.toLowerCase();
                return usernameLower.includes(cleanUsername) || 
                       tagLower.includes(cleanUsername);
            });

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
                throw new Error(`Utilisateur "${username}" non trouvé. Utilisateurs récents : ${
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
            let channel = channelId ? this.client.channels.cache.get(channelId) : this.lastUsedChannel;

            if (channel && channel.sendTyping) {
                const permissions = channel.permissionsFor(this.client.user);
                if (permissions && permissions.has('SEND_MESSAGES')) {
                    await channel.sendTyping();
                    this.typingChannels.add(channel.id);
                    console.log('⌨️ Statut "en train d\'écrire" activé');
                }
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
                        guild: guild.name,
                        hasAccess: this.checkChannelAccess(ch)
                    }));
            }
        } else {
            channels = this.client.channels.cache
                .filter(ch => ch.name)
                .map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    guild: ch.guild?.name || 'DM',
                    hasAccess: this.checkChannelAccess(ch)
                }));
        }

        return Array.from(channels);
    }

    checkChannelAccess(channel) {
        try {
            const permissions = channel.permissionsFor(this.client.user);
            return permissions && 
                   permissions.has('VIEW_CHANNEL') && 
                   permissions.has('SEND_MESSAGES');
        } catch {
            return false;
        }
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    getClient() {
        return this.client;
    }
}

module.exports = DiscordAIController;