const OpenAI = require('openai');

class AdvancedAIProcessor {
    constructor(apiKey, discordController) {
        this.openai = new OpenAI({ apiKey });
        this.discordController = discordController;
        this.conversationHistory = new Map();
        this.requestCount = 0;
        this.maxRequests = 300000;
        
        console.log('🧠 Processeur IA Avancé initialisé');
    }

    async processCommand(userInput, chatId) {
        try {
            this.requestCount++;
            
            if (this.requestCount > this.maxRequests) {
                return {
                    success: false,
                    message: "⚠️ Limite de requêtes IA atteinte"
                };
            }

            console.log(`📥 Traitement requête: "${userInput}"`);

            // Analyser l'intention avec l'IA
            const analysis = await this.analyzeIntention(userInput, chatId);
            
            // Exécuter les actions
            return await this.executeActions(analysis, chatId);

        } catch (error) {
            console.error('Erreur processeur IA:', error);
            return {
                success: false,
                message: `❌ Erreur IA: ${error.message}`
            };
        }
    }

    async analyzeIntention(userInput, chatId) {
        // Récupérer l'historique de conversation
        const history = this.conversationHistory.get(chatId) || [];
        
        // Construire le contexte
        const contextMessages = [
            {
                role: "system",
                content: `Tu es un assistant IA pour Discord. Tu dois analyser les demandes de l'utilisateur et les convertir en actions Discord.

Actions disponibles:
1. SEND_MESSAGE - Envoyer un message sur un channel
2. SEND_DM - Envoyer un message privé à quelqu'un
3. ADD_FRIEND - Ajouter quelqu'un en ami
4. JOIN_SERVER - Rejoindre un serveur Discord
5. REACT - Réagir à un message
6. SET_STATUS - Changer le statut
7. SEARCH_USER - Chercher un utilisateur
8. GET_MESSAGES - Récupérer des messages

Tu dois répondre en JSON avec cette structure:
{
    "actions": [
        {
            "type": "SEND_DM",
            "params": {
                "username": "nom_utilisateur",
                "message": "message à envoyer",
                "typing": true
            },
            "order": 1
        }
    ],
    "reasoning": "explication de ce que tu vas faire",
    "human_response": "réponse naturelle et amicale pour l'utilisateur"
}

IMPORTANT: 
- Génère des messages TRÈS naturels et humains
- Varie les formulations
- Ajoute des émojis de manière naturelle
- Sois conversationnel et amical
- Pour des messages Discord, fais-les courts et naturels`
            }
        ];

        // Ajouter l'historique récent
        history.slice(-5).forEach(msg => {
            contextMessages.push(msg);
        });

        // Ajouter la requête actuelle
        contextMessages.push({
            role: "user",
            content: userInput
        });

        // Appel à l'API OpenAI
        const response = await this.openai.chat.completions.create({
            model: process.env.AI_MODEL || 'gpt-3.5-turbo',
            messages: contextMessages,
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.8,
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(response.choices[0].message.content);
        
        // Mettre à jour l'historique
        history.push(
            { role: "user", content: userInput },
            { role: "assistant", content: JSON.stringify(aiResponse) }
        );
        
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        
        this.conversationHistory.set(chatId, history);

        console.log('🧠 Analyse IA:', aiResponse.reasoning);
        
        return aiResponse;
    }

    async executeActions(analysis, chatId) {
        const results = [];
        const actions = analysis.actions || [];
        
        // Trier par ordre
        actions.sort((a, b) => (a.order || 0) - (b.order || 0));

        for (const action of actions) {
            try {
                let result;
                
                switch (action.type) {
                    case 'SEND_DM':
                        result = await this.executeSendDM(action.params);
                        break;
                    
                    case 'SEND_MESSAGE':
                        result = await this.executeSendMessage(action.params);
                        break;
                    
                    case 'ADD_FRIEND':
                        result = await this.executeAddFriend(action.params);
                        break;
                    
                    case 'JOIN_SERVER':
                        result = await this.executeJoinServer(action.params);
                        break;
                    
                    case 'REACT':
                        result = await this.executeReact(action.params);
                        break;
                    
                    case 'SET_STATUS':
                        result = await this.executeSetStatus(action.params);
                        break;
                    
                    case 'SEARCH_USER':
                        result = await this.executeSearchUser(action.params);
                        break;
                    
                    case 'GET_MESSAGES':
                        result = await this.executeGetMessages(action.params);
                        break;
                    
                    default:
                        result = { success: false, error: `Action inconnue: ${action.type}` };
                }
                
                results.push({ action: action.type, ...result });
                
                // Délai entre les actions pour être plus naturel
                if (actions.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
            } catch (error) {
                console.error(`Erreur action ${action.type}:`, error);
                results.push({ 
                    action: action.type, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        // Construire la réponse finale
        const allSuccess = results.every(r => r.success !== false);
        
        return {
            success: allSuccess,
            message: analysis.human_response || this.generateHumanResponse(results),
            results: results,
            reasoning: analysis.reasoning
        };
    }

    // ========== EXÉCUTION DES ACTIONS ==========
    
    async executeSendDM(params) {
        const { username, message, typing = true } = params;
        
        const options = {
            typing,
            typingDelay: 1500 + Math.random() * 1500 // Délai naturel
        };
        
        await this.discordController.sendDMByUsername(username, message, options);
        
        return { 
            success: true, 
            message: `DM envoyé à ${username}` 
        };
    }

    async executeSendMessage(params) {
        const { channelId, message, typing = true } = params;
        
        const options = {
            typing,
            typingDelay: 1500 + Math.random() * 1500
        };
        
        await this.discordController.sendMessage(channelId, message, options);
        
        return { 
            success: true, 
            message: `Message envoyé sur le channel` 
        };
    }

    async executeAddFriend(params) {
        const { username } = params;
        
        const result = await this.discordController.addFriendByUsername(username);
        
        return { 
            success: true, 
            message: `Demande d'ami envoyée à ${result.user}` 
        };
    }

    async executeJoinServer(params) {
        const { inviteCode } = params;
        
        const result = await this.discordController.joinServer(inviteCode);
        
        return { 
            success: true, 
            message: `Serveur "${result.guild}" rejoint` 
        };
    }

    async executeReact(params) {
        const { messageId, channelId, emoji } = params;
        
        await this.discordController.reactToMessage(messageId, channelId, emoji);
        
        return { 
            success: true, 
            message: `Réaction ${emoji} ajoutée` 
        };
    }

    async executeSetStatus(params) {
        const { status, activityType, activityName } = params;
        
        await this.discordController.setStatus(status, activityType, activityName);
        
        return { 
            success: true, 
            message: `Statut changé: ${status}` 
        };
    }

    async executeSearchUser(params) {
        const { username } = params;
        
        const user = await this.discordController.findUserByName(username);
        
        if (!user) {
            return { 
                success: false, 
                message: `Utilisateur "${username}" introuvable` 
            };
        }
        
        return { 
            success: true, 
            message: `Utilisateur trouvé: ${user.tag}`,
            user: {
                id: user.id,
                tag: user.tag,
                username: user.username
            }
        };
    }

    async executeGetMessages(params) {
        const { channelId, limit = 10 } = params;
        
        const messages = await this.discordController.getChannelMessages(channelId, limit);
        
        return { 
            success: true, 
            message: `${messages.length} messages récupérés`,
            messages: messages
        };
    }

    // ========== GÉNÉRATION DE MESSAGES HUMAINS ==========
    
    async generateHumanMessage(context, style = 'casual') {
        try {
            const prompt = `Génère un message Discord très naturel et humain basé sur ce contexte: ${context}

Style: ${style}

Le message doit être:
- Court (1-3 phrases max)
- Naturel et conversationnel
- Sans formalité excessive
- Avec des émojis occasionnels
- Comme un vrai humain qui écrit vite

Réponds uniquement avec le message, sans guillemets.`;

            const response = await this.openai.chat.completions.create({
                model: process.env.AI_MODEL || 'gpt-3.5-turbo',
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100,
                temperature: 0.9
            });

            return response.choices[0].message.content.trim();
            
        } catch (error) {
            console.error('Erreur génération message:', error);
            // Fallback sur des messages prédéfinis
            const fallbacks = [
                "ok 👍",
                "d'acc",
                "ça marche !",
                "ok parfait",
                "nickel"
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    }

    generateHumanResponse(results) {
        const successCount = results.filter(r => r.success !== false).length;
        const totalCount = results.length;
        
        if (successCount === 0) {
            return "❌ Désolé, je n'ai pas pu effectuer l'action demandée.";
        }
        
        if (successCount === totalCount) {
            const responses = [
                "✅ C'est fait !",
                "✅ Voilà, c'est réglé 👍",
                "✅ Terminé !",
                "✅ Nickel, c'est bon !",
                "✅ Parfait, tout est ok !"
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        return `⚠️ ${successCount}/${totalCount} actions effectuées avec succès.`;
    }

    getStats() {
        return {
            requestsUsed: this.requestCount,
            requestsLeft: this.maxRequests - this.requestCount,
            conversations: this.conversationHistory.size,
            estimatedCost: (this.requestCount * 0.000002).toFixed(6)
        };
    }

    clearConversation(chatId) {
        this.conversationHistory.delete(chatId);
    }
}

module.exports = AdvancedAIProcessor;