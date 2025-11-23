import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress } from "viem";

describe("GasStation", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();

  let owner = wallets[0];
  let user = wallets[1];
  let recipient = wallets[2];

  let usdc: any;
  let weth: any;
  let router: any;
  let gasStation: any;

  const usdcUnits = (n: bigint) => n; // Mock ERC20 uses 6 decimals but raw bigint is fine for tests

  beforeEach(async () => {
    usdc = await viem.deployContract("MockERC20", ["USD Coin", "USDC", 6]);
    weth = await viem.deployContract("MockWETH");
    router = await viem.deployContract("MockSwapRouter", [usdc.address, weth.address]);
    gasStation = await viem.deployContract("GasStation", [
      usdc.address,
      router.address,
      weth.address,
      3000, // pool fee
    ]);

    // fund user with USDC
    await usdc.write.mint([user.account.address, usdcUnits(1_000_000n)]);
  });

  it("deposit transfers USDC and emits Deposited", async () => {
    const gasStationAsUser = await viem.getContractAt("GasStation", gasStation.address, {
      client: { wallet: user },
    });
    const usdcAsUser = await viem.getContractAt("MockERC20", usdc.address, {
      client: { wallet: user },
    });

    const total = usdcUnits(500_000n);
    const chainIds = [1n, 8453n];
    const chainAmts = [usdcUnits(200_000n), usdcUnits(300_000n)];

    await usdcAsUser.write.approve([gasStation.address, total]);

    await viem.assertions.emitWithArgs(
      gasStationAsUser.write.deposit([total, chainIds, chainAmts]),
      gasStation,
      "Deposited",
      [getAddress(user.account.address), total, chainIds, chainAmts],
    );

    const bal = await usdc.read.balanceOf([gasStation.address]);
    assert.equal(bal, total);
  });

  it("deposit reverts on invalid inputs", async () => {
    const gasStationAsUser = await viem.getContractAt("GasStation", gasStation.address, {
      client: { wallet: user },
    });

    await assert.rejects(
      gasStationAsUser.write.deposit([0n, [1n], [1n]]),
      /totalAmount = 0/,
    );
    await assert.rejects(
      gasStationAsUser.write.deposit([1n, [1n], []]),
      /array length mismatch/,
    );
    await assert.rejects(
      gasStationAsUser.write.deposit([10n, [1n], [9n]]),
      /amounts do not sum to totalAmount/,
    );
  });

  it("only owner can drip", async () => {
    const gasStationAsUser = await viem.getContractAt("GasStation", gasStation.address, {
      client: { wallet: user },
    });
    await assert.rejects(
      gasStationAsUser.write.drip([1n, user.account.address]),
      /Ownable: caller is not the owner/,
    );
  });

  it("drip swaps, unwraps WETH, and sends ETH to recipient; emits Dripped", async () => {
    const gasStationAsUser = await viem.getContractAt("GasStation", gasStation.address, {
      client: { wallet: user },
    });
    const usdcAsUser = await viem.getContractAt("MockERC20", usdc.address, {
      client: { wallet: user },
    });

    // user deposits into GasStation
    const depositAmt = usdcUnits(250_000n);
    await usdcAsUser.write.approve([gasStation.address, depositAmt]);
    await gasStationAsUser.write.deposit([depositAmt, [1n], [depositAmt]]);

    // pre-fund WETH contract with ETH so withdraw can succeed
    const usdcToSwap = usdcUnits(100_000n);
    const expectedWeth = usdcToSwap * 10n ** 12n; // 6 -> 18 decimals
    await owner.sendTransaction({ to: weth.address, value: expectedWeth });

    const beforeRecipient = await publicClient.getBalance({ address: recipient.account.address });

    await viem.assertions.emitWithArgs(
      gasStation.write.drip([usdcToSwap, recipient.account.address]),
      gasStation,
      "Dripped",
      [getAddress(recipient.account.address), usdcToSwap, expectedWeth],
    );

    const afterRecipient = await publicClient.getBalance({ address: recipient.account.address });
    assert.equal(afterRecipient - beforeRecipient, expectedWeth);

    const routerUsdc = await usdc.read.balanceOf([router.address]);
    assert.equal(routerUsdc, usdcToSwap);

    const gasStationWeth = await weth.read.balanceOf([gasStation.address]);
    assert.equal(gasStationWeth, 0n);
  });
});


