const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

class SimpleDMExtractor {
    constructor(token) {
        this.client = new Client({
            checkUpdate: false,
            partials: ['CHANNEL', 'MESSAGE', 'USER']
        });
        this.token = token;
        this.dmData = {
            channels: [],
            totalMessages: 0,
            exportDate: new Date().toISOString(),
            stats: {
                totalChannels: 0,
                messagesByChannel: {},
                oldestMessage: null,
                newestMessage: null
            }
        };
    }

    async start() {
        try {
            console.log('🚀 Connexion au compte Discord...');
            
            this.client.on('ready', async () => {
                console.log(`✅ Connecté en tant que ${this.client.user.tag} (${this.client.user.id})`);
                console.log('📥 Récupération des DMs...');
                
                // Attendre un peu pour que Discord charge les données
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                await this.extractDMs();
                await this.saveToFile();
                
                console.log('✅ Export terminé !');
                this.client.destroy();
                process.exit(0);
            });

            this.client.on('error', (error) => {
                console.error('❌ Erreur de connexion:', error.message);
            });

            await this.client.login(this.token);
        } catch (error) {
            console.error('❌ Erreur:', error.message);
            process.exit(1);
        }
    }

    async extractDMs() {
        // Récupérer tous les channels
        const allChannels = this.client.channels.cache;
        console.log(`🔍 Total des channels chargés: ${allChannels.size}`);
        
        // Filtrer les DMs
        const dmChannels = allChannels.filter(channel => {
            return channel.type === 'DM' || channel.type === 'GROUP_DM' || channel.type === 1 || channel.type === 3;
        });

        console.log(`📊 ${dmChannels.size} conversations DM trouvées`);
        
        // Debug: afficher les types de channels
        const channelTypes = {};
        allChannels.forEach(channel => {
            channelTypes[channel.type] = (channelTypes[channel.type] || 0) + 1;
        });
        console.log('📋 Types de channels disponibles:', channelTypes);

        this.dmData.stats.totalChannels = dmChannels.size;

        if (dmChannels.size === 0) {
            console.log('⚠️  Aucune conversation DM trouvée. Cela peut être dû à:');
            console.log('   - Aucun DM existant');
            console.log('   - DMs supprimés récemment');
            console.log('   - Discord n\'a pas encore chargé les données');
            console.log('   - Problème de permissions');
            return;
        }

        for (const [channelId, channel] of dmChannels) {
            try {
                const channelName = channel.name || 
                    (channel.recipient ? channel.recipient.tag : 'DM Inconnu');
                
                console.log(`📩 Traitement: ${channelName}`);
                
                const channelData = {
                    id: channelId,
                    type: channel.type,
                    name: channelName,
                    recipient: channel.recipient ? {
                        id: channel.recipient.id,
                        username: channel.recipient.username,
                        discriminator: channel.recipient.discriminator,
                        tag: channel.recipient.tag
                    } : null,
                    createdTimestamp: channel.createdTimestamp,
                    messages: []
                };

                // Récupération des messages
                let lastMessageId = null;
                let messageCount = 0;
                const maxMessages = 1000;

                try {
                    while (messageCount < maxMessages) {
                        const messages = await channel.messages.fetch({
                            limit: 50,
                            before: lastMessageId
                        });

                        if (messages.size === 0) break;

                        for (const [messageId, message] of messages) {
                            const messageData = {
                                id: messageId,
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
                                attachments: [],
                                embeds: [],
                                reactions: []
                            };

                            // Ajouter les attachments si disponibles
                            if (message.attachments && message.attachments.size > 0) {
                                messageData.attachments = Array.from(message.attachments.values()).map(att => ({
                                    id: att.id,
                                    filename: att.filename,
                                    url: att.url,
                                    size: att.size,
                                    contentType: att.contentType
                                }));
                            }

                            // Ajouter les embeds si disponibles
                            if (message.embeds && message.embeds.length > 0) {
                                messageData.embeds = message.embeds.map(embed => ({
                                    title: embed.title,
                                    description: embed.description,
                                    url: embed.url,
                                    color: embed.color,
                                    timestamp: embed.timestamp
                                }));
                            }

                            // Ajouter les réactions si disponibles
                            if (message.reactions && message.reactions.cache.size > 0) {
                                messageData.reactions = Array.from(message.reactions.cache.values()).map(reaction => ({
                                    emoji: reaction.emoji.name || reaction.emoji.toString(),
                                    count: reaction.count
                                }));
                            }

                            channelData.messages.push(messageData);
                            messageCount++;

                            // Mise à jour des statistiques
                            if (!this.dmData.stats.oldestMessage || message.createdTimestamp < this.dmData.stats.oldestMessage) {
                                this.dmData.stats.oldestMessage = message.createdTimestamp;
                            }
                            if (!this.dmData.stats.newestMessage || message.createdTimestamp > this.dmData.stats.newestMessage) {
                                this.dmData.stats.newestMessage = message.createdTimestamp;
                            }
                        }

                        lastMessageId = messages.last().id;
                        console.log(`  📄 ${messageCount} messages récupérés...`);
                        
                        // Pause pour éviter le rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (fetchError) {
                    console.error(`  ⚠️  Erreur lors de la récupération des messages: ${fetchError.message}`);
                }

                // Tri des messages par timestamp
                channelData.messages.sort((a, b) => a.timestamp - b.timestamp);
                
                this.dmData.channels.push(channelData);
                this.dmData.stats.messagesByChannel[channelId] = messageCount;
                this.dmData.totalMessages += messageCount;

                console.log(`✅ ${messageCount} messages récupérés pour ${channelName}`);

            } catch (error) {
                console.error(`❌ Erreur lors du traitement de ${channel.name || 'DM'}:`, error.message);
            }
        }
    }

    async saveToFile() {
        const filename = `discord_dms_simple_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(__dirname, filename);

        try {
            fs.writeFileSync(filepath, JSON.stringify(this.dmData, null, 2), 'utf8');
            console.log(`💾 Données sauvegardées dans: ${filename}`);
            
            // Affichage des statistiques
            console.log('\n📊 Statistiques:');
            console.log(`  - Conversations: ${this.dmData.stats.totalChannels}`);
            console.log(`  - Messages totaux: ${this.dmData.totalMessages}`);
            console.log(`  - Taille du fichier: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
            
            if (this.dmData.stats.oldestMessage) {
                console.log(`  - Plus ancien message: ${new Date(this.dmData.stats.oldestMessage).toLocaleString()}`);
            }
            if (this.dmData.stats.newestMessage) {
                console.log(`  - Plus récent message: ${new Date(this.dmData.stats.newestMessage).toLocaleString()}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error.message);
        }
    }
}

// Configuration
const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_TOKEN_HERE';

if (TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  Veuillez configurer votre token Discord:');
    console.log('   1. Créez un fichier .env avec: DISCORD_TOKEN=votre_token');
    console.log('   2. Ou utilisez: DISCORD_TOKEN=votre_token node dmExtractorSimple.js');
    process.exit(1);
}

// Lancement
const extractor = new SimpleDMExtractor(TOKEN);
extractor.start();
