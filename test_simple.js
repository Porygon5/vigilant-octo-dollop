#!/usr/bin/env node

console.log('🧪 Test simple du système Discord AI...');

// Test de connexion Discord
const DiscordController = require('./discordController');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

async function testDiscord() {
    try {
        console.log('🎮 Test connexion Discord...');
        const discord = new DiscordController(process.env.DISCORD_TOKEN);
        await discord.connect();
        
        const status = await discord.getStatus();
        console.log('✅ Discord connecté:', status);
        
        await discord.disconnect();
        console.log('✅ Test Discord réussi');
        
    } catch (error) {
        console.error('❌ Erreur test Discord:', error.message);
    }
}

async function main() {
    await testDiscord();
    console.log('🎉 Tests terminés');
    process.exit(0);
}

main().catch(console.error);
