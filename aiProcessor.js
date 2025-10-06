const OpenAI = require('openai');

class DiscordAIProcessor {
    constructor(apiKey, discordController) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.discordController = discordController;
        this.commandCache = new Map();
        this.requestCount = 0;
        this.maxRequests = 300000; // Limite pour 5$
        
        console.log('🧠 Processeur IA initialisé (Optimisé coûts)');
    }

    async processCommand(userInput, chatId) {
        try {
            this.requestCount++;
            
            // Vérification limite de coûts
            if (this.requestCount > this.maxRequests) {
                return {
                    success: false,
                    message: "⚠️ Limite de requêtes IA atteinte (5$ épuisés)"
                };
            }

            // Cache pour éviter les requêtes répétitives
            const cacheKey = userInput.toLowerCase().trim();
            if (this.commandCache.has(cacheKey)) {
                console.log('💾 Cache hit - Économie de tokens !');
                return await this.executeCommand(this.commandCache.get(cacheKey), chatId);
            }

            // Analyse IA optimisée (tokens limités)
            const analysis = await this.analyzeCommand(userInput);
            
            // Cache du résultat
            this.commandCache.set(cacheKey, analysis);
            
            return await this.executeCommand(analysis, chatId);

        } catch (error) {
            console.error('Erreur processeur IA:', error);
            return {
                success: false,
                message: `Erreur IA: ${error.message}`
            };
        }
    }

    async analyzeCommand(userInput) {
        const systemPrompt = `Tu es un assistant qui convertit des commandes naturelles en actions Discord.

RÉGLES STRICTES:
- Réponse JSON uniquement
- Max 100 tokens
- Pas d'explications
- Actions simples uniquement

ACTIONS DISPONIBLES:
- send_message: {target, content}
- reply_to_user: {username, content}
- react_to_message: {emoji}
- show_recent: {channel}
- typing_status: {enable}

EXEMPLE:
Input: "Répond 'salut' à Anthony0707"
Output: {"action": "reply_to_user", "username": "Anthony0707", "content": "salut"}`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                max_tokens: 100,
                temperature: 0.3
            });

            const response = completion.choices[0].message.content.trim();
            console.log(`💰 Tokens utilisés: ${completion.usage.total_tokens} (Coût: ~$${(completion.usage.total_tokens * 0.000002).toFixed(6)})`);
            
            return JSON.parse(response);

        } catch (error) {
            console.error('Erreur OpenAI:', error);
            
            // Fallback sans IA pour les commandes simples
            return this.fallbackCommandAnalysis(userInput);
        }
    }

    fallbackCommandAnalysis(userInput) {
        const input = userInput.toLowerCase();
        
        // Patterns simples pour économiser les tokens
        if (input.includes('répond') && input.includes('à')) {
            const match = input.match(/répond['\s]+['"]([^'"]+)['"]['\s]+à['\s]+(\w+)/);
            if (match) {
                return {
                    action: "reply_to_user",
                    username: match[2],
                    content: match[1]
                };
            }
        }
        
        if (input.includes('envoie') || input.includes('écris')) {
            const match = input.match(/['"]([^'"]+)['"]/);
            if (match) {
                return {
                    action: "send_message",
                    target: "current_channel",
                    content: match[1]
                };
            }
        }
        
        if (input.includes('montre') && input.includes('message')) {
            return {
                action: "show_recent",
                channel: "current"
            };
        }
        
        if (input.includes('réagis') && input.includes('👍')) {
            return {
                action: "react_to_message",
                emoji: "👍"
            };
        }
        
        return {
            action: "unknown",
            message: "Commande non reconnue"
        };
    }

    async executeCommand(analysis, chatId) {
        try {
            switch (analysis.action) {
                case 'reply_to_user':
                    return await this.handleReplyToUser(analysis, chatId);
                
                case 'send_message':
                    return await this.handleSendMessage(analysis, chatId);
                
                case 'react_to_message':
                    return await this.handleReactToMessage(analysis, chatId);
                
                case 'show_recent':
                    return await this.handleShowRecent(analysis, chatId);
                
                case 'typing_status':
                    return await this.handleTypingStatus(analysis, chatId);
                
                default:
                    return {
                        success: false,
                        message: "❓ Action non reconnue. Essayez: 'Répond salut à Anthony0707'"
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur exécution: ${error.message}`
            };
        }
    }

    async handleReplyToUser(analysis, chatId) {
        try {
            // Activer le statut "en train d'écrire"
            await this.discordController.startTyping();
            
            // Attendre un peu pour l'effet
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Envoyer le message
            const result = await this.discordController.sendDMToUser(
                analysis.username, 
                analysis.content
            );
            
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ Message envoyé à ${analysis.username}: "${analysis.content}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ Erreur envoi à ${analysis.username}: ${error.message}`
            };
        }
    }

    async handleSendMessage(analysis, chatId) {
        try {
            await this.discordController.startTyping();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const result = await this.discordController.sendMessage(
                analysis.target || 'current_channel',
                analysis.content
            );
            
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ Message envoyé: "${analysis.content}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ Erreur envoi message: ${error.message}`
            };
        }
    }

    async handleReactToMessage(analysis, chatId) {
        try {
            const result = await this.discordController.reactToLastMessage(analysis.emoji);
            
            return {
                success: true,
                message: `✅ Réaction ${analysis.emoji} ajoutée !`
            };
            
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur réaction: ${error.message}`
            };
        }
    }

    async handleShowRecent(analysis, chatId) {
        try {
            const messages = await this.discordController.getRecentMessages(5);
            
            let messageText = "📨 *Messages récents:*\n\n";
            messages.forEach((msg, index) => {
                const time = new Date(msg.timestamp).toLocaleTimeString();
                messageText += `${index + 1}. **${msg.author}** (${time})\n`;
                messageText += `   💬 ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}\n\n`;
            });
            
            return {
                success: true,
                message: messageText
            };
            
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur récupération messages: ${error.message}`
            };
        }
    }

    async handleTypingStatus(analysis, chatId) {
        try {
            if (analysis.enable) {
                await this.discordController.startTyping();
                return {
                    success: true,
                    message: "⌨️ Statut 'en train d'écrire' activé"
                };
            } else {
                await this.discordController.stopTyping();
                return {
                    success: true,
                    message: "✅ Statut 'en train d'écrire' désactivé"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur statut: ${error.message}`
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

    // Méthodes utilitaires pour économiser les tokens
    extractUsername(text) {
        const match = text.match(/@?(\w+)/);
        return match ? match[1] : null;
    }

    extractContent(text) {
        const match = text.match(/['"]([^'"]+)['"]/);
        return match ? match[1] : text;
    }

    extractEmoji(text) {
        const emojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡'];
        for (const emoji of emojis) {
            if (text.includes(emoji)) return emoji;
        }
        return '👍'; // Défaut
    }
}

module.exports = DiscordAIProcessor;
