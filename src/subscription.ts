import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const stevenFulop = 'did:plc:cwof5oencu34qrxbbpbdaur6'

export class FirehoseSubscription extends FirehoseSubscriptionBase {

  isCampaignMember(recordAuthor: string): boolean {
    return [stevenFulop].includes(recordAuthor);
  }

  hasTerm(recordText: string): boolean {
    return recordText.toLowerCase().includes('fulop')
  }

  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        return this.isCampaignMember(create.author) || this.hasTerm(create.record.text)
      })
      .map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      console.log(postsToCreate[0])
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
