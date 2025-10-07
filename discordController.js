const { Client } = require('discord.js-selfbot-v13');

class UltraDiscordController {
    constructor(token) {
        this.client = new Client({
            checkUpdate: false,
            partials: ['CHANNEL', 'MESSAGE', 'USER', 'GUILD_MEMBER']
        });
        this.token = token;
        this.isConnected = false;
        this.messageHistory = [];
        this.lastUsedChannel = null;
        this.setupClient();
    }

    setupClient() {
        console.log('🚀 Initialisation du contrôleur Discord Ultra-Puissant...');

        this.client.on('ready', () => {
            console.log(`✅ Discord connecté: ${this.client.user.tag}`);
            this.isConnected = true;
        });

        this.client.on('messageCreate', (message) => {
            // Historique des messages
            this.messageHistory.unshift({
                id: message.id,
                content: message.content,
                author: message.author.tag,
                authorId: message.author.id,
                channel: message.channel.name || 'DM',
                channelId: message.channel.id,
                timestamp: message.createdTimestamp,
                guild: message.guild?.name || 'DM',
                guildId: message.guild?.id
            });

            if (this.messageHistory.length > 200) {
                this.messageHistory = this.messageHistory.slice(0, 200);
            }

            if (message.channel.type === 'GUILD_TEXT' || message.channel.type === 0) {
                const permissions = message.channel.permissionsFor(this.client.user);
                if (permissions && permissions.has('SEND_MESSAGES')) {
                    this.lastUsedChannel = message.channel;
                }
            }
        });

        this.client.on('error', (error) => {
            console.error('❌ Erreur Discord:', error.message);
            this.isConnected = false;
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

    // ========== ENVOI DE MESSAGES ==========
    
    async sendMessage(targetChannelId, content, options = {}) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const channel = await this.client.channels.fetch(targetChannelId);
            
            if (options.typing) {
                await channel.sendTyping();
                await new Promise(resolve => setTimeout(resolve, options.typingDelay || 2000));
            }

            const message = await channel.send(content);
            console.log(`✅ Message envoyé sur #${channel.name}: ${content.substring(0, 50)}...`);
            return message;
        } catch (error) {
            console.error('❌ Erreur envoi message:', error.message);
            throw error;
        }
    }

    async sendDM(userId, content, options = {}) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const user = await this.client.users.fetch(userId);
            const dmChannel = await user.createDM();
            
            if (options.typing) {
                await dmChannel.sendTyping();
                await new Promise(resolve => setTimeout(resolve, options.typingDelay || 2000));
            }

            const message = await dmChannel.send(content);
            console.log(`📩 DM envoyé à ${user.tag}: ${content.substring(0, 50)}...`);
            return message;
        } catch (error) {
            console.error('❌ Erreur envoi DM:', error.message);
            throw error;
        }
    }

    async sendDMByUsername(username, content, options = {}) {
        const user = await this.findUserByName(username);
        if (!user) throw new Error(`Utilisateur "${username}" introuvable`);
        return await this.sendDM(user.id, content, options);
    }

    // ========== GESTION DES AMIS ==========
    
    async addFriend(userId) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const user = await this.client.users.fetch(userId);
            await this.client.relationships.addFriend(user);
            console.log(`✅ Demande d'ami envoyée à ${user.tag}`);
            return { success: true, user: user.tag };
        } catch (error) {
            console.error('❌ Erreur ajout ami:', error.message);
            throw error;
        }
    }

    async addFriendByUsername(username) {
        const user = await this.findUserByName(username);
        if (!user) throw new Error(`Utilisateur "${username}" introuvable`);
        return await this.addFriend(user.id);
    }

    async removeFriend(userId) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const user = await this.client.users.fetch(userId);
            await this.client.relationships.removeFriend(user);
            console.log(`✅ ${user.tag} retiré des amis`);
            return { success: true, user: user.tag };
        } catch (error) {
            console.error('❌ Erreur retrait ami:', error.message);
            throw error;
        }
    }

    async getFriends() {
        if (!this.isConnected) throw new Error('Discord non connecté');

        const friends = [];
        for (const [userId, relationship] of this.client.relationships.cache) {
            if (relationship.type === 'FRIEND') {
                const user = await this.client.users.fetch(userId);
                friends.push({
                    id: user.id,
                    username: user.username,
                    tag: user.tag,
                    avatar: user.displayAvatarURL()
                });
            }
        }
        return friends;
    }

    // ========== GESTION DES SERVEURS ==========
    
    async joinServer(inviteCode) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            // Nettoyer le code d'invitation
            const cleanCode = inviteCode.replace(/https?:\/\/(discord\.gg|discord\.com\/invite)\//g, '');
            
            const invite = await this.client.fetchInvite(cleanCode);
            await invite.acceptInvite();
            
            console.log(`✅ Serveur rejoint: ${invite.guild.name}`);
            return { success: true, guild: invite.guild.name, guildId: invite.guild.id };
        } catch (error) {
            console.error('❌ Erreur rejoindre serveur:', error.message);
            throw error;
        }
    }

    async leaveServer(guildId) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const guild = await this.client.guilds.fetch(guildId);
            await guild.leave();
            console.log(`✅ Serveur quitté: ${guild.name}`);
            return { success: true, guild: guild.name };
        } catch (error) {
            console.error('❌ Erreur quitter serveur:', error.message);
            throw error;
        }
    }

    async getServerInfo(guildId) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        
        return {
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
            createdAt: guild.createdAt,
            channels: Array.from(channels.values()).map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type
            }))
        };
    }

    async getAllServers() {
        if (!this.isConnected) throw new Error('Discord non connecté');

        const servers = [];
        for (const [guildId, guild] of this.client.guilds.cache) {
            servers.push({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL()
            });
        }
        return servers;
    }

    // ========== RÉACTIONS ET INTERACTIONS ==========
    
    async reactToMessage(messageId, channelId, emoji) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const channel = await this.client.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);
            await message.react(emoji);
            console.log(`👍 Réaction ${emoji} ajoutée`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur réaction:', error.message);
            throw error;
        }
    }

    async deleteMessage(messageId, channelId) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const channel = await this.client.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);
            
            if (message.author.id !== this.client.user.id) {
                throw new Error('Impossible de supprimer le message d\'un autre utilisateur');
            }
            
            await message.delete();
            console.log(`🗑️ Message supprimé`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression message:', error.message);
            throw error;
        }
    }

    async editMessage(messageId, channelId, newContent) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            const channel = await this.client.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);
            
            if (message.author.id !== this.client.user.id) {
                throw new Error('Impossible de modifier le message d\'un autre utilisateur');
            }
            
            await message.edit(newContent);
            console.log(`✏️ Message modifié`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur modification message:', error.message);
            throw error;
        }
    }

    // ========== STATUT ET TYPING ==========
    
    async setStatus(status, activityType = 'PLAYING', activityName = '') {
        if (!this.isConnected) throw new Error('Discord non connecté');

        try {
            await this.client.user.setPresence({
                status: status, // 'online', 'idle', 'dnd', 'invisible'
                activities: activityName ? [{
                    name: activityName,
                    type: activityType // 'PLAYING', 'STREAMING', 'LISTENING', 'WATCHING'
                }] : []
            });
            console.log(`✅ Statut changé: ${status}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur changement statut:', error.message);
            throw error;
        }
    }

    async startTyping(channelId) {
        if (!this.isConnected) return;

        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.sendTyping();
            console.log('⌨️ Statut "en train d\'écrire" activé');
        } catch (error) {
            console.error('❌ Erreur typing:', error.message);
        }
    }

    // ========== RECHERCHE ET UTILITAIRES ==========
    
    async findUserByName(username) {
        const cleanUsername = username.replace(/[#@]/g, '').toLowerCase();
        
        // Recherche dans le cache
        let user = this.client.users.cache.find(u => 
            u.username.toLowerCase() === cleanUsername ||
            u.tag.toLowerCase() === cleanUsername ||
            u.username.toLowerCase().includes(cleanUsername)
        );

        if (!user && this.messageHistory.length > 0) {
            const recentMsg = this.messageHistory.find(msg => 
                msg.author.toLowerCase().includes(cleanUsername)
            );
            
            if (recentMsg) {
                user = await this.client.users.fetch(recentMsg.authorId);
            }
        }

        return user;
    }

    async searchMessages(query, limit = 50) {
        const results = this.messageHistory
            .filter(msg => 
                msg.content.toLowerCase().includes(query.toLowerCase()) ||
                msg.author.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, limit);

        return results;
    }

    async getChannelMessages(channelId, limit = 50) {
        if (!this.isConnected) throw new Error('Discord non connecté');

        const channel = await this.client.channels.fetch(channelId);
        const messages = await channel.messages.fetch({ limit });
        
        return Array.from(messages.values()).map(msg => ({
            id: msg.id,
            content: msg.content,
            author: msg.author.tag,
            timestamp: msg.createdTimestamp,
            attachments: msg.attachments.size
        }));
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    getClient() {
        return this.client;
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
}

module.exports = UltraDiscordController;