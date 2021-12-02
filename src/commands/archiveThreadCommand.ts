import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types";
import { CommandInteraction, Message } from "discord.js";
import { Command } from "./command";

export default class ArchiveThreadCommand implements Command {
    getCommandMetadata(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName('archivethread')
            .setDescription('Archives a thread and deletes its message from the channel')
            .toJSON()
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.deferReply({ ephemeral: true })

        if (!interaction.memberPermissions?.has('MANAGE_THREADS')) {
            interaction.editReply('You do not have permission to execute this command.')
            return
        }

        if (!interaction.channel?.isThread()) {
            interaction.editReply('Command can only be used inside a thread')
            return
        }

        try {
            const message = await interaction.channel.fetchStarterMessage()
            await message.delete()
        } catch (error: any) {
            console.error(error)
            interaction.editReply('Unable to delete starter message.')
        }

        await interaction.editReply('Deleted starter message and archived thread.')
        await interaction.channel.setArchived(true)
    }
}