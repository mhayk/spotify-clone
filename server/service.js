import fs from 'fs';
import fsPromises from 'fs/promises';
import { randomUUID } from 'crypto';
import { PassThrough, Writable } from 'stream';
import { once } from 'events'
import streamsPromisess from 'stream/promises';
import Throttle from 'throttle';
import childProcess from 'child_process';
import { logger } from './util.js';

import config from './config.js';
import { join, extname } from 'path';

const {
    dir: {
        publicDirectory,
    },
    constants: {
        fallBackBitRate,
        englishConversation,
        bitRateDivisor
    }
} = config
export class Service {
    constructor() {
        this.clientStreams = new Map();
        this.currentSong = englishConversation;
        this.currentBitRate = 0;
        this.throttleTransform = {};
        this.currentReadable = {};

        this.startStreamming();
    }

    createClientStream() {
        const id = randomUUID()
        const clientStream = new PassThrough()
        this.clientStreams.set(id, clientStream)

        return {
            id,
            clientStream
        }
    }

    removeClientStream(clientId) {
        this.clientStreams.delete(clientId)
    }

    _executeSoxCommand(args) {
        return childProcess.spawn('sox', args)
    }

    async getBitRate(song) {
        try {
            const args = [
                '--i', // info
                '-B', //bitrate
                song
            ]

            const {
                stderr, // error
                stdout, // log
                // stdin // input .. send data as stream
            } = this._executeSoxCommand(args)

            await Promise.all([
                once(stdout, 'readable'),
                once(stderr, 'readable'),
            ])
            const [success, error] = [stdout, stderr].map(stream => stream.read())
            if (error) return await Promise.reject(error)

            return success
                .toString()
                .trim()
                .replace(/k/, '000')

        } catch (error) {
            logger.error(`deu ruim no bitrate ${error}`)

            return fallBackBitRate;
        }
    }

    broadCast() {
        return new Writable({
            write: (chunk, encoding, callback) => {
                for (const [id, stream] of this.clientStreams) {
                    // if client is not connected it should not be broadcasted
                    if (stream.writableEnded) {
                        this.clientStreams.delete(id)
                        continue
                    }
                    stream.write(chunk)
                }
                callback()
            }
        })
    }

    async startStreamming() {
        logger.info(`starting with ${this.currentSong}`)
        const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong)) / bitRateDivisor;
        const throttleTransform = this.throttleTransform = new Throttle(bitRate)
        const songReadable = this.currentReadable = this.createFileStream(this.currentSong)
        return streamsPromisess.pipeline(
            songReadable,
            throttleTransform,
            this.broadCast(),
        )
    }

    createFileStream(filename) {
        return fs.createReadStream(filename);
    }

    async getFileInfo(file) {
        const fullFilePath = join(publicDirectory, file);

        // Check if file exists
        await fsPromises.access(fullFilePath);
        const fileType = extname(fullFilePath);

        return {
            type: fileType,
            name: fullFilePath
        }
    }

    async getFileStream(file) {
        const { name, type } = await this.getFileInfo(file);
        return {
            stream: this.createFileStream(name),
            type,
        }
    }
}