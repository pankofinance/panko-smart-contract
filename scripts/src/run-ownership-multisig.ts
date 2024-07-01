import { ethers, network } from 'hardhat'

import { abi as GainV3FactoryABI } from '@pancakeswap/v3-core/artifacts/contracts/GainV3Factory.sol/GainV3Factory.json'
import { abi as GainV3PoolDeployerABI } from '@pancakeswap/v3-core/artifacts/contracts/GainV3PoolDeployer.sol/GainV3PoolDeployer.json'

import { abi as NFTDescriptorExABI } from '@pancakeswap/v3-periphery/artifacts/contracts/NFTDescriptorEx.sol/NFTDescriptorEx.json'

import { abi as GainStableSwapFactoryABI } from '@pancakeswap/stable-swap/artifacts/contracts/GainStableSwapFactory.sol/GainStableSwapFactory.json'

import { abi as SmartRouterABI } from '@pancakeswap/smart-router/artifacts/contracts/SmartRouter.sol/SmartRouter.json'

import { abi as GainTokenABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/GainToken.sol/GainToken.json'
import { abi as MasterChefABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChef.sol/MasterChef.json'
import { abi as MasterChefV2ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV2.sol/MasterChefV2.json'
import { abi as MasterChefV3ABI } from '@pancakeswap/masterchef-v3/artifacts/contracts/MasterChefV3.sol/MasterChefV3.json'

import { abi as VEManABI } from '@pancakeswap/voter/artifacts/contracts/VEMan.sol/VEMan.json'
import { abi as GaugeVotingABI } from '@pancakeswap/voter/artifacts/contracts/GaugeVoting.sol/GaugeVoting.json'
import { abi as GaugeVotingAdminUtilABI } from '@pancakeswap/voter/artifacts/contracts/GaugeVotingAdminUtil.sol/GaugeVotingAdminUtil.json'
import { abi as GaugeVotingBulkABI } from '@pancakeswap/voter/artifacts/contracts/GaugeVotingBulk.sol/GaugeVotingBulk.json'
import { abi as RevenueSharingPoolFactoryABI } from '@pancakeswap/voter/artifacts/contracts/RevenueSharingPoolFactory.sol/RevenueSharingPoolFactory.json'

import { abi as FarmBoosterABI } from '@pancakeswap/v3-farm/artifacts/contracts/FarmBooster.sol/FarmBooster.json'

import { abi as MasterChefV3ReceiverABI } from '@pancakeswap/fee/artifacts/contracts/receiver/MasterChefV3Receiver.sol/MasterChefV3Receiver.json'
import { configs } from '@pancakeswap/common/config'

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name

  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  let tx

  const ADMIN = config.admin
  const BURNER = config.burner

  if (!ADMIN || ADMIN === ethers.constants.AddressZero) {
    throw new Error('ADMIN address not found')
  }

  const core = await import(`@pancakeswap/v3-core/deployed/${networkName}.json`)
  const v3factory = new ethers.Contract(core.V3Factory, GainV3FactoryABI, owner)
  const deployer = new ethers.Contract(core.V3PoolDeployer, GainV3PoolDeployerABI, owner)

  const pp = await import(`@pancakeswap/v3-periphery/deployed/${networkName}.json`)
  const nftDescriptorEx = new ethers.Contract(pp.NFTDescriptorEx, NFTDescriptorExABI, owner)

  const ss = await import(`@pancakeswap/stable-swap/deployed/${networkName}.json`)
  const stableSwapFactory = new ethers.Contract(ss.StableSwapFactory, GainStableSwapFactoryABI, owner)

  const router = await import(`@pancakeswap/smart-router/deployed/${networkName}.json`)
  const smartRouter = new ethers.Contract(router.SmartRouter, SmartRouterABI, owner)

  const mc = await import(`@pancakeswap/masterchef-v3/deployed/${networkName}.json`)
  const mancakeToken = new ethers.Contract(mc.GainToken, GainTokenABI, owner)
  const masterchef = new ethers.Contract(mc.MasterChef, MasterChefABI, owner)
  const masterchefv2 = new ethers.Contract(mc.MasterChefV2, MasterChefV2ABI, owner)
  const masterchefv3 = new ethers.Contract(mc.MasterChefV3, MasterChefV3ABI, owner)

  const lm = await import(`@pancakeswap/v3-lm-pool/deployed/${networkName}.json`)

  const vote = await import(`@pancakeswap/voter/deployed/${networkName}.json`)
  const veMan = new ethers.Contract(vote.VEMan, VEManABI, owner)
  const gaugeVoting = new ethers.Contract(vote.GaugeVoting, GaugeVotingABI, owner)
  const gaugeVotingAdminUtil = new ethers.Contract(vote.GaugeVotingAdminUtil, GaugeVotingAdminUtilABI, owner)
  // const gaugeVotingBulk = new ethers.Contract(vote.GaugeVotingBulk, GaugeVotingBulkABI, owner)
  const revenueSharingPoolFactory = new ethers.Contract(
    vote.RevenueSharingPoolFactory,
    RevenueSharingPoolFactoryABI,
    owner
  )

  const farm = await import(`@pancakeswap/v3-farm/deployed/${networkName}.json`)
  const farmBooster = new ethers.Contract(farm.FarmBooster, FarmBoosterABI, owner)

  const fee = await import(`@pancakeswap/fee/deployed/${networkName}.json`)
  const masterchefv3receiver = new ethers.Contract(fee.MasterChefV3Receiver, MasterChefV3ReceiverABI, owner)

  tx = await v3factory.setOwner(ADMIN)
  await tx.wait(5)
  console.log('v3Factory setOwner:', tx.hash)

  tx = await nftDescriptorEx.setOwner(ADMIN)
  await tx.wait(5)
  console.log('NFTDescriptorEx setOwner:', tx.hash)

  tx = await stableSwapFactory.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('stableSwapFactory setOwner:', tx.hash)

  tx = await smartRouter.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('smartRouter setOwner:', tx.hash)

  tx = await mancakeToken.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('GainToken setOwner:', tx.hash)

  tx = await masterchef.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('MasterChef setOwner:', tx.hash)

  tx = await masterchefv2.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('MasterChefV2 setOwner:', tx.hash)

  tx = await masterchefv3.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('MasterChefV3 setOwner:', tx.hash)

  tx = await veMan.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('VEMan setOwner:', tx.hash)

  tx = await gaugeVoting.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('GaugeVoting setOwner:', tx.hash)

  tx = await gaugeVotingAdminUtil.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('GaugeVotingAdminUtil setOwner:', tx.hash)

  // tx = await gaugeVotingBulk.transferOwnership(ADMIN)
  // await tx.wait(5)
  // console.log('GaugeVotingBulk setOwner:', tx.hash)

  tx = await revenueSharingPoolFactory.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('RevenueSharingPoolFactory setOwner:', tx.hash)

  tx = await farmBooster.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('FarmBooster setOwner:', tx.hash)

  tx = await masterchefv3receiver.transferOwnership(ADMIN)
  await tx.wait(5)
  console.log('MasterChefV3Receiver setOwner:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
