import Arweave from "arweave";
import Log from "./logger";
import { Governance, Pool } from "@kyve/contract-lib";
import WebSocket from "ws";

const log = new Log("node");

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const untilMined = async (
  txID: string,
  arweave: Arweave
): Promise<void> => {
  let status = (await arweave.transactions.getStatus(txID)).status;

  while (status !== 200) {
    await sleep(30 * 1000);

    status = (await arweave.transactions.getStatus(txID)).status;

    if (status === 200 || status === 202) {
      // mined / pending
      log.info(`Waiting for TX ${txID} to be mined.`);
    } else {
      throw Error(
        `Transaction ${txID} was not mined. Please check your wallet balance or try again.`
      );
    }
  }
};

export const untilCached = async (
  txID: string,
  type: "credit" | "stake"
): Promise<void> => {
  const endpoint = `wss://kyve.ws/${type}`;
  const client = new WebSocket(endpoint);

  client.on("message", (msg) => {
    const event = JSON.parse(msg.toString());

    if (event.transaction === txID) {
      client.close();
      return;
    }
  });

  client.on("ping", () => client.pong);
};

export const deposit = async (
  amount: number,
  address: string,
  governance: Governance,
  pool: Pool,
  arweave: Arweave
): Promise<void> => {
  // check if node has enough balance
  const governanceState = await governance.getState();
  if (governanceState.balances[address] < amount) {
    throw new Error(
      "Not enough $KYVE. Get free tokens here: https://docs.kyve.network/usdkyve-token#get-free-tokens"
    );
  }
  // deposit tokens into the pool
  const depositID = await pool.deposit(amount);
  log.info(
    `Depositing ${amount} $KYVE into pool: ${pool.id!}. Transaction ${depositID}`
  );
  await untilMined(depositID, arweave);
  await untilCached(depositID, "credit");
  log.info("Successfully deposited tokens.");
};
