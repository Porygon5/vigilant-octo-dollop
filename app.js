require('dotenv').config({ path: './config.env' });
const UltraDiscordController = require('./discordController');
const AdvancedAIProcessor = require('./aiProcessor');
const UltraTelegramBot = require('./telegramBot');
const express = require('express');
const cors = require('cors');

class DiscordAIMasterApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.discordController = null;
        this.aiProcessor = null;
        this.telegramBot = null;
        this.isRunning = false;
        
        this.setupExpress();
    }

    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());

        // Route de santé
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                discord: this.discordController?.getConnectionStatus() || false,
                telegram: this.telegramBot ? true : false,
                ai: this.aiProcessor ? true : false,
                uptime: process.uptime(),
                version: '2.0.0-ultra'
            });
        });

        // Route de statistiques IA
        this.app.get('/stats', (req, res) => {
            if (this.aiProcessor) {
                res.json({
                    ai: this.aiProcessor.getStats(),
                    discord: {
                        connected: this.discordController?.getConnectionStatus(),
                        messageHistory: this.discordController?.messageHistory.length || 0
                    }
                });
            } else {
                res.status(503).json({ error: 'AI Processor not initialized' });
            }
        });

        // Route pour envoyer un message via API
        this.app.post('/api/send-message', async (req, res) => {
            try {
                const { channelId, message } = req.body;
                
                if (!channelId || !message) {
                    return res.status(400).json({ error: 'channelId et message requis' });
                }

                const result = await this.discordController.sendMessage(channelId, message);
                res.json({ success: true, messageId: result.id });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Route pour envoyer un DM via API
        this.app.post('/api/send-dm', async (req, res) => {
            try {
                const { userId, message } = req.body;
                
                if (!userId || !message) {
                    return res.status(400).json({ error: 'userId et message requis' });
                }

                const result = await this.discordController.sendDM(userId, message);
                res.json({ success: true, messageId: result.id });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Route pour ajouter un ami via API
        this.app.post('/api/add-friend', async (req, res) => {
            try {
                const { username } = req.body;
                
                if (!username) {
                    return res.status(400).json({ error: 'username requis' });
                }

                const result = await this.discordController.addFriendByUsername(username);
                res.json(result);
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Route pour rejoindre un serveur via API
        this.app.post('/api/join-server', async (req, res) => {
            try {
                const { inviteCode } = req.body;
                
                if (!inviteCode) {
                    return res.status(400).json({ error: 'inviteCode requis' });
                }

                const result = await this.discordController.joinServer(inviteCode);
                res.json(result);
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Route pour traiter une commande IA via API
        this.app.post('/api/process-command', async (req, res) => {
            try {
                const { command, chatId } = req.body;
                
                if (!command) {
                    return res.status(400).json({ error: 'command requis' });
                }

                const result = await this.aiProcessor.processCommand(command, chatId || 'api');
                res.json(result);
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Route d'accueil
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Discord AI Master',
                version: '2.0.0-ultra',
                status: this.isRunning ? 'running' : 'stopped',
                endpoints: [
                    'GET /health',
                    'GET /stats',
                    'POST /api/send-message',
                    'POST /api/send-dm',
                    'POST /api/add-friend',
                    'POST /api/join-server',
                    'POST /api/process-command'
                ]
            });
        });

        console.log('🌐 Express server configuré');
    }

    async initialize() {
        try {
            console.log('🔧 Initialisation des composants...');

            // Vérifier les variables d'environnement
            this.validateEnvironment();

            // 1. Contrôleur Discord
            console.log('📱 Initialisation Discord...');
            this.discordController = new UltraDiscordController(process.env.DISCORD_TOKEN);
            
            // 2. Processeur IA
            console.log('🧠 Initialisation IA...');
            this.aiProcessor = new AdvancedAIProcessor(
                process.env.OPENAI_API_KEY,
                this.discordController
            );
            
            // 3. Bot Telegram
            console.log('🤖 Initialisation Telegram...');
            this.telegramBot = new UltraTelegramBot(
                process.env.TELEGRAM_TOKEN,
                this.discordController,
                this.aiProcessor
            );

            console.log('✅ Tous les composants initialisés !');

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            throw error;
        }
    }

    validateEnvironment() {
        const required = [
            'DISCORD_TOKEN',
            'TELEGRAM_TOKEN',
            'OPENAI_API_KEY'
        ];

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`❌ Variables manquantes: ${missing.join(', ')}`);
        }

        console.log('✅ Variables d\'environnement validées');
    }

    async start() {
        try {
            if (this.isRunning) {
                console.log('⚠️ Le système est déjà en cours d\'exécution');
                return;
            }

            console.log('\n🚀 Démarrage de DISCORD AI MASTER...\n');

            // Initialiser les composants
            await this.initialize();

            // Connexion Discord
            console.log('🔗 Connexion à Discord...');
            const discordConnected = await this.discordController.connect();
            
            if (!discordConnected) {
                throw new Error('❌ Échec connexion Discord');
            }

            // Démarrage serveur Express
            this.server = this.app.listen(this.port, () => {
                console.log(`\n🌐 API REST démarrée sur http://localhost:${this.port}`);
            });

            this.isRunning = true;

            this.showWelcomeMessage();

            console.log('\n✅ SYSTÈME OPÉRATIONNEL !\n');

        } catch (error) {
            console.error('\n❌ Erreur démarrage:', error.message);
            await this.stop();
            process.exit(1);
        }
    }

    async stop() {
        try {
            console.log('\n🛑 Arrêt du système...');

            if (this.server) {
                this.server.close();
                console.log('🌐 API REST arrêtée');
            }

            if (this.discordController) {
                await this.discordController.disconnect();
            }

            if (this.telegramBot && this.telegramBot.bot) {
                try {
                    await this.telegramBot.bot.stopPolling();
                    console.log('📱 Bot Telegram arrêté');
                } catch (error) {
                    // Ignorer les erreurs de polling
                }
            }

            this.isRunning = false;
            console.log('✅ Système arrêté proprement\n');

        } catch (error) {
            console.error('❌ Erreur arrêt:', error);
        }
    }

    async restart() {
        console.log('🔄 Redémarrage du système...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.start();
    }

    showWelcomeMessage() {
        const client = this.discordController.getClient();
        
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                 🚀 DISCORD AI MASTER v2.0 🚀                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ✅ Discord      : ${client.user.tag.padEnd(40)} ║
║  ✅ Telegram     : Bot actif                                    ║
║  ✅ IA           : OpenAI ${process.env.AI_MODEL.padEnd(29)} ║
║  ✅ API REST     : http://localhost:${this.port}                         ║
║                                                                  ║
║  📱 TELEGRAM                                                     ║
║  • /start  - Démarrer                                           ║
║  • /menu   - Menu principal                                     ║
║  • /status - Statut Discord                                     ║
║  • /help   - Aide complète                                      ║
║                                                                  ║
║  🧠 FONCTIONNALITÉS IA                                          ║
║  • Envoi de messages et DMs ultra-réalistes                     ║
║  • Gestion des amis et serveurs                                 ║
║  • Compréhension du langage naturel                             ║
║  • Actions multiples en séquence                                ║
║  • Génération de messages humains                               ║
║                                                                  ║
║  🌐 API REST ENDPOINTS                                          ║
║  • POST /api/send-message                                       ║
║  • POST /api/send-dm                                            ║
║  • POST /api/add-friend                                         ║
║  • POST /api/join-server                                        ║
║  • POST /api/process-command                                    ║
║                                                                  ║
║  💰 Coûts optimisés : ~300k requêtes pour 5$                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
        `);
    }

    setupGracefulShutdown() {
        process.on('SIGINT', async () => {
            console.log('\n🛑 Signal SIGINT reçu...');
            await this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Signal SIGTERM reçu...');
            await this.stop();
            process.exit(0);
        });

        process.on('uncaughtException', async (error) => {
            console.error('\n❌ Exception non gérée:', error.message);
            if (!error.message.includes('ETELEGRAM')) {
                await this.stop();
                process.exit(1);
            }
        });

        process.on('unhandledRejection', async (reason) => {
            console.error('\n❌ Promesse rejetée:', reason);
            if (reason && !reason.message?.includes('ETELEGRAM')) {
                await this.stop();
                process.exit(1);
            }
        });
    }
}

// Fonction principale
async function main() {
    const app = new DiscordAIMasterApp();
    
    // Configuration arrêt propre
    app.setupGracefulShutdown();
    
    // Démarrage
    await app.start();
    
    // Garder le processus actif
    process.stdin.resume();
}

// Lancement
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = DiscordAIMasterApp;