const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

class AdvancedDMExtractor {
    constructor(options = {}) {
        this.client = new Client();
        this.options = {
            maxMessagesPerChannel: options.maxMessagesPerChannel || 1000,
            delayBetweenRequests: options.delayBetweenRequests || 1000,
            exportFormat: options.exportFormat || 'json',
            includeAttachments: options.includeAttachments !== false,
            includeEmbeds: options.includeEmbeds !== false,
            includeReactions: options.includeReactions !== false,
            filterByDate: options.filterByDate || null,
            filterByUser: options.filterByUser || null,
            ...options
        };
        
        this.dmData = {
            channels: [],
            totalMessages: 0,
            exportDate: new Date().toISOString(),
            options: this.options,
            stats: {
                totalChannels: 0,
                messagesByChannel: {},
                oldestMessage: null,
                newestMessage: null,
                messagesByUser: {},
                attachments: 0,
                embeds: 0
            }
        };
    }

    async start() {
        try {
            console.log('🚀 Connexion au compte Discord...');
            
            this.client.on('ready', async () => {
                console.log(`✅ Connecté en tant que ${this.client.user.tag} (${this.client.user.id})`);
                console.log('📥 Récupération des DMs avec filtres avancés...');
                
                await this.extractDMs();
                await this.saveToFile();
                
                console.log('✅ Export terminé !');
                this.client.destroy();
                process.exit(0);
            });

            this.client.on('error', (error) => {
                console.error('❌ Erreur de connexion:', error.message);
            });

            await this.client.login(this.options.token);
        } catch (error) {
            console.error('❌ Erreur:', error.message);
            process.exit(1);
        }
    }

    async extractDMs() {
        // Attendre que Discord charge les données
        console.log('🔄 Chargement des conversations DM...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const dmChannels = this.client.channels.cache.filter(channel => 
            channel.type === 'DM' || channel.type === 'GROUP_DM' || channel.type === 1 || channel.type === 3
        );

        console.log(`📊 ${dmChannels.size} conversations DM trouvées`);
        
        // Debug: afficher tous les types de channels disponibles
        const allChannels = this.client.channels.cache;
        console.log(`🔍 Total des channels chargés: ${allChannels.size}`);
        
        const channelTypes = {};
        allChannels.forEach(channel => {
            channelTypes[channel.type] = (channelTypes[channel.type] || 0) + 1;
        });
        console.log('📋 Types de channels:', channelTypes);

        this.dmData.stats.totalChannels = dmChannels.size;

        for (const [channelId, channel] of dmChannels) {
            try {
                console.log(`📩 Traitement: ${channel.name || 'DM'}`);
                
                const channelData = {
                    id: channelId,
                    type: channel.type,
                    name: channel.name || 'DM Privé',
                    recipient: channel.type === 'DM' ? {
                        id: channel.recipient?.id,
                        username: channel.recipient?.username,
                        discriminator: channel.recipient?.discriminator,
                        tag: channel.recipient?.tag
                    } : null,
                    createdTimestamp: channel.createdTimestamp,
                    messages: []
                };

                // Récupération des messages avec filtres
                const messages = await this.fetchMessagesWithFilters(channel);
                
                for (const message of messages) {
                    const messageData = this.formatMessage(message);
                    
                    if (this.shouldIncludeMessage(messageData)) {
                        channelData.messages.push(messageData);
                        
                        // Mise à jour des statistiques
                        this.updateStats(messageData);
                    }
                }

                // Tri des messages par timestamp
                channelData.messages.sort((a, b) => a.timestamp - b.timestamp);
                
                this.dmData.channels.push(channelData);
                this.dmData.stats.messagesByChannel[channelId] = channelData.messages.length;
                this.dmData.totalMessages += channelData.messages.length;

                console.log(`✅ ${channelData.messages.length} messages récupérés pour ${channelData.name}`);

            } catch (error) {
                console.error(`❌ Erreur lors de la récupération de ${channel.name || 'DM'}:`, error.message);
            }
        }
    }

    async fetchMessagesWithFilters(channel) {
        let allMessages = [];
        let lastMessageId = null;
        let messageCount = 0;

        while (messageCount < this.options.maxMessagesPerChannel) {
            const messages = await channel.messages.fetch({
                limit: 100,
                before: lastMessageId
            });

            if (messages.size === 0) break;

            // Filtrage par date si spécifié
            if (this.options.filterByDate) {
                const filteredMessages = Array.from(messages.values()).filter(message => {
                    const messageDate = new Date(message.createdTimestamp);
                    const filterDate = new Date(this.options.filterByDate);
                    return messageDate >= filterDate;
                });
                
                allMessages.push(...filteredMessages);
                
                // Si tous les messages sont plus anciens que la date de filtrage, on s'arrête
                if (filteredMessages.length === 0) break;
            } else {
                allMessages.push(...Array.from(messages.values()));
            }

            messageCount += messages.size;
            lastMessageId = messages.last().id;
            
            console.log(`  📄 ${messageCount} messages récupérés...`);
            
            // Pause pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenRequests));
        }

        return allMessages;
    }

    formatMessage(message) {
        const messageData = {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator,
                tag: message.author.tag,
                bot: message.author.bot
            },
            timestamp: message.createdTimestamp,
            editedTimestamp: message.editedTimestamp,
            type: message.type
        };

        if (this.options.includeAttachments && message.attachments.size > 0) {
            messageData.attachments = message.attachments.map(att => ({
                id: att.id,
                filename: att.filename,
                url: att.url,
                size: att.size,
                contentType: att.contentType
            }));
        }

        if (this.options.includeEmbeds && message.embeds.length > 0) {
            messageData.embeds = message.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                url: embed.url,
                color: embed.color,
                timestamp: embed.timestamp,
                fields: embed.fields?.map(field => ({
                    name: field.name,
                    value: field.value,
                    inline: field.inline
                }))
            }));
        }

        if (this.options.includeReactions && message.reactions.cache.size > 0) {
            messageData.reactions = message.reactions.cache.map(reaction => ({
                emoji: reaction.emoji.name || reaction.emoji.toString(),
                count: reaction.count,
                users: reaction.users.cache.map(user => ({
                    id: user.id,
                    username: user.username,
                    tag: user.tag
                }))
            }));
        }

        messageData.mentions = {
            users: message.mentions.users.map(user => ({
                id: user.id,
                username: user.username,
                tag: user.tag
            })),
            channels: message.mentions.channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type
            }))
        };

        return messageData;
    }

    shouldIncludeMessage(messageData) {
        // Filtre par utilisateur
        if (this.options.filterByUser) {
            return messageData.author.username.toLowerCase().includes(this.options.filterByUser.toLowerCase()) ||
                   messageData.author.tag.toLowerCase().includes(this.options.filterByUser.toLowerCase());
        }
        
        return true;
    }

    updateStats(messageData) {
        // Statistiques par utilisateur
        const userId = messageData.author.id;
        if (!this.dmData.stats.messagesByUser[userId]) {
            this.dmData.stats.messagesByUser[userId] = {
                username: messageData.author.username,
                tag: messageData.author.tag,
                count: 0
            };
        }
        this.dmData.stats.messagesByUser[userId].count++;

        // Messages les plus anciens/récents
        if (!this.dmData.stats.oldestMessage || messageData.timestamp < this.dmData.stats.oldestMessage) {
            this.dmData.stats.oldestMessage = messageData.timestamp;
        }
        if (!this.dmData.stats.newestMessage || messageData.timestamp > this.dmData.stats.newestMessage) {
            this.dmData.stats.newestMessage = messageData.timestamp;
        }

        // Compteurs d'attachments et embeds
        if (messageData.attachments) this.dmData.stats.attachments += messageData.attachments.length;
        if (messageData.embeds) this.dmData.stats.embeds += messageData.embeds.length;
    }

    async saveToFile() {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `discord_dms_advanced_${timestamp}.${this.options.exportFormat}`;
        const filepath = path.join(__dirname, filename);

        try {
            let content;
            if (this.options.exportFormat === 'json') {
                content = JSON.stringify(this.dmData, null, 2);
            } else if (this.options.exportFormat === 'csv') {
                content = this.convertToCSV();
            } else {
                content = JSON.stringify(this.dmData, null, 2);
            }

            fs.writeFileSync(filepath, content, 'utf8');
            console.log(`💾 Données sauvegardées dans: ${filename}`);
            
            // Affichage des statistiques détaillées
            this.displayStats(filepath);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error.message);
        }
    }

    convertToCSV() {
        let csv = 'Channel,Author,Content,Timestamp,Attachments,Embeds\n';
        
        for (const channel of this.dmData.channels) {
            for (const message of channel.messages) {
                const attachments = message.attachments ? message.attachments.length : 0;
                const embeds = message.embeds ? message.embeds.length : 0;
                const content = (message.content || '').replace(/"/g, '""');
                const timestamp = new Date(message.timestamp).toISOString();
                
                csv += `"${channel.name}","${message.author.tag}","${content}","${timestamp}",${attachments},${embeds}\n`;
            }
        }
        
        return csv;
    }

    displayStats(filepath) {
        console.log('\n📊 Statistiques détaillées:');
        console.log(`  - Conversations: ${this.dmData.stats.totalChannels}`);
        console.log(`  - Messages totaux: ${this.dmData.totalMessages}`);
        console.log(`  - Attachments: ${this.dmData.stats.attachments}`);
        console.log(`  - Embeds: ${this.dmData.stats.embeds}`);
        console.log(`  - Taille du fichier: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
        
        if (this.dmData.stats.oldestMessage) {
            console.log(`  - Plus ancien message: ${new Date(this.dmData.stats.oldestMessage).toLocaleString()}`);
        }
        if (this.dmData.stats.newestMessage) {
            console.log(`  - Plus récent message: ${new Date(this.dmData.stats.newestMessage).toLocaleString()}`);
        }
        
        console.log('\n👥 Top utilisateurs:');
        const topUsers = Object.entries(this.dmData.stats.messagesByUser)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5);
            
        topUsers.forEach(([userId, userData], index) => {
            console.log(`  ${index + 1}. ${userData.tag}: ${userData.count} messages`);
        });
    }
}

// Configuration via ligne de commande
const args = process.argv.slice(2);
const options = {
    token: process.env.DISCORD_TOKEN
};

// Parsing des arguments
for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
        case 'maxMessages':
            options.maxMessagesPerChannel = parseInt(value);
            break;
        case 'delay':
            options.delayBetweenRequests = parseInt(value);
            break;
        case 'format':
            options.exportFormat = value;
            break;
        case 'date':
            options.filterByDate = value;
            break;
        case 'user':
            options.filterByUser = value;
            break;
        case 'noAttachments':
            options.includeAttachments = false;
            i--; // Pas de valeur pour ce flag
            break;
        case 'noEmbeds':
            options.includeEmbeds = false;
            i--; // Pas de valeur pour ce flag
            break;
    }
}

if (!options.token || options.token === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  Veuillez configurer votre token Discord:');
    console.log('   1. Créez un fichier .env avec: DISCORD_TOKEN=votre_token');
    console.log('   2. Ou utilisez: DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js');
    console.log('\n📖 Options disponibles:');
    console.log('  --maxMessages <number>  : Nombre max de messages par channel');
    console.log('  --delay <ms>           : Délai entre les requêtes');
    console.log('  --format <json|csv>    : Format d\'export');
    console.log('  --date <YYYY-MM-DD>    : Filtrer par date (messages après cette date)');
    console.log('  --user <username>      : Filtrer par nom d\'utilisateur');
    console.log('  --noAttachments        : Exclure les attachments');
    console.log('  --noEmbeds            : Exclure les embeds');
    process.exit(1);
}

// Lancement
const extractor = new AdvancedDMExtractor(options);
extractor.start();
