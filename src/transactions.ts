import { MvsdWebsocket } from 'mvsd'
import { Subject, interval, Subscription, Observable } from 'rxjs'
import { uniq, } from 'lodash'

export interface Transaction { hash: string, inputs: { address: string }[], outputs: { address: string }[] }

export class Transactions {
    mvsd: MvsdWebsocket
    transactions = new Subject<any>()
    reconnectInterval: Observable<number> = interval(5000)
    connectSubscription?: Subscription
    constructor(websocketPath: string = 'ws://127.0.0.1:8821/ws') {
        this.mvsd = new MvsdWebsocket(websocketPath)
        this.mvsd.transactions.subscribe((tx) => this.transactions.next(tx))

        this.mvsd.ready.subscribe((ready) => {
            if (ready) {
                this.connectSubscription?.unsubscribe()
                console.info('connected')
                this.mvsd.subscribeTransactions()
            } else {
                this.connectSubscription = this.reconnectInterval.subscribe(() => {
                    console.info('try to connect')
                    this.mvsd.connect()
                })
            }
        })
    }
}

export function transactionAddresses(tx: Transaction) {
    return uniq(
        tx.inputs.map((input: { address: string }) => input.address).concat(
            tx.outputs.map((output: { address: string }) => output.address)
        ).filter(address => address !== undefined)
    )
}