import { ethers, network } from 'hardhat'
import { writeFileSync } from 'fs'

const currentNetwork = network.name

const main = async () => {
  console.log('Deploying to network:', currentNetwork)

  const LPFactory = await ethers.getContractFactory('GainStableSwapLPFactory')
  const lpFactory = await LPFactory.deploy()
  await lpFactory.deployed()
  console.log('GainStableSwapLPFactory deployed to:', lpFactory.address)

  const TwoPoolDeployer = await ethers.getContractFactory('GainStableSwapTwoPoolDeployer')
  const twoPoolDeployer = await TwoPoolDeployer.deploy()
  await twoPoolDeployer.deployed()
  console.log('GainStableSwapTwoPoolDeployer deployed to:', twoPoolDeployer.address)

  const ThreePoolDeployer = await ethers.getContractFactory('GainStableSwapThreePoolDeployer')
  const threePoolDeployer = await ThreePoolDeployer.deploy()
  await threePoolDeployer.deployed()
  console.log('GainStableSwapThreePoolDeployer deployed to:', threePoolDeployer.address)

  const Factory = await ethers.getContractFactory('GainStableSwapFactory')
  const factory = await Factory.deploy(lpFactory.address, twoPoolDeployer.address, threePoolDeployer.address)
  await factory.deployed()
  console.log('GainStableSwapFactory deployed to:', factory.address)

  await lpFactory.transferOwnership(factory.address)
  console.log('GainStableSwapLPFactory ownership transferred to:', factory.address)
  await twoPoolDeployer.transferOwnership(factory.address)
  console.log('GainStableSwapTwoPoolDeployer ownership transferred to:', factory.address)
  await threePoolDeployer.transferOwnership(factory.address)
  console.log('GainStableSwapThreePoolDeployer ownership transferred to:', factory.address)

  const TwoPoolInfo = await ethers.getContractFactory('GainStableSwapTwoPoolInfo')
  const twoPoolInfo = await TwoPoolInfo.deploy()
  await twoPoolInfo.deployed()
  console.log('GainStableSwapTwoPoolInfo deployed to:', twoPoolInfo.address)

  const ThreePoolInfo = await ethers.getContractFactory('GainStableSwapThreePoolInfo')
  const threePoolInfo = await ThreePoolInfo.deploy()
  await threePoolInfo.deployed()
  console.log('GainStableSwapThreePoolInfo deployed to:', threePoolInfo.address)

  const Info = await ethers.getContractFactory('GainStableSwapInfo')
  const info = await Info.deploy(twoPoolInfo.address, threePoolInfo.address)
  await info.deployed()
  console.log('GainStableSwapInfo deployed to:', info.address)

  const contracts = {
    StableSwapLPFactory: lpFactory.address,
    StableSwapTwoPoolDeployer: twoPoolDeployer.address,
    StableSwapThreePoolDeployer: threePoolDeployer.address,
    StableSwapFactory: factory.address,
    StableSwapTwoPoolInfo: twoPoolInfo.address,
    StableSwapThreePoolInfo: threePoolInfo.address,
    StableSwapInfo: info.address,
  }

  writeFileSync(`./deployed/${network.name}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
