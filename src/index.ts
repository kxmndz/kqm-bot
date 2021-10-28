// Require the necessary discord.js classes
import { REST } from '@discordjs/rest'
import AdmZip from 'adm-zip'
import { RESTPatchAPIApplicationCommandJSONBody, Routes } from 'discord-api-types/v9'
import { Client, Intents } from 'discord.js'
import { https } from 'follow-redirects'
import { Constants } from './constants'
import { LocalCommandManager } from './managers/commandManager'
import { LiveCommandManager } from './managers/liveCommandManager'
import fs from 'fs'
import fsp from 'fs/promises'
import { LocalInteractionManager } from './managers/interactionManager'
import { LiveInteractionManager } from './managers/liveInteractionManager'

class DiscordBotHandler {
    client = new Client({ intents: [Intents.FLAGS.GUILDS] })
    restClient = new REST({ version: '9' }).setToken(Constants.DISCORD_BOT_TOKEN)

    localCommandManager = new LocalCommandManager()
    liveCommandManager = new LiveCommandManager()

    localInteractionManager = new LocalInteractionManager()
    liveInteractionManager = new LiveInteractionManager()

    constructor() {
        console.log('Initialized a new Bot Handler')
    }

    async initialize() {
        await this.loadCommands()

        // When the client is ready, run this code (only once)
        this.client.once('ready', () => {
            console.log('Ready!')
        })

        this.client.on('interactionCreate', async interaction => {
            try {
                if (interaction.isCommand()) {
                    const CommandClass = 
                    this.localCommandManager.resolveLocalCommand(interaction.commandName) ??
                    this.liveCommandManager.resolveLiveCommand(interaction.commandName)
                    if (!CommandClass) return
    
                    const commandInstance = new CommandClass()
                    await commandInstance.execute(interaction)
                } else if (interaction.isButton() || interaction.isSelectMenu()) {
                    const ExecutableInteractionClass = this.localInteractionManager.resolveInteraction(interaction.customId)
                    if (!ExecutableInteractionClass) return

                    const executableInteractionInstance = new ExecutableInteractionClass()
                    await executableInteractionInstance.execute(interaction)
                }
            } catch(error) {
                console.error(error)
                if (!interaction.isCommand() && !interaction.isSelectMenu() && !interaction.isMessageComponent()) return
                
                await interaction.followUp({content: '**ERROR**: ' + error, ephemeral: true})
            }
        })
        
    
        // Login to Discord with your client's token
        this.client.login(Constants.DISCORD_BOT_TOKEN)
    }

    async loadCommands() {
        await this.downloadAndExtractLiveCommandRepo()

        return this.registerCommands([
            ...await this.liveCommandManager.getLiveCommands(),
            ...await this.localCommandManager.getLocalCommands()
        ])
    }

    async registerCommands(commands: RESTPatchAPIApplicationCommandJSONBody[]) {
        const hashSet: Record<string, RESTPatchAPIApplicationCommandJSONBody> = {}
        for (const command of commands) {
            if(!command.name) continue
            hashSet[command.name] = command
        }

        if(Constants.DEV_MODE) {
            await this.restClient.put(Routes.applicationGuildCommands(Constants.DISCORD_CLIENT_ID, Constants.DISCORD_DEV_GUILD_ID), { body: Object.values(hashSet) })
        } else {
            await this.restClient.put(Routes.applicationGuildCommands(Constants.DISCORD_CLIENT_ID, Constants.DISCORD_GUILD_ID), { body: Object.values(hashSet) })
        }
    }

    async downloadAndExtractLiveCommandRepo() {
        const downloadFilePath = Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR + '.zip'

        if (fs.existsSync(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR))
            await fsp.rm(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR, { recursive: true, force: true })
            
        if (fs.existsSync(downloadFilePath))
            await fsp.rm(downloadFilePath)

        console.log('deleted existing file')

        // Download the zip
        await this.download(Constants.LIVE_COMMANDS_REPO, downloadFilePath)

        console.log('downloaded file')

        const zip = new AdmZip(downloadFilePath)
        zip.extractAllTo(Constants.LIVE_COMMANDS_REPO_EXTRACT_DIR)
    }

    private async download(url: string, filePath: string) {
        const proto = https
      
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath)
            let fileInfo: unknown = null
      
            const request = proto.get(url, response => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to get '${url}' (${response.statusCode})`))
                    return
                }
      
                fileInfo = {
                    mime: response.headers['content-type'],
                    size: parseInt(response.headers['content-length'] ?? '', 10),
                }
      
                response.pipe(file)
            })
      
            // The destination stream is ended by the time it's called
            file.on('finish', () => resolve(fileInfo))
      
            request.on('error', err => {
                fs.unlink(filePath, () => reject(err))
            })
      
            file.on('error', err => {
                fs.unlink(filePath, () => reject(err))
            })
      
            request.end()
        })
    }
}

export const discordBot = new DiscordBotHandler()
discordBot.initialize()