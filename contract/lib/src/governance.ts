import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { fetch } from "cross-fetch";
import { readContract } from "smartweave";
import { GOVERNANCE_CONTRACT_ID } from "./constants";

type Keyfile = JWKInterface | "use_wallet";

interface GovernanceState {
  balances: Record<string, number>;
}

export class Governance {
  public inst: Arweave;
  public wallet: Keyfile;
  public state?: GovernanceState;
  public readonly id = GOVERNANCE_CONTRACT_ID;
  public useCache: boolean;
  public cacheUrl: string = "https://api.kyve.network";

  constructor(arweave: Arweave, wallet: Keyfile, useCache: boolean = true) {
    this.inst = arweave;
    this.wallet = wallet;
    this.useCache = useCache;
  }

  async getState(): Promise<GovernanceState> {
    let res: GovernanceState;

    if (this.useCache) {
      const response = await fetch(
        `${this.cacheUrl}/pool?id=${this.id}&type=meta`
      );
      if (response.ok) {
        res = await response.json();
      } else {
        throw new Error(
          `Couldn't read state for governance (${this.id}) from cache.`
        );
      }
    } else {
      res = await readContract(this.inst, this.id);
    }

    this.state = res;

    return res;
  }
}
