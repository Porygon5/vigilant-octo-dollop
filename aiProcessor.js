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

            // Cache pour éviter les requêtes répétitives
            const cacheKey = userInput.toLowerCase().trim();
            if (this.commandCache.has(cacheKey)) {
                console.log('💾 Cache hit - Économie de tokens !');
                return await this.executeCommand(this.commandCache.get(cacheKey), chatId);
            }

            // Analyse IA intelligente
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
        const systemPrompt = `Tu es un assistant Discord intelligent et autonome. Tu comprends le langage naturel et prends des décisions intelligentes.

🎯 CAPACITÉS DISPONIBLES:
1. **Envoyer des messages**
   - À un utilisateur en DM: reply_to_user
   - Sur un channel: send_message
   - Avec mentions: inclure @username dans le contenu

2. **Réactions et interactions**
   - Ajouter une réaction: react_to_message
   - Activer le typing: typing_status

3. **Consultation**
   - Voir les messages récents: show_recent
   - Obtenir des informations: get_info

4. **Actions complexes**
   - Clarifier si besoin: ask_clarification

🧠 TON RÔLE:
- Comprendre l'intention de l'utilisateur, même si mal formulée
- Déduire les informations manquantes de manière intelligente
- Proposer des clarifications si vraiment nécessaire
- Être proactif et autonome dans les décisions

📝 FORMAT DE RÉPONSE (JSON):
{
  "action": "nom_action",
  "params": {
    // paramètres nécessaires
  },
  "reasoning": "courte explication de ta décision"
}

💡 EXEMPLES D'INTELLIGENCE:

Input: "dis lui salut"
Output: {
  "action": "reply_to_user",
  "params": {
    "username": "last_conversation",
    "content": "salut"
  },
  "reasoning": "Je réponds à la dernière personne avec qui l'utilisateur a parlé"
}

Input: "envoie un message sympa"
Output: {
  "action": "send_message",
  "params": {
    "target": "current_channel",
    "content": "Salut tout le monde ! 😊 J'espère que vous passez une bonne journée !"
  },
  "reasoning": "J'ai créé un message amical et positif pour le channel actuel"
}

Input: "il a dit quoi déjà ?"
Output: {
  "action": "show_recent",
  "params": {
    "channel": "current",
    "filter": "specific_user"
  },
  "reasoning": "L'utilisateur veut voir ce qu'une personne spécifique a dit récemment"
}

Input: "mets un pouce bleu"
Output: {
  "action": "react_to_message",
  "params": {
    "emoji": "👍"
  },
  "reasoning": "Pouce bleu = 👍, réaction au dernier message"
}

🎨 SOIS CRÉATIF ET INTELLIGENT:
- Si l'utilisateur demande "réponds-lui", devine qui est "lui"
- Si c'est vague, fais le choix le plus logique
- Adapte le ton et le contenu au contexte
- N'hésite pas à enrichir les messages courts`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                max_tokens: 400,
                temperature: 0.7,
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0].message.content.trim();
            console.log(`💰 Tokens utilisés: ${completion.usage.total_tokens} (Coût: ~$${(completion.usage.total_tokens * 0.000002).toFixed(6)})`);
            
            const parsed = JSON.parse(response);
            console.log(`🧠 Raisonnement IA: ${parsed.reasoning || 'N/A'}`);
            
            return parsed;

        } catch (error) {
            console.error('Erreur OpenAI:', error);
            return this.intelligentFallback(userInput);
        }
    }

    intelligentFallback(userInput) {
        const input = userInput.toLowerCase();
        console.log('💾 Utilisation du fallback intelligent');
        
        // Patterns intelligents pour répondre
        const replyPatterns = [
            { regex: /répond[s]?\s+['"]([^'"]+)['"]\s+à\s+@?(\w+)/i, extract: (m) => ({ username: m[2], content: m[1] }) },
            { regex: /dis\s+['"]([^'"]+)['"]\s+à\s+@?(\w+)/i, extract: (m) => ({ username: m[2], content: m[1] }) },
            { regex: /envoie\s+['"]([^'"]+)['"]\s+à\s+@?(\w+)/i, extract: (m) => ({ username: m[2], content: m[1] }) },
            { regex: /répond(?:s)?\s+(?:lui|leur)\s+['"]([^'"]+)['"]/i, extract: (m) => ({ username: 'last_conversation', content: m[1] }) },
            { regex: /dis\s+(?:lui|leur)\s+(\w+)/i, extract: (m) => ({ username: 'last_conversation', content: m[1] }) }
        ];
        
        for (const pattern of replyPatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                const data = pattern.extract(match);
                return {
                    action: "reply_to_user",
                    params: data,
                    reasoning: "Détection de commande de réponse"
                };
            }
        }
        
        // Messages généraux
        const messagePatterns = [
            { regex: /(?:envoie|écris|poste)\s+['"]([^'"]+)['"]/i, extract: (m) => m[1] },
            { regex: /(?:envoie|écris)\s+un\s+(?:message|truc)\s+(\w+)/i, extract: (m) => {
                const type = m[1].toLowerCase();
                const messages = {
                    'sympa': 'Salut tout le monde ! 😊 J\'espère que vous passez une bonne journée !',
                    'cool': '🎉 Quoi de neuf les amis ? 🚀',
                    'motivant': '💪 Allez, on est au top aujourd\'hui ! Let\'s go! 🔥'
                };
                return messages[type] || `Bonjour ! ${type}`;
            }},
            { regex: /dis\s+['"]([^'"]+)['"]/i, extract: (m) => m[1] }
        ];
        
        for (const pattern of messagePatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                return {
                    action: "send_message",
                    params: {
                        target: "current_channel",
                        content: pattern.extract(match)
                    },
                    reasoning: "Envoi de message général"
                };
            }
        }
        
        // Réactions
        const reactionPatterns = [
            { regex: /réagis\s+(?:avec\s+)?([👍👎❤️😂😮😢😡🔥💯✨🎉])/i, emoji: (m) => m[1] },
            { regex: /mets?\s+(?:un\s+)?(pouce|coeur|rire|feu)/i, emoji: (m) => {
                const map = { 
                    pouce: '👍', 
                    coeur: '❤️', 
                    rire: '😂', 
                    feu: '🔥' 
                };
                return map[m[1]] || '👍';
            }}
        ];
        
        for (const pattern of reactionPatterns) {
            const match = input.match(pattern.regex);
            if (match) {
                return {
                    action: "react_to_message",
                    params: {
                        emoji: pattern.emoji(match)
                    },
                    reasoning: "Ajout de réaction"
                };
            }
        }
        
        // Consultation
        if (input.includes('montre') || input.includes('affiche') || input.includes('voir') || input.includes('dit quoi')) {
            return {
                action: "show_recent",
                params: {
                    channel: "current",
                    limit: 10,
                    filter: input.includes('il') || input.includes('elle') ? 'specific_user' : null
                },
                reasoning: "Affichage des messages récents"
            };
        }
        
        // Typing status
        if (input.includes('typing') || input.includes('écri')) {
            return {
                action: "typing_status",
                params: {
                    enable: true
                },
                reasoning: "Activation du statut d'écriture"
            };
        }
        
        // Message amical par défaut si contient des mots clés de salutation
        const greetings = ['salut', 'bonjour', 'hello', 'hey', 'coucou', 'yo'];
        if (greetings.some(g => input.includes(g))) {
            return {
                action: "send_message",
                params: {
                    target: "current_channel",
                    content: userInput
                },
                reasoning: "Message de salutation détecté"
            };
        }
        
        // Si rien ne match, demander clarification
        return {
            action: "ask_clarification",
            params: {
                original_input: userInput,
                suggestions: [
                    "• Voulez-vous envoyer un message ?",
                    "• Voulez-vous voir les messages récents ?",
                    "• Voulez-vous réagir à un message ?"
                ]
            },
            reasoning: "Intention peu claire"
        };
    }

    async executeCommand(analysis, chatId) {
        try {
            // Log du raisonnement de l'IA
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
                        message: `❓ J'ai besoin de clarification:\n\n${(analysis.params?.suggestions || []).join('\n')}\n\nPouvez-vous préciser ?`
                    };
                
                case 'get_info':
                    return await this.handleGetInfo(analysis.params || analysis, chatId);
                
                default:
                    return {
                        success: false,
                        message: `❓ Je n'ai pas bien compris "${analysis.params?.original_input || 'votre demande'}".\n\nEssayez:\n• "Réponds 'salut' à @username"\n• "Envoie 'bonjour' sur le channel"\n• "Montre les messages récents"\n• "Réagis avec 👍"`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur: ${error.message}`
            };
        }
    }

    async handleReplyToUser(analysis, chatId) {
        try {
            const params = analysis.params || analysis;
            let username = params.username;
            let content = params.content;
            
            // Gestion intelligente du "last_conversation"
            if (username === 'last_conversation') {
                const recent = await this.discordController.getRecentMessages(10);
                if (recent.length > 0) {
                    const lastUser = recent.find(msg => msg.author !== this.discordController.client?.user?.tag);
                    if (lastUser) {
                        username = lastUser.author.split('#')[0];
                        console.log(`🎯 Dernière conversation détectée: ${username}`);
                    }
                }
            }
            
            await this.discordController.startTyping();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = await this.discordController.sendDMToUser(username, content);
            
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ Message envoyé à ${username}: "${content}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ Impossible d'envoyer à ${analysis.params?.username || analysis.username}: ${error.message}`
            };
        }
    }

    async handleSendMessage(analysis, chatId) {
        try {
            const params = analysis.params || analysis;
            let target = params.target || 'current_channel';
            let content = params.content;
            
            await this.discordController.startTyping();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Si le target contient un #, c'est un nom de channel
            if (target.includes('#')) {
                const channelName = target.replace('#', '').toLowerCase();
                const channels = await this.discordController.getChannels();
                const foundChannel = channels.find(ch => 
                    ch.name.toLowerCase().includes(channelName)
                );
                
                if (foundChannel) {
                    target = foundChannel.id;
                    console.log(`📍 Channel trouvé: ${foundChannel.name}`);
                }
            }
            
            const result = await this.discordController.sendMessage(target, content);
            
            await this.discordController.stopTyping();
            
            return {
                success: true,
                message: `✅ Message envoyé: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
            };
            
        } catch (error) {
            await this.discordController.stopTyping();
            return {
                success: false,
                message: `❌ Erreur envoi: ${error.message}`
            };
        }
    }

    async handleReactToMessage(analysis, chatId) {
        try {
            const params = analysis.params || analysis;
            const result = await this.discordController.reactToLastMessage(params.emoji);
            
            return {
                success: true,
                message: `✅ Réaction ${params.emoji} ajoutée !`
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
            const params = analysis.params || analysis;
            const limit = params.limit || 5;
            const filter = params.filter;
            
            let messages = await this.discordController.getRecentMessages(limit * 2);
            
            // Appliquer les filtres si demandés
            if (filter === 'specific_user' && messages.length > 0) {
                const userCounts = {};
                messages.forEach(msg => {
                    userCounts[msg.author] = (userCounts[msg.author] || 0) + 1;
                });
                const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
                if (topUser) {
                    messages = messages.filter(msg => msg.author === topUser[0]);
                    console.log(`🎯 Filtré pour l'utilisateur: ${topUser[0]}`);
                }
            }
            
            messages = messages.slice(0, limit);
            
            let messageText = `📨 **Messages récents** (${messages.length}):\n\n`;
            messages.forEach((msg, index) => {
                const time = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const preview = msg.content.substring(0, 60);
                messageText += `${index + 1}. **${msg.author}** (${time})\n`;
                messageText += `   💬 ${preview}${msg.content.length > 60 ? '...' : ''}\n`;
                messageText += `   📍 ${msg.channel}\n\n`;
            });
            
            return {
                success: true,
                message: messageText
            };
            
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur récupération: ${error.message}`
            };
        }
    }

    async handleTypingStatus(analysis, chatId) {
        try {
            const params = analysis.params || analysis;
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

    async handleGetInfo(analysis, chatId) {
        try {
            const params = analysis.params || analysis;
            const infoType = params.type || 'general';
            
            switch (infoType) {
                case 'servers':
                    const servers = await this.discordController.getServers();
                    return {
                        success: true,
                        message: `🏠 **Serveurs (${servers.length}):**\n${servers.map((s, i) => `${i+1}. ${s.name} (${s.memberCount} membres)`).join('\n')}`
                    };
                
                case 'channels':
                    const channels = await this.discordController.getChannels();
                    return {
                        success: true,
                        message: `💬 **Channels (${channels.length}):**\n${channels.slice(0, 10).map((c, i) => `${i+1}. #${c.name} (${c.guild})`).join('\n')}`
                    };
                
                case 'status':
                    const status = await this.discordController.getStatus();
                    return {
                        success: true,
                        message: `📊 **Statut:**\n👤 ${status.username}\n🏠 ${status.guilds} serveurs\n💬 ${status.channels} channels`
                    };
                
                default:
                    return {
                        success: true,
                        message: "ℹ️ Informations disponibles: servers, channels, status"
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `❌ Erreur récupération info: ${error.message}`
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