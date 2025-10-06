const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

class DMExtractor {
    constructor(token) {
        this.client = new Client();
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
        const dmChannels = this.client.channels.cache.filter(channel => 
            channel.type === 'DM' || channel.type === 'GROUP_DM'
        );

        console.log(`📊 ${dmChannels.size} conversations DM trouvées`);

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

                // Récupération des messages
                let lastMessageId = null;
                let messageCount = 0;
                const maxMessages = 1000; // Limite pour éviter les timeouts

                while (messageCount < maxMessages) {
                    const messages = await channel.messages.fetch({
                        limit: 100,
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
                            attachments: message.attachments.map(att => ({
                                id: att.id,
                                filename: att.filename,
                                url: att.url,
                                size: att.size,
                                contentType: att.contentType
                            })),
                            embeds: message.embeds.map(embed => ({
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
                            })),
                            reactions: message.reactions.cache.map(reaction => ({
                                emoji: reaction.emoji.name || reaction.emoji.toString(),
                                count: reaction.count,
                                users: reaction.users.cache.map(user => ({
                                    id: user.id,
                                    username: user.username,
                                    tag: user.tag
                                }))
                            })),
                            mentions: {
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
                            }
                        };

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

                // Tri des messages par timestamp
                channelData.messages.sort((a, b) => a.timestamp - b.timestamp);
                
                this.dmData.channels.push(channelData);
                this.dmData.stats.messagesByChannel[channelId] = messageCount;
                this.dmData.totalMessages += messageCount;

                console.log(`✅ ${messageCount} messages récupérés pour ${channelData.name}`);

            } catch (error) {
                console.error(`❌ Erreur lors de la récupération de ${channel.name || 'DM'}:`, error.message);
            }
        }
    }

    async saveToFile() {
        const filename = `discord_dms_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(__dirname, filename);

        try {
            fs.writeFileSync(filepath, JSON.stringify(this.dmData, null, 2), 'utf8');
            console.log(`💾 Données sauvegardées dans: ${filename}`);
            
            // Affichage des statistiques
            console.log('\n📊 Statistiques:');
            console.log(`  - Conversations: ${this.dmData.stats.totalChannels}`);
            console.log(`  - Messages totaux: ${this.dmData.totalMessages}`);
            console.log(`  - Taille du fichier: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
            
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
    console.log('   2. Ou modifiez directement le script');
    console.log('   3. Ou utilisez: DISCORD_TOKEN=votre_token node dmExtractor.js');
    process.exit(1);
}

// Lancement
const extractor = new DMExtractor(TOKEN);
extractor.start();
