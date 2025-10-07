const OpenAI = require('openai');

class DiscordAIProcessor {
    constructor(apiKey, discordController) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.discordController = discordController;
        this.commandCache = new Map();
        this.requestCount = 0;
        this.maxRequests = 300000;
        
        console.log('🧠 Processeur IA Ultra-Intelligent initialisé');
    }

    async processCommand(userInput, chatId) {
        try {
            this.requestCount++;
            
            if (this.requestCount > this.maxRequests) {
                return {
                    success: false,
                    message: "⚠️ Limite de requêtes IA atteinte (5$ épuisés)"
                };
            }

            // Essayer d'abord le fallback intelligent (plus rapide et gratuit)
            const fallbackResult = this.intelligentFallback(userInput);
            
            if (fallbackResult.action !== 'ask_clarification') {
                console.log('💾 Fallback intelligent utilisé - aucun appel API');
                return await this.executeCommand(fallbackResult, chatId);
            }

            // Si le fallback ne comprend pas, utiliser l'IA
            console.log('🤖 Utilisation de l\'IA OpenAI...');
            const analysis = await this.analyzeCommand(userInput);
            return await this.executeCommand(analysis, chatId);

        } catch (error) {
            console.error('Erreur processeur IA:', error);
            return {
                success: false,
                message: `Erreur IA: ${error.message}`
            };
        }
    }

    intelligentFallback(userInput) {
        const input = userInput.toLowerCase();
        console.log('💾 Analyse fallback intelligent:', input);
        
        // 1. Patterns pour répondre à quelqu'un
        const replyPatterns = [
            { 
                regex: /(?:répond[s]?|dis|envoie)\s+['"]([^'"]+)['"]\s+(?:à|a)\s+(?:@)?([^\s]+)/i,
                extract: (m) => {
                    const username = m[2].replace(/[#@]/g, '');
                    return { username, content: m[1] };
                }
            },
            { 
                regex: /(?:dis|répond[s]?)\s+(?:à|a)\s+(?:@)?([^\s]+)\s+(?:de\s+)?['"]?([^'"]+)['"]?/i,
                extract: (m) => {
                    const username = m[1].replace(/[#@]/g, '');
                    return { username, content: m[2] };
                }
            },
            {
                regex: /(?:dis|répond[s]?)\s+(?:lui|leur)\s+['"]([^'"]+)['"]/i,
                extract: (m) => ({ username: 'last_conversation', content: m[1] })
            }
        ];
        
        for (const pattern of replyPatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                const data = pattern.extract(match);
                console.log('✅ Détecté: Réponse à un utilisateur -', data);
                return {
                    action: "reply_to_user",
                    params: data,
                    reasoning: "Détection de commande de réponse"
                };
            }
        }
        
        // 2. Messages généraux sur un channel
        const messagePatterns = [
            { 
                regex: /(?:envoie|écris|poste|dis)\s+['"]([^'"]+)['"]\s+(?:sur|dans)\s+(?:#)?([^\s]+)/i,
                extract: (m) => ({ target: m[2], content: m[1] })
            },
            { 
                regex: /(?:envoie|écris)\s+(?:un\s+)?(?:message\s+)?['"]?([^'"]+)['"]?/i,
                extract: (m) => ({ target: 'current_channel', content: m[1] })
            }
        ];
        
        for (const pattern of messagePatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                const data = pattern.extract(match);
                console.log('✅ Détecté: Message général -', data);
                return {
                    action: "send_message",
                    params: data,
                    reasoning: "Envoi de message général"
                };
            }
        }
        
        // 3. Réactions
        const reactionPatterns = [
            { 
                regex: /réagis\s+(?:avec\s+)?([👍👎❤️😂😮😢😡🔥💯✨🎉])/i,
                emoji: (m) => m[1]
            },
            { 
                regex: /mets?\s+(?:un\s+)?(pouce|coeur|rire|feu|like)/i,
                emoji: (m) => {
                    const map = { 
                        pouce: '👍',
                        like: '👍',
                        coeur: '❤️',
                        rire: '😂',
                        feu: '🔥'
                    };
                    return map[m[1]] || '👍';
                }
            }
        ];
        
        for (const pattern of reactionPatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                const emoji = pattern.emoji(match);
                console.log('✅ Détecté: Réaction -', emoji);
                return {
                    action: "react_to_message",
                    params: { emoji },
                    reasoning: "Ajout de réaction"
                };
            }
        }
        
        // 4. Consultation de messages
        if (input.includes('montre') || input.includes('affiche') || input.includes('voir') || input.includes('dit quoi') || input.includes('messages')) {
            console.log('✅ Détecté: Consultation de messages');
            return {
                action: "show_recent",
                params: {
                    channel: "current",
                    limit: 10
                },
                reasoning: "Affichage des messages récents"
            };
        }
        
        // 5. Statut typing
        if (input.includes('typing') || input.includes('écri') || input.includes('tape')) {
            console.log('✅ Détecté: Statut d\'écriture');
            return {
                action: "typing_status",
                params: { enable: true },
                reasoning: "Activation du statut d'écriture"
            };
        }
        
        // Si rien ne match
        console.log('❓ Aucun pattern détecté');
        return {
            action: "ask_clarification",
            params: {
                original_input: userInput,
                suggestions: [
                    "• Essayez: \"Répond 'salut' à @username\"",
                    "• Essayez: \"Envoie 'message' sur le channel\"",
                    "• Essayez: \"Montre les messages récents\"",
                    "• Essayez: \"Réagis avec 👍\""
                ]
            },
            reasoning: "Intention peu claire"
        };
    }

    async executeCommand(analysis, chatId) {
        try {
            if (analysis.reasoning) {
                console.log(`💭 Raisonnement: ${analysis.reasoning}`);
            }
            
            const action = analysis.action || analysis.params?.action;
            
            switch (action) {
                case 'reply_to_user':
                    return await this.handleReplyToUser(analysis.params || analysis, chatId);
                
                case 'send_message':
                    return await this.handleSendMessage(analysis.params || analysis, chatId);
                
                case 'react_to_message':
                    return await this.handleReactToMessage(analysis.params || analysis, chatId);
                
                case 'show_recent':
                    return await this.handleShowRecent(analysis.params || analysis, chatId);
                
                case 'typing_status':
                    return await this.handleTypingStatus(analysis.params || analysis, chatId);
                
                case 'ask_clarification':
                    return {
                        success: true,
                        message: `❓ Je n'ai pas bien compris.\n\n${(analysis.params?.suggestions || []).join('\n')}`
                    };
                
                default:
                    return {
                        success: false,
                        message: `❓ Commande non reconnue.\n\nEssayez:\n• "Répond 'salut' à @username"\n• "Envoie 'message' sur le channel"\n• "Montre les messages récents"\n• "Réagis avec 👍"`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur: ${error.message}`
            };
        }
    }

    async handleReplyToUser(params, chatId) {
        try {
            let username = params.username;
            let content = params.content;
            
            // Gestion du "last_conversation"
            if (username === 'last_conversation') {
                const recent = await this.discordController.getRecentMessages(10);
                if (recent.length > 0) {
                    const lastUser = recent.find(msg => msg.author !== this.discordController.client?.user?.tag);
                    if (lastUser) {
                        username = lastUser.author.split('#')[0];
                        console.log(`🎯 Dernière conversation: ${username}`);
                    }
                }
            }
            
            await this.discordController.startTyping();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            await this.discordController.sendDMToUser(username, content);
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ DM envoyé à ${username}: "${content}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }

    async handleSendMessage(params, chatId) {
        try {
            let target = params.target || 'current_channel';
            let content = params.content;
            
            await this.discordController.startTyping();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await this.discordController.sendMessage(target, content);
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ Message envoyé: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }

    async handleReactToMessage(params, chatId) {
        try {
            await this.discordController.reactToLastMessage(params.emoji);
            
            return {
                success: true,
                message: `✅ Réaction ${params.emoji} ajoutée !`
            };
            
        } catch (error) {
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }

    async handleShowRecent(params, chatId) {
        try {
            const limit = params.limit || 5;
            const messages = await this.discordController.getRecentMessages(limit);
            
            if (messages.length === 0) {
                return {
                    success: true,
                    message: "📭 Aucun message récent. Attendez que des messages arrivent sur Discord."
                };
            }
            
            let messageText = `📨 Messages récents (${messages.length}):\n\n`;
            messages.forEach((msg, index) => {
                const time = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const preview = msg.content.substring(0, 60);
                messageText += `${index + 1}. ${msg.author} (${time})\n`;
                messageText += `   ${msg.channel}\n`;
                messageText += `   "${preview}${msg.content.length > 60 ? '...' : ''}"\n\n`;
            });
            
            return {
                success: true,
                message: messageText
            };
            
        } catch (error) {
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }

    async handleTypingStatus(params, chatId) {
        try {
            if (params.enable) {
                await this.discordController.startTyping();
                return {
                    success: true,
                    message: "⌨️ Statut 'en train d'écrire' activé"
                };
            } else {
                await this.discordController.stopTyping();
                return {
                    success: true,
                    message: "✅ Statut désactivé"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ ${error.message}`
            };
        }
    }

    getStats() {
        return {
            requestsUsed: this.requestCount,
            requestsLeft: this.maxRequests - this.requestCount,
            cacheHits: this.commandCache.size,
            estimatedCost: (this.requestCount * 0.000002).toFixed(6)
        };
    }
}

module.exports = DiscordAIProcessor;