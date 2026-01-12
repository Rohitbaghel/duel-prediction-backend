import { network } from "hardhat";

const DUEL_ADDRESS = "0x6EE01751A188A1b25879d4A7C46991D7f7c2d178";

async function main() {
  const { ethers } = await network.connect({
    network: "mantle",
    chainType: "op",
  });

  const [minter] = await ethers.getSigners();
  console.log("Minter:", minter.address);

  const duel = await ethers.getContractAt("Duel", DUEL_ADDRESS);

  const to = "0x88C04C5fEf3EDdF5CFeFE5AE1CB44d69b8a922c7"; // replace
  const amount = ethers.parseUnits("1000", 18);

  console.log("Minting 1000 DUEL...");

  const tx = await duel.mint(to, amount);
  await tx.wait();

  console.log(`Minted 1000 DUEL to ${to}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
