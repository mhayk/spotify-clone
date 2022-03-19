import { jest, expect, describe, test, beforeEach } from '@jest/globals'

import config from '../../../server/config.js'

const {
    pages
} = config

describe('#Routes - test site for api response', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.clearAllMocks()
    })

    test.todo('GET / - should redirect to home page')
    test.todo(`GET /home - should response with ${pages.homeHTML} file stream`)
    test.todo(`GET /controller - should response ${pages.controllerHTML} file stream`)
    test.todo(`GET /file.ext - should response file stream`)
    test.todo(`GET /unknown - given an inexistent route it should response with 404`)

    describe('exceptions', () => {
        test.todo('given inexistent file it should response with 404')
        test.todo('given an error it should response with 500')
    })
})