import { ethers, run, network } from "hardhat";
import { configs } from "@pancakeswap/common/config";

import { writeFileSync } from "fs";
import { utils } from "ethers";

export const cakePerBlock = utils.parseUnits("10", 18);
export const startBlock = 0;

async function main() {
  const [owner] = await ethers.getSigners();
  const networkName = network.name;
  // Check if the network is supported.
  console.log(`Deploying to ${networkName} network...`);

  // Compile contracts.
  await run("compile");
  console.log("Compiled contracts...");

  const config = configs[networkName as keyof typeof configs];
  if (!config) {
    throw new Error(`No config found for network ${networkName}`);
  }

  const burner = config.burner === ethers.constants.AddressZero ? owner.address : config.burner;

  const v3PeripheryDeployedContracts = await import(`@pancakeswap/v3-periphery/deployed/${networkName}.json`);
  // const masterchefV3DeployedContracts = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`);

  const SwapLabs = await ethers.getContractFactory("SwapLabsToken");
  const mancake = await SwapLabs.deploy();
  await mancake.deployed();
  console.log("SwapLabs deployed to:", mancake.address);

  const SyrupBar = await ethers.getContractFactory("SyrupBar");
  const syrup = await SyrupBar.deploy(mancake.address);
  await syrup.deployed();
  console.log("SyrupBar deployed to:", syrup.address);

  const MasterChef = await ethers.getContractFactory("MasterChef");
  const masterchef = await MasterChef.deploy(mancake.address, syrup.address, burner, cakePerBlock, startBlock);
  await masterchef.deployed();
  console.log("MasterChef deployed to:", masterchef.address);

  const MasterChefV2 = await ethers.getContractFactory("MasterChefV2");
  const masterchefv2 = await MasterChefV2.deploy(masterchef.address, mancake.address, 1, burner);
  await masterchefv2.deployed();
  console.log("MasterChefV2 deployed to:", masterchefv2.address);

  const MasterChefV3 = await ethers.getContractFactory("MasterChefV3");
  const masterchefv3 = await MasterChefV3.deploy(
    mancake.address,
    v3PeripheryDeployedContracts.NonfungiblePositionManager,
    config.WNATIVE
  );
  await masterchefv3.deployed();
  console.log("MasterChefV3 deployed to:", masterchefv3.address);

  // await mancake.connect(owner).transferOwnership(masterchef.address);
  await syrup.connect(owner).transferOwnership(masterchef.address);

  writeFileSync(
    `./deployed/${networkName}.json`,
    JSON.stringify(
      {
        // ...masterchefV3DeployedContracts,
        SwapLabsToken: mancake.address,
        SyrupBar: syrup.address,
        MasterChef: masterchef.address,
        MasterChefV2: masterchefv2.address,
        MasterChefV3: masterchefv3.address,
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
