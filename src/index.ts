import { Transactions, transactionAddresses, Transaction } from './transactions'
import { ok, } from 'assert'
import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import { post } from 'superagent'

export interface PostHook {
    url: string
}

// setup express
const app = express()
app.use(bodyParser.json())
app.use(morgan('combined'))

// setup constants
const MVSD_WS = process.env.MVSD_WS || 'ws://127.0.0.1:8821/ws'
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000
const VALID_HOOK_URL = RegExp(process.env.VALID_HOOK_URL || 'https?://.+') 

// initialize hooks
const transactionHooks: { [address: string]: PostHook } = {}

/**
 * Create a new transaction hook
 * 
 * @param address string
 * 
 * curl -X POST -H "Content-Type: application/json" -d '{ "url": "https://yourhookurl" }' http://127.0.0.1:4000/hook/tx/MG65zQHtch4zxj9ghZKyTcjrRDiCdPAf8M
 */
app.post('/hook/tx/:address', (req, res) => {
    const url: string = req.body.url
    const address = req.params.address
    try {
        ok(url, 'url must be provided')
        ok(VALID_HOOK_URL.test(url), 'invalid url')
        transactionHooks[address] = { url }
        console.log('registered new transaction hook for address', address)
        res.json({ address, url })
    } catch (error) {
        res.status(500).send(error.message)
    }
})

app.post('/test/*', (req, res) => {
    console.log(req.body)
})

// transaction service
const transactionService = new Transactions(MVSD_WS)
transactionService.transactions.subscribe((transaction: Transaction) => {
    console.info('check transaction', transaction.hash)
    const addresses = transactionAddresses(transaction)
    addresses.forEach(address => {
        const hook = transactionHooks[address]
        if (hook !== undefined) {
            console.log('transaction hook triggered for address', address, 'call', hook.url)
            post(hook.url)
                .send(transaction)
                .then()
                .catch(error=>{
                    console.error('error calling hook url', { 
                        type: 'transaction',
                        url: hook.url,
                        message: error.message,
                        statusCode: error.status,
                        payload: JSON.stringify(transaction),
                        address,
                    })
                })
        }
    })
})

app.listen(PORT, () => {
    console.log('hook ready')
    console.log('environment', {
        MVSD_WS, PORT
    })
})