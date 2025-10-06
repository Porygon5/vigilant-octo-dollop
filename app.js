require('dotenv').config({ path: './config.env' });
const DiscordAIController = require('./discordController');
const DiscordAIProcessor = require('./aiProcessor');
const DiscordAITelegramBot = require('./telegramBot');
const express = require('express');
const cors = require('cors');

class DiscordAIApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.discordController = null;
        this.aiProcessor = null;
        this.telegramBot = null;
        this.isRunning = false;
        
        this.setupExpress();
        this.setupComponents();
    }

    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Route de santé
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                discord: this.discordController?.getConnectionStatus() || false,
                telegram: this.telegramBot ? true : false,
                ai: this.aiProcessor ? true : false,
                uptime: process.uptime()
            });
        });

        // Route de statistiques
        this.app.get('/stats', (req, res) => {
            if (this.aiProcessor) {
                res.json(this.aiProcessor.getStats());
            } else {
                res.json({ error: 'AI Processor not initialized' });
            }
        });

        // Route de contrôle
        this.app.post('/control', (req, res) => {
            const { action, data } = req.body;
            
            switch (action) {
                case 'start':
                    this.start();
                    res.json({ success: true, message: 'System started' });
                    break;
                case 'stop':
                    this.stop();
                    res.json({ success: true, message: 'System stopped' });
                    break;
                case 'restart':
                    this.restart();
                    res.json({ success: true, message: 'System restarted' });
                    break;
                default:
                    res.json({ success: false, message: 'Unknown action' });
            }
        });

        console.log('🌐 Express server configuré');
    }

    async setupComponents() {
        try {
            console.log('🔧 Initialisation des composants...');

            // Vérifier les variables d'environnement
            this.validateEnvironment();

            // 1. Contrôleur Discord
            this.discordController = new DiscordAIController(process.env.DISCORD_TOKEN);
            console.log('✅ Contrôleur Discord initialisé');

            // 2. Processeur IA
            this.aiProcessor = new DiscordAIProcessor(
                process.env.OPENAI_API_KEY, 
                this.discordController
            );
            console.log('✅ Processeur IA initialisé');

            // 3. Bot Telegram
            this.telegramBot = new DiscordAITelegramBot(
                process.env.TELEGRAM_TOKEN,
                this.discordController,
                this.aiProcessor
            );
            console.log('✅ Bot Telegram initialisé');

            console.log('🎉 Tous les composants initialisés avec succès !');

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            process.exit(1);
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
            throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
        }

        console.log('✅ Variables d\'environnement validées');
    }

    async start() {
        try {
            if (this.isRunning) {
                console.log('⚠️ Le système est déjà en cours d\'exécution');
                return;
            }

            console.log('🚀 Démarrage du système Discord AI...');

            // 1. Connexion Discord
            const discordConnected = await this.discordController.connect();
            if (!discordConnected) {
                throw new Error('Échec connexion Discord');
            }

            // 2. Démarrage serveur Express
            this.server = this.app.listen(this.port, () => {
                console.log(`🌐 Serveur web démarré sur le port ${this.port}`);
                console.log(`📊 Dashboard: http://localhost:${this.port}`);
            });

            this.isRunning = true;

            console.log('🎉 Système Discord AI démarré avec succès !');
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Erreur démarrage:', error);
            await this.stop();
            throw error;
        }
    }

    async stop() {
        try {
            console.log('🛑 Arrêt du système Discord AI...');

            if (this.server) {
                this.server.close();
                console.log('🌐 Serveur web arrêté');
            }

            if (this.discordController) {
                await this.discordController.disconnect();
                console.log('🔌 Discord déconnecté');
            }

            if (this.telegramBot && this.telegramBot.bot) {
                try {
                    await this.telegramBot.bot.stopPolling();
                    console.log('📱 Bot Telegram arrêté');
                } catch (error) {
                    console.error('❌ Erreur arrêt Telegram:', error.message);
                }
            }

            this.isRunning = false;
            console.log('✅ Système arrêté proprement');

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
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🤖 DISCORD AI CONTROLLER 🤖               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎮 Discord: ${this.discordController?.getConnectionStatus() ? '✅ Connecté' : '❌ Déconnecté'}
║  📱 Telegram: ✅ Bot actif
║  🧠 IA: ✅ OpenAI configuré
║  🌐 Web: ✅ http://localhost:${this.port}
║                                                              ║
║  📋 Commandes Telegram:                                      ║
║  • /start - Démarrer le bot                                  ║
║  • /menu - Menu principal                                    ║
║  • /status - Statut Discord                                  ║
║  • /help - Aide complète                                     ║
║                                                              ║
║  💬 Exemples de commandes IA:                                ║
║  • "Répond 'salut' à Anthony0707"                           ║
║  • "Envoie un message sur Gaming"                            ║
║  • "Montre les derniers messages"                            ║
║                                                              ║
║  💰 Coûts IA optimisés pour 300k+ requêtes                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
    }

    // Gestion propre de l'arrêt
    setupGracefulShutdown() {
        process.on('SIGINT', async () => {
            console.log('\n🛑 Signal SIGINT reçu, arrêt en cours...');
            await this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Signal SIGTERM reçu, arrêt en cours...');
            await this.stop();
            process.exit(0);
        });

        process.on('uncaughtException', async (error) => {
            console.error('❌ Exception non gérée:', error.message || error);
            if (error.message && error.message.includes('ETELEGRAM')) {
                console.log('⚠️ Erreur Telegram ignorée - Le bot continue de fonctionner');
                return;
            }
            await this.stop();
            process.exit(1);
        });

        process.on('unhandledRejection', async (reason, promise) => {
            console.error('❌ Promesse rejetée non gérée:', reason.message || reason);
            if (reason.message && reason.message.includes('ETELEGRAM')) {
                console.log('⚠️ Erreur Telegram ignorée - Le bot continue de fonctionner');
                return;
            }
            await this.stop();
            process.exit(1);
        });
    }
}

// Fonction principale
async function main() {
    const app = new DiscordAIApp();
    
    // Configuration arrêt propre
    app.setupGracefulShutdown();
    
    // Démarrage automatique
    await app.start();
    
    // Garder le processus actif
    process.stdin.resume();
}

// Lancement
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = DiscordAIApp;
