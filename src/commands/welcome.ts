import { SlashCommandBuilder } from '@discordjs/builders'
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types'
import { CommandInteraction, MessageActionRow, MessageButton } from 'discord.js'
import { Command } from './command'

export default class WelcomeCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('welcome')
            .setDescription('Display the welcome message')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.reply({
            content: 'Welcome to **Paperback**!',
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('I Need Help')
                            .setCustomId('selfHelpInteraction')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setLabel('Support On Patreon')
                            .setStyle('LINK')
                            .setURL('https://www.patreon/faizandurrani')
                    )
            ]
        })
    }

}