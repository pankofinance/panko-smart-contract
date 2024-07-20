import { ethers, network } from "hardhat";
import { writeFileSync } from "fs";

const currentNetwork = network.name;

const main = async () => {
  console.log("Deploying to network:", currentNetwork);

  const LPFactory = await ethers.getContractFactory(
    "SwapLabsStableSwapLPFactory"
  );
  const lpFactory = await LPFactory.deploy();
  await lpFactory.deployed();
  console.log("SwapLabsStableSwapLPFactory deployed to:", lpFactory.address);

  const TwoPoolDeployer = await ethers.getContractFactory(
    "SwapLabsStableSwapTwoPoolDeployer"
  );
  const twoPoolDeployer = await TwoPoolDeployer.deploy();
  await twoPoolDeployer.deployed();
  console.log(
    "SwapLabsStableSwapTwoPoolDeployer deployed to:",
    twoPoolDeployer.address
  );

  const ThreePoolDeployer = await ethers.getContractFactory(
    "SwapLabsStableSwapThreePoolDeployer"
  );
  const threePoolDeployer = await ThreePoolDeployer.deploy();
  await threePoolDeployer.deployed();
  console.log(
    "SwapLabsStableSwapThreePoolDeployer deployed to:",
    threePoolDeployer.address
  );

  const Factory = await ethers.getContractFactory("SwapLabsStableSwapFactory");
  const factory = await Factory.deploy(
    lpFactory.address,
    twoPoolDeployer.address,
    threePoolDeployer.address
  );
  await factory.deployed();
  console.log("SwapLabsStableSwapFactory deployed to:", factory.address);

  await lpFactory.transferOwnership(factory.address);
  console.log(
    "SwapLabsStableSwapLPFactory ownership transferred to:",
    factory.address
  );
  await twoPoolDeployer.transferOwnership(factory.address);
  console.log(
    "SwapLabsStableSwapTwoPoolDeployer ownership transferred to:",
    factory.address
  );
  await threePoolDeployer.transferOwnership(factory.address);
  console.log(
    "SwapLabsStableSwapThreePoolDeployer ownership transferred to:",
    factory.address
  );

  const TwoPoolInfo = await ethers.getContractFactory(
    "SwapLabsStableSwapTwoPoolInfo"
  );
  const twoPoolInfo = await TwoPoolInfo.deploy();
  await twoPoolInfo.deployed();
  console.log(
    "SwapLabsStableSwapTwoPoolInfo deployed to:",
    twoPoolInfo.address
  );

  const ThreePoolInfo = await ethers.getContractFactory(
    "SwapLabsStableSwapThreePoolInfo"
  );
  const threePoolInfo = await ThreePoolInfo.deploy();
  await threePoolInfo.deployed();
  console.log(
    "SwapLabsStableSwapThreePoolInfo deployed to:",
    threePoolInfo.address
  );

  const Info = await ethers.getContractFactory("SwapLabsStableSwapInfo");
  const info = await Info.deploy(twoPoolInfo.address, threePoolInfo.address);
  await info.deployed();
  console.log("SwapLabsStableSwapInfo deployed to:", info.address);

  const contracts = {
    StableSwapLPFactory: lpFactory.address,
    StableSwapTwoPoolDeployer: twoPoolDeployer.address,
    StableSwapThreePoolDeployer: threePoolDeployer.address,
    StableSwapFactory: factory.address,
    StableSwapTwoPoolInfo: twoPoolInfo.address,
    StableSwapThreePoolInfo: threePoolInfo.address,
    StableSwapInfo: info.address,
  };

  writeFileSync(
    `./deployed/${network.name}.json`,
    JSON.stringify(contracts, null, 2)
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
