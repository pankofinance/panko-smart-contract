import bn from 'bignumber.js'
import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'
import { configs } from '@pancakeswap/common/config'
import fs from 'fs'

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })
function encodePriceSqrt(reserve1: any, reserve0: any) {
  return BigNumber.from(
    // eslint-disable-next-line new-cap
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      // eslint-disable-next-line new-cap
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  )
}

function isAscii(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str)
}
function asciiStringToBytes32(str: string): string {
  if (str.length > 32 || !isAscii(str)) {
    throw new Error('Invalid label, must be less than 32 characters')
  }

  return '0x' + Buffer.from(str, 'ascii').toString('hex').padEnd(64, '0')
}

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name
  console.log('owner', owner.address)

  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const deployedContracts = await import(`@pancakeswap/v3-core/deployed/${networkName}.json`)

  const v3PoolDeployer_address = deployedContracts.V3PoolDeployer
  const v3Factory_address = deployedContracts.V3Factory

  const SwapRouter = await ethers.getContractFactory('SwapRouter')
  const swapRouter = await SwapRouter.deploy(v3PoolDeployer_address, v3Factory_address, config.WNATIVE)
  await swapRouter.deployed()
  console.log('swapRouter', swapRouter.address)

  const NFTDescriptorEx = await ethers.getContractFactory('NFTDescriptorEx')
  const nftDescriptorEx = await NFTDescriptorEx.deploy()
  await nftDescriptorEx.deployed()
  console.log('nftDescriptorEx', nftDescriptorEx.address)

  const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory('NonfungibleTokenPositionDescriptor')
  const nonfungibleTokenPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(
    config.WNATIVE,
    asciiStringToBytes32(config.nativeCurrencyLabel),
    nftDescriptorEx.address
  )
  await nonfungibleTokenPositionDescriptor.deployed()
  console.log('nonfungibleTokenPositionDescriptor', nonfungibleTokenPositionDescriptor.address)

  // off chain version
  // const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory(
  //   'NonfungibleTokenPositionDescriptorOffChain'
  // )
  // const baseTokenUri = 'https://nft.pancakeswap.com/v3/'
  // const nonfungibleTokenPositionDescriptor = await upgrades.deployProxy(NonfungibleTokenPositionDescriptor, [
  //   baseTokenUri,
  // ])
  // await nonfungibleTokenPositionDescriptor.deployed()
  // console.log('nonfungibleTokenPositionDescriptor', nonfungibleTokenPositionDescriptor.address)

  const NonfungiblePositionManager = await ethers.getContractFactory('NonfungiblePositionManager')
  const nonfungiblePositionManager = await NonfungiblePositionManager.deploy(
    v3PoolDeployer_address,
    v3Factory_address,
    config.WNATIVE,
    nonfungibleTokenPositionDescriptor.address
  )
  await nonfungiblePositionManager.deployed()
  console.log('nonfungiblePositionManager', nonfungiblePositionManager.address)

  // const PancakeInterfaceMulticall = await ethers.getContractFactory('PancakeInterfaceMulticall')
  // const pancakeInterfaceMulticall = await PancakeInterfaceMulticall.deploy()
  // await pancakeInterfaceMulticall.deployed()
  // console.log('PancakeInterfaceMulticall', pancakeInterfaceMulticall.address)

  const SwapLabsInterfaceMulticallV2 = await ethers.getContractFactory('SwapLabsInterfaceMulticallV2')
  const mancakeInterfaceMulticallV2 = await SwapLabsInterfaceMulticallV2.deploy()
  await mancakeInterfaceMulticallV2.deployed()
  console.log('SwapLabsInterfaceMulticallV2', mancakeInterfaceMulticallV2.address)

  const V3Migrator = await ethers.getContractFactory('V3Migrator')
  const v3Migrator = await V3Migrator.deploy(
    v3PoolDeployer_address,
    v3Factory_address,
    config.WNATIVE,
    nonfungiblePositionManager.address
  )
  await v3Migrator.deployed()
  console.log('V3Migrator', v3Migrator.address)

  const TickLens = await ethers.getContractFactory('TickLens')
  const tickLens = await TickLens.deploy()
  await tickLens.deployed()
  console.log('TickLens', tickLens.address)

  const QuoterV2 = await ethers.getContractFactory('QuoterV2')
  const quoterV2 = await QuoterV2.deploy(v3PoolDeployer_address, v3Factory_address, config.WNATIVE)
  await quoterV2.deployed()
  console.log('QuoterV2', quoterV2.address)

  const contracts = {
    SwapRouter: swapRouter.address,
    V3Migrator: v3Migrator.address,
    QuoterV2: quoterV2.address,
    TickLens: tickLens.address,
    // NFTDescriptor: nftDescriptor.address,
    NFTDescriptorEx: nftDescriptorEx.address,
    NonfungibleTokenPositionDescriptor: nonfungibleTokenPositionDescriptor.address,
    NonfungiblePositionManager: nonfungiblePositionManager.address,
    // PancakeInterfaceMulticall: pancakeInterfaceMulticall.address,
    MulticallV2: mancakeInterfaceMulticallV2.address,
  }

  fs.writeFileSync(`./deployed/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
